import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { generateOrderNo } from '../lib/auth'

interface Contact { id: string; name: string; payment_terms: string | null }
interface Warehouse { id: string; name: string; code: string }
interface Product { id: string; name: string; uom: string; sales_price: number; tax_rate: number; internal_ref: string | null }

interface LineItem {
  id: string
  product_id: string
  description: string
  quantity: number
  uom: string
  unit_price: number
  discount: number
  tax_rate: number
  subtotal: number
}

function newLine(): LineItem {
  return {
    id: Math.random().toString(36).slice(2),
    product_id: '',
    description: '',
    quantity: 1,
    uom: 'PCS',
    unit_price: 0,
    discount: 0,
    tax_rate: 0,
    subtotal: 0,
  }
}

function calcSubtotal(l: LineItem): number {
  const base = l.quantity * l.unit_price
  const afterDiscount = base * (1 - l.discount / 100)
  return Math.round(afterDiscount * 100) / 100
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { maximumFractionDigits: 2 })
}

export function SalesNewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [customers, setCustomers] = useState<Contact[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [orderNo, setOrderNo]     = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10))
  const [expiryDate, setExpiryDate] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([newLine()])

  useEffect(() => {
    if (!user?.companyId) return
    Promise.all([
      supabase.from('contacts').select('id, name, payment_terms').eq('company_id', user.companyId).eq('type', 'customer').eq('is_active', true).order('name'),
      supabase.from('warehouses').select('id, name, code').eq('company_id', user.companyId).eq('is_active', true).order('name'),
      supabase.from('products').select('id, name, uom, sales_price, tax_rate, internal_ref').eq('company_id', user.companyId).eq('is_active', true).order('name'),
      supabase.from('sales_orders').select('id', { count: 'exact', head: true }).eq('company_id', user.companyId),
    ]).then(([c, w, p, cnt]) => {
      setCustomers(c.data ?? [])
      setWarehouses(w.data ?? [])
      setProducts(p.data ?? [])
      setOrderNo(generateOrderNo('SO', cnt.count ?? 0))
      if (w.data?.[0]) setWarehouseId(w.data[0].id)
      setLoading(false)
    })
  }, [user?.companyId])

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l
      const updated = { ...l, ...patch }
      // Auto-fill from product
      if (patch.product_id) {
        const prod = products.find(p => p.id === patch.product_id)
        if (prod) {
          updated.uom        = prod.uom
          updated.unit_price = prod.sales_price
          updated.tax_rate   = prod.tax_rate
          updated.description = prod.name
        }
      }
      updated.subtotal = calcSubtotal(updated)
      return updated
    }))
  }

  function removeLine(id: string) {
    setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev)
  }

  const subtotal   = lines.reduce((s, l) => s + l.subtotal, 0)
  const taxAmount  = lines.reduce((s, l) => s + l.subtotal * l.tax_rate / 100, 0)
  const total      = subtotal + taxAmount

  async function save(status: 'draft' | 'confirmed') {
    if (!user?.companyId) return
    const hasProducts = lines.some(l => l.product_id || l.description)
    if (!hasProducts) { toast('Add at least one order line', 'error'); return }

    setSaving(true)
    try {
      const { data: order, error } = await supabase.from('sales_orders').insert({
        company_id:    user.companyId,
        order_no:      orderNo,
        order_date:    orderDate,
        expiry_date:   expiryDate || null,
        customer_id:   customerId || null,
        warehouse_id:  warehouseId || null,
        payment_terms: paymentTerms || null,
        notes:         notes || null,
        status,
        subtotal,
        tax_amount: taxAmount,
        total,
        created_by: user.userId,
      }).select('id').single()

      if (error || !order) throw error ?? new Error('Failed to create order')

      const linePayload = lines
        .filter(l => l.product_id || l.description)
        .map((l, i) => ({
          order_id:    order.id,
          product_id:  l.product_id || null,
          description: l.description,
          quantity:    l.quantity,
          uom:         l.uom,
          unit_price:  l.unit_price,
          discount:    l.discount,
          tax_rate:    l.tax_rate,
          subtotal:    l.subtotal,
          sort_order:  i,
        }))

      if (linePayload.length) {
        const { error: le } = await supabase.from('sales_order_lines').insert(linePayload)
        if (le) throw le
      }

      toast(`Order ${status === 'confirmed' ? 'confirmed' : 'saved as draft'}!`, 'success')
      navigate(`/sales/${order.id}`)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save order', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout title="New Sales Order" showBack>
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </Layout>
    )
  }

  return (
    <Layout title="New Sales Order" showBack backTo="/sales" noPadding>
      <div className="px-4 py-4 space-y-4 pb-32">

        {/* Order Info */}
        <Card>
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">1</span>
            Order Info
          </h3>
          <div className="space-y-3">
            <Input label="Order Number" value={orderNo} onChange={e => setOrderNo(e.target.value)} readOnly hint="Auto-generated" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Order Date" type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} required />
              <Input label="Expiry Date" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Customer & Warehouse */}
        <Card>
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">2</span>
            Customer & Delivery
          </h3>
          <div className="space-y-3">
            <Select label="Customer" value={customerId} onChange={e => {
              setCustomerId(e.target.value)
              const c = customers.find(x => x.id === e.target.value)
              if (c?.payment_terms) setPaymentTerms(c.payment_terms)
            }}>
              <option value="">Walk-in / Cash</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Warehouse" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
              <option value="">Select warehouse</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
            </Select>
            <Input label="Payment Terms" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" />
          </div>
        </Card>

        {/* Order Lines */}
        <Card>
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">3</span>
            Order Lines
          </h3>
          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div key={line.id} className="bg-slate-50 rounded-xl p-3 space-y-2.5 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Line {idx + 1}</span>
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(line.id)} className="p-1 rounded-lg text-red-400 hover:bg-red-50 active:scale-95">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Product</label>
                  <div className="relative">
                    <select
                      value={line.product_id}
                      onChange={e => updateLine(line.id, { product_id: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none min-h-[44px]"
                    >
                      <option value="">Select product…</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.internal_ref ? `(${p.internal_ref})` : ''}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                {!line.product_id && (
                  <Input label="Description" value={line.description} onChange={e => updateLine(line.id, { description: e.target.value })} placeholder="Manual description" />
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Qty</label>
                    <input type="number" min="0.01" step="0.01" value={line.quantity}
                      onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Unit Price</label>
                    <input type="number" min="0" step="0.01" value={line.unit_price}
                      onChange={e => updateLine(line.id, { unit_price: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Disc %</label>
                    <input type="number" min="0" max="100" step="0.01" value={line.discount}
                      onChange={e => updateLine(line.id, { discount: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">Tax: {line.tax_rate}%</span>
                  <span className="font-bold text-sm text-teal-700">PKR {fmt(line.subtotal)}</span>
                </div>
              </div>
            ))}

            <button
              onClick={() => setLines(prev => [...prev, newLine()])}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-teal-200 text-teal-600 text-sm font-medium hover:bg-teal-50 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Line
            </button>
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions…" rows={3} />
        </Card>
      </div>

      {/* Sticky totals + actions */}
      <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] inset-x-0 bg-white border-t border-slate-200 shadow-xl z-30">
        <div className="px-4 pt-3 pb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium">PKR {fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">Tax</span>
            <span className="font-medium">PKR {fmt(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-slate-100 pt-2 mb-3">
            <span>Total</span>
            <span className="text-teal-700">PKR {fmt(total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => save('draft')} loading={saving}>
              Save Draft
            </Button>
            <Button variant="primary" onClick={() => save('confirmed')} loading={saving}>
              Confirm Order
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

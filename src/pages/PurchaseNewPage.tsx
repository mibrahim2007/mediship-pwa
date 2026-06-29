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

interface Vendor    { id: string; name: string }
interface Warehouse { id: string; name: string; code: string }
interface Product   { id: string; name: string; uom: string; cost_price: number; tax_rate: number; internal_ref: string | null }

interface LineItem {
  id: string
  product_id: string
  description: string
  quantity: number
  uom: string
  unit_price: number
  tax_rate: number
  subtotal: number
}

function newLine(): LineItem {
  return { id: Math.random().toString(36).slice(2), product_id: '', description: '', quantity: 1, uom: 'PCS', unit_price: 0, tax_rate: 0, subtotal: 0 }
}

function calcSubtotal(l: LineItem) {
  return Math.round(l.quantity * l.unit_price * 100) / 100
}

function fmt(n: number) { return n.toLocaleString('en-PK', { maximumFractionDigits: 2 }) }

export function PurchaseNewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [vendors, setVendors]     = useState<Vendor[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts]   = useState<Product[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)

  const [orderNo, setOrderNo]       = useState('')
  const [orderDate, setOrderDate]   = useState(new Date().toISOString().slice(0, 10))
  const [vendorId, setVendorId]     = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [notes, setNotes]           = useState('')
  const [lines, setLines]           = useState<LineItem[]>([newLine()])

  useEffect(() => {
    if (!user?.companyId) return
    Promise.all([
      supabase.from('contacts').select('id, name').eq('company_id', user.companyId).eq('type', 'vendor').eq('is_active', true).order('name'),
      supabase.from('warehouses').select('id, name, code').eq('company_id', user.companyId).eq('is_active', true).order('name'),
      supabase.from('products').select('id, name, uom, cost_price, tax_rate, internal_ref').eq('company_id', user.companyId).eq('is_active', true).order('name'),
      supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('company_id', user.companyId),
    ]).then(([v, w, p, cnt]) => {
      setVendors(v.data ?? [])
      setWarehouses(w.data ?? [])
      setProducts(p.data ?? [])
      setOrderNo(generateOrderNo('PO', cnt.count ?? 0))
      if (w.data?.[0]) setWarehouseId(w.data[0].id)
      setLoading(false)
    })
  }, [user?.companyId])

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l
      const updated = { ...l, ...patch }
      if (patch.product_id) {
        const prod = products.find(p => p.id === patch.product_id)
        if (prod) { updated.uom = prod.uom; updated.unit_price = prod.cost_price; updated.tax_rate = prod.tax_rate; updated.description = prod.name }
      }
      updated.subtotal = calcSubtotal(updated)
      return updated
    }))
  }

  const subtotal  = lines.reduce((s, l) => s + l.subtotal, 0)
  const taxAmount = lines.reduce((s, l) => s + l.subtotal * l.tax_rate / 100, 0)
  const total     = subtotal + taxAmount

  async function save(status: 'draft' | 'confirmed') {
    if (!user?.companyId) return
    if (!lines.some(l => l.product_id || l.description)) { toast('Add at least one line', 'error'); return }
    setSaving(true)
    try {
      const { data: po, error } = await supabase.from('purchase_orders').insert({
        company_id: user.companyId, order_no: orderNo, order_date: orderDate,
        vendor_id: vendorId || null, warehouse_id: warehouseId || null,
        notes: notes || null, status, subtotal, tax_amount: taxAmount, total, created_by: user.userId,
      }).select('id').single()
      if (error || !po) throw error ?? new Error('Failed')

      const payload = lines.filter(l => l.product_id || l.description).map((l, i) => ({
        order_id: po.id, product_id: l.product_id || null, description: l.description,
        quantity: l.quantity, uom: l.uom, unit_price: l.unit_price, tax_rate: l.tax_rate, subtotal: l.subtotal, sort_order: i,
      }))
      if (payload.length) await supabase.from('purchase_order_lines').insert(payload)

      toast(`PO ${status === 'confirmed' ? 'confirmed' : 'saved'}!`, 'success')
      navigate('/purchase')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save PO', 'error')
    } finally { setSaving(false) }
  }

  if (loading) return <Layout title="New Purchase Order" showBack><div className="flex justify-center py-20"><Spinner size="lg" /></div></Layout>

  return (
    <Layout title="New Purchase Order" showBack backTo="/purchase" noPadding>
      <div className="px-4 py-4 space-y-4 pb-32">
        <Card>
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">1</span>
            Order Info
          </h3>
          <div className="space-y-3">
            <Input label="PO Number" value={orderNo} onChange={e => setOrderNo(e.target.value)} readOnly hint="Auto-generated" />
            <Input label="Order Date" type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} required />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">2</span>
            Vendor & Warehouse
          </h3>
          <div className="space-y-3">
            <Select label="Vendor" value={vendorId} onChange={e => setVendorId(e.target.value)}>
              <option value="">Select vendor…</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
            <Select label="Deliver To" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
              <option value="">Select warehouse</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
            </Select>
          </div>
        </Card>

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
                    <button onClick={() => setLines(prev => prev.filter(l => l.id !== line.id))} className="p-1 rounded-lg text-red-400 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Product</label>
                  <div className="relative">
                    <select value={line.product_id} onChange={e => updateLine(line.id, { product_id: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none min-h-[44px]">
                      <option value="">Select product…</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.internal_ref ? ` (${p.internal_ref})` : ''}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                {!line.product_id && (
                  <Input label="Description" value={line.description} onChange={e => updateLine(line.id, { description: e.target.value })} placeholder="Manual item" />
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Qty</label>
                    <input type="number" min="0.01" step="0.01" value={line.quantity}
                      onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Unit Cost</label>
                    <input type="number" min="0" step="0.01" value={line.unit_price}
                      onChange={e => updateLine(line.id, { unit_price: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tax %</label>
                    <input type="number" min="0" max="100" step="0.1" value={line.tax_rate}
                      onChange={e => updateLine(line.id, { tax_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className="font-bold text-sm text-teal-700">PKR {fmt(line.subtotal)}</span>
                </div>
              </div>
            ))}
            <button onClick={() => setLines(prev => [...prev, newLine()])}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-teal-200 text-teal-600 text-sm font-medium hover:bg-teal-50 active:scale-95 transition-all">
              <Plus className="h-4 w-4" /> Add Line
            </button>
          </div>
        </Card>

        <Card>
          <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions…" rows={3} />
        </Card>
      </div>

      <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] inset-x-0 bg-white border-t border-slate-200 shadow-xl z-30">
        <div className="px-4 pt-3 pb-3">
          <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Subtotal</span><span>PKR {fmt(subtotal)}</span></div>
          <div className="flex justify-between text-sm mb-2"><span className="text-slate-500">Tax</span><span>PKR {fmt(taxAmount)}</span></div>
          <div className="flex justify-between font-bold text-base border-t border-slate-100 pt-2 mb-3">
            <span>Total</span><span className="text-teal-700">PKR {fmt(total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => save('draft')} loading={saving}>Save Draft</Button>
            <Button variant="primary"   onClick={() => save('confirmed')} loading={saving}>Confirm PO</Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

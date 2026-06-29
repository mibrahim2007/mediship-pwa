import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Card } from '../components/ui/Card'
import { Badge, statusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

interface OrderLine { id: string; description: string | null; quantity: number; uom: string | null; unit_price: number; discount: number; tax_rate: number; subtotal: number; products: { name: string; uom: string } | null }
interface OrderDetail { id: string; order_no: string; order_date: string; expiry_date: string | null; status: string; subtotal: number; tax_amount: number; total: number; payment_terms: string | null; notes: string | null; contacts: { name: string; phone: string | null; email: string | null } | null; lines: OrderLine[] }

function fmt(n: number) { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }) }

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-700 text-right max-w-[60%]">{value}</span>
    </div>
  )
}

export function SalesDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  async function load() {
    if (!id || !user?.companyId) return
    const { data: o } = await supabase
      .from('sales_orders')
      .select('*, contacts!customer_id(name, phone, email)')
      .eq('id', id).eq('company_id', user.companyId).single()

    const { data: lines } = await supabase
      .from('sales_order_lines')
      .select('*, products(name, uom)')
      .eq('order_id', id).order('sort_order')

    if (o) setOrder({ ...o, lines: lines ?? [] } as OrderDetail)
    setLoading(false)
  }

  useEffect(() => { load() }, [id, user?.companyId])

  async function updateStatus(status: string) {
    if (!id || !user?.companyId) return
    setUpdating(true)
    const { error } = await supabase.from('sales_orders').update({ status }).eq('id', id).eq('company_id', user.companyId)
    if (error) {
      toast('Failed to update status', 'error')
    } else {
      toast(`Order ${status}`, 'success')
      await load()
    }
    setUpdating(false)
  }

  if (loading) return <Layout title="Order Detail" showBack><div className="flex justify-center py-20"><Spinner size="lg" /></div></Layout>
  if (!order) return <Layout title="Order Detail" showBack><div className="text-center py-20 text-slate-400">Order not found</div></Layout>

  const { label, variant } = statusBadge(order.status)

  return (
    <Layout title={order.order_no} showBack backTo="/sales">
      <div className="space-y-4 pb-6">

        {/* Status */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-slate-800">{order.order_no}</h2>
            <Badge variant={variant}>{label}</Badge>
          </div>
          <InfoRow label="Order Date"   value={order.order_date} />
          <InfoRow label="Expiry Date"  value={order.expiry_date} />
          <InfoRow label="Customer"     value={order.contacts?.name} />
          <InfoRow label="Phone"        value={order.contacts?.phone} />
          <InfoRow label="Payment Terms" value={order.payment_terms} />
          {order.notes && <InfoRow label="Notes" value={order.notes} />}
        </Card>

        {/* Lines */}
        <Card padding="none">
          <div className="px-4 pt-4 pb-2">
            <h3 className="font-semibold text-slate-700 text-sm">Order Lines</h3>
          </div>
          {order.lines.map((line, i) => (
            <div key={line.id} className={`px-4 py-3 ${i < order.lines.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-sm text-slate-800 flex-1 pr-2">
                  {line.products?.name ?? line.description ?? `Line ${i + 1}`}
                </span>
                <span className="font-bold text-sm text-teal-700 shrink-0">{fmt(line.subtotal)}</span>
              </div>
              <p className="text-xs text-slate-400">
                {line.quantity} {line.uom ?? line.products?.uom ?? 'PCS'} × {fmt(line.unit_price)}
                {line.discount > 0 && <span className="text-orange-500"> · {line.discount}% disc</span>}
                {line.tax_rate > 0 && <span> · {line.tax_rate}% tax</span>}
              </p>
            </div>
          ))}
          <div className="px-4 pt-3 pb-4 bg-slate-50 rounded-b-2xl space-y-1.5 border-t border-slate-100">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span>{fmt(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Tax</span>
              <span>{fmt(order.tax_amount)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1 border-t border-slate-200">
              <span>Total</span>
              <span className="text-teal-700">{fmt(order.total)}</span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          {order.status === 'draft' && (
            <Button fullWidth onClick={() => updateStatus('confirmed')} loading={updating}>
              Confirm Order
            </Button>
          )}
          {order.status === 'confirmed' && (
            <Button fullWidth onClick={() => updateStatus('delivered')} loading={updating}>
              Mark as Delivered
            </Button>
          )}
          {(order.status === 'draft' || order.status === 'confirmed') && (
            <Button fullWidth variant="danger" onClick={() => updateStatus('cancelled')} loading={updating}>
              Cancel Order
            </Button>
          )}
        </div>
      </div>
    </Layout>
  )
}

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, Plus } from 'lucide-react'
import { Layout } from '../components/Layout'
import { Card } from '../components/ui/Card'
import { Badge, statusBadge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { FAB } from '../components/ui/FAB'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

type StatusFilter = 'all' | 'draft' | 'confirmed' | 'delivered' | 'cancelled'

interface Order {
  id: string
  order_no: string
  order_date: string
  status: string
  total: number
  contacts: { name: string } | null
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'draft',     label: 'Draft' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

function fmt(n: number) {
  return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })
}

export function SalesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    if (!user?.companyId) return
    setLoading(true)
    let q = supabase
      .from('sales_orders')
      .select('id, order_no, order_date, status, total, contacts!customer_id(name)')
      .eq('company_id', user.companyId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (statusFilter !== 'all') q = q.eq('status', statusFilter)

    q.then(({ data }) => {
      setOrders((data ?? []) as unknown as Order[])
      setLoading(false)
    })
  }, [user?.companyId, statusFilter])

  const filtered = orders.filter(o =>
    !search ||
    o.order_no.toLowerCase().includes(search.toLowerCase()) ||
    (o.contacts?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="Sales Orders">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders or customers…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={[
                'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                statusFilter === tab.key
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ChevronRight className="h-8 w-8" />}
            title="No orders found"
            description={search ? 'Try a different search term' : 'Create your first sales order'}
            action={
              <button onClick={() => navigate('/sales/new')} className="text-sm font-medium text-teal-600">
                + New Order
              </button>
            }
          />
        ) : (
          <div className="space-y-2 pb-24">
            <p className="text-xs text-slate-400 font-medium">{filtered.length} orders</p>
            {filtered.map(order => {
              const { label, variant } = statusBadge(order.status)
              return (
                <Card key={order.id} onClick={() => navigate(`/sales/${order.id}`)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                      <span className="text-teal-600 font-bold text-xs">SO</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-slate-800">{order.order_no}</span>
                        <Badge variant={variant}>{label}</Badge>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {order.contacts?.name ?? 'Walk-in'} · {order.order_date}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-slate-800">{fmt(order.total)}</p>
                      <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <FAB onClick={() => navigate('/sales/new')} label="New Order" />
    </Layout>
  )
}

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, TrendingUp, Users, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react'
import { Layout } from '../components/Layout'
import { Card } from '../components/ui/Card'
import { Badge, statusBadge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

interface KPI {
  todayOrders: number
  totalRevenue: number
  activeLeads: number
  lowStockItems: number
}

interface RecentOrder {
  id: string
  order_no: string
  order_date: string
  status: string
  total: number
  contacts: { name: string } | null
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [kpi, setKpi] = useState<KPI>({ todayOrders: 0, totalRevenue: 0, activeLeads: 0, lowStockItems: 0 })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load(showRefreshing = false) {
    if (!user?.companyId) return
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)

    try {
      const today = new Date().toISOString().slice(0, 10)

      const [ordersRes, revenueRes, leadsRes, recentRes] = await Promise.all([
        supabase.from('sales_orders').select('id', { count: 'exact', head: true })
          .eq('company_id', user.companyId).eq('order_date', today),
        supabase.from('sales_orders').select('total')
          .eq('company_id', user.companyId).eq('status', 'confirmed'),
        supabase.from('crm_leads').select('id', { count: 'exact', head: true })
          .eq('company_id', user.companyId).not('stage', 'in', '(won,lost)'),
        supabase.from('sales_orders')
          .select('id, order_no, order_date, status, total, contacts!customer_id(name)')
          .eq('company_id', user.companyId)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const revenue = (revenueRes.data ?? []).reduce((s: number, r: {total: number}) => s + Number(r.total), 0)

      setKpi({
        todayOrders:  ordersRes.count ?? 0,
        totalRevenue: revenue,
        activeLeads:  leadsRes.count ?? 0,
        lowStockItems: 0,
      })
      setRecentOrders((recentRes.data ?? []) as unknown as RecentOrder[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [user?.companyId])

  const kpiCards = [
    { label: "Today's Orders", value: String(kpi.todayOrders), icon: ShoppingCart, color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    { label: 'Total Revenue',  value: fmt(kpi.totalRevenue),   icon: TrendingUp,   color: 'bg-teal-500', bg: 'bg-teal-50',  text: 'text-teal-600',  border: 'border-teal-100' },
    { label: 'Active Leads',   value: String(kpi.activeLeads),  icon: Users,        color: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
    { label: 'Low Stock',      value: String(kpi.lowStockItems),icon: AlertTriangle, color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
  ]

  const today = new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Layout title="Dashboard">
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-5 pb-4">
          {/* Greeting */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {greeting()}, {user?.fullName.split(' ')[0]}!
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">{today}</p>
            </div>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm active:scale-95 transition-transform"
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-3">
            {kpiCards.map(({ label, value, icon: Icon, bg, text, border }) => (
              <Card key={label} className={`${bg} border ${border}`} padding="md">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 ${text}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Recent Orders */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Recent Orders</h3>
              <button
                onClick={() => navigate('/sales')}
                className="flex items-center gap-1 text-xs text-teal-600 font-medium"
              >
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <Card>
                <div className="text-center py-6">
                  <ShoppingCart className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No orders yet</p>
                  <button
                    onClick={() => navigate('/sales/new')}
                    className="mt-3 text-sm font-medium text-teal-600"
                  >
                    Create first order →
                  </button>
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {recentOrders.map(order => {
                  const { label, variant } = statusBadge(order.status)
                  return (
                    <Card
                      key={order.id}
                      padding="md"
                      onClick={() => navigate(`/sales/${order.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-slate-800">{order.order_no}</span>
                            <Badge variant={variant}>{label}</Badge>
                          </div>
                          <p className="text-xs text-slate-400 truncate">
                            {order.contacts?.name ?? 'Walk-in'} · {order.order_date}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-slate-800">{fmt(order.total)}</p>
                          <ChevronRight className="h-4 w-4 text-slate-300 ml-auto mt-0.5" />
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/sales/new')}
                className="flex items-center gap-3 bg-teal-600 text-white rounded-2xl p-4 active:scale-95 transition-transform shadow-sm"
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="font-semibold text-sm">New Order</span>
              </button>
              <button
                onClick={() => navigate('/crm/leads/new')}
                className="flex items-center gap-3 bg-orange-500 text-white rounded-2xl p-4 active:scale-95 transition-transform shadow-sm"
              >
                <Users className="h-5 w-5" />
                <span className="font-semibold text-sm">New Lead</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

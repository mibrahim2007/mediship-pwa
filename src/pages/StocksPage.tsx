import React, { useEffect, useState } from 'react'
import { Search, Package, ArrowUp, ArrowDown, Plus, X } from 'lucide-react'
import { Layout } from '../components/Layout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { FAB } from '../components/ui/FAB'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

type StocksTab = 'products' | 'movements'

interface Product { id: string; name: string; internal_ref: string | null; category: string | null; uom: string; reorder_point: number; cost_price: number; sales_price: number }
interface StockMove { id: string; reference: string | null; move_date: string; quantity: number; source_type: string | null; state: string; to_location: string | null; from_location: string | null; products: { name: string } | null }

function stockColor(qty: number, reorder: number) {
  if (qty <= 0)      return { bg: 'bg-red-50', text: 'text-red-600', label: 'Out' }
  if (qty <= reorder) return { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Low' }
  return { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'OK' }
}

export function StocksPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [tab, setTab] = useState<StocksTab>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({})
  const [moves, setMoves] = useState<StockMove[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdjust, setShowAdjust] = useState(false)

  // Adjust form
  const [adjProduct, setAdjProduct] = useState('')
  const [adjDirection, setAdjDirection] = useState<'in' | 'out'>('in')
  const [adjQty, setAdjQty] = useState('1')
  const [adjCost, setAdjCost] = useState('0')
  const [adjRef, setAdjRef] = useState('')
  const [adjDate, setAdjDate] = useState(new Date().toISOString().slice(0, 10))
  const [adjusting, setAdjusting] = useState(false)

  async function load() {
    if (!user?.companyId) return
    setLoading(true)
    const [prodRes, movesRes] = await Promise.all([
      supabase.from('products').select('id, name, internal_ref, category, uom, reorder_point, cost_price, sales_price').eq('company_id', user.companyId).eq('is_active', true).order('name'),
      supabase.from('stock_moves').select('id, reference, move_date, quantity, source_type, state, to_location, from_location, products(name)').eq('company_id', user.companyId).order('created_at', { ascending: false }).limit(100),
    ])
    const prods = prodRes.data ?? []
    setProducts(prods)
    setMoves((movesRes.data ?? []) as unknown as StockMove[])

    // Compute stock levels from moves (state = done)
    const doneMoves = (movesRes.data ?? []).filter((m: { state: string }) => m.state === 'done')
    const levels: Record<string, number> = {}
    for (const p of prods) levels[p.id] = 0
    for (const m of doneMoves) {
      // find which product — need product_id from the move
      // Actually we need product_id column; let's fetch it separately
    }
    // Fetch stock_moves with product_id for level calculation
    const { data: allMoves } = await supabase
      .from('stock_moves')
      .select('product_id, quantity, to_location, from_location, state')
      .eq('company_id', user.companyId)
      .eq('state', 'done')

    for (const m of allMoves ?? []) {
      const pid = m.product_id
      if (!pid) continue
      if (!levels[pid]) levels[pid] = 0
      if (m.to_location)   levels[pid] += Number(m.quantity)
      if (m.from_location) levels[pid] -= Number(m.quantity)
    }
    setStockLevels(levels)
    setLoading(false)
  }

  useEffect(() => { load() }, [user?.companyId])

  async function doAdjust() {
    if (!adjProduct || !user?.companyId) { toast('Select a product', 'error'); return }
    setAdjusting(true)
    try {
      // Get or create default location
      const { data: wh } = await supabase.from('warehouses').select('id').eq('company_id', user.companyId).eq('is_active', true).limit(1)
      if (!wh?.length) { toast('No warehouse found. Create one first.', 'error'); setAdjusting(false); return }
      const { data: locs } = await supabase.from('stock_locations').select('id').eq('warehouse_id', wh[0].id).limit(1)
      const locationId = locs?.[0]?.id
      if (!locationId) { toast('No stock location found', 'error'); setAdjusting(false); return }

      const qty  = parseFloat(adjQty) || 0
      const cost = parseFloat(adjCost) || 0
      const { error } = await supabase.from('stock_moves').insert({
        company_id:    user.companyId,
        product_id:    adjProduct,
        quantity:      qty,
        unit_cost:     cost,
        total_cost:    qty * cost,
        reference:     adjRef || null,
        move_date:     adjDate,
        source_type:   'adjustment',
        to_location:   adjDirection === 'in'  ? locationId : null,
        from_location: adjDirection === 'out' ? locationId : null,
        state:         'done',
        created_by:    user.userId,
      })
      if (error) throw error
      toast('Stock adjusted!', 'success')
      setShowAdjust(false)
      setAdjProduct(''); setAdjQty('1'); setAdjCost('0'); setAdjRef('')
      load()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setAdjusting(false)
    }
  }

  const filteredProducts = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.internal_ref ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="Stocks & Inventory">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-2xl p-1">
          {(['products', 'movements'] as StocksTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={['flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all', tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'].join(' ')}>
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : tab === 'products' ? (
          filteredProducts.length === 0 ? (
            <EmptyState icon={<Package className="h-8 w-8" />} title="No products found" description="Add products from the main web app" />
          ) : (
            <div className="space-y-2 pb-24">
              {filteredProducts.map(p => {
                const qty = stockLevels[p.id] ?? 0
                const { bg, text, label } = stockColor(qty, p.reorder_point)
                return (
                  <Card key={p.id}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                        <Package className={`h-5 w-5 ${text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-slate-800 truncate">{p.name}</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {p.internal_ref && <span className="mr-2 font-mono">{p.internal_ref}</span>}
                          {p.category && <span>{p.category}</span>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-lg font-black ${text}`}>{qty.toFixed(0)}</div>
                        <div className="text-xs text-slate-400">{p.uom}</div>
                        <Badge variant={label === 'OK' ? 'success' : label === 'Low' ? 'warning' : 'danger'} className="mt-0.5">{label}</Badge>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )
        ) : (
          moves.length === 0 ? (
            <EmptyState icon={<ArrowUp className="h-8 w-8" />} title="No movements yet" />
          ) : (
            <div className="space-y-2 pb-24">
              {moves.map(m => (
                <Card key={m.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.to_location ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {m.to_location
                        ? <ArrowDown className="h-4 w-4 text-emerald-600" />
                        : <ArrowUp   className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">{m.products?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-400">{m.reference ?? m.source_type} · {m.move_date}</p>
                    </div>
                    <div className={`font-bold text-sm ${m.to_location ? 'text-emerald-600' : 'text-red-500'}`}>
                      {m.to_location ? '+' : '-'}{m.quantity}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </div>

      <FAB onClick={() => setShowAdjust(true)} label="Adjust" />

      {/* Adjust Stock Bottom Sheet */}
      {showAdjust && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdjust(false)} />
          <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-8 z-10 space-y-4"
               style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-800 text-base">Stock Adjustment</h3>
              <button onClick={() => setShowAdjust(false)} className="p-1.5 rounded-xl bg-slate-100 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Select label="Product" value={adjProduct} onChange={e => setAdjProduct(e.target.value)} required>
              <option value="">Select product…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Direction" value={adjDirection} onChange={e => setAdjDirection(e.target.value as 'in' | 'out')}>
                <option value="in">Stock In ↓</option>
                <option value="out">Stock Out ↑</option>
              </Select>
              <Input label="Quantity" type="number" min="0.01" step="0.01" value={adjQty} onChange={e => setAdjQty(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Unit Cost (PKR)" type="number" min="0" value={adjCost} onChange={e => setAdjCost(e.target.value)} />
              <Input label="Reference" value={adjRef} onChange={e => setAdjRef(e.target.value)} placeholder="e.g. ADJ-001" />
            </div>
            <Input label="Date" type="date" value={adjDate} onChange={e => setAdjDate(e.target.value)} />
            <Button fullWidth size="lg" onClick={doAdjust} loading={adjusting}>Save Adjustment</Button>
          </div>
        </div>
      )}
    </Layout>
  )
}

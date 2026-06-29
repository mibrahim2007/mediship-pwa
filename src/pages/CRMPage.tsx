import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Phone, Mail, ChevronRight, Search } from 'lucide-react'
import { Layout } from '../components/Layout'
import { Card } from '../components/ui/Card'
import { Badge, statusBadge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { FAB } from '../components/ui/FAB'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

type CRMTab = 'leads' | 'contacts'
type LeadStage = 'all' | 'new' | 'qualified' | 'proposition' | 'won' | 'lost'

interface Lead { id: string; name: string; company_name: string | null; stage: string; priority: string | null; expected_revenue: number | null; probability: number | null; phone: string | null }
interface Contact { id: string; name: string; type: string; company_name: string | null; phone: string | null; email: string | null; city: string | null; is_active: boolean }

const STAGES: { key: LeadStage; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'new',         label: 'New' },
  { key: 'qualified',   label: 'Qualified' },
  { key: 'proposition', label: 'Prop.' },
  { key: 'won',         label: 'Won' },
  { key: 'lost',        label: 'Lost' },
]

const priorityColor = { low: 'text-slate-400', medium: 'text-amber-500', high: 'text-red-500' }

function fmt(n: number) { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }) }

export function CRMPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<CRMTab>('leads')
  const [leads, setLeads] = useState<Lead[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState<LeadStage>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user?.companyId) return
    setLoading(true)
    Promise.all([
      supabase.from('crm_leads').select('id, name, company_name, stage, priority, expected_revenue, probability, phone').eq('company_id', user.companyId).order('created_at', { ascending: false }).limit(100),
      supabase.from('contacts').select('id, name, type, company_name, phone, email, city, is_active').eq('company_id', user.companyId).order('name').limit(200),
    ]).then(([l, c]) => {
      setLeads(l.data ?? [])
      setContacts(c.data ?? [])
      setLoading(false)
    })
  }, [user?.companyId])

  const filteredLeads = leads.filter(l =>
    (stageFilter === 'all' || l.stage === stageFilter) &&
    (!search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.company_name ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const filteredContacts = contacts.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="CRM">
      <div className="space-y-4">
        {/* Tab toggle */}
        <div className="flex bg-slate-100 rounded-2xl p-1">
          {(['leads', 'contacts'] as CRMTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={['flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-200', tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'].join(' ')}>
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tab}…`}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]" />
        </div>

        {/* Stage filter (leads only) */}
        {tab === 'leads' && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            {STAGES.map(s => (
              <button key={s.key} onClick={() => setStageFilter(s.key)}
                className={['shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors', stageFilter === s.key ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-200'].join(' ')}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : tab === 'leads' ? (
          filteredLeads.length === 0 ? (
            <EmptyState icon={<TrendingUp className="h-8 w-8" />} title="No leads found"
              action={<button onClick={() => navigate('/crm/leads/new')} className="text-sm font-medium text-teal-600">+ New Lead</button>} />
          ) : (
            <div className="space-y-2 pb-24">
              {filteredLeads.map(lead => {
                const { label, variant } = statusBadge(lead.stage)
                const pColor = priorityColor[(lead.priority ?? 'medium') as keyof typeof priorityColor] ?? 'text-slate-400'
                return (
                  <Card key={lead.id} onClick={() => navigate(`/crm/leads/new?id=${lead.id}`)}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-5 w-5 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-slate-800 truncate">{lead.name}</span>
                          <Badge variant={variant}>{label}</Badge>
                        </div>
                        {lead.company_name && <p className="text-xs text-slate-400 truncate">{lead.company_name}</p>}
                        <div className="flex items-center gap-3 mt-1.5">
                          {lead.expected_revenue != null && (
                            <span className="text-xs font-medium text-teal-600">{fmt(lead.expected_revenue)}</span>
                          )}
                          {lead.probability != null && (
                            <span className="text-xs text-slate-400">{lead.probability}%</span>
                          )}
                          <span className={`text-xs font-medium capitalize ${pColor}`}>{lead.priority ?? 'medium'}</span>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-teal-50 text-teal-600 active:scale-95">
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )
        ) : (
          filteredContacts.length === 0 ? (
            <EmptyState icon={<Mail className="h-8 w-8" />} title="No contacts found" />
          ) : (
            <div className="space-y-2 pb-24">
              {filteredContacts.map(c => {
                const { label, variant } = statusBadge(c.type)
                return (
                  <Card key={c.id}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-sm">{c.name[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-slate-800 truncate">{c.name}</span>
                          <Badge variant={variant}>{label}</Badge>
                        </div>
                        {c.company_name && <p className="text-xs text-slate-400 truncate">{c.company_name}</p>}
                        {c.city && <p className="text-xs text-slate-400">{c.city}</p>}
                      </div>
                      <div className="shrink-0 flex flex-col gap-1.5 items-end">
                        {c.phone && (
                          <a href={`tel:${c.phone}`}
                            className="p-1.5 rounded-lg bg-teal-50 text-teal-600 active:scale-95">
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {c.email && (
                          <a href={`mailto:${c.email}`}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 active:scale-95">
                            <Mail className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )
        )}
      </div>

      <FAB onClick={() => navigate(tab === 'leads' ? '/crm/leads/new' : '/crm/contacts')} label={tab === 'leads' ? 'New Lead' : 'New Contact'} />
    </Layout>
  )
}

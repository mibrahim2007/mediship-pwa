import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

export function LeadNewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name:              '',
    stage:             'new',
    priority:          'medium',
    company_name:      '',
    contact_name:      '',
    phone:             '',
    email:             '',
    source:            '',
    expected_revenue:  '',
    probability:       '20',
    expected_closing:  '',
  })

  function set(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast('Lead name is required', 'error'); return }
    if (!user?.companyId) return
    setSaving(true)
    try {
      const { error } = await supabase.from('crm_leads').insert({
        company_id:       user.companyId,
        name:             form.name,
        stage:            form.stage,
        priority:         form.priority,
        company_name:     form.company_name || null,
        contact_name:     form.contact_name || null,
        phone:            form.phone || null,
        email:            form.email || null,
        source:           form.source || null,
        expected_revenue: form.expected_revenue ? parseFloat(form.expected_revenue) : null,
        probability:      form.probability ? parseInt(form.probability) : 20,
        expected_closing: form.expected_closing || null,
        created_by:       user.userId,
      })
      if (error) throw error
      toast('Lead created!', 'success')
      navigate('/crm')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to create lead', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="New Lead" showBack backTo="/crm">
      <form onSubmit={save} className="space-y-4 pb-6">
        <Card>
          <h3 className="font-semibold text-slate-700 mb-3">Lead Details</h3>
          <div className="space-y-3">
            <Input label="Lead Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. PharmaCity Expansion" required />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Stage" value={form.stage} onChange={e => set('stage', e.target.value)}>
                <option value="new">New</option>
                <option value="qualified">Qualified</option>
                <option value="proposition">Proposition</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </Select>
              <Select label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-700 mb-3">Contact Info</h3>
          <div className="space-y-3">
            <Input label="Company Name" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Company or hospital name" />
            <Input label="Contact Name" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Decision maker's name" />
            <Input label="Phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+92 300 0000000" />
            <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@company.pk" />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-700 mb-3">Opportunity</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Expected Revenue (PKR)" type="number" value={form.expected_revenue} onChange={e => set('expected_revenue', e.target.value)} placeholder="0" />
              <Input label="Probability %" type="number" min="0" max="100" value={form.probability} onChange={e => set('probability', e.target.value)} />
            </div>
            <Input label="Expected Closing" type="date" value={form.expected_closing} onChange={e => set('expected_closing', e.target.value)} />
            <Select label="Source" value={form.source} onChange={e => set('source', e.target.value)}>
              <option value="">Select source…</option>
              <option value="cold_call">Cold Call</option>
              <option value="referral">Referral</option>
              <option value="website">Website</option>
              <option value="exhibition">Exhibition</option>
              <option value="social_media">Social Media</option>
              <option value="existing_customer">Existing Customer</option>
              <option value="other">Other</option>
            </Select>
          </div>
        </Card>

        <Button type="submit" fullWidth size="lg" loading={saving}>
          Save Lead
        </Button>
      </form>
    </Layout>
  )
}

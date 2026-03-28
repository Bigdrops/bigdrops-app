import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import ClientSelector from '../components/ClientSelector'

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px', border: '1px solid #E2E8F0',
  borderRadius: 10, fontSize: 14, color: '#1E293B',
  background: 'white', outline: 'none',
}
const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 700,
  color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
}

export default function NewProject() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    client_id: null,
    client_name: '',
    status: 'active',
    project_value: '',
    po_number: '',
    notes: '',
    location: '',
    start_date: new Date().toISOString().split('T')[0],
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Project name required', description: 'Project name is required', variant: 'destructive' })
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from('projects').insert({
      name:          form.name.trim(),
      client_id:     form.client_id || null,
      client_name:   form.client_name || null,
      status:        form.status,
      start_date:    form.start_date,
      project_value: form.project_value ? parseFloat(form.project_value) : null,
      po_number:     form.po_number.trim() || null,
      notes:         form.notes.trim() || null,
      location:      form.location.trim() || null,
    }).select().single()
    setSaving(false)
    if (error) {
      toast({ title: 'Create failed', description: error.message, variant: 'destructive' })
      return
    }
    navigate(`/projects/${data.id}`)
  }

  return (
    <Layout title="New Project">
      <div style={{ maxWidth: 600 }}>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>New Project</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>Create a project tree for a job or contract</p>
        </div>

        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Project name */}
          <div>
            <label style={labelStyle}>Project Name *</label>
            <input
              style={inputStyle}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Transformer Maintenance – Dangote Cement"
              autoFocus
            />
          </div>

          {/* Client */}
          <div>
            <label style={labelStyle}>Client</label>
            <ClientSelector
              value={form.client_id}
              clientName={form.client_name}
              onClientChange={(id, name) => { set('client_id', id); set('client_name', name) }}
            />
          </div>

          {/* Start date */}
          <div>
            <label style={labelStyle}>Start Date</label>
            <input
              type="date"
              style={inputStyle}
              value={form.start_date}
              onChange={e => set('start_date', e.target.value)}
            />
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Auto-set to today. Edit if the job started earlier.</div>
          </div>

          {/* Project value */}
          <div>
            <label style={labelStyle}>Project Value (₦)</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              <span style={{ padding: '0 14px', fontSize: 16, color: '#94A3B8', borderRight: '1px solid #E2E8F0', lineHeight: '42px', backgroundColor: '#F8FAFC' }}>₦</span>
              <input
                type="number"
                min="0"
                value={form.project_value}
                onChange={e => set('project_value', e.target.value)}
                placeholder="Optional"
                style={{ ...inputStyle, border: 'none', borderRadius: 0 }}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label style={labelStyle}>Site / Location</label>
            <input
              style={inputStyle}
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="e.g. Block B, Dangote Cement Plant, Ibese"
            />
          </div>

          {/* P.O. Number */}
          <div>
            <label style={labelStyle}>P.O. Number</label>
            <input
              style={inputStyle}
              value={form.po_number}
              onChange={e => set('po_number', e.target.value)}
              placeholder="Optional — can be added later"
            />
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <Select value={form.status} onValueChange={(value) => set('status', value)}>
              <SelectTrigger style={{ ...inputStyle, cursor: 'pointer' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Optional internal notes about this project"
            />
          </div>

        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            onClick={() => navigate('/projects')}
            style={{
              flex: 1, padding: '12px', border: '1px solid #E2E8F0',
              borderRadius: 10, background: 'white', fontSize: 14,
              color: '#64748B', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, padding: '12px', border: 'none',
              borderRadius: 10, background: saving ? '#94A3B8' : '#0F172A',
              fontSize: 14, color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 700,
            }}
          >
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </div>

      </div>
    </Layout>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import ClientSelector from '../components/ClientSelector'

const fieldClassName = 'h-10 rounded-[10px] border-slate-200 bg-white px-3.5 text-sm text-slate-800'
const labelClassName = 'text-[12px] font-bold uppercase tracking-[0.04em] text-slate-600'

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
      <div className="max-w-[600px]">
        <Card className="rounded-[14px] border-slate-200 bg-white shadow-none">
          <CardHeader className="gap-1">
            <CardTitle className="text-xl font-extrabold text-slate-900">New Project</CardTitle>
            <CardDescription className="text-[13px] text-slate-400">
              Create a project tree for a job or contract
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className={labelClassName}>Project Name *</Label>
              <Input
                className={fieldClassName}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Transformer Maintenance – Dangote Cement"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className={labelClassName}>Client</Label>
              <ClientSelector
                value={form.client_id}
                clientName={form.client_name}
                onClientChange={(id, name) => { set('client_id', id); set('client_name', name) }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={labelClassName}>Start Date</Label>
              <Input
                type="date"
                className={fieldClassName}
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
              <p className="text-[11px] text-slate-400">Auto-set to today. Edit if the job started earlier.</p>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClassName}>Project Value (₦)</Label>
              <div className="flex items-center overflow-hidden rounded-[10px] border border-slate-200 bg-white">
                <span className="bg-slate-50 px-3.5 text-base leading-10 text-slate-400 border-r border-slate-200">₦</span>
                <Input
                  type="number"
                  min="0"
                  value={form.project_value}
                  onChange={e => set('project_value', e.target.value)}
                  placeholder="Optional"
                  className="h-10 rounded-none border-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClassName}>Site / Location</Label>
              <Input
                className={fieldClassName}
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. Block B, Dangote Cement Plant, Ibese"
              />
            </div>

            <div className="space-y-1.5">
              <Label className={labelClassName}>P.O. Number</Label>
              <Input
                className={fieldClassName}
                value={form.po_number}
                onChange={e => set('po_number', e.target.value)}
                placeholder="Optional — can be added later"
              />
            </div>

            <div className="space-y-1.5">
              <Label className={labelClassName}>Status</Label>
              <Select value={form.status} onValueChange={(value) => set('status', value)}>
                <SelectTrigger className="h-10 rounded-[10px] border-slate-200 bg-white text-sm text-slate-800">
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

            <div className="space-y-1.5">
              <Label className={labelClassName}>Notes</Label>
              <Textarea
                className="min-h-20 rounded-[10px] border-slate-200 bg-white text-sm text-slate-800"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Optional internal notes about this project"
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-[10px] border-slate-200 bg-white text-sm font-semibold text-slate-500 hover:bg-slate-50"
            onClick={() => navigate('/projects')}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 flex-[2] rounded-[10px] bg-slate-900 text-sm font-bold text-white hover:bg-slate-800"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </div>
    </Layout>
  )
}

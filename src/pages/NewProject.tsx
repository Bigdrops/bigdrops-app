import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { feedback } from '@/lib/feedback'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { pageFormCardClassName, pageFormFieldClassName, pageFormLabelClassName, pageFormPrimaryActionClassName } from '@/components/ui/form-page-styles'
import { createProjectWithGeneratedCode } from '@/domain/projects'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import ClientSelector from '../components/ClientSelector'

interface ProjectFormState {
  name: string
  client_id: string | null
  client_name: string
  status: string
  project_value: number | null
  po_number: string
  notes: string
  location: string
  start_date: string
}

export default function NewProject() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state as { clientId?: string; clientName?: string }) || {}

  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ProjectFormState>({
    name: '',
    client_id: prefill.clientId || null,
    client_name: prefill.clientName || '',
    status: 'active',
    project_value: null,
    po_number: '',
    notes: '',
    location: '',
    start_date: new Date().toISOString().split('T')[0],
  })

  const set = <K extends keyof ProjectFormState>(key: K, val: ProjectFormState[K]) => 
    setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      feedback.error('Project name required', { description: 'Project name is required' })
      return
    }
    setSaving(true)
    const { data, error } = await createProjectWithGeneratedCode(supabase as any, {
      name: form.name.trim(),
      client_id: form.client_id || null,
      client_name: form.client_name || null,
      status: form.status,
      start_date: form.start_date,
      project_value: form.project_value,
      po_number: form.po_number.trim() || null,
      notes: form.notes.trim() || null,
      location: form.location.trim() || null,
    })

    setSaving(false)
    if (error) {
      feedback.error('Create failed', {
        description: getUserFacingMutationMessage(error, { action: 'create' }),
      })
      return
    }

    if (!data) return

    // Audit Trail
    try {
      const { recordAuditLog, PROJECT_TRACKED_FIELDS } = await import('@/lib/audit')
      await recordAuditLog({
        entityType: 'project',
        recordId: data.id,
        entityLabel: data.name,
        action: 'CREATE',
        oldData: null,
        newData: data,
        trackedFields: PROJECT_TRACKED_FIELDS,
      })
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }

    navigate(`/projects/${data.id}`)
  }

  return (
    <Layout title="New Project">
      <div className="max-w-[600px]">
        <Card className={pageFormCardClassName}>
          <CardHeader className="gap-1">
            <CardTitle className="text-xl font-extrabold text-slate-900">New Project</CardTitle>
            <CardDescription className="text-[13px] text-slate-400">
              Create a project tree for a job or contract
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className={pageFormLabelClassName}>Project Name *</Label>
              <Input
                className={pageFormFieldClassName}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Transformer Maintenance – Dangote Cement"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className={pageFormLabelClassName}>Client</Label>
              <ClientSelector
                clientId={form.client_id}
                clientName={form.client_name}
                onClientChange={(id, name) => { set('client_id', id); set('client_name', name || '') }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={pageFormLabelClassName}>Start Date</Label>
              <Input
                type="date"
                className={pageFormFieldClassName}
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
              <p className="text-[11px] text-slate-400">Auto-set to today. Edit if the job started earlier.</p>
            </div>

            <div className="space-y-1.5">
              <Label className={pageFormLabelClassName}>Project Value (₦)</Label>
              <div className="flex h-10 items-center overflow-hidden rounded-lg border border-zinc-300 bg-white">
                <span className="flex h-full items-center border-r border-zinc-300 bg-slate-50 px-3 text-sm text-slate-500">₦</span>
                <NumericInput
                  min={0}
                  value={form.project_value}
                  onChange={val => set('project_value', val)}
                  placeholder="Optional"
                  className="h-full rounded-none border-0 px-3 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={pageFormLabelClassName}>Site / Location</Label>
              <Input
                className={pageFormFieldClassName}
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. Block B, Dangote Cement Plant, Ibese"
              />
            </div>

            <div className="space-y-1.5">
              <Label className={pageFormLabelClassName}>P.O. Number</Label>
              <Input
                className={pageFormFieldClassName}
                value={form.po_number}
                onChange={e => set('po_number', e.target.value)}
                placeholder="Optional — can be added later"
              />
            </div>

            <div className="space-y-1.5">
              <Label className={pageFormLabelClassName}>Status</Label>
              <Select value={form.status} onValueChange={(value) => set('status', value)}>
                <SelectTrigger className="h-10 rounded-lg border-zinc-300 bg-white px-3 text-sm text-slate-800">
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
              <Label className={pageFormLabelClassName}>Notes</Label>
              <Textarea
                className="min-h-20 rounded-lg border-zinc-300 bg-white px-3 py-2 text-sm text-slate-800"
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
            className="h-10 flex-1 rounded-lg border-zinc-300 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
            onClick={() => navigate('/projects')}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={`${pageFormPrimaryActionClassName} flex-[2] hover:opacity-90`}
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </div>
    </Layout>
  )
}

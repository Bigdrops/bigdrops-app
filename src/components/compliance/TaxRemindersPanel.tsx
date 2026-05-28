import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Bell, PlusCircle, Edit, Trash2, Loader2, CheckCircle2, Calendar, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { supabase } from '@/supabase'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { TaxReminder, TaxReminderStatus, TaxFilingTaxType, TaxFiling } from '@/domain/compliance/types'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'

interface TaxRemindersPanelProps {
  reminders: TaxReminder[]
  filings: TaxFiling[]
  onRemindersChanged: () => void
}

const STATUS_TONES: Record<TaxReminderStatus, string> = {
  upcoming:  'bg-bd-status-info-bg text-bd-status-info-text border-bd-status-info-border',
  due:       'bg-bd-status-warning-bg text-bd-status-warning-text border-bd-status-warning-border',
  overdue:   'bg-bd-status-danger-bg text-bd-status-danger-text border-bd-status-danger-border',
  resolved:  'bg-bd-status-success-bg text-bd-status-success-text border-bd-status-success-border',
  cancelled: 'bg-bd-surface-muted text-bd-text-muted border-bd-border',
}

const TAX_TYPE_LABELS: Record<TaxFilingTaxType, string> = {
  vat: 'VAT Delivery',
  wht: 'WHT Remittance',
  cit: 'CIT Filing',
}

export default function TaxRemindersPanel({ reminders, filings, onRemindersChanged }: TaxRemindersPanelProps) {
  const [editingReminder, setEditingReminder] = useState<Partial<TaxReminder> | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const openNew = () => {
    const today = new Date().toISOString().split('T')[0]
    setEditingReminder({
      tax_type: 'vat',
      due_date: today,
      status: 'upcoming',
      notes: '',
    })
  }

  const handleSave = async () => {
    if (!editingReminder?.tax_type || !editingReminder.due_date) {
      feedback.error('Tax type and due date are required')
      return
    }

    try {
      setSaving(true)
      const isNew = !editingReminder.id
      const record = {
        settings_id: 1,
        tax_type: editingReminder.tax_type,
        period_start: editingReminder.period_start || null,
        period_end: editingReminder.period_end || null,
        due_date: editingReminder.due_date,
        status: editingReminder.status ?? 'upcoming',
        linked_filing_id: editingReminder.linked_filing_id || null,
        notes: editingReminder.notes || null,
        updated_at: new Date().toISOString(),
      }

      if (isNew) {
        const { error } = await supabase
          .from('tax_reminders')
          .insert([{ ...record, created_at: new Date().toISOString() }])
        if (error) throw error
        feedback.success('Reminder added')
      } else {
        const { error } = await supabase
          .from('tax_reminders')
          .update(record)
          .eq('id', editingReminder.id!)
        if (error) throw error
        feedback.success('Reminder updated')
      }

      setEditingReminder(null)
      onRemindersChanged()
    } catch (e: any) {
      feedback.error(getUserFacingMutationMessage(e, { action: 'save' }))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this reminder?')) return
    try {
      setIsDeleting(id)
      const { error } = await supabase.from('tax_reminders').delete().eq('id', id)
      if (error) throw error
      feedback.success('Reminder removed')
      onRemindersChanged()
    } catch (e: any) {
      feedback.error(e.message || 'Failed to delete reminder')
    } finally {
      setIsDeleting(null)
    }
  }

  const resolveReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tax_reminders')
        .update({ status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      feedback.success('Obligation resolved')
      onRemindersChanged()
    } catch (e: any) {
      feedback.error('Could not update status')
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-row items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2 text-bd-text">
          <Bell className="h-4 w-4 text-bd-status-info-text" />
          Tax Obligations & Deadlines
        </h3>
        <Button
          size="sm"
          onClick={openNew}
          className="h-8 rounded-full px-4 text-xs font-bold bg-bd-overlay-bg text-bd-overlay-text border border-bd-overlay-border shadow-sm hover:opacity-90"
        >
          <PlusCircle className="h-3 w-3 mr-2" />
          New Deadline
        </Button>
      </div>

      <div className="rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg overflow-hidden">
        {reminders.length === 0 ? (
          <div className="text-center py-20 px-4 bg-bd-surface-muted">
            <Calendar className="h-10 w-10 text-bd-text-muted opacity-20 mx-auto mb-3" />
            <div className="text-sm font-bold text-bd-text">No Tracked Obligations</div>
            <div className="text-xs text-bd-text-muted mt-1 max-w-[280px] mx-auto">
              Keep track of upcoming VAT deliveries, WHT remittances and tax filing dates.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-bd-border">
            {reminders.map(reminder => (
              <div
                key={reminder.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${reminder.status === 'resolved' ? 'opacity-60 grayscale-[0.5]' : 'hover:bg-bd-surface-muted'}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-bd-text-muted opacity-60">
                      {TAX_TYPE_LABELS[reminder.tax_type]}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold uppercase rounded-full px-2 border ${STATUS_TONES[reminder.status]}`}
                    >
                      {reminder.status}
                    </Badge>
                  </div>
                  <div className="text-sm font-bold text-bd-text flex items-center gap-2">
                     Due: {formatDisplayDate(reminder.due_date)}
                     {reminder.status === 'overdue' && <AlertCircle className="h-3 w-3 text-bd-status-danger-text" />}
                  </div>
                  <div className="text-xs text-bd-text-muted mt-0.5">
                    {reminder.period_start && reminder.period_end ? (
                      <span>Period: {formatDisplayDate(reminder.period_start)} — {formatDisplayDate(reminder.period_end)}</span>
                    ) : (
                      <span>One-off Obligation</span>
                    )}
                    {reminder.notes && <span className="block italic mt-0.5 line-clamp-1">{reminder.notes}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="flex items-center gap-1">
                    {reminder.status !== 'resolved' && (
                      <Button
                        variant="ghost" 
                        size="sm"
                        className="h-8 text-[10px] uppercase font-black tracking-widest text-bd-status-success-text hover:bg-bd-status-success-bg px-3"
                        onClick={() => resolveReminder(reminder.id)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1.5" />
                        Resolve
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-bd-text-muted hover:text-bd-text hover:bg-bd-surface-muted"
                      onClick={() => setEditingReminder(reminder)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-bd-status-danger-text opacity-30 hover:opacity-100 hover:bg-bd-status-danger-bg"
                      onClick={() => handleDelete(reminder.id)}
                      loading={isDeleting === reminder.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!editingReminder} onOpenChange={open => !open && setEditingReminder(null)}>
        <SheetContent className="flex h-full w-full max-w-full flex-col overflow-hidden bg-bd-card-bg p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-bd-border">
            <SheetTitle>{editingReminder?.id ? 'Edit Obligation' : 'New Obligation'}</SheetTitle>
            <SheetDescription>
              Maintain one tax deadline, linked filing, and status record from a single operational sheet.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-bd-text-muted">Obligation Type</Label>
              <Select
                value={editingReminder?.tax_type ?? 'vat'}
                onValueChange={v => setEditingReminder({ ...editingReminder, tax_type: v as TaxFilingTaxType })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vat">VAT Delivery</SelectItem>
                  <SelectItem value="wht">WHT Remittance</SelectItem>
                  <SelectItem value="cit">CIT Filing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-bd-text-muted">Due Date</Label>
              <Input
                type="date"
                value={editingReminder?.due_date ?? ''}
                onChange={e => setEditingReminder({ ...editingReminder, due_date: e.target.value })}
                className="h-10"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-bd-text-muted">Filing Start</Label>
                <Input
                  type="date"
                  value={editingReminder?.period_start ?? ''}
                  onChange={e => setEditingReminder({ ...editingReminder, period_start: e.target.value || null })}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-bd-text-muted">Filing End</Label>
                <Input
                  type="date"
                  value={editingReminder?.period_end ?? ''}
                  onChange={e => setEditingReminder({ ...editingReminder, period_end: e.target.value || null })}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-bd-text-muted">Status</Label>
              <Select
                value={editingReminder?.status ?? 'upcoming'}
                onValueChange={v => setEditingReminder({ ...editingReminder, status: v as TaxReminderStatus })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="due">Due Soon</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-bd-text-muted">Link to Filing Record</Label>
              <Combobox
                options={[
                  { value: 'none', label: 'No linked filing' },
                  ...filings.map(f => ({
                    value: f.id,
                    label: `${TAX_TYPE_LABELS[f.tax_type]} (${formatDisplayDate(f.period_start)})`,
                    description: `Due: ${formatNaira(f.amount_due)}`
                  }))
                ]}
                value={editingReminder?.linked_filing_id || 'none'}
                onChange={v => setEditingReminder({ ...editingReminder, linked_filing_id: v === 'none' ? null : v })}
                placeholder="Search filings..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-bd-text-muted">Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                value={editingReminder?.notes ?? ''}
                onChange={e => setEditingReminder({ ...editingReminder, notes: e.target.value })}
              />
            </div>
            </div>
          </div>
          <SheetFooter className="border-t border-bd-border bg-bd-card-bg pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setEditingReminder(null)} className="h-10 sm:min-w-28">
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="h-10 sm:min-w-36">
              {editingReminder?.id ? 'Update Reminder' : 'Save Reminder'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

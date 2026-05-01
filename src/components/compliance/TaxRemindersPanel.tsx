import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
import { toast } from 'sonner'
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
  upcoming:  'bg-blue-50 text-blue-700 border-blue-200',
  due:       'bg-amber-50 text-amber-700 border-amber-200',
  overdue:   'bg-red-50 text-red-700 border-red-200',
  resolved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
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
      toast.error('Tax type and due date are required')
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
        toast.success('Reminder added')
      } else {
        const { error } = await supabase
          .from('tax_reminders')
          .update(record)
          .eq('id', editingReminder.id!)
        if (error) throw error
        toast.success('Reminder updated')
      }

      setEditingReminder(null)
      onRemindersChanged()
    } catch (e: any) {
      toast.error(getUserFacingMutationMessage(e, { action: 'save' }))
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
      toast.success('Reminder removed')
      onRemindersChanged()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete reminder')
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
      toast.success('Obligation resolved')
      onRemindersChanged()
    } catch (e: any) {
      toast.error('Could not update status')
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <Card className="border-blue-100 bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-600" />
            Tax Obligations & Deadlines
          </CardTitle>
          <Button
            size="sm"
            onClick={openNew}
            className="h-8 rounded-full px-4 text-xs font-bold bg-slate-900 border border-slate-800 shadow hover:bg-slate-800"
          >
            <PlusCircle className="h-3 w-3 mr-2" />
            New Deadline
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {reminders.length === 0 ? (
            <div className="text-center py-20 px-4 bg-slate-50/50 rounded-b-xl border-t border-dashed border-slate-200">
              <Calendar className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <div className="text-sm font-bold text-slate-800">No Tracked Obligations</div>
              <div className="text-xs text-muted-foreground mt-1 max-w-[280px] mx-auto">
                Keep track of upcoming VAT deliveries, WHT remittances and tax filing dates.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reminders.map(reminder => (
                <div
                  key={reminder.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${reminder.status === 'resolved' ? 'opacity-60 grayscale-[0.5]' : 'hover:bg-slate-50'}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {TAX_TYPE_LABELS[reminder.tax_type]}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold uppercase rounded-full px-2 ${STATUS_TONES[reminder.status]}`}
                      >
                        {reminder.status}
                      </Badge>
                    </div>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                       Due: {formatDisplayDate(reminder.due_date)}
                       {reminder.status === 'overdue' && <AlertCircle className="h-3 w-3 text-red-500" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
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
                          className="h-8 text-[10px] uppercase font-black tracking-widest text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3"
                          onClick={() => resolveReminder(reminder.id)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1.5" />
                          Resolve
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-slate-900 transition-colors"
                        onClick={() => setEditingReminder(reminder)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-100 hover:text-red-500 hover:bg-red-50 transition-colors"
                        disabled={isDeleting === reminder.id}
                        onClick={() => handleDelete(reminder.id)}
                      >
                        {isDeleting === reminder.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!editingReminder} onOpenChange={open => !open && setEditingReminder(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingReminder?.id ? 'Edit Obligation' : 'New Obligation'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Obligation Type</Label>
              <Select
                value={editingReminder?.tax_type ?? 'vat'}
                onValueChange={v => setEditingReminder({ ...editingReminder, tax_type: v as TaxFilingTaxType })}
              >
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vat">VAT Delivery</SelectItem>
                  <SelectItem value="wht">WHT Remittance</SelectItem>
                  <SelectItem value="cit">CIT Filing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Due Date</Label>
              <Input
                type="date"
                value={editingReminder?.due_date ?? ''}
                onChange={e => setEditingReminder({ ...editingReminder, due_date: e.target.value })}
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Filing Start</Label>
                <Input
                  type="date"
                  value={editingReminder?.period_start ?? ''}
                  onChange={e => setEditingReminder({ ...editingReminder, period_start: e.target.value || null })}
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Filing End</Label>
                <Input
                  type="date"
                  value={editingReminder?.period_end ?? ''}
                  onChange={e => setEditingReminder({ ...editingReminder, period_end: e.target.value || null })}
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</Label>
              <Select
                value={editingReminder?.status ?? 'upcoming'}
                onValueChange={v => setEditingReminder({ ...editingReminder, status: v as TaxReminderStatus })}
              >
                <SelectTrigger className="rounded-xl border-slate-200">
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

            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Link to Filing Record</Label>
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

            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Notes & Context</Label>
              <Input
                placeholder="Optional notes..."
                value={editingReminder?.notes ?? ''}
                onChange={e => setEditingReminder({ ...editingReminder, notes: e.target.value })}
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-12 bg-slate-900 text-white font-bold rounded-2xl shadow-lg border-slate-800 transition-all hover:scale-[1.01] active:scale-100"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingReminder?.id ? 'Update Reminder' : 'Save Reminder'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}


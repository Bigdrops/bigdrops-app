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
import { ClipboardList, PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '@/supabase'
import { toast } from 'sonner'
import { TaxFiling, TaxFilingStatus, TaxFilingTaxType } from '@/domain/compliance/types'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'

interface TaxFilingsPanelProps {
  filings: TaxFiling[]
  onFilingsChanged: () => void
}

const STATUS_TONES: Record<TaxFilingStatus, string> = {
  draft:    'bg-slate-100 text-slate-600 border-slate-200',
  ready:    'bg-blue-50 text-blue-700 border-blue-200',
  filed:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  paid:     'bg-emerald-100 text-emerald-800 border-emerald-300',
  overdue:  'bg-red-50 text-red-700 border-red-200',
}

const TAX_TYPE_LABELS: Record<TaxFilingTaxType, string> = {
  vat: 'VAT',
  wht: 'WHT',
  cit: 'CIT',
}

export default function TaxFilingsPanel({ filings, onFilingsChanged }: TaxFilingsPanelProps) {
  const [editingFiling, setEditingFiling] = useState<Partial<TaxFiling> | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const openNew = () => {
    const today = new Date().toISOString().split('T')[0]
    setEditingFiling({
      tax_type: 'vat',
      period_start: today,
      period_end: today,
      amount_due: 0,
      amount_paid: 0,
      status: 'draft',
    })
  }

  const handleSave = async () => {
    if (!editingFiling?.tax_type || !editingFiling.period_start || !editingFiling.period_end) {
      toast.error('Tax type, period start and period end are required')
      return
    }
    try {
      setSaving(true)
      const isNew = !editingFiling.id
      const record = {
        settings_id: 1,
        tax_type: editingFiling.tax_type,
        period_start: editingFiling.period_start,
        period_end: editingFiling.period_end,
        amount_due: editingFiling.amount_due ?? 0,
        amount_paid: editingFiling.amount_paid ?? 0,
        status: editingFiling.status ?? 'draft',
        submitted_at: editingFiling.submitted_at || null,
        receipt_reference: editingFiling.receipt_reference || null,
        portal_reference: editingFiling.portal_reference || null,
        notes: editingFiling.notes || null,
        updated_at: new Date().toISOString(),
      }

      if (isNew) {
        const { error } = await supabase
          .from('tax_filings')
          .insert([{ ...record, created_at: new Date().toISOString() }])
        if (error) throw error
        toast.success('Filing record created')
      } else {
        const { error } = await supabase
          .from('tax_filings')
          .update(record)
          .eq('id', editingFiling.id!)
        if (error) throw error
        toast.success('Filing record updated')
      }

      setEditingFiling(null)
      onFilingsChanged()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save filing')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this filing record?')) return
    try {
      setIsDeleting(id)
      const { error } = await supabase.from('tax_filings').delete().eq('id', id)
      if (error) throw error
      toast.success('Filing deleted')
      onFilingsChanged()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete filing')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <Card className="border-emerald-100 bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-emerald-600" />
            Tax Filing Records
          </CardTitle>
          <Button
            size="sm"
            onClick={openNew}
            className="h-8 rounded-full px-4 text-xs font-bold bg-slate-900 border border-slate-800 shadow hover:bg-slate-800"
          >
            <PlusCircle className="h-3 w-3 mr-2" />
            Add Filing
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {filings.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-50 rounded-b-xl border-t border-dashed border-slate-200">
              <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <div className="text-sm font-bold text-slate-800">No Filing Records</div>
              <div className="text-xs text-muted-foreground mt-1 max-w-[280px] mx-auto">
                Create records to track VAT, WHT, and CIT submissions and their payment status.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filings.map(filing => (
                <div
                  key={filing.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                        {TAX_TYPE_LABELS[filing.tax_type]}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold uppercase rounded-full px-2 ${STATUS_TONES[filing.status]}`}
                      >
                        {filing.status}
                      </Badge>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {formatDisplayDate(filing.period_start)} — {formatDisplayDate(filing.period_end)}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-3">
                      {filing.receipt_reference && <span>Ref: {filing.receipt_reference}</span>}
                      {filing.portal_reference && <span>Portal: {filing.portal_reference}</span>}
                      {filing.submitted_at && <span>Filed: {formatDisplayDate(filing.submitted_at)}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">
                        Due: <span className="font-bold text-slate-700">{formatNaira(filing.amount_due)}</span>
                      </div>
                      {filing.amount_paid > 0 && (
                        <div className="text-xs text-emerald-600 font-medium">
                          Paid: {formatNaira(filing.amount_paid)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-900"
                        onClick={() => setEditingFiling(filing)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-300 hover:text-red-600 hover:bg-red-50"
                        disabled={isDeleting === filing.id}
                        onClick={() => handleDelete(filing.id)}
                      >
                        {isDeleting === filing.id
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

      {/* Create / Edit Sheet */}
      <Sheet open={!!editingFiling} onOpenChange={open => !open && setEditingFiling(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingFiling?.id ? 'Edit Filing' : 'New Filing'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            {/* Tax Type */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tax Type</Label>
              <Select
                value={editingFiling?.tax_type ?? 'vat'}
                onValueChange={v => setEditingFiling({ ...editingFiling, tax_type: v as TaxFilingTaxType })}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vat">VAT</SelectItem>
                  <SelectItem value="wht">WHT</SelectItem>
                  <SelectItem value="cit">CIT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Period Start</Label>
                <Input
                  type="date"
                  value={editingFiling?.period_start ?? ''}
                  onChange={e => setEditingFiling({ ...editingFiling, period_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Period End</Label>
                <Input
                  type="date"
                  value={editingFiling?.period_end ?? ''}
                  onChange={e => setEditingFiling({ ...editingFiling, period_end: e.target.value })}
                />
              </div>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount Due</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingFiling?.amount_due ?? ''}
                  onChange={e => setEditingFiling({ ...editingFiling, amount_due: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount Paid</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingFiling?.amount_paid ?? ''}
                  onChange={e => setEditingFiling({ ...editingFiling, amount_paid: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</Label>
              <Select
                value={editingFiling?.status ?? 'draft'}
                onValueChange={v => setEditingFiling({ ...editingFiling, status: v as TaxFilingStatus })}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="filed">Filed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submitted date */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Submission Date</Label>
              <Input
                type="date"
                value={editingFiling?.submitted_at ?? ''}
                onChange={e => setEditingFiling({ ...editingFiling, submitted_at: e.target.value || null })}
              />
            </div>

            {/* References */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Receipt Ref</Label>
                <Input
                  placeholder="e.g. RCT-0001"
                  value={editingFiling?.receipt_reference ?? ''}
                  onChange={e => setEditingFiling({ ...editingFiling, receipt_reference: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Portal Ref</Label>
                <Input
                  placeholder="e.g. FIRS-2025-001"
                  value={editingFiling?.portal_reference ?? ''}
                  onChange={e => setEditingFiling({ ...editingFiling, portal_reference: e.target.value })}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Notes</Label>
              <Input
                placeholder="Optional context..."
                value={editingFiling?.notes ?? ''}
                onChange={e => setEditingFiling({ ...editingFiling, notes: e.target.value })}
              />
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-11 bg-slate-900 text-white font-bold rounded-xl shadow-lg border-slate-800"
              >
                {saving ? 'Saving...' : 'Save Filing'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

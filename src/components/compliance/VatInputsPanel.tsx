import { useState } from 'react'
import { Edit, FileJson, Info, PlusCircle, Trash2, Wallet } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { supabase } from '@/supabase'
import { feedback } from '@/lib/feedback'
import { TaxInputEntry } from '@/domain/compliance/types'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'
import ComplianceJsonImportSheet from './import/ComplianceJsonImportSheet'

interface VatInputsPanelProps {
  taxInputs: TaxInputEntry[]
  onInputsChanged: () => void
}

export default function VatInputsPanel({ taxInputs, onInputsChanged }: VatInputsPanelProps) {
  const [editingEntry, setEditingEntry] = useState<Partial<TaxInputEntry> | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const handleSave = async () => {
    if (!editingEntry?.date || editingEntry.net_amount === undefined || editingEntry.vat_amount === undefined) {
      feedback.error('Date, net amount, and VAT amount are required')
      return
    }

    try {
      setSaving(true)
      const isNew = !editingEntry.id

      const recordToSave = {
        settings_id: 1,
        date: editingEntry.date,
        vendor_name: editingEntry.vendor_name || null,
        category: editingEntry.category || null,
        reference: editingEntry.reference || null,
        net_amount: editingEntry.net_amount || 0,
        vat_amount: editingEntry.vat_amount || 0,
        is_recoverable: editingEntry.is_recoverable ?? true,
        notes: editingEntry.notes || null,
        updated_at: new Date().toISOString(),
      }

      if (isNew) {
        const { error } = await supabase
          .from('tax_input_entries')
          .insert([{ ...recordToSave, created_at: new Date().toISOString() }])
        if (error) throw error
        feedback.success('VAT input recorded')
      } else {
        const { error } = await supabase
          .from('tax_input_entries')
          .update(recordToSave)
          .eq('id', editingEntry.id)
        if (error) throw error
        feedback.success('VAT input updated')
      }

      setEditingEntry(null)
      onInputsChanged()
    } catch (e: any) {
      feedback.error(getUserFacingMutationMessage(e, { action: 'save' }))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id)
      const { error } = await supabase.from('tax_input_entries').delete().eq('id', id)
      if (error) throw error
      feedback.success('VAT input deleted')
      onInputsChanged()
    } catch (e: any) {
      feedback.error(e.message || 'Failed to delete VAT input')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-row items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-bd-text">
          <Wallet className="h-4 w-4 text-bd-status-warning-text" />
          VAT Input Entries
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-widest"
          >
            <FileJson className="mr-1.5 h-3 w-3" />
            Import JSON
          </Button>
          <Button
            size="sm"
            onClick={() =>
              setEditingEntry({
                date: new Date().toISOString().split('T')[0],
                is_recoverable: true,
                net_amount: 0,
                vat_amount: 0,
              })
            }
            className="h-8 rounded-full px-4 text-xs font-bold"
          >
            <PlusCircle className="mr-2 h-3 w-3" />
            Add Entry
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg">
        {taxInputs.length === 0 ? (
          <div className="bg-bd-surface-muted px-4 py-12 text-center">
            <Wallet className="mx-auto mb-3 h-10 w-10 text-bd-text-muted opacity-20" />
            <div className="text-sm font-bold text-bd-text">No VAT Inputs Recorded</div>
            <div className="mx-auto mt-1 max-w-[280px] text-xs text-bd-text-muted">
              Track recoverable VAT from your business purchases and expenses.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-bd-border">
            {taxInputs.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-bd-surface-muted sm:flex-row sm:items-center"
              >
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-bd-text-muted">
                      {formatDisplayDate(entry.date)}
                    </div>
                    {!entry.is_recoverable ? (
                      <span className="rounded-full border border-bd-status-warning-border bg-bd-status-warning-bg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-bd-status-warning-text">
                        Non-Recoverable
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm font-bold text-bd-text">{entry.vendor_name || 'Unknown Vendor'}</div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-bd-text-muted">
                    {entry.category ? <span>{entry.category}</span> : null}
                    {entry.reference ? <span>• Ref: {entry.reference}</span> : null}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-6 sm:w-auto sm:justify-end">
                  <div className="text-right">
                    <div className="mb-0.5 text-xs text-bd-text-muted">
                      VAT: <span className="font-bold text-bd-text">{formatNaira(entry.vat_amount)}</span>
                    </div>
                    <div className="text-xs text-bd-text-muted opacity-70">Net: {formatNaira(entry.net_amount)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-bd-text-muted hover:bg-bd-surface-muted hover:text-bd-text"
                      onClick={() => setEditingEntry(entry)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-bd-status-danger-text opacity-50 hover:bg-bd-status-danger-bg hover:opacity-100"
                      disabled={isDeleting === entry.id}
                      onClick={() => {
                        if (confirm('Delete entry?')) handleDelete(entry.id)
                      }}
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

      <Sheet open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <SheetContent className="flex h-full w-full max-w-full flex-col overflow-hidden bg-bd-card-bg p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-bd-border">
            <SheetTitle>{editingEntry?.id ? 'Edit VAT Input' : 'New VAT Input'}</SheetTitle>
            <SheetDescription>
              Capture supplier, amounts, and recoverability for one VAT input entry.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-bd-text-muted">Date</Label>
                <Input
                  type="date"
                  className="h-10"
                  value={editingEntry?.date || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-bd-text-muted">Vendor / Supplier</Label>
                <Input
                  className="h-10"
                  placeholder="e.g. Globacom Nigeria"
                  value={editingEntry?.vendor_name || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, vendor_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-bd-text-muted">Category</Label>
                <Input
                  className="h-10"
                  placeholder="e.g. Software, Office"
                  value={editingEntry?.category || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, category: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-bd-text-muted">Reference</Label>
                <Input
                  className="h-10"
                  placeholder="Receipt or invoice number"
                  value={editingEntry?.reference || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, reference: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-bd-text-muted">Net Amount</Label>
                <NumericInput
                  className="h-10"
                  value={editingEntry?.net_amount ?? 0}
                  onChange={(value) => setEditingEntry({ ...editingEntry, net_amount: value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-bd-text-muted">VAT Amount</Label>
                <NumericInput
                  className="h-10"
                  value={editingEntry?.vat_amount ?? 0}
                  onChange={(value) => setEditingEntry({ ...editingEntry, vat_amount: value })}
                />
              </div>
            </div>

            <div className="mt-4 rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-surface-muted px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-bd-text">Recoverable VAT</Label>
                  <p className="text-xs text-bd-text-muted">Deduct this amount from output VAT when applicable.</p>
                </div>
                <Switch
                  checked={editingEntry?.is_recoverable ?? true}
                  onCheckedChange={(checked) => setEditingEntry({ ...editingEntry, is_recoverable: checked })}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label className="text-[11px] font-bold text-bd-text-muted">Notes</Label>
              <Textarea
                placeholder="Optional context..."
                value={editingEntry?.notes || ''}
                onChange={(e) => setEditingEntry({ ...editingEntry, notes: e.target.value })}
              />
            </div>
          </div>

          <SheetFooter className="border-t border-bd-border bg-bd-card-bg pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setEditingEntry(null)} className="h-10 sm:min-w-28">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="h-10 sm:min-w-32">
              {saving ? 'Saving...' : 'Save Entry'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="mt-6 rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-surface p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-bd-status-info-text" />
          <div>
            <div className="text-sm font-bold text-bd-text">Understanding VAT Inputs</div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-bd-text-muted">
              VAT inputs refer to the tax paid on business purchases. These can often be deducted from the VAT you collect on sales to determine your net tax liability.
            </p>
          </div>
        </div>
      </div>

      <ComplianceJsonImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        type="vat_input"
        onSuccess={onInputsChanged}
      />
    </div>
  )
}

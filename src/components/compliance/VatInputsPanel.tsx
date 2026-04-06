import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Info, PlusCircle, Wallet, Edit, Trash2 } from 'lucide-react'
import { supabase } from '@/supabase'
import { toast } from 'sonner'
import { TaxInputEntry } from '@/domain/compliance/types'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { FileJson } from 'lucide-react'
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
      toast.error('Date, net amount, and VAT amount are required')
      return
    }

    try {
      setSaving(true)
      const isNew = !editingEntry.id

      const recordToSave = {
        settings_id: 1, // Singleton
        date: editingEntry.date,
        vendor_name: editingEntry.vendor_name || null,
        category: editingEntry.category || null,
        reference: editingEntry.reference || null,
        net_amount: editingEntry.net_amount || 0,
        vat_amount: editingEntry.vat_amount || 0,
        is_recoverable: editingEntry.is_recoverable ?? true,
        notes: editingEntry.notes || null,
        updated_at: new Date().toISOString()
      }

      if (isNew) {
        const { error } = await supabase.from('tax_input_entries').insert([{ ...recordToSave, created_at: new Date().toISOString() }])
        if (error) throw error
        toast.success('VAT input recorded')
      } else {
        const { error } = await supabase.from('tax_input_entries').update(recordToSave).eq('id', editingEntry.id)
        if (error) throw error
        toast.success('VAT input updated')
      }

      setEditingEntry(null)
      onInputsChanged()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save VAT input')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id)
      const { error } = await supabase.from('tax_input_entries').delete().eq('id', id)
      if (error) throw error
      toast.success('VAT input deleted')
      onInputsChanged()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete VAT input')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <Card className="border-amber-200 bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-amber-600" />
            VAT Input Entries
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50">
              <FileJson className="h-3 w-3 mr-1.5" />
              Import JSON
            </Button>
            <Button size="sm" onClick={() => setEditingEntry({ date: new Date().toISOString().split('T')[0], is_recoverable: true, net_amount: 0, vat_amount: 0 })} className="h-8 rounded-full px-4 text-xs font-bold bg-slate-900 border border-slate-800 shadow hover:bg-slate-800">
              <PlusCircle className="h-3 w-3 mr-2" />
              Add Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {taxInputs.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-b-xl bg-slate-50 border-t border-dashed border-slate-200">
              <Wallet className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <div className="text-sm font-bold text-slate-800">No VAT Inputs Recorded</div>
              <div className="text-xs text-muted-foreground mt-1 max-w-[280px] mx-auto">
                Track recoverable VAT from your business purchases and expenses.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {taxInputs.map(entry => (
                <div key={entry.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{formatDisplayDate(entry.date)}</div>
                      {!entry.is_recoverable && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Non-Recoverable</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-900">{entry.vendor_name || 'Unknown Vendor'}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-2">
                      {entry.category && <span>{entry.category}</span>}
                      {entry.reference && <span>• Ref: {entry.reference}</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-0.5">VAT: <span className="font-bold text-slate-700">{formatNaira(entry.vat_amount)}</span></div>
                      <div className="text-xs text-slate-400">Net: {formatNaira(entry.net_amount)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={() => setEditingEntry(entry)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-300 hover:text-red-600 hover:bg-red-50" disabled={isDeleting === entry.id} onClick={() => { if(confirm('Delete entry?')) handleDelete(entry.id) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingEntry?.id ? 'Edit VAT Input' : 'New VAT Input'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Date</Label>
              <Input type="date" value={editingEntry?.date || ''} onChange={e => setEditingEntry({ ...editingEntry, date: e.target.value })} />
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Vendor / Supplier</Label>
              <Input placeholder="e.g. Globacom Nigeria" value={editingEntry?.vendor_name || ''} onChange={e => setEditingEntry({ ...editingEntry, vendor_name: e.target.value })} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</Label>
                <Input placeholder="e.g. Software, Office" value={editingEntry?.category || ''} onChange={e => setEditingEntry({ ...editingEntry, category: e.target.value })} />
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Reference</Label>
                <Input placeholder="Receipt or Invoice #" value={editingEntry?.reference || ''} onChange={e => setEditingEntry({ ...editingEntry, reference: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Amount</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={editingEntry?.net_amount ?? ''} 
                  onChange={e => setEditingEntry({ ...editingEntry, net_amount: parseFloat(e.target.value) || 0 })} 
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">VAT Amount</Label>
                <Input 
                  type="number"
                  step="0.01" 
                  value={editingEntry?.vat_amount ?? ''} 
                  onChange={e => setEditingEntry({ ...editingEntry, vat_amount: parseFloat(e.target.value) || 0 })} 
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Recoverable VAT</Label>
                <div className="text-xs text-muted-foreground">Can be deducted from output VAT</div>
              </div>
              <Switch checked={editingEntry?.is_recoverable ?? true} onCheckedChange={c => setEditingEntry({ ...editingEntry, is_recoverable: c })} />
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Notes</Label>
              <Input placeholder="Optional context..." value={editingEntry?.notes || ''} onChange={e => setEditingEntry({ ...editingEntry, notes: e.target.value })} />
            </div>

            <div className="pt-4">
              <Button onClick={handleSave} disabled={saving} className="w-full h-11 bg-slate-900 text-white font-bold rounded-xl shadow-lg border-slate-800">
                {saving ? 'Saving...' : 'Save Entry'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-slate-900">Understanding VAT Inputs</div>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-2xl">
              VAT inputs refer to the tax paid on business purchases. These can often be deducted (recovered) from the VAT you collect on sales to determine your net tax liability.
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

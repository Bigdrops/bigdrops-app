import { useEffect, useMemo, useState } from 'react'
import { Info, Wand2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import { buildApplyResult } from '@/domain/import/apply'
import { normalizeImportData } from '@/domain/import/normalize'
import { parseImportText } from '@/domain/import/parse'
import { getUnknownColumnCandidates, resolveImportColumns } from '@/domain/import/resolve'
import { validateImportData } from '@/domain/import/validate'
import type { ApplyImportResult, CustomColumnDecision, ImportMode, ValidatedImportData } from '@/domain/import/types'
import type { ColumnConfig, InvoiceItem } from '@/domain/invoice'
import { JsonImportUI } from '@/components/import/JsonImportLayout'

type ImportAdapter = {
  documentType: 'invoice' | 'quotation'
  prompts: Record<ImportMode, string>
  createItem: () => InvoiceItem
}

type JsonItemsImportSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyImport: (result: ApplyImportResult) => void
  items: InvoiceItem[]
  columns: ColumnConfig[]
  adapter: ImportAdapter
  title?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  contentClassName?: string
}

function makeDefaultDecision(candidateKey: string, label: string): CustomColumnDecision {
  return { action: 'create', label: label || candidateKey }
}

export default function JsonItemsImportSheet({
  open,
  onOpenChange,
  onApplyImport,
  items,
  columns,
  adapter,
  title = 'Import Items',
  side = 'bottom',
  contentClassName = '',
}: JsonItemsImportSheetProps) {
  const [mode, setMode] = useState<ImportMode>('Create Rows')
  const [pastedText, setPastedText] = useState('')
  const [validated, setValidated] = useState<ValidatedImportData | null>(null)
  const [decisions, setDecisions] = useState<Record<string, CustomColumnDecision>>({})
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false)
  const [overwriteExpanded, setOverwriteExpanded] = useState(false)
  const [exemptOverwriteIds, setExemptOverwriteIds] = useState<string[]>([])
  const { toast } = useToast()

  const standardRowCount = useMemo(
    () => items.filter((item) => item.row_type !== 'group_header').length,
    [items],
  )

  const existingCustomColumns = useMemo(
    () => columns.filter((column) => column.key.startsWith('custom_')),
    [columns],
  )

  const unresolvedCandidates = useMemo(
    () => (validated ? getUnknownColumnCandidates(validated, columns) : []),
    [columns, validated],
  )

  useEffect(() => {
    if (!open) {
      setPastedText('')
      setValidated(null)
      setDecisions({})
      setMode('Create Rows')
      setShowOverwriteDialog(false)
      setOverwriteExpanded(false)
      setExemptOverwriteIds([])
      return
    }

    if (standardRowCount === 0) {
      setMode('Create Rows')
    }
  }, [open, standardRowCount])

  const runResolve = (data: ValidatedImportData) => {
    const resolvedResult = resolveImportColumns({
      validated: data,
      existingColumns: columns,
      decisions,
    })

    if (resolvedResult.ok === false) {
      toast({ title: 'Import blocked', description: resolvedResult.message, variant: 'destructive' })
      return
    }

    const draftResult = buildApplyResult({
      mode,
      existingItems: items,
      existingColumns: columns,
      resolved: resolvedResult.data,
      skippedRows: data.skippedRows,
      createItem: adapter.createItem,
    })

    if (mode === 'Update Table' && draftResult.overwriteTargets.length > 0) {
      setShowOverwriteDialog(true)
      setOverwriteExpanded(false)
      setExemptOverwriteIds([])
      return
    }

    onApplyImport(draftResult)
    toast({
      title: 'Import applied',
      description:
        mode === 'Create Rows'
          ? `${draftResult.createdRowCount} rows imported.`
          : `Updated ${draftResult.updatedRowNumbers.length} rows.`,
    })
    onOpenChange(false)
  }

  const handleStartImport = () => {
    if (!pastedText.trim()) {
      toast({ title: 'Paste JSON', description: 'Paste JSON before importing.', variant: 'destructive' })
      return
    }

    const parsed = parseImportText(pastedText, mode)
    if (parsed.ok === false) {
      toast({ title: 'Invalid JSON', description: parsed.error.message, variant: 'destructive' })
      return
    }

    const normalized = normalizeImportData(parsed.data, mode)
    if (normalized.ok === false) {
      toast({ title: 'Import failed', description: normalized.message, variant: 'destructive' })
      return
    }

    const validatedResult = validateImportData(mode, normalized.data, items)
    if (validatedResult.ok === false) {
      toast({ title: 'Import failed', description: validatedResult.message, variant: 'destructive' })
      return
    }

    const nextValidated = validatedResult.data
    setValidated(nextValidated)

    const candidates = getUnknownColumnCandidates(nextValidated, columns)
    if (candidates.length === 0) {
      runResolve(nextValidated)
      return
    }

    setDecisions(
      Object.fromEntries(
        candidates.map((candidate) => [
          candidate.key,
          decisions[candidate.key] || makeDefaultDecision(candidate.key, candidate.sourceLabels[0] || candidate.key),
        ]),
      ),
    )
  }

  const handleApplyOverwriteDecision = () => {
    if (!validated) return

    const resolvedResult = resolveImportColumns({
      validated,
      existingColumns: columns,
      decisions,
    })

    if (resolvedResult.ok === false) {
      toast({ title: 'Import blocked', description: resolvedResult.message, variant: 'destructive' })
      return
    }

    const finalResult = buildApplyResult({
      mode,
      existingItems: items,
      existingColumns: columns,
      resolved: resolvedResult.data,
      skippedRows: validated.skippedRows,
      exemptOverwriteIds,
      createItem: adapter.createItem,
    })

    onApplyImport(finalResult)
    toast({
      title: 'Import applied',
      description: `Updated ${finalResult.updatedRowNumbers.length} rows.`,
    })
    setShowOverwriteDialog(false)
    onOpenChange(false)
  }

  const overwritePreview = useMemo(() => {
    if (!validated) return null
    const resolvedResult = resolveImportColumns({
      validated,
      existingColumns: columns,
      decisions,
    })
    if (resolvedResult.ok === false) return null

    return buildApplyResult({
      mode,
      existingItems: items,
      existingColumns: columns,
      resolved: resolvedResult.data,
      skippedRows: validated.skippedRows,
      createItem: adapter.createItem,
    })
  }, [adapter.createItem, columns, decisions, items, mode, validated])

  const helpText = `Quick Guide: Choose a mode, copy the AI prompt, paste your extracted JSON, resolve any new columns, and save.`

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={side}
          className={`max-h-[94vh] rounded-t-[28px] bg-slate-50 p-0 border-none sm:max-w-2xl sm:mx-auto overflow-y-auto ${contentClassName}`.trim()}
        >
          <JsonImportUI
            title={title}
            description={`Import data into this ${adapter.documentType}.`}
            promptText={adapter.prompts[mode]}
            rawInput={pastedText}
            onRawInputChange={(val) => { setPastedText(val); setValidated(null); }}
            onPreview={handleStartImport}
            onSave={() => (validated && unresolvedCandidates.length > 0 ? runResolve(validated) : handleStartImport())}
            saveLabel="Apply Import"
            isParsed={!!validated}
            helpText={helpText}
            additionalActions={
              <Button 
                variant="ghost" 
                onClick={() => { setValidated(null); setPastedText(''); }}
                className="w-full text-slate-400 text-xs font-bold hover:text-slate-600"
              >
                Clear and Start Over
              </Button>
            }
            previewContent={
              <div className="space-y-4">
                <div className="space-y-2 px-1">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Import Mode</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={mode === 'Create Rows' ? 'default' : 'outline'}
                      className={`h-11 rounded-xl text-xs font-bold ${mode === 'Create Rows' ? 'bg-slate-900 shadow-lg' : 'border-slate-200'}`}
                      onClick={() => { setMode('Create Rows'); setValidated(null); }}
                    >
                      Create Rows
                    </Button>
                    <Button
                      type="button"
                      variant={mode === 'Update Table' ? 'default' : 'outline'}
                      className={`h-11 rounded-xl text-xs font-bold ${mode === 'Update Table' ? 'bg-slate-900 shadow-lg' : 'border-slate-200'}`}
                      disabled={standardRowCount === 0}
                      onClick={() => { setMode('Update Table'); setValidated(null); }}
                    >
                      Update Table
                    </Button>
                  </div>
                </div>

                {validated && unresolvedCandidates.length > 0 && (
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-900">Resolve Columns</div>
                        <div className="text-xs text-slate-500 font-medium">Map unknown keys to your table.</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {unresolvedCandidates.map((candidate) => {
                        const decision = decisions[candidate.key] || makeDefaultDecision(candidate.key, candidate.sourceLabels[0] || candidate.key)
                        return (
                          <div key={candidate.key} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-700">{candidate.sourceLabels[0] || candidate.key}</span>
                              <span className="text-[10px] text-slate-400 font-mono italic">{String(candidate.sampleValues[0] || '').slice(0, 20)}...</span>
                            </div>
                            
                            <Select
                              value={decision.action}
                              onValueChange={(val: 'create' | 'map' | 'drop') =>
                                setDecisions(curr => ({
                                  ...curr,
                                  [candidate.key]: val === 'create' ? { action: 'create', label: candidate.sourceLabels[0] || candidate.key }
                                                 : val === 'map' ? { action: 'map', columnKey: existingCustomColumns[0]?.key || '' }
                                                 : { action: 'drop' }
                                }))
                              }
                            >
                              <SelectTrigger className="h-9 rounded-lg bg-white border-slate-200 text-xs font-black uppercase tracking-wider">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="create">Create Column</SelectItem>
                                <SelectItem value="map">Map Existing</SelectItem>
                                <SelectItem value="drop">Ignore Key</SelectItem>
                              </SelectContent>
                            </Select>

                            {decision.action === 'create' && (
                              <Input 
                                value={decision.label} 
                                onChange={e => setDecisions(curr => ({ ...curr, [candidate.key]: { ...decision, label: e.target.value } }))}
                                className="h-9 rounded-lg border-slate-200 text-xs font-bold placeholder:text-slate-300"
                                placeholder={candidate.sourceLabels[0] || candidate.key}
                              />
                            )}

                            {decision.action === 'map' && (
                              <Select
                                value={decision.columnKey}
                                onValueChange={val => setDecisions(curr => ({ ...curr, [candidate.key]: { ...decision, columnKey: val } }))}
                              >
                                <SelectTrigger className="h-9 rounded-lg bg-white border-slate-200 text-xs font-bold">
                                  <SelectValue placeholder="Target column..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {existingCustomColumns.map(col => (
                                    <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            }
          />
        </SheetContent>
      </Sheet>

      <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <DialogContent className="max-w-md rounded-[28px] bg-slate-50 p-0 border-none overflow-hidden select-none shadow-2xl">
          <div className="p-5 border-b bg-white">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5 leading-tight">
              <Wand2 className="h-4 w-4 text-emerald-600" />
              Overwrite Review
            </h3>
            <p className="text-[11px] font-medium text-slate-500 leading-tight">
              {overwritePreview?.overwriteTargets.length || 0} cells will be updated. Review and exempt any if needed.
            </p>
          </div>

          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <Button
              variant="ghost"
              className="w-full justify-start text-[10px] font-black uppercase tracking-widest text-slate-400 p-0 h-auto hover:bg-transparent"
              onClick={() => setOverwriteExpanded(!overwriteExpanded)}
            >
              {overwriteExpanded ? 'Hide Details' : 'Review Details'}
            </Button>

            {overwriteExpanded && overwritePreview?.overwriteTargets.map(target => {
              const exempted = exemptOverwriteIds.includes(target.id)
              return (
                <button
                  key={target.id}
                  onClick={() => setExemptOverwriteIds(curr => exempted ? curr.filter(id => id !== target.id) : [...curr, target.id])}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${exempted ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100 shadow-sm'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-extrabold text-slate-900">Row {target.rowNumber} • {target.columnLabel}</span>
                    {exempted && <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Exempt</span>}
                  </div>
                  <div className="mt-1.5 text-[10px] font-medium text-slate-500 line-clamp-2">
                    <span className="text-slate-400">Current:</span> {String(target.currentValue)}
                    <br />
                    <span className="text-slate-400">New:</span> {String(target.nextValue)}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="p-4 bg-white border-t flex gap-2">
            <Button variant="outline" onClick={() => setShowOverwriteDialog(false)} className="flex-1 h-12 rounded-xl border-slate-200 font-bold text-slate-600">Back</Button>
            <Button onClick={handleApplyOverwriteDecision} className="flex-[2] h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg transition-all active:scale-[0.98]">Apply Import</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

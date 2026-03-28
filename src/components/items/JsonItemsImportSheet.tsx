import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { buildApplyResult } from '@/domain/import/apply'
import { normalizeImportData } from '@/domain/import/normalize'
import { parseImportText } from '@/domain/import/parse'
import { getUnknownColumnCandidates, resolveImportColumns } from '@/domain/import/resolve'
import { validateImportData } from '@/domain/import/validate'
import type { ApplyImportResult, CustomColumnDecision, ImportMode, ValidatedImportData } from '@/domain/import/types'
import type { ColumnConfig, InvoiceItem } from '@/domain/invoice'

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
  title = 'Import JSON',
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

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
  }

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(adapter.prompts[mode])
      toast({ title: 'Copied', description: `${adapter.documentType === 'invoice' ? 'Invoice' : 'Quotation'} prompt copied.` })
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy prompt.', variant: 'destructive' })
    }
  }

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
          ? `${draftResult.createdRowCount} rows imported${draftResult.skippedRows.length ? `, ${draftResult.skippedRows.length} skipped` : ''}.`
          : `Updated ${draftResult.updatedRowNumbers.length} rows.`,
    })
    handleClose(false)
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
    handleClose(false)
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

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side={side}
          className={`rounded-t-[28px] bg-card p-0 [&>[data-slot=sheet-close]]:hidden ${contentClassName}`.trim()}
        >
          <SheetHeader className="border-b border-zinc-200 px-5 py-4 text-left">
            <SheetTitle className="text-base font-semibold text-zinc-900">{title}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 p-5">
            <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              <div className="font-medium text-zinc-900">Use the exact conversion prompt from this screen.</div>
              <div className="mt-1 text-xs text-zinc-600">The full prompt stays collapsed here by default.</div>
              <Button
                type="button"
                variant="link"
                className="mt-1 h-auto p-0 text-xs font-semibold text-zinc-900"
                onClick={copyPrompt}
              >
                Copy Prompt
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Mode</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={mode === 'Create Rows' ? 'default' : 'outline'}
                  className="h-11 rounded-2xl"
                  onClick={() => {
                    setMode('Create Rows')
                    setValidated(null)
                    setDecisions({})
                  }}
                >
                  Create Rows
                </Button>
                <Button
                  type="button"
                  variant={mode === 'Update Table' ? 'default' : 'outline'}
                  className="h-11 rounded-2xl"
                  disabled={standardRowCount === 0}
                  onClick={() => {
                    setMode('Update Table')
                    setValidated(null)
                    setDecisions({})
                  }}
                >
                  Update Table
                </Button>
              </div>
              {standardRowCount === 0 ? (
                <div className="text-xs text-zinc-500">Update Table becomes available after the table has at least one row.</div>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Paste Raw JSON</div>
              <Textarea
                value={pastedText}
                onChange={(event) => {
                  setPastedText(event.target.value)
                  setValidated(null)
                  setDecisions({})
                }}
                placeholder={`{ "items": [ { "description": "", "quantity": 1, "unit_price": 0 } ] }`}
                className="min-h-56 rounded-[24px] border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900"
              />
            </div>

            {validated && unresolvedCandidates.length > 0 ? (
              <div className="space-y-4 rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">Resolve unknown columns</div>
                  <div className="text-xs text-zinc-600">Choose Create new column, Map to existing column, or Ignore column for each key.</div>
                </div>

                <div className="space-y-4">
                  {unresolvedCandidates.map((candidate) => {
                    const decision = decisions[candidate.key] || makeDefaultDecision(candidate.key, candidate.sourceLabels[0] || candidate.key)

                    return (
                      <div key={candidate.key} className="rounded-2xl border border-zinc-200 bg-white p-3">
                        <div className="text-sm font-medium text-zinc-900">{candidate.sourceLabels[0] || candidate.key}</div>
                        <div className="mt-1 text-xs text-zinc-500">
                          Sample: {candidate.sampleValues.length ? candidate.sampleValues.join(', ') : 'No sample value'}
                        </div>

                        <div className="mt-3 space-y-3">
                          <Select
                            value={decision.action}
                            onValueChange={(value: 'create' | 'map' | 'drop') =>
                              setDecisions((current) => ({
                                ...current,
                                [candidate.key]:
                                  value === 'create'
                                    ? { action: 'create', label: decision.action === 'create' ? decision.label : candidate.sourceLabels[0] || candidate.key }
                                    : value === 'map'
                                      ? { action: 'map', columnKey: existingCustomColumns[0]?.key || '' }
                                      : { action: 'drop' },
                              }))
                            }
                          >
                            <SelectTrigger className="h-11 rounded-2xl border-zinc-200 bg-white text-sm">
                              <SelectValue placeholder="Choose an action" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="create">Create new column</SelectItem>
                              <SelectItem value="map">Map to existing column</SelectItem>
                              <SelectItem value="drop">Ignore column</SelectItem>
                            </SelectContent>
                          </Select>

                          {decision.action === 'create' ? (
                            <Input
                              value={decision.label || ''}
                              onChange={(event) =>
                                setDecisions((current) => ({
                                  ...current,
                                  [candidate.key]: { action: 'create', label: event.target.value },
                                }))
                              }
                              className="h-11 rounded-2xl border-zinc-200 bg-white"
                              placeholder="Column label"
                            />
                          ) : null}

                          {decision.action === 'map' ? (
                            existingCustomColumns.length > 0 ? (
                              <Select
                                value={decision.columnKey}
                                onValueChange={(value) =>
                                  setDecisions((current) => ({
                                    ...current,
                                    [candidate.key]: { action: 'map', columnKey: value },
                                  }))
                                }
                              >
                                <SelectTrigger className="h-11 rounded-2xl border-zinc-200 bg-white text-sm">
                                  <SelectValue placeholder="Choose a custom column" />
                                </SelectTrigger>
                                <SelectContent>
                                  {existingCustomColumns.map((column) => (
                                    <SelectItem key={column.key} value={column.key}>
                                      {column.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                No existing custom columns are available to map into.
                              </div>
                            )
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {validated?.skippedRows.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                {validated.skippedRows.length} rows will be skipped because description is required in Create Rows mode.
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-2xl border-zinc-200 bg-card"
                onClick={() => {
                  setPastedText('')
                  setValidated(null)
                  setDecisions({})
                }}
              >
                Clear
              </Button>
              <Button
                type="button"
                className="h-10 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800"
                onClick={() => {
                  if (validated && unresolvedCandidates.length > 0) {
                    runResolve(validated)
                    return
                  }
                  handleStartImport()
                }}
              >
                {validated && unresolvedCandidates.length > 0 ? 'Continue Import' : 'Import'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <DialogContent className="h-[100dvh] max-w-none rounded-none sm:h-[100dvh] sm:max-w-none">
          <DialogHeader>
            <DialogTitle>Overwrite review</DialogTitle>
            <DialogDescription>
              {overwritePreview?.overwriteTargets.length || 0} cells already contain data and will be overwritten unless you exempt them.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-medium text-zinc-900">This warning covers the screen by default.</div>
              <div className="mt-1 text-xs text-zinc-600">Expand the affected cells, then exempt any updates you want removed from the final patch.</div>
              <Button
                type="button"
                variant="link"
                className="mt-1 h-auto p-0 text-xs font-semibold text-zinc-900"
                onClick={() => setOverwriteExpanded((current) => !current)}
              >
                {overwriteExpanded ? 'Hide affected cells' : 'Review affected cells'}
              </Button>
            </div>

            {overwriteExpanded && overwritePreview ? (
              <div className="mt-4 space-y-3">
                {overwritePreview.overwriteTargets.map((target) => {
                  const exempted = exemptOverwriteIds.includes(target.id)

                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() =>
                        setExemptOverwriteIds((current) =>
                          exempted ? current.filter((entry) => entry !== target.id) : [...current, target.id],
                        )
                      }
                      className={`w-full rounded-2xl border p-4 text-left ${
                        exempted ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200 bg-white'
                      }`}
                    >
                      <div className="text-sm font-medium text-zinc-900">
                        Row {target.rowNumber} - {target.columnLabel}
                      </div>
                      <div className="mt-1 text-xs text-zinc-600">Current: {String(target.currentValue)}</div>
                      <div className="text-xs text-zinc-600">Incoming: {String(target.nextValue)}</div>
                      <div className="mt-2 text-xs font-semibold text-zinc-900">
                        {exempted ? 'Exempted from final patch' : 'Tap to exempt this overwrite'}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowOverwriteDialog(false)}>
              Back
            </Button>
            <Button type="button" onClick={handleApplyOverwriteDecision}>
              Apply Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

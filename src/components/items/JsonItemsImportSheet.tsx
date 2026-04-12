import { useEffect, useMemo, useState } from 'react'
import { Copy, Info, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { buildApplyResult } from '@/domain/import/apply'
import { normalizeImportData } from '@/domain/import/normalize'
import { parseImportText } from '@/domain/import/parse'
import { getUnknownColumnCandidates, resolveImportColumns } from '@/domain/import/resolve'
import { hasMeaningfulStandardRows } from '@/domain/import/tableState'
import { validateImportData } from '@/domain/import/validate'
import type { ApplyImportResult, CustomColumnDecision, ImportMode, ValidatedImportData } from '@/domain/import/types'
import type { ColumnConfig, InvoiceItem } from '@/domain/invoice'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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

const MODE_COPY: Record<
  ImportMode,
  {
    title: string
    subtitle: string
    helper: string
    placeholder: string
    applyLabel: string
  }
> = {
  Add: {
    title: 'Add',
    subtitle: 'Append brand-new rows from JSON.',
    helper:
      'Use Add when you want to create fresh line items. The pasted JSON should describe new rows to append, not changes to existing ones.',
    placeholder: `{
  "items": [
    {
      "description": "Supply and install LED floodlights",
      "sub_description": "150W IP66 outdoor fittings",
      "quantity": 12,
      "unit": "pcs",
      "unit_price": 48000
    }
  ]
}`,
    applyLabel: 'Add rows',
  },
  Update: {
    title: 'Update',
    subtitle: 'Patch existing visible rows only.',
    helper:
      'Use Update for sparse patches. row_number matches the current visible table numbering starting at 1. Include only the rows and fields that should change. Omitted rows and omitted fields stay exactly as they are.',
    placeholder: `{
  "items": [
    {
      "row_number": 3,
      "quantity": 12
    },
    {
      "row_number": 5,
      "unit_price": 48000,
      "sub_description": "Powder-coated finish"
    }
  ]
}`,
    applyLabel: 'Apply update',
  },
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
  const { toast } = useToast()
  const [mode, setMode] = useState<ImportMode>('Add')
  const [pastedText, setPastedText] = useState('')
  const [validated, setValidated] = useState<ValidatedImportData | null>(null)
  const [decisions, setDecisions] = useState<Record<string, CustomColumnDecision>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const updateEnabled = useMemo(() => hasMeaningfulStandardRows(items), [items])

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
      setMode('Add')
      setPastedText('')
      setValidated(null)
      setDecisions({})
      setErrorMessage(null)
      setCopied(false)
      return
    }

    if (!updateEnabled && mode === 'Update') {
      setMode('Add')
    }
  }, [mode, open, updateEnabled])

  const activeMode = MODE_COPY[mode]

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(adapter.prompts[mode])
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy the prompt. You can still copy it manually from the popup.',
        variant: 'destructive',
      })
    }
  }

  const handleModeChange = (nextMode: ImportMode) => {
    if (nextMode === 'Update' && !updateEnabled) return
    setMode(nextMode)
    setValidated(null)
    setDecisions({})
    setErrorMessage(null)
  }

  const handleTextChange = (value: string) => {
    setPastedText(value)
    setValidated(null)
    setDecisions({})
    setErrorMessage(null)
  }

  const applyImport = (data: ValidatedImportData) => {
    const resolvedResult = resolveImportColumns({
      validated: data,
      existingColumns: columns,
      decisions,
    })

    if (resolvedResult.ok === false) {
      setErrorMessage(resolvedResult.message)
      return
    }

    const finalResult = buildApplyResult({
      mode,
      existingItems: items,
      existingColumns: columns,
      resolved: resolvedResult.data,
      skippedRows: data.skippedRows,
      createItem: adapter.createItem,
    })

    onApplyImport(finalResult)
    toast({
      title: mode === 'Add' ? 'Rows added' : 'Updates applied',
      description:
        mode === 'Add'
          ? `${finalResult.createdRowCount} row${finalResult.createdRowCount === 1 ? '' : 's'} appended.`
          : `Patched ${finalResult.updatedRowNumbers.length} row${finalResult.updatedRowNumbers.length === 1 ? '' : 's'}.`,
    })
    onOpenChange(false)
  }

  const handleApply = () => {
    if (!pastedText.trim()) {
      setErrorMessage('Paste JSON before applying.')
      return
    }

    const parsed = parseImportText(pastedText, mode)
    if (parsed.ok === false) {
      setErrorMessage(parsed.error.message)
      return
    }

    const normalized = normalizeImportData(parsed.data, mode)
    if (normalized.ok === false) {
      setErrorMessage(normalized.message)
      return
    }

    const validatedResult = validateImportData(mode, normalized.data, items)
    if (validatedResult.ok === false) {
      setErrorMessage(validatedResult.message)
      return
    }

    const nextValidated = validatedResult.data
    const candidates = getUnknownColumnCandidates(nextValidated, columns)

    setValidated(nextValidated)
    setErrorMessage(null)

    if (candidates.length > 0) {
      setDecisions((current) =>
        Object.fromEntries(
          candidates.map((candidate) => [
            candidate.key,
            current[candidate.key] || makeDefaultDecision(candidate.key, candidate.sourceLabels[0] || candidate.key),
          ]),
        ),
      )
      return
    }

    applyImport(nextValidated)
  }

  const handleFinalizeColumnChoices = () => {
    if (!validated) return
    applyImport(validated)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          'max-h-[94vh] rounded-t-[28px] border-none bg-slate-50 p-0 sm:mx-auto sm:max-w-2xl',
          contentClassName,
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-slate-900">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <h2 className="text-base font-black">{title}</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Choose a mode first, copy the prompt, paste the JSON, then apply it in this same popup.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPrompt}
                className="h-9 rounded-xl border-emerald-200 bg-emerald-50 px-3 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {copied ? 'Copied' : 'Copy prompt'}
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Mode</div>
              <div className="grid grid-cols-2 gap-2">
                {(['Add', 'Update'] as ImportMode[]).map((entry) => {
                  const selected = mode === entry
                  const disabled = entry === 'Update' && !updateEnabled

                  return (
                    <Button
                      key={entry}
                      type="button"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => handleModeChange(entry)}
                      className={cn(
                        'h-auto min-h-14 rounded-2xl border px-3 py-3 text-left transition-colors',
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                        disabled && 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-55 hover:bg-slate-100',
                      )}
                    >
                      <div className="w-full">
                        <div className="text-sm font-black">{MODE_COPY[entry].title}</div>
                        <div className={cn('mt-1 text-[11px] leading-relaxed', selected ? 'text-slate-200' : 'text-slate-500')}>
                          {MODE_COPY[entry].subtitle}
                        </div>
                      </div>
                    </Button>
                  )
                })}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                {updateEnabled
                  ? 'Update is available because the table already has at least one real line item. It will target the current visible row numbers.'
                  : 'Update stays unavailable until the table has at least one real line item. The default blank starter row does not count.'}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-sm font-bold text-slate-900">{activeMode.title} mode</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{activeMode.helper}</p>
                </div>
              </div>
            </div>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">AI Prompt</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{activeMode.subtitle}</div>
                </div>
              </div>
              <Textarea
                value={adapter.prompts[mode]}
                readOnly
                className="min-h-[220px] rounded-2xl border-slate-200 bg-white font-mono text-[11px] leading-5 text-slate-700"
              />
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Paste JSON</div>
                <div className="text-[11px] text-slate-400">{mode === 'Update' ? 'Sparse patches allowed' : 'New rows only'}</div>
              </div>
              <Textarea
                value={pastedText}
                onChange={(event) => handleTextChange(event.target.value)}
                placeholder={activeMode.placeholder}
                className="min-h-[220px] rounded-2xl border-slate-200 bg-white font-mono text-[12px] leading-5 text-slate-800"
              />
            </section>

            {errorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {unresolvedCandidates.length > 0 ? (
              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <div className="text-sm font-bold text-slate-900">Handle new JSON keys</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                    Choose whether each new key should create a column, map to an existing custom column, or be ignored. You will stay in this same popup.
                  </p>
                </div>

                <div className="space-y-3">
                  {unresolvedCandidates.map((candidate) => {
                    const decision = decisions[candidate.key] || makeDefaultDecision(candidate.key, candidate.sourceLabels[0] || candidate.key)

                    return (
                      <div key={candidate.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-slate-900">{candidate.sourceLabels[0] || candidate.key}</div>
                            <div className="mt-1 text-[12px] text-slate-500">
                              Sample: {String(candidate.sampleValues[0] ?? '').trim() || 'Empty'}
                            </div>
                          </div>
                          <div className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                            {candidate.inferredType}
                          </div>
                        </div>

                        <div className="mt-3 space-y-3">
                          <Select
                            value={decision.action}
                            onValueChange={(value: 'create' | 'map' | 'drop') =>
                              setDecisions((current) => ({
                                ...current,
                                [candidate.key]:
                                  value === 'create'
                                    ? { action: 'create', label: candidate.sourceLabels[0] || candidate.key }
                                    : value === 'map'
                                      ? { action: 'map', columnKey: existingCustomColumns[0]?.key || '' }
                                      : { action: 'drop' },
                              }))
                            }
                          >
                            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="create">Create column</SelectItem>
                              <SelectItem value="map">Map existing</SelectItem>
                              <SelectItem value="drop">Ignore key</SelectItem>
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
                              placeholder="Column label"
                              className="h-10 rounded-xl border-slate-200 bg-white"
                            />
                          ) : null}

                          {decision.action === 'map' ? (
                            <Select
                              value={decision.columnKey}
                              onValueChange={(value) =>
                                setDecisions((current) => ({
                                  ...current,
                                  [candidate.key]: { action: 'map', columnKey: value },
                                }))
                              }
                            >
                              <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm">
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
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleTextChange('')}
                className="h-11 rounded-xl border-slate-200 text-sm font-bold text-slate-600"
              >
                Clear
              </Button>
              <Button
                type="button"
                onClick={unresolvedCandidates.length > 0 ? handleFinalizeColumnChoices : handleApply}
                disabled={!pastedText.trim() || (mode === 'Update' && !updateEnabled)}
                className="h-11 flex-1 rounded-xl bg-slate-900 text-sm font-black text-white hover:bg-slate-800"
              >
                {unresolvedCandidates.length > 0 ? 'Apply with column choices' : activeMode.applyLabel}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

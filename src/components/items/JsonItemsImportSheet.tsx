import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { buildApplyResult } from '@/domain/import/apply'
import { normalizeImportData } from '@/domain/import/normalize'
import { parseImportText } from '@/domain/import/parse'
import { resolveImportColumns } from '@/domain/import/resolve'
import { hasMeaningfulStandardRows } from '@/domain/import/tableState'
import { validateImportData } from '@/domain/import/validate'
import type { ApplyImportResult, CustomColumnDecision, ImportMode } from '@/domain/import/types'
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
    description: string
    placeholder: string
    applyLabel: string
  }
> = {
  Add: {
    description: 'Create and append new line items from extracted JSON.',
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
    description: 'Patch existing visible rows only using row_number.',
    placeholder: `{
  "items": [
    {
      "row_number": 3,
      "quantity": 12
    },
    {
      "row_number": 5,
      "unit_price": 48000
    }
  ]
}`,
    applyLabel: 'Update rows',
  },
}

const DISABLED_UPDATE_MESSAGE = 'Add at least one real item before updating'

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [disabledMessageVisible, setDisabledMessageVisible] = useState(false)
  const [pulseAdd, setPulseAdd] = useState(false)
  const pulseTimeoutRef = useRef<number | null>(null)
  const disabledMessageTimeoutRef = useRef<number | null>(null)

  const updateEnabled = useMemo(() => hasMeaningfulStandardRows(items), [items])
  const activeMode = MODE_COPY[mode]

  useEffect(() => {
    if (!open) {
      setMode('Add')
      setPastedText('')
      setErrorMessage(null)
      setCopied(false)
      setDisabledMessageVisible(false)
      setPulseAdd(false)
      if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current)
      if (disabledMessageTimeoutRef.current) window.clearTimeout(disabledMessageTimeoutRef.current)
      pulseTimeoutRef.current = null
      disabledMessageTimeoutRef.current = null
      return
    }

    if (!updateEnabled && mode === 'Update') {
      setMode('Add')
    }
  }, [mode, open, updateEnabled])

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current)
      if (disabledMessageTimeoutRef.current) window.clearTimeout(disabledMessageTimeoutRef.current)
    }
  }, [])

  const triggerDisabledUpdateFeedback = () => {
    setDisabledMessageVisible(false)
    window.setTimeout(() => setDisabledMessageVisible(true), 0)
    if (disabledMessageTimeoutRef.current) window.clearTimeout(disabledMessageTimeoutRef.current)
    disabledMessageTimeoutRef.current = window.setTimeout(() => {
      setDisabledMessageVisible(false)
      disabledMessageTimeoutRef.current = null
    }, 3000)
    setPulseAdd(true)
    if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current)
    pulseTimeoutRef.current = window.setTimeout(() => {
      setPulseAdd(false)
      pulseTimeoutRef.current = null
    }, 220)
  }

  const handleModeChange = (nextMode: ImportMode) => {
    if (nextMode === 'Update' && !updateEnabled) {
      triggerDisabledUpdateFeedback()
      return
    }

    setMode(nextMode)
    setErrorMessage(null)
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(adapter.prompts[mode])
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy the prompt.',
        variant: 'destructive',
      })
    }
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

    const validated = validateImportData(mode, normalized.data, items)
    if (validated.ok === false) {
      setErrorMessage(validated.message)
      return
    }

    const decisions = Object.fromEntries(
      validated.data.unknownCandidates.map((candidate) => [
        candidate.key,
        makeDefaultDecision(candidate.key, candidate.sourceLabels[0] || candidate.key),
      ]),
    ) as Record<string, CustomColumnDecision>

    const resolved = resolveImportColumns({
      validated: validated.data,
      existingColumns: columns,
      decisions,
    })

    if (resolved.ok === false) {
      setErrorMessage(resolved.message)
      return
    }

    const result = buildApplyResult({
      mode,
      existingItems: items,
      existingColumns: columns,
      resolved: resolved.data,
      skippedRows: validated.data.skippedRows,
      createItem: adapter.createItem,
    })

    onApplyImport(result)
    toast({
      title: mode === 'Add' ? 'Rows added' : 'Rows updated',
      description:
        mode === 'Add'
          ? `${result.createdRowCount} row${result.createdRowCount === 1 ? '' : 's'} appended.`
          : `Patched ${result.updatedRowNumbers.length} row${result.updatedRowNumbers.length === 1 ? '' : 's'}.`,
    })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          'max-h-[88vh] rounded-t-[26px] border-none bg-slate-50 p-0 sm:mx-auto sm:max-w-xl',
          contentClassName,
        )}
      >
          <div className="flex h-full flex-col overflow-hidden">
            <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-900">{title}</h2>
                </div>
              </div>

              <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-100/80 p-1">
                <div className="grid grid-cols-2 gap-1">
                  {(['Add', 'Update'] as ImportMode[]).map((entry) => {
                    const selected = mode === entry
                    const disabled = entry === 'Update' && !updateEnabled

                    return (
                      <button
                        key={entry}
                        type="button"
                        aria-pressed={selected}
                        aria-disabled={disabled}
                        onClick={() => handleModeChange(entry)}
                        className={cn(
                          'h-8 rounded-full px-3 text-[13px] font-semibold',
                          selected ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600',
                          disabled && 'opacity-45',
                          entry === 'Add' && 'transition-transform duration-150',
                          entry === 'Add' && pulseAdd && 'scale-[1.02]',
                        )}
                      >
                        {entry}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 sm:px-5">
              <section className="min-h-[58px] rounded-xl bg-white px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">AI Prompt</div>
                    <p className="mt-1 text-[13px] leading-5 text-slate-600">{activeMode.description}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPrompt}
                    className="h-8 shrink-0 rounded-full px-3 text-xs font-semibold text-slate-700"
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </section>

              <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-white px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">JSON Input</div>
                  <div className="text-[11px] text-slate-400">{mode === 'Update' ? 'Existing rows only' : 'Append new rows'}</div>
                </div>
                <Textarea
                  value={pastedText}
                  onChange={(event) => {
                    setPastedText(event.target.value)
                    if (errorMessage) setErrorMessage(null)
                  }}
                  placeholder={activeMode.placeholder}
                  className="mt-2.5 min-h-[220px] flex-1 resize-none rounded-xl border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-[12px] leading-5 text-slate-800"
                />
              </section>
            </div>

            <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-3 sm:px-5">
              <div className="min-h-[20px] text-[12px] text-red-600">{errorMessage || ''}</div>
              <div className="min-h-[44px] pt-1">
                <div
                  className={cn(
                    'mx-auto max-w-[320px] rounded-full bg-slate-900 px-4 py-2 text-center text-[12px] font-medium text-white transition duration-200',
                    disabledMessageVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0',
                  )}
                >
                  {DISABLED_UPDATE_MESSAGE}
                </div>
              </div>
              <Button
                type="button"
                onClick={handleApply}
                disabled={!pastedText.trim()}
                className="h-11 w-full rounded-xl bg-slate-950 text-sm font-black text-white hover:bg-slate-900"
              >
                {activeMode.applyLabel}
              </Button>
            </div>
          </div>
      </SheetContent>
    </Sheet>
  )
}

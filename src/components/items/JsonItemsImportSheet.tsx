import { useEffect, useMemo, useState } from 'react'
import { Copy, HelpCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { getImportHelpSteps } from '@/components/invoice/mobileFormHelpers.js'
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

const MODE_COPY: Record<ImportMode, { description: string; placeholder: string }> = {
  Add: {
    description: 'Create and append new line items from extracted JSON.',
    placeholder: '{\n  "items": [{ "description": "...", "quantity": 1, "unit_price": 0 }]\n}',
  },
  Update: {
    description: 'Patch existing rows using row_number. Only include changed rows and changed fields.',
    placeholder: '{\n  "items": [{ "row_number": 3, "unit_price": 50000 }]\n}',
  },
}

function makeDefaultDecision(candidateKey: string, label: string): CustomColumnDecision {
  return { action: 'create', label: label || candidateKey }
}

function ImportHelpSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const steps = getImportHelpSteps()
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!open) setStepIndex(0)
  }, [open])

  const step = steps[stepIndex]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] rounded-t-[24px] border-none bg-white p-0 sm:mx-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="border-b border-slate-200 px-4 py-4 text-left sm:px-5">How to use Import</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-5 pt-4 sm:px-5">
          <div className="rounded-[18px] border border-slate-200 p-4">
            <div className="mb-2 text-lg font-extrabold text-slate-900">{step.title}</div>
            <div className="mb-4 text-sm text-slate-600">{step.description}</div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {steps.map((entry, index) => (
                  <div key={entry.title} className={`h-2 w-2 rounded-full ${stepIndex === index ? 'bg-blue-600' : 'bg-slate-200'}`} />
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStepIndex((current) => Math.max(0, current - 1))} className="h-10 rounded-[12px] px-3 text-sm font-bold">
                  Back
                </Button>
                <Button type="button" variant="outline" onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))} className="h-10 rounded-[12px] px-3 text-sm font-bold">
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
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
  const [helpOpen, setHelpOpen] = useState(false)

  const updateEnabled = useMemo(() => hasMeaningfulStandardRows(items), [items])
  const activeMode = MODE_COPY[mode]

  useEffect(() => {
    if (!open) {
      setMode('Add')
      setPastedText('')
      setErrorMessage(null)
      setCopied(false)
      return
    }
    if (!updateEnabled && mode === 'Update') setMode('Add')
  }, [mode, open, updateEnabled])

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(adapter.prompts[mode])
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy the prompt.', variant: 'destructive' })
    }
  }

  const handleApply = () => {
    if (!pastedText.trim()) return setErrorMessage('Paste JSON before applying.')

    const parsed = parseImportText(pastedText, mode)
    if (parsed.ok === false) return setErrorMessage(parsed.error.message)

    const normalized = normalizeImportData(parsed.data, mode)
    if (normalized.ok === false) return setErrorMessage(normalized.message)

    const validated = validateImportData(mode, normalized.data, items)
    if (validated.ok === false) return setErrorMessage(validated.message)

    const decisions = Object.fromEntries(
      validated.data.unknownCandidates.map((candidate) => [candidate.key, makeDefaultDecision(candidate.key, candidate.sourceLabels[0] || candidate.key)]),
    ) as Record<string, CustomColumnDecision>

    const resolved = resolveImportColumns({ validated: validated.data, existingColumns: columns, decisions })
    if (resolved.ok === false) return setErrorMessage(resolved.message)

    const result = buildApplyResult({ mode, existingItems: items, existingColumns: columns, resolved: resolved.data, skippedRows: validated.data.skippedRows, createItem: adapter.createItem })
    onApplyImport(result)
    toast({ title: mode === 'Add' ? 'Rows added' : 'Rows updated' })
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={side}
          className={cn('max-h-[90vh] rounded-t-[24px] border-none bg-white p-0 sm:mx-auto sm:max-w-xl', contentClassName)}
        >
            <div className="flex h-full flex-col overflow-hidden">
              <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 rounded-[14px] bg-slate-100 p-1">
                  {(['Add', 'Update'] as ImportMode[]).map((entry) => {
                    const selected = mode === entry
                    const disabled = entry === 'Update' && !updateEnabled
                    return (
                      <button
                        key={entry}
                        type="button"
                        aria-pressed={selected}
                        disabled={disabled}
                        onClick={() => {
                          setMode(entry)
                          setErrorMessage(null)
                        }}
                        className={cn(
                          'h-9 rounded-[10px] text-sm font-bold',
                          selected ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
                          disabled && 'cursor-not-allowed opacity-40',
                        )}
                      >
                        {entry}
                      </button>
                    )
                  })}
                </div>
              </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 sm:px-5">
              <section>
                <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  <span>AI Prompt</span>
                  <Button type="button" variant="ghost" size="sm" onClick={handleCopyPrompt} className="h-auto px-0 text-xs font-bold normal-case tracking-normal text-blue-600 hover:text-blue-700">
                    <Copy className="mr-1 h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div className="rounded-[16px] bg-slate-50 p-3 text-sm text-slate-600">{adapter.prompts[mode]}</div>
              </section>

              <section className="rounded-[16px] bg-slate-50 p-3 text-sm text-slate-600">{activeMode.description}</section>

              <section className="flex min-h-0 flex-1 flex-col">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">
                  JSON Input
                  {mode === 'Add' ? <span className="ml-2 normal-case tracking-normal text-slate-400">Append new rows</span> : null}
                </div>
                <Textarea
                  value={pastedText}
                  onChange={(event) => {
                    setPastedText(event.target.value)
                    if (errorMessage) setErrorMessage(null)
                  }}
                  placeholder={activeMode.placeholder}
                  className="mt-2 min-h-[220px] flex-1 resize-none rounded-[14px] border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs"
                />
              </section>

              <button type="button" onClick={() => setHelpOpen(true)} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                <HelpCircle className="h-4 w-4" />
                How to use Import
              </button>
            </div>

            <div className="border-t border-slate-200 px-4 pb-4 pt-3 sm:px-5">
              <div className="min-h-[20px] text-xs text-red-600">{errorMessage || ''}</div>
              <Button type="button" onClick={handleApply} disabled={!pastedText.trim()} className="h-10 w-full rounded-[12px] bg-slate-950 text-sm font-semibold text-white">
                Apply
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <ImportHelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}

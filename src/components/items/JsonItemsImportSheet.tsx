import { useEffect, useMemo, useState } from 'react'
import { Copy, HelpCircle, Play, X } from 'lucide-react'

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
  prompts: Record<ImportMode, string> | ((columns: ColumnConfig[], mode: ImportMode) => string)
  createItem: () => InvoiceItem
  applyResult: (args: any) => void
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

const MODE_COPY: Record<ImportMode, { description: string; placeholder: string; badge: string }> = {
  Add: {
    description: 'Create and append new line items from extracted JSON.',
    placeholder: '{\n  "items": [{ "description": "...", "quantity": 1, "unit_price": 0 }]\n}',
    badge: 'Append mode',
  },
  Update: {
    description: 'Patch existing rows using row_number. Only include changed rows and fields.',
    placeholder: '{\n  "items": [{ "row_number": 3, "unit_price": 50000 }]\n}',
    badge: 'Update mode',
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
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-[32px] border border-[var(--bd-border)] border-b-0 bg-[var(--bd-bg)] p-0 shadow-2xl sm:mx-auto sm:max-w-[520px] [&>[data-slot=sheet-close]]:hidden"
      >
        <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-[var(--bd-border)]" />
        <SheetHeader className="px-6 pb-2 pt-5">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-left text-[22px] font-black tracking-tight text-[var(--bd-text)]">
              Import Guide
            </SheetTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bd-bg2)] text-[var(--bd-text3)] hover:text-[var(--bd-text)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>

        <div className="px-6 pb-10 pt-4">
          <div className="mb-6">
            <div className="text-[11px] font-black uppercase tracking-widest text-[var(--bd-indigo)]">Step {stepIndex + 1} of {steps.length}</div>
            <h3 className="mt-1 text-[18px] font-bold text-[var(--bd-text)]">{step.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--bd-text2)]">{step.description}</p>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-[var(--bd-border)] bg-[var(--bd-surface)] shadow-inner">
            <div className="flex aspect-video items-center justify-center bg-[var(--bd-bg2)]">
               <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bd-surface)] text-[var(--bd-text4)] shadow-sm">
                  <Play className="ml-1 h-6 w-6 fill-current" />
               </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn('h-1.5 transition-all duration-300 rounded-full', stepIndex === index ? 'w-6 bg-[var(--bd-indigo)]' : 'w-1.5 bg-[var(--bd-border)]')}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                className="h-10 rounded-full border-[var(--bd-border)] bg-[var(--bd-surface)] px-5 text-sm font-bold text-[var(--bd-text2)]"
              >
                Prev
              </Button>
              <Button
                onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}
                className="h-10 rounded-full bg-[var(--bd-text)] px-8 text-sm font-bold text-white shadow-md"
              >
                {stepIndex === steps.length - 1 ? 'Got it' : 'Next'}
              </Button>
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
      const prompt = typeof adapter.prompts === 'function'
        ? adapter.prompts(columns, mode)
        : adapter.prompts[mode]
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' })
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
    toast({ title: mode === 'Add' ? 'Rows added' : 'Rows updated' })
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={side}
          className={cn(
            'max-h-[92vh] rounded-t-[32px] border border-[var(--bd-border)] border-b-0 bg-[var(--bd-bg)] p-0 shadow-2xl sm:mx-auto sm:max-w-[560px] [&>[data-slot=sheet-close]]:hidden',
            contentClassName,
          )}
        >
          <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-[var(--bd-border)]" />

          <div className="px-6 pb-10 pt-2">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-[24px] font-black tracking-tight text-[var(--bd-text)]">{title}</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bd-bg2)] text-[var(--bd-text3)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 flex gap-1 rounded-[16px] bg-[var(--bd-bg2)] p-1.5">
              {(['Add', 'Update'] as ImportMode[]).map((entry) => {
                const selected = mode === entry
                const unavailable = entry === 'Update' && !updateEnabled

                return (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => {
                      if (unavailable) return
                      setMode(entry)
                      setErrorMessage(null)
                    }}
                    className={cn(
                      'flex-1 rounded-[10px] py-2.5 text-[14px] font-bold transition-all',
                      selected
                        ? 'bg-[var(--bd-surface)] text-[var(--bd-text)] shadow-sm border border-[var(--bd-border-soft)]'
                        : 'text-[var(--bd-text3)] hover:text-[var(--bd-text2)]',
                      unavailable && 'opacity-30 cursor-not-allowed',
                    )}
                  >
                    {entry === 'Add' ? 'New Items' : 'Update Existing'}
                  </button>
                )
              })}
            </div>

            <div className="mb-6 rounded-[20px] border border-[var(--bd-border-soft)] bg-[var(--bd-surface)] p-5 shadow-sm">
               <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--bd-indigo)]">1. Strategy</div>
                    <p className="mt-1 text-[13px] font-medium leading-relaxed text-[var(--bd-text2)]">{activeMode.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="flex shrink-0 items-center gap-2 rounded-full bg-[var(--bd-indigo)] px-4 py-2.5 text-[12px] font-bold text-white shadow-md transition active:scale-95"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copied' : 'Copy AI Prompt'}
                  </button>
               </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="jsonEditor" className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--bd-text3)]">2. Paste Result (JSON)</label>
              <span className="text-[10px] font-bold text-[var(--bd-text4)]">{activeMode.badge}</span>
            </div>

            <Textarea
              id="jsonEditor"
              value={pastedText}
              onChange={(e) => {
                setPastedText(e.target.value)
                if (errorMessage) setErrorMessage(null)
              }}
              placeholder={activeMode.placeholder}
              className="min-h-[160px] rounded-[20px] border-[var(--bd-border)] bg-[var(--bd-bg2)] p-4 font-mono text-[13px] leading-relaxed text-[var(--bd-text)] focus:bg-[var(--bd-surface)] focus-visible:ring-1 focus-visible:ring-[var(--bd-indigo-border)]"
            />

            <div className="flex items-center justify-between py-4">
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="flex items-center gap-2 text-[13px] font-bold text-[var(--bd-indigo)]"
              >
                <HelpCircle className="h-4 w-4" />
                How to use
              </button>
              
              <div className="text-[11px] font-medium text-[var(--bd-rose)]">
                {errorMessage || ''}
              </div>
            </div>

            <button
              type="button"
              onClick={handleApply}
              disabled={!pastedText.trim()}
              className="mt-2 flex h-14 w-full items-center justify-center rounded-[var(--bd-radius-lg)] bg-[var(--bd-text)] text-[16px] font-black text-white shadow-xl transition active:scale-98 disabled:opacity-40"
            >
              Apply to Document
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <ImportHelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}
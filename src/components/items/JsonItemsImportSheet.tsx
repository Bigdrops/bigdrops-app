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

const MODE_COPY: Record<ImportMode, { description: string; placeholder: string; badge: string }> = {
  Add: {
    description: 'Create and append new line items from extracted JSON.',
    placeholder: '{\n  "items": [{ "description": "...", "quantity": 1, "unit_price": 0 }]\n}',
    badge: 'Append new rows',
  },
  Update: {
    description: 'Patch existing rows using row_number. Only include changed rows and changed fields.',
    placeholder: '{\n  "items": [{ "row_number": 3, "unit_price": 50000 }]\n}',
    badge: 'Update rows',
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
        className="max-h-[90vh] rounded-t-[28px] border border-slate-200 border-b-0 bg-white p-0 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] sm:mx-auto sm:max-w-[520px] [&>[data-slot=sheet-close]]:hidden"
      >
        <div className="mx-auto mt-3 h-[5px] w-12 rounded-full bg-[#d0d9e2]" />
        <SheetHeader className="px-5 pb-0 pt-4">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-left text-[1.3rem] font-bold tracking-[-0.02em] text-[#0f1a24]">
              How to use Import
            </SheetTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 rounded-full text-[#68788c] hover:bg-[#f1f4f8] hover:text-[#0f1a24]"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="px-5 pb-7 pt-4">
          <div className="text-[14px] leading-7 text-[#334e66]">
            <p className="mb-3">
              <strong>{stepIndex + 1}. {step.title}</strong>
            </p>
            <p className="whitespace-pre-line">{step.description}</p>
          </div>

          <div className="mt-5 rounded-[18px] border border-slate-200 bg-slate-100 p-0">
            <div className="flex aspect-video items-center justify-center rounded-[18px] bg-slate-100 text-sm text-slate-400">
              <div className="text-center">
                <div className="text-[13px] text-slate-300">YouTube video placeholder</div>
                <div className="mx-auto mt-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((entry, index) => (
                <div
                  key={entry.title}
                  className={cn('h-2 w-2 rounded-full', stepIndex === index ? 'bg-blue-600' : 'bg-slate-200')}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                className="h-9 rounded-[10px] border-slate-200 px-3 text-sm font-bold text-slate-700"
              >
                ← Back
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}
                className="h-9 rounded-[10px] border-slate-200 px-3 text-sm font-bold text-slate-700"
              >
                Next →
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
      await navigator.clipboard.writeText(adapter.prompts[mode])
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
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
    toast({ title: mode === 'Add' ? 'Rows added' : 'Rows updated' })
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={side}
          className={cn(
            'max-h-[90vh] rounded-t-[28px] border border-slate-200 border-b-0 bg-white p-0 shadow-[0_-8px_30px_rgba(0,0,0,0.04),0_-2px_8px_rgba(0,0,0,0.02)] sm:mx-auto sm:max-w-[560px] [&>[data-slot=sheet-close]]:hidden',
            contentClassName,
          )}
        >
          <div className="mx-auto mt-3 h-[5px] w-12 rounded-full bg-[#d0d9e2]" />

          <div className="px-4 pb-[18px] pt-0 sm:px-5">
            <div className="mb-[14px] flex items-center justify-between">
              <h2 className="text-[1.3rem] font-[650] tracking-[-0.02em] text-[#0f1a24]">{title}</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-9 w-9 rounded-full p-0 text-[#68788c] hover:bg-[#f1f4f8] hover:text-[#0f1a24]"
              >
                <X className="h-[18px] w-[18px]" />
              </Button>
            </div>

            <div className="mb-[18px] grid grid-cols-2 gap-2 rounded-[40px] border border-slate-200 bg-[#f1f5f9] p-[5px]">
              {(['Add', 'Update'] as ImportMode[]).map((entry) => {
                const selected = mode === entry
                const unavailable = entry === 'Update' && !updateEnabled

                return (
                  <button
                    key={entry}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      if (unavailable) {
                        setErrorMessage('Update stays unavailable until the table has at least one real line item.')
                        return
                      }
                      setMode(entry)
                      setErrorMessage(null)
                    }}
                    className={cn(
                      'rounded-[36px] px-2 py-[9px] text-[0.95rem] font-semibold transition-all duration-150',
                      selected
                        ? 'border border-[#dde7f0] bg-white text-[#0f1825] shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.05)]'
                        : 'bg-transparent text-[#475569]',
                      unavailable && 'opacity-40',
                    )}
                  >
                    {entry}
                  </button>
                )
              })}
            </div>

            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-[#8a9aac]">
                AI Prompt
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={handleCopyPrompt}
                className="h-auto rounded-full border-[1.5px] border-[#d7e0ea] bg-white px-4 py-[7px] text-[0.82rem] font-semibold text-[#223444] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:bg-[#0f1a24] hover:text-white"
              >
                <Copy className="mr-[6px] h-[15px] w-[15px]" />
                {copied ? 'Copied' : 'Copy prompt'}
              </Button>
            </div>

            <div className="mb-[18px] rounded-[18px] border border-[#eef3f8] bg-[#fafcff] px-4 py-3 text-[0.9rem] font-[450] leading-[1.4] text-[#2a4055]">
              {activeMode.description}
            </div>

            <div className="mb-[6px] flex items-baseline justify-between gap-3">
              <label
                htmlFor="jsonEditor"
                className="text-[0.7rem] font-bold uppercase tracking-[0.04em] text-[#5c738a]"
              >
                JSON Input
              </label>
              <span className="rounded-full bg-[#f0f5fa] px-[10px] py-[2px] text-[0.75rem] text-[#5f7d9c]">
                {activeMode.badge}
              </span>
            </div>

            <Textarea
              id="jsonEditor"
              value={pastedText}
              onChange={(event) => {
                setPastedText(event.target.value)
                if (errorMessage) setErrorMessage(null)
              }}
              placeholder={activeMode.placeholder}
              spellCheck={false}
              className="mb-[10px] min-h-[164px] resize-y rounded-[22px] border-[1.8px] border-[#e2eaf2] bg-[#fbfdff] px-4 py-[14px] font-mono text-[0.85rem] leading-[1.5] text-[#11212e] focus:border-[#7f8fa3] focus:bg-white"
            />

            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="inline-flex items-center gap-2 bg-transparent pb-[10px] pt-[6px] text-[0.85rem] font-semibold text-[#2e4b6a] underline underline-offset-[3px] decoration-[#b3c6d9] hover:text-[#0f1a24] hover:decoration-[#0f1a24]"
            >
              <HelpCircle className="h-[15px] w-[15px]" />
              How to use Import
            </button>

            <div className="mb-[10px] min-h-[20px] text-[0.75rem] font-medium text-[#c83a3a]">
              {errorMessage || ''}
            </div>

            <Button
              type="button"
              onClick={handleApply}
              disabled={!pastedText.trim()}
              className="h-[46px] w-full rounded-[48px] border border-[#263b4a] bg-[#0f1a24] text-[0.95rem] font-bold text-white shadow-[0_6px_14px_rgba(15,26,36,0.08)] hover:bg-[#1f3140]"
            >
              Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ImportHelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}
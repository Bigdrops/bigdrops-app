import { useEffect, useMemo, useState } from 'react'
import { Copy, HelpCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

const MODE_COPY: Record<ImportMode, { description: string; placeholder: string; applyLabel: string }> = {
  Add: {
    description: 'Append new rows from JSON.',
    placeholder: '{\n  "items": [{ "description": "Cable", "quantity": 3, "unit_price": 5000 }]\n}',
    applyLabel: 'Add rows',
  },
  Update: {
    description: 'Update existing rows using row_number.',
    placeholder: '{\n  "items": [{ "row_number": 2, "unit_price": 8000 }]\n}',
    applyLabel: 'Update rows',
  },
}

function makeDefaultDecision(candidateKey: string, label: string): CustomColumnDecision {
  return { action: 'create', label: label || candidateKey }
}

function ImportHelpSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[90vw] max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>How to use Import</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 text-sm text-slate-700">
          <section className="rounded-lg border border-slate-200 p-3">
            <div className="font-semibold text-slate-900">1) Add vs Update</div>
            <p className="mt-1">Use <strong>Add</strong> for new rows. Use <strong>Update</strong> to patch existing rows by row_number.</p>
          </section>
          <section className="rounded-lg border border-slate-200 p-3">
            <div className="font-semibold text-slate-900">2) Copy → extract → paste → apply</div>
            <p className="mt-1">Copy prompt, run it in your AI tool, paste JSON back here, then apply.</p>
          </section>
          <section className="rounded-lg border border-slate-200 p-3">
            <div className="font-semibold text-slate-900">3) Common mistakes</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Missing <code>items</code> array</li>
              <li>Using Update with no row_number</li>
              <li>Invalid JSON trailing commas</li>
            </ul>
          </section>
          <section className="rounded-lg border border-slate-200 p-2">
            <iframe
              title="Import tutorial"
              className="aspect-video w-full rounded"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </section>
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
          className={cn('max-h-[90vh] rounded-t-2xl border-none bg-white p-0 sm:mx-auto sm:max-w-xl', contentClassName)}
        >
          <div className="flex h-full flex-col overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                <button type="button" onClick={() => setHelpOpen(true)} className="inline-flex items-center gap-1 text-xs text-slate-600 underline">
                  <HelpCircle className="h-3.5 w-3.5" /> How to use Import
                </button>
              </div>

              <div className="mt-3 inline-flex rounded-md border border-slate-200 p-0.5">
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
                      className={cn('h-8 px-3 text-sm', selected ? 'bg-slate-900 text-white' : 'text-slate-700', disabled && 'cursor-not-allowed opacity-40')}
                    >
                      {entry}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 sm:px-5">
              <section className="rounded-lg border border-slate-200 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-600">{activeMode.description}</p>
                  <Button type="button" variant="ghost" size="sm" onClick={handleCopyPrompt} className="h-8 shrink-0 px-2 text-xs">
                    <Copy className="mr-1 h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </section>

              <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 p-2.5">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">JSON Input</div>
                <Textarea
                  value={pastedText}
                  onChange={(event) => {
                    setPastedText(event.target.value)
                    if (errorMessage) setErrorMessage(null)
                  }}
                  placeholder={activeMode.placeholder}
                  className="mt-2 min-h-[220px] flex-1 resize-none rounded-md border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs"
                />
              </section>
            </div>

            <div className="border-t border-slate-200 px-4 pb-4 pt-3 sm:px-5">
              <div className="min-h-[20px] text-xs text-red-600">{errorMessage || ''}</div>
              <Button type="button" onClick={handleApply} disabled={!pastedText.trim()} className="h-10 w-full rounded-md bg-slate-950 text-sm font-semibold text-white">
                {activeMode.applyLabel}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <ImportHelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}

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
import { feedback } from '@/lib/feedback'
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

import { JsonImportLayout } from '@/components/import/JsonImportLayout'

export default function JsonItemsImportSheet({
  open,
  onOpenChange,
  onApplyImport,
  items,
  columns,
  adapter,
  title = 'Import JSON Items',
  side = 'bottom',
  contentClassName = '',
}: JsonItemsImportSheetProps) {
  const [mode, setMode] = useState<ImportMode>('Add')
  const [pastedText, setPastedText] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const updateEnabled = useMemo(() => hasMeaningfulStandardRows(items), [items])
  const activeMode = MODE_COPY[mode]

  useEffect(() => {
    if (!open) {
      setMode('Add')
      setPastedText('')
      setErrorMessage(null)
      return
    }
    if (!updateEnabled && mode === 'Update') setMode('Add')
  }, [mode, open, updateEnabled])

  const activePrompt = useMemo(() => {
    return typeof adapter.prompts === 'function'
      ? adapter.prompts(columns, mode)
      : adapter.prompts[mode]
  }, [adapter.prompts, columns, mode])

  const handleApply = () => {
    if (!pastedText.trim()) {
      setErrorMessage('Paste JSON before applying.')
      return
    }

    try {
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

      console.warn("[1] INPUT:", parsed.data?.groups?.length)

      const result = buildApplyResult({
        mode,
        existingItems: items,
        existingColumns: columns,
        resolved: resolved.data,
        skippedRows: validated.data.skippedRows,
        createItem: adapter.createItem,
      })

      console.warn("[1.5] ABOUT TO CALL onApplyImport, result.groups:", result.groups?.length, "onApplyImport type:", typeof onApplyImport)
      console.warn("[1.5b] onApplyImport.name:", (onApplyImport as any).name, "source:", (onApplyImport as any).toString().substring(0, 150))
      onApplyImport(result)
      console.warn("[1.6] onApplyImport RETURNED")
      feedback.success(mode === 'Add' ? 'Rows added' : 'Rows updated')
      onOpenChange(false)
    } catch (e: any) {
      setErrorMessage(e.message || 'Import failed.')
    }
  }

  return (
    <JsonImportLayout
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`Add or update ${adapter.documentType} items using JSON.`}
      promptText={activePrompt}
      rawInput={pastedText}
      onRawInputChange={(val) => {
        setPastedText(val)
        setErrorMessage(null)
      }}
      onPreview={handleApply}
      onSave={handleApply}
      saveLabel="Apply to Document"
      error={errorMessage}
      className={contentClassName}
      tutorial={{
        title: 'How JSON item import works',
        description: `You can add new items or update existing ones by pasting extracted JSON for your ${adapter.documentType}.`,
        steps: [
          'Copy the AI prompt',
          'Paste into ChatGPT or your preferred AI tool along with your source document',
          'Paste the returned JSON result here',
          'Review the items and apply them to the document'
        ],
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      }}
      previewContent={
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-overlay-muted))]">Import Strategy</span>
            <div className="flex gap-1 rounded-[var(--bd-radius-xl)] bg-[hsl(var(--bd-overlay-section-bg))] border border-[hsl(var(--bd-overlay-border))] p-1.5 shadow-sm">
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
                      'flex-1 rounded-[var(--bd-radius-md)] py-2 text-[13px] font-bold transition-all',
                      selected
                        ? 'bg-[hsl(var(--bd-bg))] text-[hsl(var(--bd-overlay-text))] shadow-sm border border-[hsl(var(--bd-overlay-border))]'
                        : 'text-[hsl(var(--bd-overlay-muted))] hover:text-[hsl(var(--bd-overlay-text))]',
                      unavailable && 'opacity-30 cursor-not-allowed',
                    )}
                  >
                    {entry === 'Add' ? 'New Items' : 'Update Existing'}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[hsl(var(--bd-overlay-border))] bg-[hsl(var(--bd-overlay-section-bg))] p-4">
             <div className="text-[10px] font-extrabold uppercase tracking-widest text-[hsl(var(--bd-status-info-text))] opacity-80 mb-1">Mode Details</div>
             <p className="text-[12px] font-medium leading-relaxed text-[hsl(var(--bd-overlay-text))]">{activeMode.description}</p>
          </div>
        </div>
      }
    />
  )
}

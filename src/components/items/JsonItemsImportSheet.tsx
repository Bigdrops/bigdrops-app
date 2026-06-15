import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, HelpCircle, Info, Play, X } from 'lucide-react'

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
import type { ApplyImportResult, CustomColumnDecision, ImportMode, OverwriteTarget, ResolvedImportData, ValidatedImportData } from '@/domain/import/types'
import type { ColumnConfig, InvoiceItem } from '@/domain/invoice'
import { feedback } from '@/lib/feedback'
import { cn } from '@/lib/utils'
import { getStandardRowEntries, MAX_IMPORTED_ROWS } from '@/domain/import/utils'
import { detectOverwriteTargets } from '@/domain/import/overwrite'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type ImportAdapter = {
  documentType: 'invoice' | 'quotation'
  prompts: Record<ImportMode, string> | ((columns: ColumnConfig[], mode: ImportMode, currentItemCount: number) => string)
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
  const [overwriteTargets, setOverwriteTargets] = useState<OverwriteTarget[]>([])
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false)
  const pendingApplyRef = useRef<{
    resolved: ResolvedImportData
    validated: ValidatedImportData
  } | null>(null)

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

  const currentItemCount = useMemo(() => getStandardRowEntries(items).length, [items])

  const activePrompt = useMemo(() => {
    return typeof adapter.prompts === 'function'
      ? adapter.prompts(columns, mode, currentItemCount)
      : adapter.prompts[mode]
  }, [adapter.prompts, columns, mode, currentItemCount])

  const performApply = (
    resolved: ResolvedImportData,
    validated: ValidatedImportData,
  ) => {
    const result = buildApplyResult({
      mode,
      existingItems: items,
      existingColumns: columns,
      resolved,
      skippedRows: validated.skippedRows,
      createItem: adapter.createItem,
    })

    onApplyImport(result)
    feedback.success(mode === 'Add' ? 'Rows added' : 'Rows updated')
    onOpenChange(false)
  }

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

      // CHANGE 5: Overflow check — truncate items > MAX_IMPORTED_ROWS
      if (parsed.data.items.length > MAX_IMPORTED_ROWS) {
        feedback.warning(
          `Import contains ${parsed.data.items.length} rows, maximum is ${MAX_IMPORTED_ROWS}. Only the first ${MAX_IMPORTED_ROWS} will be processed.`,
        )
        parsed.data.items = parsed.data.items.slice(0, MAX_IMPORTED_ROWS)
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

      // CHANGE 3: Overwrite confirmation
      if (mode === 'Update') {
        const targets = detectOverwriteTargets(resolved.data, items)
        if (targets.length > 0) {
          setOverwriteTargets(targets)
          pendingApplyRef.current = { resolved: resolved.data, validated: validated.data }
          setShowOverwriteDialog(true)
          return
        }
      }

      performApply(resolved.data, validated.data)
    } catch (e: any) {
      setErrorMessage(e.message || 'Import failed.')
    }
  }

  const handleOverwriteConfirm = () => {
    const pending = pendingApplyRef.current
    if (!pending) return

    performApply(pending.resolved, pending.validated)
    setShowOverwriteDialog(false)
    pendingApplyRef.current = null
  }

  const handleOverwriteCancel = () => {
    setShowOverwriteDialog(false)
    pendingApplyRef.current = null
  }

  return (
    <>
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
      alwaysVisibleContent={
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-bd-overlay-muted">Import Strategy</span>
            <div className="flex gap-1 rounded-[var(--bd-radius-xl)] bg-bd-overlay-section-bg border border-bd-overlay-border p-1.5 shadow-sm">
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
                        ? 'bg-bd-bg text-bd-overlay-text shadow-sm border border-bd-overlay-border'
                        : 'text-bd-overlay-muted hover:text-bd-overlay-text',
                      unavailable && 'opacity-30 cursor-not-allowed',
                    )}
                  >
                    {entry === 'Add' ? 'New Items' : 'Update Existing'}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-bd-overlay-border bg-bd-overlay-section-bg p-4">
             <div className="text-[10px] font-extrabold uppercase tracking-widest text-bd-status-info-text opacity-80 mb-1">Mode Details</div>
             <p className="text-[12px] font-medium leading-relaxed text-bd-overlay-text">{activeMode.description}</p>
          </div>

          {mode === 'Update' && (
            <div className="flex items-center gap-2 rounded-lg border border-bd-overlay-border bg-bd-overlay-section-bg px-3 py-2">
              <Info className="h-3.5 w-3.5 shrink-0 text-bd-status-info-text" />
              <p className="text-xs text-bd-overlay-muted leading-snug">
                Fields you leave empty will stay unchanged. Only include the columns you want to overwrite.
              </p>
            </div>
          )}
        </div>
      }
    />
    <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Overwrite existing values?</AlertDialogTitle>
          <AlertDialogDescription>
            The import contains {overwriteTargets.length} field{overwriteTargets.length > 1 ? 's' : ''} that already have values. Applying will overwrite them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="max-h-48 overflow-y-auto space-y-1.5 py-2">
          {overwriteTargets.map((t, i) => (
            <div key={`${t.id}-${t.columnKey}-${i}`} className="rounded-lg border border-bd-overlay-border bg-bd-overlay-section-bg px-3 py-2 text-xs">
              <span className="font-semibold text-bd-overlay-text">Row {t.rowNumber}</span>
              <span className="text-bd-overlay-muted mx-1">·</span>
              <span className="text-bd-overlay-muted">{t.columnLabel}</span>
              <span className="text-bd-overlay-muted mx-1">→</span>
              <span className="text-bd-status-warning-text font-medium">{String(t.currentValue)}</span>
              <span className="text-bd-overlay-muted mx-1">→</span>
              <span className="text-bd-status-success-text font-medium">{String(t.nextValue)}</span>
            </div>
          ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleOverwriteCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleOverwriteConfirm}>
            Overwrite {overwriteTargets.length} field{overwriteTargets.length > 1 ? 's' : ''}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

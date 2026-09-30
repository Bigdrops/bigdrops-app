import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  X,
} from 'lucide-react'

import ColumnManager from '@/components/ColumnManager'
import { BoqImportSheet } from '@/components/boq/BoqImportSheet'
import { Field, PreviewMetric } from '@/components/boq/BoqEditorParts'
import {
  BoqDesktopFormPresentation,
  BoqMobileFoldFormPresentation,
} from '@/components/boq/BoqFormPresentations'
import { FormFooter } from '@/components/document/FormFooter'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Boq } from '@/domain/boq/types'
import type { TableDocumentRow } from '@/domain/table-document/types'
import { createEmptyTableRow } from '@/domain/table-document/rows'
import { computeBoqCommercialView } from '@/domain/boq/calculations'
import { BOQ_BUILTIN_COLUMNS, BOQ_HIDE_FULL_DENY_LIST, normalizeBoqColumns } from '@/domain/boq/columns'
import {
  applyInstantMarkup,
  getBoqRowKey,
  isInstantMarkupEligible,
  previewInstantMarkup,
  type InstantMarkupMode,
  type InstantMarkupPreview,
  type InstantMarkupSelection,
} from '@/domain/boq/instant-markup'
import { useInvoiceColumns } from '@/components/useInvoiceColumns'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { feedback } from '@/lib/feedback'
import { getUnsupportedImageErrorMessage, isSupportedImageFile } from '@/lib/documentImageUploadPolicy'
import { uploadItemPhoto } from '@/lib/itemPhotoUpload'
import { cn } from '@/lib/utils'

type BoqEditorProps = {
  initialBoq: Boq
  onSave: (boq: Boq) => Promise<void>
  onCancel?: () => void
  saving?: boolean
  mode?: 'create' | 'edit'
}

const moneyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})

function formatMoney(value: number) {
  return moneyFormatter.format(value || 0)
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`
}

function normalizeRows(rows: TableDocumentRow[]) {
  return rows.map((row, index) => ({ ...row, sort_order: index }))
}

function renumber(rows: TableDocumentRow[]) {
  let item = 0
  return rows.map((row) => {
    if (row.row_type === 'section') return ''
    item += 1
    return String(item).padStart(2, '0')
  })
}

function buildDefaultSelection(rows: TableDocumentRow[]): InstantMarkupSelection {
  return rows.reduce<InstantMarkupSelection>((selection, row, index) => {
    const rowKey = getBoqRowKey(row, index)
    selection[rowKey] = isInstantMarkupEligible(row)
    return selection
  }, {})
}

export function BoqEditor({
  initialBoq,
  onSave,
  onCancel,
  saving = false,
  mode = 'create',
}: BoqEditorProps) {
  const [boq, setBoq] = useState<Boq>(initialBoq)
  const [markupOpen, setMarkupOpen] = useState(false)
  const [markupMode, setMarkupMode] = useState<InstantMarkupMode>('percentage')
  const [markupValue, setMarkupValue] = useState('20')
  const [included, setIncluded] = useState<InstantMarkupSelection>(() => buildDefaultSelection(initialBoq.table_rows || []))
  const [preview, setPreview] = useState<InstantMarkupPreview | null>(null)
  const [markupError, setMarkupError] = useState('')
  const [undoRows, setUndoRows] = useState<TableDocumentRow[] | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [uploadingRow, setUploadingRow] = useState<number | null>(null)
  const { layoutMode, hasFold } = useLayoutMode()
  const {
    columns,
    setColumns,
    getColumn,
    toggleVisible,
    toggleDisabled,
    updateColumn,
    addCustomColumn,
    removeCustomColumn,
    resetColumns,
    moveColumn,
    customColumns,
  } = useInvoiceColumns(
    normalizeBoqColumns(initialBoq.custom_fields?.columnConfig),
    BOQ_BUILTIN_COLUMNS,
  )

  const rows = boq.table_rows || []
  const itemNumbers = useMemo(() => renumber(rows), [rows])
  const computed = useMemo(() => computeBoqCommercialView(boq), [boq])
  const totals = computed.costing
  const eligibleCount = rows.filter(isInstantMarkupEligible).length
  const isFoldComposition = hasFold || layoutMode === 'tablet'

  const patchBoq = (patch: Partial<Boq>) => setBoq((current) => ({ ...current, ...patch }))

  useEffect(() => {
    setBoq((current) => ({
      ...current,
      custom_fields: {
        ...(current.custom_fields || {}),
        columnConfig: columns,
      },
    }))
  }, [columns])

  const updateRows = (nextRows: TableDocumentRow[]) => {
    const normalized = normalizeRows(nextRows)
    patchBoq({ table_rows: normalized })
    setIncluded((current) => {
      const next: InstantMarkupSelection = {}
      normalized.forEach((row, index) => {
        const rowKey = getBoqRowKey(row, index)
        next[rowKey] = current[rowKey] ?? isInstantMarkupEligible(row)
      })
      return next
    })
  }

  const updateRow = (index: number, patch: Partial<TableDocumentRow>) => {
    const next = [...rows]
    next[index] = { ...next[index], ...patch }
    updateRows(next)
  }

  const addRow = (rowType: 'item' | 'section') => {
    updateRows([...rows, createEmptyTableRow(rows.length, rowType)])
  }

  const removeRow = (index: number) => {
    updateRows(rows.filter((_, rowIndex) => rowIndex !== index))
  }

  const moveRow = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= rows.length) return
    const next = [...rows]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    updateRows(next)
  }

  const openMarkup = () => {
    setMarkupOpen(true)
    setPreview(null)
    setMarkupError('')
    setIncluded(buildDefaultSelection(rows))
  }

  const handlePreview = () => {
    const result = previewInstantMarkup(rows, { mode: markupMode, value: markupValue, included })
    if (result.ok === false) {
      setMarkupError(result.error)
      setPreview(null)
      return
    }
    setMarkupError(result.affectedCount > 0 ? '' : 'No included eligible row will change.')
    setPreview(result)
  }

  const handleApplyMarkup = () => {
    const result = applyInstantMarkup(rows, { mode: markupMode, value: markupValue, included })
    if (result.ok === false) {
      setMarkupError(result.error)
      return
    }
    setUndoRows(rows)
    updateRows(result.nextRows)
    setPreview(null)
    setMarkupOpen(false)
  }

  const undoMarkup = () => {
    if (!undoRows) return
    updateRows(undoRows)
    setUndoRows(null)
  }

  const includeAll = (include: boolean) => {
    setIncluded(rows.reduce<InstantMarkupSelection>((selection, row, index) => {
      selection[getBoqRowKey(row, index)] = include && isInstantMarkupEligible(row)
      return selection
    }, {}))
  }

  const isColumnVisible = (key: string) => {
    const column = getColumn(key)
    if (!column) return true
    return (column.visibilityMode || 'show') !== 'hide_full'
  }

  const toggleColumnFull = (key: string) => {
    if (BOQ_HIDE_FULL_DENY_LIST.has(key)) {
      feedback.info('Locked column', { description: 'This column is required for Cost & Pricing Sheet calculations.' })
      return
    }
    toggleDisabled(key)
  }

  const handlePhotoUpload = async (index: number, file: File) => {
    if (!isSupportedImageFile(file)) {
      feedback.error('Unsupported file', { description: getUnsupportedImageErrorMessage(file.name) })
      return
    }
    setUploadingRow(index)
    try {
      const imageUrl = await uploadItemPhoto(file)
      updateRow(index, { image_url: imageUrl })
    } catch (error) {
      feedback.error('Upload failed', { description: error instanceof Error ? error.message : 'Could not upload image.' })
    } finally {
      setUploadingRow(null)
    }
  }

  const presentationProps = {
    boq,
    mode,
    rows,
    itemNumbers,
    totals,
    eligibleCount,
    uploadingRow,
    onCancel,
    onPatchBoq: patchBoq,
    onUpdateRow: updateRow,
    onAddRow: addRow,
    onRemoveRow: removeRow,
    onMoveRow: moveRow,
    onOpenImport: () => setImportOpen(true),
    onOpenColumns: () => setShowColumnManager(true),
    onOpenMarkup: openMarkup,
    onUndoMarkup: undoMarkup,
    hasUndo: Boolean(undoRows),
    isColumnVisible,
    onPhotoUpload: handlePhotoUpload,
    formatters: { money: formatMoney, percent: formatPercent },
    customColumns,
    isFold: isFoldComposition,
  }

  return (
    <div className="min-h-screen bg-bd-surface-muted text-bd-text">
      {layoutMode === 'desktop' && !isFoldComposition ? (
        <BoqDesktopFormPresentation {...presentationProps} />
      ) : (
        <BoqMobileFoldFormPresentation {...presentationProps} />
      )}

      <FormFooter
        onCancel={onCancel || (() => undefined)}
        onSaveDraft={() => void onSave(boq)}
        onSaveSent={() => void onSave(boq)}
        onFloatingSave={() => void onSave(boq)}
        saving={saving}
        primaryLabel={mode === 'edit' ? 'Save Changes' : 'Create Sheet'}
      />

      <BoqImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        boq={boq}
        onApply={(nextBoq) => {
          setBoq(nextBoq)
          if (nextBoq.custom_fields?.columnConfig) {
            setColumns(normalizeBoqColumns(nextBoq.custom_fields.columnConfig))
          }
        }}
      />

      {showColumnManager ? (
        <ColumnManager
          columns={columns}
          onUpdate={updateColumn}
          onToggle={toggleVisible}
          onToggleFull={toggleColumnFull}
          onAddCustom={addCustomColumn}
          onRemoveCustom={removeCustomColumn}
          onReset={resetColumns}
          onMove={moveColumn}
          onClose={() => setShowColumnManager(false)}
          items={rows.map((row) => ({
            row_type: row.row_type === 'section' ? 'group_header' : 'standard',
            description: row.description,
            vat_rate: row.vat_rate == null ? null : Number(row.vat_rate),
            discount_rate: row.discount_rate == null ? null : Number(row.discount_rate),
            install_rate: row.install_rate == null ? null : Number(row.install_rate),
            install_rate_override: Boolean(row.install_rate_override),
          }))}
        />
      ) : null}

      <Dialog open={markupOpen} onOpenChange={(open) => {
        setMarkupOpen(open)
        if (!open) {
          setPreview(null)
          setMarkupError('')
        }
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Instant Markup</DialogTitle>
            <DialogDescription>
              Derive SP from CP for included rows. CP and excluded rows stay unchanged.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Markup mode">
                <Button type="button" variant={markupMode === 'percentage' ? 'default' : 'outline'} onClick={() => setMarkupMode('percentage')}>
                  Percentage
                </Button>
                <Button type="button" variant={markupMode === 'value' ? 'default' : 'outline'} onClick={() => setMarkupMode('value')}>
                  Value
                </Button>
              </div>
              <Field label={markupMode === 'percentage' ? 'Percentage' : 'Value per unit'}>
                <Input
                  inputMode="decimal"
                  value={markupValue}
                  onChange={(event) => {
                    setMarkupValue(event.target.value)
                    setPreview(null)
                    setMarkupError('')
                  }}
                  aria-invalid={Boolean(markupError)}
                />
              </Field>
              <p className="text-xs text-bd-text-muted">
                {markupMode === 'percentage'
                  ? 'SP = CP x (1 + percentage / 100). Reapply derives from CP again.'
                  : 'SP = CP + value. Value is per item unit, not a document total.'}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => includeAll(true)}>Include All</Button>
                <Button type="button" variant="outline" onClick={() => includeAll(false)}>Exclude All</Button>
              </div>
              {markupError ? <p className="text-xs font-medium text-destructive" role="alert">{markupError}</p> : null}
              <Button type="button" className="w-full" onClick={handlePreview}>Preview</Button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-bd-border">
              {preview ? (
                <div className="space-y-3 p-3">
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    <PreviewMetric label="Affected" value={`${preview.affectedCount}`} />
                    <PreviewMetric label="Selling before" value={formatMoney(preview.sellingBefore)} />
                    <PreviewMetric label="Selling after" value={formatMoney(preview.sellingAfter)} />
                    <PreviewMetric label="Profit before" value={formatMoney(preview.grossProfitBefore)} />
                    <PreviewMetric label="Profit after" value={formatMoney(preview.grossProfitAfter)} />
                    <PreviewMetric label="Change" value={formatMoney(preview.aggregateChange)} />
                  </div>
                  <div className="space-y-2">
                    {preview.rows.map((item) => (
                      <div key={item.rowKey} className="rounded-md border border-bd-border p-2 text-xs">
                        <div className="font-medium">{item.description}</div>
                        <div className="mt-1 grid grid-cols-2 gap-1 text-bd-text-muted sm:grid-cols-4">
                          <span>CP {item.cp}</span>
                          <span>SP {item.currentSp || '0'} {'->'} {item.proposedSp}</span>
                          <span>Profit {formatMoney(item.profit)}</span>
                          <span>Margin {formatPercent(item.marginPercent)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-bd-border">
                  {rows.map((row, index) => {
                    const rowKey = getBoqRowKey(row, index)
                    const eligible = isInstantMarkupEligible(row)
                    return (
                      <label key={rowKey} className={cn('flex items-start gap-3 p-3 text-sm', !eligible && 'opacity-60')}>
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={Boolean(included[rowKey])}
                          disabled={!eligible}
                          onChange={(event) => setIncluded((current) => ({ ...current, [rowKey]: event.target.checked }))}
                          aria-label={`${eligible ? 'Include' : 'Cannot include'} ${row.description || row.section_title || `row ${index + 1}`}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{row.row_type === 'section' ? row.section_title || 'Group header' : row.description || `Row ${index + 1}`}</span>
                          <span className="block text-xs text-bd-text-muted">
                            {row.row_type === 'section'
                              ? 'Group headers never participate.'
                              : eligible
                                ? `CP ${row.cp || 0} · current SP ${row.sp || 0}`
                                : 'Excluded - No cost price'}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMarkupOpen(false)}>
              <X />
              Cancel
            </Button>
            {preview ? (
              <Button type="button" variant="outline" onClick={() => setPreview(null)}>Back</Button>
            ) : null}
            <Button type="button" onClick={handleApplyMarkup} disabled={!preview || preview.affectedCount === 0}>
              <Check />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

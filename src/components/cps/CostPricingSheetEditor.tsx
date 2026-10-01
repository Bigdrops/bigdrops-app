import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronUp, GripVertical, Plus, RotateCcw, Trash2, X } from 'lucide-react'

import ClientSelector from '@/components/ClientSelector'
import { CpsImportSheet } from '@/components/cps/CpsImportSheet'
import {
  CostPricingSheetDesktopForm,
  CostPricingSheetMobileFoldForm,
} from '@/components/cps/CostPricingSheetFormPresentations'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CPS_BUILTIN_COLUMNS, CPS_HIDE_FULL_DENY_LIST, normalizeCpsColumns } from '@/domain/cps/columns'
import { computeCpsCommercialView } from '@/domain/cps/calculations'
import { computeCpsRowEconomics } from '@/domain/cps/calculateCpsTotals'
import {
  applyInstantMarkup,
  getCpsRowKey,
  isInstantMarkupEligible,
  previewInstantMarkup,
  type InstantMarkupMode,
  type InstantMarkupPreview,
  type InstantMarkupSelection,
} from '@/domain/cps/instant-markup'
import type { Cps } from '@/domain/cps/types'
import { appendCpsRow, insertCpsRow, normalizeCpsRowOrder, removeCpsRow } from '@/domain/cps/row-operations'
import type { TableDocumentRow } from '@/domain/table-document/types'
import type { ClientRecord } from '@/domain/clientWorkspace'
import { useInvoiceColumns, type InvoiceColumn } from '@/components/useInvoiceColumns'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { getUnsupportedImageErrorMessage, isSupportedImageFile } from '@/lib/documentImageUploadPolicy'
import { feedback } from '@/lib/feedback'
import { uploadItemPhoto } from '@/lib/itemPhotoUpload'
import { cn } from '@/lib/utils'

type CostPricingSheetEditorProps = {
  initialCps: Cps
  onSave: (cps: Cps) => Promise<void>
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
    selection[getCpsRowKey(row, index)] = isInstantMarkupEligible(row)
    return selection
  }, {})
}

export function CostPricingSheetEditor({
  initialCps,
  onSave,
  onCancel,
  saving = false,
  mode = 'create',
}: CostPricingSheetEditorProps) {
  const [cps, setCps] = useState<Cps>(initialCps)
  const [markupOpen, setMarkupOpen] = useState(false)
  const [markupMode, setMarkupMode] = useState<InstantMarkupMode>('percentage')
  const [markupValue, setMarkupValue] = useState('20')
  const [included, setIncluded] = useState<InstantMarkupSelection>(() => buildDefaultSelection(initialCps.table_rows || []))
  const [preview, setPreview] = useState<InstantMarkupPreview | null>(null)
  const [markupError, setMarkupError] = useState('')
  const [undoRows, setUndoRows] = useState<TableDocumentRow[] | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [uploadingRow, setUploadingRow] = useState<number | null>(null)
  const { isDesktop, hasFold, isTablet } = useLayoutMode()
  const {
    columns,
    setColumns,
    getColumn,
    toggleDisabled,
    updateColumn,
    addCustomColumn,
    removeCustomColumn,
    resetColumns,
    moveColumn,
    customColumns,
  } = useInvoiceColumns(
    normalizeCpsColumns(initialCps.custom_fields?.columnConfig),
    CPS_BUILTIN_COLUMNS,
  )

  const rows = cps.table_rows || []
  const itemNumbers = useMemo(() => renumber(rows), [rows])
  const computed = useMemo(() => computeCpsCommercialView(cps), [cps])
  const totals = computed.costing
  const rowEconomics = useMemo(() => {
    return rows.reduce<Record<number, ReturnType<typeof computeCpsRowEconomics>>>((acc, row, index) => {
      acc[index] = computeCpsRowEconomics(row)
      return acc
    }, {})
  }, [rows])
  const eligibleCount = rows.filter(isInstantMarkupEligible).length
  const useDesktopComposition = isDesktop && !hasFold && !isTablet

  const patchCps = (patch: Partial<Cps>) => setCps((current) => ({ ...current, ...patch }))

  const patchClient = (clientId: string, clientName: string, client: ClientRecord | null) => {
    setCps((current) => ({
      ...current,
      client_name: clientName,
      custom_fields: {
        ...(current.custom_fields || {}),
        client_id: clientId || '',
        client_snapshot: client
          ? {
              id: client.id,
              name: client.name,
              contact_person: client.contact_person || '',
              phone: client.phone || '',
              email: client.email || '',
              city: client.city || '',
              state: client.state || '',
            }
          : null,
      },
    }))
  }

  useEffect(() => {
    setCps((current) => ({
      ...current,
      custom_fields: {
        ...(current.custom_fields || {}),
        columnConfig: columns,
      },
    }))
  }, [columns])

  const updateRows = (nextRows: TableDocumentRow[]) => {
    const normalized = normalizeCpsRowOrder(nextRows)
    patchCps({ table_rows: normalized })
    setIncluded((current) => {
      const next: InstantMarkupSelection = {}
      normalized.forEach((row, index) => {
        const rowKey = getCpsRowKey(row, index)
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
    updateRows(appendCpsRow(rows, rowType))
  }

  const insertRow = (index: number, rowType: 'item' | 'section', groupId?: string | null) => {
    updateRows(insertCpsRow(rows, index, rowType, { groupId: groupId ?? null }))
  }

  const removeRow = (index: number) => {
    updateRows(removeCpsRow(rows, index))
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
      selection[getCpsRowKey(row, index)] = include && isInstantMarkupEligible(row)
      return selection
    }, {}))
  }

  const isColumnVisible = (key: string) => {
    const column = getColumn(key)
    if (!column) return true
    return (column.visibilityMode || 'show') !== 'hide_full'
  }

  const toggleColumnFull = (key: string) => {
    if (CPS_HIDE_FULL_DENY_LIST.has(key)) {
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

  const saveCurrent = () => void onSave(cps)

  const presentationProps = {
    cps,
    mode,
    rows,
    itemNumbers,
    rowEconomics,
    totals,
    eligibleCount,
    uploadingRow,
    saving,
    onCancel,
    onSave: saveCurrent,
    onPatchCps: patchCps,
    onUpdateRow: updateRow,
    onAddRow: addRow,
    onInsertRow: insertRow,
    onRemoveRow: removeRow,
    onMoveRow: moveRow,
    onOpenImport: () => setImportOpen(true),
    onOpenColumns: () => setShowColumnManager(true),
    onOpenClientPicker: () => setClientPickerOpen(true),
    onClearClient: () => patchClient('', '', null),
    onOpenMarkup: openMarkup,
    onUndoMarkup: undoMarkup,
    hasUndo: Boolean(undoRows),
    isColumnVisible,
    onPhotoUpload: handlePhotoUpload,
    formatters: { money: formatMoney, percent: formatPercent },
    customColumns,
  }

  return (
    <>
      {useDesktopComposition ? (
        <CostPricingSheetDesktopForm {...presentationProps} />
      ) : (
        <CostPricingSheetMobileFoldForm {...presentationProps} />
      )}

      <CpsImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        cps={cps}
        onApply={(nextCps) => {
          setCps(nextCps)
          setIncluded(buildDefaultSelection(nextCps.table_rows || []))
          if (nextCps.custom_fields?.columnConfig) {
            setColumns(normalizeCpsColumns(nextCps.custom_fields.columnConfig))
          }
        }}
      />

      <ClientSelector
        clientId={String(cps.custom_fields?.client_id || '') || null}
        clientName={cps.client_name || ''}
        compact
        dense
        hideHeader
        hideTrigger
        allowClear
        open={clientPickerOpen}
        onOpenChange={setClientPickerOpen}
        onClientChange={patchClient}
      />

      {showColumnManager ? (
        <CpsColumnSheet
          columns={columns}
          onUpdate={updateColumn}
          onToggleFull={toggleColumnFull}
          onAddCustom={addCustomColumn}
          onRemoveCustom={removeCustomColumn}
          onReset={resetColumns}
          onMove={moveColumn}
          onClose={() => setShowColumnManager(false)}
        />
      ) : null}

      <InstantMarkupDialog
        open={markupOpen}
        dock={useDesktopComposition}
        rows={rows}
        included={included}
        mode={markupMode}
        value={markupValue}
        preview={preview}
        error={markupError}
        onOpenChange={(open) => {
          setMarkupOpen(open)
          if (!open) {
            setPreview(null)
            setMarkupError('')
          }
        }}
        onModeChange={(nextMode) => {
          setMarkupMode(nextMode)
          setPreview(null)
          setMarkupError('')
        }}
        onValueChange={(nextValue) => {
          setMarkupValue(nextValue)
          setPreview(null)
          setMarkupError('')
        }}
        onIncludedChange={(rowKey, nextIncluded) => setIncluded((current) => ({ ...current, [rowKey]: nextIncluded }))}
        onIncludeAll={includeAll}
        onPreview={handlePreview}
        onBack={() => setPreview(null)}
        onApply={handleApplyMarkup}
      />
    </>
  )
}

function CpsColumnSheet({
  columns,
  onUpdate,
  onToggleFull,
  onAddCustom,
  onRemoveCustom,
  onReset,
  onMove,
  onClose,
}: {
  columns: InvoiceColumn[]
  onUpdate: (key: string, field: string, value: string | boolean) => void
  onToggleFull: (key: string) => void
  onAddCustom: () => void
  onRemoveCustom: (key: string) => void
  onReset: () => void
  onMove: (key: string, targetIdx: number) => void
  onClose: () => void
}) {
  const description = columns.find((column) => column.key === 'description')
  const ordered = columns.filter((column) => column.key !== 'description')

  return (
    <div className="cps-form">
      <div className="cps-overlay" onClick={onClose}>
        <div className="cps-sheet" role="dialog" aria-modal="true" aria-labelledby="cps-column-sheet-title" onClick={(event) => event.stopPropagation()}>
          <div className="cps-grab" />
          <div className="cps-sheet-head">
            <div>
              <b id="cps-column-sheet-title">Column Settings</b>
              <small>Row fields, order, and labels</small>
            </div>
            <button type="button" className="cps-x" onClick={onClose} aria-label="Close column settings"><X size={12} /></button>
          </div>
          <div className="cps-column-scroll">
            {description ? (
              <>
                <div className="cps-cm-sec">Description</div>
                <div className="cps-cm-list">
                  <div className="cps-cm-row">
                    <input
                      className="cps-cm-lab"
                      value={description.label || 'Description'}
                      onChange={(event) => onUpdate(description.key, 'label', event.target.value)}
                      aria-label="Description column label"
                    />
                    <span className="cps-cm-badge">Fixed</span>
                  </div>
                </div>
              </>
            ) : null}

            <div className="cps-cm-sec">Columns</div>
            <div className="cps-cm-list">
              {ordered.map((column) => {
                const absIndex = columns.findIndex((entry) => entry.key === column.key)
                const visible = (column.visibilityMode || 'show') !== 'hide_full'
                const isCustom = column.key.startsWith('custom_')
                return (
                  <div className="cps-cm-row" key={column.key}>
                    <div className="cps-cm-grip"><GripVertical size={13} /></div>
                    <div className="cps-cm-ord">
                      <button type="button" disabled={absIndex <= 1} onClick={() => onMove(column.key, absIndex - 1)} aria-label={`Move ${column.label} up`}><ChevronUp size={12} /></button>
                      <button type="button" disabled={absIndex >= columns.length - 1} onClick={() => onMove(column.key, absIndex + 1)} aria-label={`Move ${column.label} down`}><ChevronDown size={12} /></button>
                    </div>
                    <div className="cps-cm-main">
                      <div className="cps-cm-labrow">
                        <input
                          className="cps-cm-lab"
                          value={column.label || ''}
                          onChange={(event) => onUpdate(column.key, 'label', event.target.value)}
                          aria-label={`${column.label || column.key} column label`}
                        />
                      </div>
                    </div>
                    {isCustom ? (
                      <button type="button" className="cps-cm-icon" onClick={() => onRemoveCustom(column.key)} aria-label={`Remove ${column.label}`}>
                        <Trash2 size={13} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={cn('cps-cm-sw', visible && 'on')}
                      onClick={() => onToggleFull(column.key)}
                      aria-pressed={visible}
                      aria-label={`${visible ? 'Hide' : 'Show'} ${column.label}`}
                    />
                  </div>
                )
              })}
            </div>
            <button type="button" className="cps-cm-reset" onClick={onAddCustom}><Plus size={12} /> Add custom column</button>
            <button type="button" className="cps-cm-reset" onClick={onReset}><RotateCcw size={12} /> Reset to defaults</button>
          </div>
          <button type="button" className="cps-cta" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

function InstantMarkupDialog({
  open,
  dock,
  rows,
  included,
  mode,
  value,
  preview,
  error,
  onOpenChange,
  onModeChange,
  onValueChange,
  onIncludedChange,
  onIncludeAll,
  onPreview,
  onBack,
  onApply,
}: {
  open: boolean
  dock: boolean
  rows: TableDocumentRow[]
  included: InstantMarkupSelection
  mode: InstantMarkupMode
  value: string
  preview: InstantMarkupPreview | null
  error: string
  onOpenChange: (open: boolean) => void
  onModeChange: (mode: InstantMarkupMode) => void
  onValueChange: (value: string) => void
  onIncludedChange: (rowKey: string, included: boolean) => void
  onIncludeAll: (included: boolean) => void
  onPreview: () => void
  onBack: () => void
  onApply: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'cps-form border-0 bg-transparent p-0 shadow-none sm:max-w-none',
          dock ? 'h-dvh max-h-dvh w-[440px] translate-x-0 translate-y-0 right-0 left-auto top-0' : 'w-full max-w-[560px]',
        )}
      >
        <div className={cn('cps-overlay', dock && 'dock')}>
          <div className="cps-sheet">
            <div className="cps-grab" />
            <DialogHeader className="cps-sheet-head text-left">
              <div>
                <DialogTitle asChild><b>Instant Markup</b></DialogTitle>
                <DialogDescription asChild>
                  <small>Derive SP from CP. CP and excluded rows stay unchanged.</small>
                </DialogDescription>
              </div>
              <button type="button" className="cps-x" onClick={() => onOpenChange(false)} aria-label="Close Instant Markup"><X size={12} /></button>
            </DialogHeader>

            {!preview ? (
              <>
                <div className="cps-modegrid" role="group" aria-label="Markup mode">
                  <button type="button" className={cn('cps-mode', mode === 'percentage' && 'on')} onClick={() => onModeChange('percentage')}>Percentage</button>
                  <button type="button" className={cn('cps-mode', mode === 'value' && 'on')} onClick={() => onModeChange('value')}>Value</button>
                </div>
                <label>
                  <span className="cps-label">{mode === 'percentage' ? 'Percentage' : 'Value per unit'}</span>
                  <Input
                    className="cps-field"
                    inputMode="decimal"
                    value={value}
                    onChange={(event) => onValueChange(event.target.value)}
                    aria-invalid={Boolean(error)}
                  />
                </label>
                <p className="text-[11px] font-semibold leading-relaxed" style={{ color: 'var(--sub)' }}>
                  {mode === 'percentage'
                    ? 'SP = CP x (1 + percentage / 100). Reapply derives from CP again.'
                    : 'SP = CP + value. Value is per item unit, not a document total.'}
                </p>
                <div className="cps-sheet-actions">
                  <button type="button" className="cps-cbtn ghost" onClick={() => onIncludeAll(true)}>Include All</button>
                  <button type="button" className="cps-cbtn ghost" onClick={() => onIncludeAll(false)}>Exclude All</button>
                </div>
                {error ? <p className="text-xs font-bold" style={{ color: 'var(--red)' }} role="alert">{error}</p> : null}
                <div>
                  {rows.map((row, index) => {
                    const rowKey = getCpsRowKey(row, index)
                    if (row.row_type === 'section') {
                      return <div key={rowKey} className="cps-mk-gcap">{row.section_title || 'Group'} - headers never participate</div>
                    }
                    const eligible = isInstantMarkupEligible(row)
                    return (
                      <div key={rowKey} className="cps-mk-row">
                        <span className="min-w-0 flex-1">
                          <b className="block text-xs">{row.description || `(row ${index + 1})`}</b>
                          <small style={{ color: 'var(--faint)' }}>
                            {eligible ? `CP ${row.cp || 0} · current SP ${row.sp || 0}` : 'Excluded - No cost price'}
                          </small>
                        </span>
                        <button
                          type="button"
                          className={cn('cps-mk-tog', included[rowKey] ? 'on' : 'off')}
                          disabled={!eligible}
                          onClick={() => onIncludedChange(rowKey, !included[rowKey])}
                          aria-pressed={Boolean(included[rowKey])}
                        >
                          {eligible ? (included[rowKey] ? 'Included' : 'Excluded') : 'No CP'}
                        </button>
                      </div>
                    )
                  })}
                </div>
                <button type="button" className="cps-cbtn primary" onClick={onPreview}>Preview</button>
              </>
            ) : (
              <>
                <div className="cps-mk-agg">
                  <PreviewMetric label="Affected items" value={`${preview.affectedCount}`} />
                  <PreviewMetric label="Selling total" value={`${formatMoney(preview.sellingBefore)} -> ${formatMoney(preview.sellingAfter)}`} />
                  <PreviewMetric label="Gross profit" value={`${formatMoney(preview.grossProfitBefore)} -> ${formatMoney(preview.grossProfitAfter)}`} />
                  <PreviewMetric label="Aggregate change" value={formatMoney(preview.aggregateChange)} />
                </div>
                <div>
                  {preview.rows.length > 0 ? preview.rows.map((row) => (
                    <div key={row.rowKey} className="cps-mk-prow">
                      <div className="d">{row.description}</div>
                      <div className="ln"><span>CP {row.cp}</span><span>{row.currentSp || '0'} -&gt; <b>{row.proposedSp}</b></span></div>
                      <div className="ln"><span>Profit {formatMoney(row.profit)}</span><span>Margin {formatPercent(row.marginPercent)}</span></div>
                    </div>
                  )) : <div className="cps-mk-prow"><div className="d">No included rows with a cost price. Nothing would change.</div></div>}
                </div>
              </>
            )}

            <DialogFooter className="cps-sheet-actions sm:justify-stretch">
              <button type="button" className="cps-cbtn ghost" onClick={() => onOpenChange(false)}><X size={12} /> Cancel</button>
              {preview ? <button type="button" className="cps-cbtn ghost" onClick={onBack}>Back</button> : null}
              <button type="button" className="cps-cbtn primary" onClick={onApply} disabled={!preview || preview.affectedCount === 0}><Check size={12} /> Apply</button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="cps-mk-cell">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  )
}

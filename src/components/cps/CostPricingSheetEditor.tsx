import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Plus, RotateCcw, Trash2, Undo2, X } from 'lucide-react'

import ClientSelector from '@/components/ClientSelector'
import { CpsImportSheet } from '@/components/cps/CpsImportSheet'
import { CpsMarkupSheet } from '@/components/cps/CpsMarkupSheet'
import { CostPricingSheetForm } from '@/components/cps/CostPricingSheetForm'
import { newRowId } from '@/components/cps/CostPricingSheetForm'
import type {
  CpsClient as MobileCpsClient,
  CpsColumn as MobileCpsColumn,
  CpsColumnKey as MobileCpsColumnKey,
  CpsDocumentFields as MobileCpsDocument,
  CpsRow as MobileCpsRow,
  CpsSavePayload as MobileCpsSavePayload,
} from '@/components/cps/CostPricingSheetForm'
import { CPS_LABELS as MOBILE_COLUMN_LABELS } from '@/components/cps/CostPricingSheetForm'
import {
  CpsClearAllDialog,
  CostPricingSheetDesktopForm,
} from '@/components/cps/CostPricingSheetFormPresentations'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
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
import { CPS_BUILTIN_COLUMNS, CPS_HIDE_FULL_DENY_LIST, normalizeCpsColumns } from '@/domain/cps/columns'
import { computeCpsCommercialView } from '@/domain/cps/calculations'
import { computeCpsRowEconomics } from '@/domain/cps/calculateCpsTotals'
import {
  getCpsRowKey,
  isInstantMarkupEligible,
  previewInstantMarkup,
  resetInstantMarkupSellingPrices,
  type InstantMarkupMode,
  type InstantMarkupPreview,
  type InstantMarkupSelection,
} from '@/domain/cps/instant-markup'
import type { Cps } from '@/domain/cps/types'
import { appendCpsRow, insertCpsRow, normalizeCpsRowOrder, removeCpsRow } from '@/domain/cps/row-operations'
import { createEmptyTableRow } from '@/domain/table-document/rows'
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

/* ------------------------------------------------------------------ */
/* Mobile/Fold branch: approved CostPricingSheetForm behind the editor  */
/*                                                                     */
/* The editor owns production state. The approved form owns Mobile/Fold */
/* presentation only. Domain-native string group_id stays authoritative */
/* at this boundary. Numeric gid values never persist.                 */
/* ------------------------------------------------------------------ */

function toMobileNumber(value: unknown) {
  const numeric = Number(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(numeric) ? numeric : 0
}

function toMobileDocument(cps: Cps): MobileCpsDocument {
  return {
    title: cps.title || '',
    sheetNumber: cps.cps_number || '',
    issueDate: cps.issue_date || '',
    site: cps.project_name || '',
    notes: cps.notes || '',
  }
}

function toMobileClient(cps: Cps): MobileCpsClient | null {
  const snapshot = cps.custom_fields?.client_snapshot as {
    id?: unknown
    name?: unknown
    person?: unknown
    contact_person?: unknown
    phone?: unknown
    email?: unknown
    addr?: unknown
  } | null | undefined
  const name = String(cps.client_name || snapshot?.name || '')
  if (!name) return null

  return {
    id: String(cps.custom_fields?.client_id || snapshot?.id || 'current-cps-client'),
    name,
    person: String(snapshot?.person || snapshot?.contact_person || ''),
    phone: String(snapshot?.phone || ''),
    email: String(snapshot?.email || ''),
    addr: String(snapshot?.addr || ''),
  }
}

const MOBILE_COLUMN_KEYS: Record<string, MobileCpsColumnKey> = {
  description: 'description',
  quantity: 'quantity',
  unit: 'unit',
  make_brand: 'make',
  cp: 'cp',
  sp: 'sp',
}

function toMobileColumnList(
  configs: Array<{ key: string; label?: string; visibilityMode?: string }>,
): MobileCpsColumn[] {
  const seen = new Set<MobileCpsColumnKey>()
  const out: MobileCpsColumn[] = []
  for (const column of configs) {
    const key = MOBILE_COLUMN_KEYS[column.key]
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({
      key,
      label: column.label || MOBILE_COLUMN_LABELS[key],
      visible: (column.visibilityMode || 'show') !== 'hide_full',
    })
  }
  if (!seen.has('specification')) {
    const descriptionVisible = out.find((column) => column.key === 'description')?.visible !== false
    out.push({
      key: 'specification',
      label: MOBILE_COLUMN_LABELS.specification,
      visible: descriptionVisible,
    })
  }
  return out
}

function toMobileColumns(cps: Cps): MobileCpsColumn[] {
  return toMobileColumnList(normalizeCpsColumns(cps.custom_fields?.columnConfig))
}

interface MobileSeed {
  document: MobileCpsDocument
  rows: MobileCpsRow[]
  client: MobileCpsClient | null
  clients: MobileCpsClient[]
  columns: MobileCpsColumn[]
}

function toMobileRows(source: TableDocumentRow[]): MobileCpsRow[] {
  const usedIds = new Set<string>()
  const claimId = (candidates: Array<string | undefined>) => {
    for (const candidate of candidates) {
      if (candidate && !usedIds.has(candidate)) {
        usedIds.add(candidate)
        return candidate
      }
    }
    const id = newRowId()
    usedIds.add(id)
    return id
  }
  const sectionIdByIndex = new Map<number, string>()
  const sectionIds = new Set<string>()
  source.forEach((row, index) => {
    if (row.row_type !== 'section') return
    const id = claimId([row.group_id || undefined, row.id || undefined, row._uiKey || undefined])
    sectionIdByIndex.set(index, id)
    sectionIds.add(id)
  })
  return source.map((row, index): MobileCpsRow => {
    if (row.row_type === 'section') {
      return {
        id: sectionIdByIndex.get(index) ?? claimId([]),
        type: 'group',
        title: row.section_title || row.description || 'Group',
      }
    }
    return {
      id: claimId([row._uiKey || undefined, row.id || undefined]),
      type: 'item',
      groupId: row.group_id && sectionIds.has(row.group_id) ? row.group_id : null,
      desc: row.description || '',
      sub: row.specification || '',
      subOpen: false,
      qty: toMobileNumber(row.quantity),
      unit: row.unit || '',
      make: row.make_brand || '',
      cp: toMobileNumber(row.cp),
      sp: toMobileNumber(row.sp),
      image: row.image_url || null,
    }
  })
}

function buildMobileSeed(cps: Cps): MobileSeed {
  const client = toMobileClient(cps)
  return {
    document: toMobileDocument(cps),
    rows: toMobileRows(cps.table_rows || []),
    client,
    clients: client ? [client] : [],
    columns: toMobileColumns(cps),
  }
}

function applyMobileClientSnapshot(current: Cps, snapshot: MobileCpsClient | null): Cps {
  return {
    ...current,
    client_name: snapshot?.name || '',
    custom_fields: {
      ...(current.custom_fields || {}),
      client_id: snapshot?.id || '',
      client_snapshot: snapshot
        ? {
            id: snapshot.id,
            name: snapshot.name,
            contact_person: snapshot.person || '',
            phone: snapshot.phone || '',
            email: snapshot.email || '',
            city: snapshot.addr || '',
            state: '',
          }
        : null,
    },
  }
}

function mergeMobilePayload(current: Cps, payload: MobileCpsSavePayload): Cps {
  const live = current.table_rows || []
  const matchLive = (pid: string, section: boolean) =>
    live.find((row) =>
      section
        ? row.row_type === 'section' &&
          ((row.group_id && row.group_id === pid) || (row.id && row.id === pid) || (row._uiKey && row._uiKey === pid))
        : row.row_type === 'item' &&
          ((row._uiKey && row._uiKey === pid) || (row.id && row.id === pid)),
    )
  const sectionGroupId = new Map<string, string>()
  for (const mrow of payload.rows) {
    if (mrow.type !== 'group' || sectionGroupId.has(mrow.id)) continue
    sectionGroupId.set(mrow.id, matchLive(mrow.id, true)?.group_id || mrow.id)
  }
  const nextRows: TableDocumentRow[] = payload.rows.map((mrow, index) => {
    if (mrow.type === 'group') {
      const groupId = sectionGroupId.get(mrow.id) ?? mrow.id
      const base = matchLive(mrow.id, true)
      if (base) {
        return { ...base, sort_order: index, section_title: mrow.title, group_id: groupId }
      }
      return {
        ...createEmptyTableRow(index, 'section'),
        section_title: mrow.title,
        group_id: groupId,
      }
    }
    const base = matchLive(mrow.id, false)
    const row = base ? { ...base } : { ...createEmptyTableRow(index, 'item') }
    const resolvedGroup = mrow.groupId == null ? undefined : sectionGroupId.get(mrow.groupId)
    return {
      ...row,
      row_type: 'item',
      sort_order: index,
      description: mrow.desc,
      specification: mrow.sub,
      quantity: Number(mrow.qty) || 0,
      unit: mrow.unit,
      make_brand: mrow.make,
      cp: String(mrow.cp ?? ''),
      sp: String(mrow.sp ?? ''),
      image_url: mrow.image ?? null,
      group_id: resolvedGroup ?? null,
    }
  })
  const snapshot = payload.client
  return applyMobileClientSnapshot(
    {
      ...current,
      title: payload.title,
      cps_number: payload.sheetNumber,
      issue_date: payload.issueDate,
      project_name: payload.site,
      notes: payload.notes,
      table_rows: normalizeCpsRowOrder(nextRows),
    },
    snapshot,
  )
}

function CostPricingSheetMobileHost({
  cps,
  mode,
  onCancel,
  saving,
  liveClient,
  liveColumns,
  importedRows,
  rowsRevision,
  syncedTitle,
  onRequestClientSelection,
  onRequestColumns,
  onRequestImport,
  onRequestMarkup,
  onRequestClearAll,
  hasUndo,
  onUndoMarkup,
  onClientChange,
  onCommit,
}: {
  cps: Cps
  mode: 'create' | 'edit'
  onCancel?: () => void
  saving: boolean
  liveClient: MobileCpsClient | null
  liveColumns: MobileCpsColumn[]
  importedRows: MobileCpsRow[]
  rowsRevision: number
  syncedTitle: string
  onRequestClientSelection: () => void
  onRequestColumns: () => void
  onRequestImport: () => void
  onRequestMarkup: () => void
  onRequestClearAll: () => void
  hasUndo: boolean
  onUndoMarkup: () => void
  onClientChange: (client: MobileCpsClient | null) => void
  onCommit: (cps: Cps) => void
}) {
  const [seed] = useState(() => buildMobileSeed(cps))
  const cpsRef = useRef(cps)
  useEffect(() => {
    cpsRef.current = cps
  })
  return (
    <CostPricingSheetForm
      key={`cps-mobile-${cps.id}`}
      modeLabel={mode === 'create' ? 'Draft' : 'Editing'}
      onBack={onCancel}
      onSave={(payload) => onCommit(mergeMobilePayload(cpsRef.current, payload))}
      saving={saving}
      initialDocument={seed.document}
      initialRows={seed.rows}
      clients={seed.clients}
      initialClient={seed.client}
      client={liveClient}
      onClientChange={onClientChange}
      onRequestClientSelection={onRequestClientSelection}
      initialColumns={seed.columns}
      columns={liveColumns}
      onRequestColumns={onRequestColumns}
      onRequestImport={onRequestImport}
      onRequestMarkup={onRequestMarkup}
      onRequestClearAll={onRequestClearAll}
      hasUndo={hasUndo}
      onUndoMarkup={onUndoMarkup}
      rows={importedRows}
      rowsRevision={rowsRevision}
      syncedTitle={syncedTitle}
    />
  )
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
  const [markupWorkingRows, setMarkupWorkingRows] = useState<TableDocumentRow[] | null>(null)
  const [resetUndoRows, setResetUndoRows] = useState<TableDocumentRow[] | null>(null)
  const [undoRows, setUndoRows] = useState<TableDocumentRow[] | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [productionRowsRevision, setProductionRowsRevision] = useState(0)
  const notifyProductionRowsChanged = () => setProductionRowsRevision((revision) => revision + 1)
  const [mobileClearOpen, setMobileClearOpen] = useState(false)
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
  const activeMarkupRows = markupWorkingRows || rows
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
    setMarkupWorkingRows(rows.map((row) => ({ ...row })))
    setResetUndoRows(null)
    setIncluded(buildDefaultSelection(rows))
  }

  const handlePreview = () => {
    const result = previewInstantMarkup(activeMarkupRows, { mode: markupMode, value: markupValue, included })
    if (result.ok === false) {
      setMarkupError(result.error)
      setPreview(null)
      return
    }
    setMarkupError(result.affectedCount > 0 ? '' : 'No included eligible row will change.')
    setPreview(result)
  }

  const handleStackMarkup = () => {
    if (!preview) return
    setMarkupWorkingRows(preview.nextRows)
    setPreview(null)
    setMarkupError('')
    setResetUndoRows(null)
  }

  const resetMarkupWorkingRows = () => {
    setResetUndoRows(activeMarkupRows.map((row) => ({ ...row })))
    setMarkupWorkingRows(resetInstantMarkupSellingPrices(activeMarkupRows))
    setPreview(null)
    setMarkupError('')
  }

  const undoResetMarkup = () => {
    if (!resetUndoRows) return
    setMarkupWorkingRows(resetUndoRows.map((row) => ({ ...row })))
    setResetUndoRows(null)
    setPreview(null)
    setMarkupError('')
  }

  const handleApplyMarkup = () => {
    const finalRows = preview?.nextRows || markupWorkingRows
    if (!finalRows) return
    setUndoRows(rows)
    updateRows(finalRows)
    setMarkupWorkingRows(null)
    setResetUndoRows(null)
    setPreview(null)
    setMarkupOpen(false)
    notifyProductionRowsChanged()
  }

  const undoMarkup = () => {
    if (!undoRows) return
    updateRows(undoRows)
    setUndoRows(null)
    notifyProductionRowsChanged()
  }

  const includeAll = (include: boolean) => {
    setIncluded(activeMarkupRows.reduce<InstantMarkupSelection>((selection, row, index) => {
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
        <CostPricingSheetMobileHost
          cps={cps}
          mode={mode}
          onCancel={onCancel}
          saving={saving}
          liveClient={toMobileClient(cps)}
          liveColumns={toMobileColumnList(columns)}
          importedRows={toMobileRows(cps.table_rows || [])}
          rowsRevision={productionRowsRevision}
          syncedTitle={cps.title || ''}
          onRequestClientSelection={() => setClientPickerOpen(true)}
          onRequestColumns={() => setShowColumnManager(true)}
          onRequestImport={() => setImportOpen(true)}
          onRequestMarkup={openMarkup}
          onRequestClearAll={() => setMobileClearOpen(true)}
          hasUndo={Boolean(undoRows)}
          onUndoMarkup={undoMarkup}
          onClientChange={(next) => {
            setCps((current) => applyMobileClientSnapshot(current, next))
          }}
          onCommit={(next) => {
            setCps(next)
            setIncluded(buildDefaultSelection(next.table_rows || []))
            void onSave(next)
          }}
        />
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
          notifyProductionRowsChanged()
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

      <CpsClearAllDialog
        open={mobileClearOpen}
        onCancel={() => setMobileClearOpen(false)}
        onConfirm={() => {
          updateRows([])
          setMobileClearOpen(false)
          notifyProductionRowsChanged()
        }}
      />

      {useDesktopComposition ? (
        <InstantMarkupDialog
          open={markupOpen}
          rows={activeMarkupRows}
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
              setMarkupWorkingRows(null)
              setResetUndoRows(null)
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
          onStack={handleStackMarkup}
          onReset={resetMarkupWorkingRows}
          onUndoReset={undoResetMarkup}
          onBack={() => setPreview(null)}
          onApply={handleApplyMarkup}
          canUndoReset={Boolean(resetUndoRows)}
        />
      ) : (
        <CpsMarkupSheet
          open={markupOpen}
          onOpenChange={(open) => {
            setMarkupOpen(open)
            if (!open) {
              setPreview(null)
              setMarkupError('')
              setMarkupWorkingRows(null)
              setResetUndoRows(null)
            }
          }}
          rows={activeMarkupRows}
          included={included}
          mode={markupMode}
          value={markupValue}
          preview={preview}
          error={markupError}
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
          onStack={handleStackMarkup}
          onReset={resetMarkupWorkingRows}
          onUndoReset={undoResetMarkup}
          onBack={() => setPreview(null)}
          onApply={handleApplyMarkup}
          canUndoReset={Boolean(resetUndoRows)}
        />
      )}
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
    <Sheet open onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[75vh] rounded-t-2xl border-t border-bd-border bg-bd-card-bg p-0 shadow-lg sm:mx-auto sm:max-w-md [&>[data-slot=sheet-close]]:hidden"
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-8 rounded-full bg-bd-surface-muted" />
        </div>

        <div className="flex max-h-[calc(75vh-40px)] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-bd-border px-4 pb-3 pt-0.5">
            <h2 className="text-[16px] font-bold tracking-[-0.01em] text-bd-text">
              Column Settings
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-bd-text-muted hover:bg-bd-surface-muted hover:text-bd-text transition-colors active:scale-95"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-3 sm:px-4">
            {description ? (
              <section>
                <div className="mb-2 px-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">
                    Description
                  </div>
                </div>
                <div className="rounded-xl border border-bd-border bg-bd-surface overflow-hidden">
                  <div className="flex items-center min-h-[44px] px-3 py-2 gap-2 border-b border-bd-border/50 last:border-b-0">
                    <Input
                      value={description.label || 'Description'}
                      onChange={(event) => onUpdate(description.key, 'label', event.target.value)}
                      placeholder="Column label"
                      aria-label="Description column label"
                      className="h-8 rounded-lg border border-transparent bg-transparent px-2 text-[13px] font-medium text-bd-text hover:border-bd-border focus:bg-bd-surface-muted focus:border-bd-border flex-1 transition-colors"
                    />
                    <span className="shrink-0 inline-flex rounded-md border border-bd-border bg-bd-surface-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-bd-text-muted">
                      Fixed
                    </span>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="mt-3">
              <div className="mb-2 px-0.5">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">
                  Columns
                </div>
              </div>
              <div className="rounded-xl border border-bd-border bg-bd-surface overflow-hidden">
                {ordered.map((column) => {
                  const absIndex = columns.findIndex((entry) => entry.key === column.key)
                  const visible = (column.visibilityMode || 'show') !== 'hide_full'
                  const isCustom = column.key.startsWith('custom_')
                  const locked = !isCustom && CPS_HIDE_FULL_DENY_LIST.has(column.key)
                  if (locked) {
                    return (
                      <div key={column.key} className="flex items-center min-h-[44px] px-3 py-2 gap-2 border-b border-bd-border/50 last:border-b-0">
                        <Input
                          value={column.label || ''}
                          onChange={(event) => onUpdate(column.key, 'label', event.target.value)}
                          placeholder="Column label"
                          aria-label={`${column.label || column.key} column label`}
                          className="h-8 rounded-lg border border-transparent bg-transparent px-2 text-[13px] font-medium text-bd-text hover:border-bd-border focus:bg-bd-surface-muted focus:border-bd-border flex-1 transition-colors"
                        />
                        <span className="shrink-0 inline-flex rounded-md border border-bd-border bg-bd-surface-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-bd-text-muted">
                          Fixed
                        </span>
                      </div>
                    )
                  }
                  return (
                    <div
                      key={column.key}
                      className={cn(
                        'flex items-center min-h-[44px] px-2 py-1.5 gap-0.5 border-b border-bd-border/50 last:border-b-0 transition-opacity',
                        !visible && 'opacity-40',
                      )}
                    >
                      <div className="flex flex-col shrink-0">
                        <button
                          type="button"
                          onClick={() => onMove(column.key, absIndex - 1)}
                          disabled={absIndex <= 1}
                          className="flex items-center justify-center w-7 h-5 text-bd-text-muted hover:text-bd-text disabled:opacity-20 disabled:cursor-default transition-colors"
                          aria-label={`Move ${column.label} up`}
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMove(column.key, absIndex + 1)}
                          disabled={absIndex >= columns.length - 1}
                          className="flex items-center justify-center w-7 h-5 text-bd-text-muted hover:text-bd-text disabled:opacity-20 disabled:cursor-default transition-colors"
                          aria-label={`Move ${column.label} down`}
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1 px-1 flex items-center gap-1.5">
                        <Input
                          value={column.label || ''}
                          onChange={(event) => onUpdate(column.key, 'label', event.target.value)}
                          placeholder="Column label"
                          aria-label={`${column.label || column.key} column label`}
                          className="h-8 rounded-lg border-transparent bg-transparent px-2 text-[13px] font-medium text-bd-text hover:border-bd-border focus:bg-bd-surface-muted focus:border-bd-border flex-1 transition-colors"
                        />
                        {isCustom ? (
                          <span className="shrink-0 inline-flex rounded-md border border-bd-border bg-bd-surface-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-bd-text-muted">
                            Custom
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-1 pr-0.5">
                        <Switch
                          size="sm"
                          checked={visible}
                          onCheckedChange={() => onToggleFull(column.key)}
                          aria-label={`${visible ? 'Hide' : 'Show'} ${column.label}`}
                        />
                        {isCustom ? (
                          <button
                            type="button"
                            onClick={() => onRemoveCustom(column.key)}
                            className="flex items-center justify-center w-7 h-7 rounded-md text-bd-text-muted hover:text-bd-status-danger-text hover:bg-bd-status-danger-bg transition-colors"
                            title="Delete custom column"
                            aria-label={`Remove ${column.label}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={onAddCustom}
                className="mt-2 flex w-full items-center gap-2 px-2 py-2 text-[13px] font-semibold text-bd-button-primary-bg rounded-lg hover:bg-bd-surface-muted transition-colors"
              >
                <Plus size={12} /> Add custom column
              </button>
              <button
                type="button"
                onClick={onReset}
                className="px-2 py-1 text-[12px] text-bd-text-muted hover:text-bd-text transition-colors"
              >
                <RotateCcw size={12} className="mr-1 inline" /> Reset to defaults
              </button>
            </section>
          </div>

          <div className="border-t border-bd-border bg-bd-card-bg px-4 py-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
            <Button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-xl text-[15px] font-bold"
            >
              Done
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function InstantMarkupDialog({
  open,
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
  onStack,
  onReset,
  onUndoReset,
  onBack,
  onApply,
  canUndoReset,
}: {
  open: boolean
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
  onStack: () => void
  onReset: () => void
  onUndoReset: () => void
  onBack: () => void
  onApply: () => void
  canUndoReset: boolean
}) {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  let itemNumber = 0
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="cps-form border-0 bg-transparent p-0 shadow-none sm:max-w-none h-dvh max-h-dvh w-[440px] translate-x-0 translate-y-0 right-0 left-auto top-0"
      >
        <div className="cps-overlay dock">
          <div className="cps-sheet">
            <div className="cps-grab" />
            <DialogHeader className="cps-sheet-head text-left">
              <div>
                <DialogTitle asChild><b>Instant Markup</b></DialogTitle>
                <DialogDescription asChild>
                  <small>Stack from current SP. CP and excluded rows stay unchanged.</small>
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
                    ? 'Next SP = current working SP x (1 + percentage / 100).'
                    : 'Next SP = current working SP + value. Value is per item unit.'}
                </p>
                <div className="cps-sheet-actions">
                  <button type="button" className="cps-cbtn ghost" onClick={() => onIncludeAll(true)}>Include All</button>
                  <button type="button" className="cps-cbtn ghost" onClick={() => onIncludeAll(false)}>Exclude All</button>
                </div>
                <div className="cps-sheet-actions">
                  <button type="button" className="cps-cbtn danger" onClick={() => setResetConfirmOpen(true)}><RotateCcw size={12} /> Reset</button>
                  <button type="button" className="cps-cbtn ghost" onClick={onUndoReset} disabled={!canUndoReset}><Undo2 size={12} /> Undo Reset</button>
                </div>
                {error ? <p className="text-xs font-bold" style={{ color: 'var(--red)' }} role="alert">{error}</p> : null}
                <div>
                  {rows.map((row, index) => {
                    const rowKey = getCpsRowKey(row, index)
                    if (row.row_type === 'section') {
                      return <div key={rowKey} className="cps-mk-gcap">{row.section_title || 'Group'} - headers never participate</div>
                    }
                    const eligible = isInstantMarkupEligible(row)
                    if (row.row_type === 'item') itemNumber += 1
                    const excluded = eligible && !included[rowKey]
                    return (
                      <div key={rowKey} className={cn('cps-mk-row', excluded && 'opacity-60')}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-bd-border bg-bd-card-bg font-mono text-xs font-black">
                          {String(itemNumber).padStart(2, '0')}
                        </span>
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
              {preview ? <button type="button" className="cps-cbtn ghost" onClick={onStack} disabled={preview.affectedCount === 0}><Plus size={12} /> Stack</button> : null}
              {!preview ? <button type="button" className="cps-cbtn ghost" onClick={onApply}>Apply Working SP</button> : null}
              <button type="button" className="cps-cbtn primary" onClick={onApply} disabled={!preview || preview.affectedCount === 0}><Check size={12} /> Apply</button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset markup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the current working selling prices to zero. You can undo this reset immediately afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onReset()
                setResetConfirmOpen(false)
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

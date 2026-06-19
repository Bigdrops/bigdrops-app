import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import {
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  ScrollText,
  Truck,
  Users,
  X,
} from 'lucide-react'
import ColumnManager from '@/components/ColumnManager'
import type { ColumnConfig, ColumnVisibilityMode } from '@/domain/invoice/types'

import ClientSelector from '@/components/ClientSelector'
import AttachExistingDocumentSheet from '@/components/document/AttachExistingDocumentSheet'
import { feedback } from '@/lib/feedback'
import { SignaturesSection } from './WaybillSignatures'
import {
  WAYBILL_COLUMN_LIMIT,
  buildWaybillCustomFields,
  collectWaybillCustomColumns,
  createCustomColumnKey,
  createDefaultItem,
  createDefaultWaybill,
  parseWaybillCustomFields,
  type Waybill,
  type WaybillCustomColumn,
  type WaybillCustomFields,
  type WaybillItem,
  type WaybillType,
  type TransportMode,
} from './waybillUtils'
import { STANDARD_ITEM_COLUMNS } from '@/domain/waybill/contracts/waybillContract'
import {
  CollapseCard,
  CompactSelectField,
  MobileField,
  MobileTextField,
  SectionLabel,
} from '@/components/invoice/mobile/mobileFormPrimitives'
import { FormLineItems } from '@/components/document/FormLineItems'
import { FormFooter } from '@/components/document/FormFooter'

const RichTextEditor = lazy(() => import('@/components/RichTextEditor'))
const WaybillImportSheet = lazy(() => import('./WaybillImportSheet').then(m => ({ default: m.WaybillImportSheet })))
import { externalWaybillImportAdapter } from '@/domain/waybill/externalWaybillImportAdapter'
import { internalWaybillImportAdapter } from '@/domain/waybill/internalWaybillImportAdapter'

export type WaybillFormData = {
  waybill: Waybill
  items: WaybillItem[]
  customColumns: WaybillCustomColumn[]
  customFields: WaybillCustomFields
}

type WaybillFormProps = {
  type: WaybillType
  onSave: (data: WaybillFormData) => Promise<void>
  onClose: () => void
  initialData?: Partial<WaybillFormData>
  waybillNumber?: string
  loadingNumber?: boolean
}

function createInitialState(type: WaybillType, initial?: Partial<WaybillFormData>, waybillNumber?: string): WaybillFormData {
  const defaultWb = createDefaultWaybill()
  const wb: Waybill = initial?.waybill
    ? { ...defaultWb, ...initial.waybill, type }
    : { ...defaultWb, type, waybill_number: waybillNumber || '' }
  const items = initial?.items?.length ? initial.items : [createDefaultItem()]
  const customColumns = initial?.customColumns ?? []
  const customFields = initial?.customFields ?? parseWaybillCustomFields(wb.custom_fields)
  return { waybill: wb, items, customColumns, customFields }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main form                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function WaybillForm({ type, onSave, onClose, initialData, waybillNumber, loadingNumber }: WaybillFormProps) {
  const [state, setState] = useState<WaybillFormData>(() => createInitialState(type, initialData, waybillNumber))
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [showTableSettings, setShowTableSettings] = useState(false)
  const [showImportSheet, setShowImportSheet] = useState(false)
  const [invoiceSheetOpen, setInvoiceSheetOpen] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const stored = initialData?.customFields?.columnVisibility
    if (stored && typeof stored === 'object') return stored
    return Object.fromEntries(STANDARD_ITEM_COLUMNS.map(c => [c.key, c.defaultVisible]))
  })
  const [columnTitles, setColumnTitles] = useState<Record<string, string>>(
    Object.fromEntries(STANDARD_ITEM_COLUMNS.map(c => [c.key, c.label]))
  )
  const [columnOrder, setColumnOrder] = useState<string[]>(STANDARD_ITEM_COLUMNS.map(c => c.key))

  const [showNotes, setShowNotes] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [notes, setNotes] = useState(() => initialData?.waybill?.notes ?? '')
  const [terms, setTerms] = useState('')
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [showTermsInTableSettings, setShowTermsInTableSettings] = useState(false)

  const warnedRef = useRef(false)

  useEffect(() => {
    if (waybillNumber && !state.waybill.waybill_number) {
      setState((prev) => ({ ...prev, waybill: { ...prev.waybill, waybill_number: waybillNumber } }))
    }
  }, [waybillNumber, state.waybill.waybill_number])

  const { waybill, items, customColumns, customFields } = state

  const markDirty = useCallback(() => {
    if (!dirty) setDirty(true)
  }, [dirty])

  const updateWaybill = <K extends keyof Waybill>(key: K, value: Waybill[K]) => {
    setState((prev) => ({ ...prev, waybill: { ...prev.waybill, [key]: value } }))
    markDirty()
  }

  const updateItem = <K extends keyof WaybillItem>(index: number, key: K, value: WaybillItem[K]) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }))
    markDirty()
  }

  const updateCustomItemField = (index: number, key: string, value: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, custom_data: { ...item.custom_data, [key]: value } } : item,
      ),
    }))
    markDirty()
  }

  const updateCustomFields = (patch: Partial<WaybillCustomFields>) => {
    setState((prev) => ({ ...prev, customFields: { ...prev.customFields, ...patch } }))
    markDirty()
  }

  const addItem = () => {
    setState((prev) => ({ ...prev, items: [...prev.items, createDefaultItem()] }))
    markDirty()
  }

  const removeItem = (index: number) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? [createDefaultItem()] : prev.items.filter((_, i) => i !== index),
    }))
    markDirty()
  }

  const moveItem = (index: number, direction: 1 | -1) => {
    const target = index + direction
    setState((prev) => {
      const next = [...prev.items]
      const tmp = next[target]
      next[target] = next[index]
      next[index] = tmp
      return { ...prev, items: next }
    })
    markDirty()
  }

  const insertItemAfter = (index: number) => {
    setState((prev) => {
      const next = [...prev.items]
      next.splice(index + 1, 0, createDefaultItem())
      return { ...prev, items: next }
    })
    markDirty()
  }

  const normalizeTitle = (title: string) => title.trim().toLowerCase().replace(/\s+/g, ' ')

  const addCustomColumn = () => {
    if (customColumns.length >= WAYBILL_COLUMN_LIMIT) {
      feedback.warning('Limit reached', { description: `Maximum ${WAYBILL_COLUMN_LIMIT} columns allowed.` })
      return
    }
    const existingLabels = customColumns.map((c) => normalizeTitle(c.label))
    const base = 'Custom Column'
    let label = base
    let counter = 2
    while (existingLabels.includes(normalizeTitle(label))) {
      label = `${base} ${counter}`
      counter++
    }
    const key = createCustomColumnKey(`custom_${Date.now()}`)
    setState((prev) => ({
      ...prev,
      customColumns: [...prev.customColumns, { key, label }],
    }))
    setColumnVisibility(prev => ({ ...prev, [key]: true }))
    markDirty()
  }

  const removeCustomColumn = (key: string) => {
    setState((prev) => ({
      ...prev,
      customColumns: prev.customColumns.filter((c) => c.key !== key),
      items: prev.items.map((item) => {
        const next = { ...item.custom_data }
        delete next[key]
        return { ...item, custom_data: next }
      }),
    }))
    markDirty()
  }

  const isColumnVisible = (key: string) => {
    if (columnVisibility[key] !== undefined) return columnVisibility[key]
    if (key.startsWith('custom_')) return true
    return false
  }

  const DEFAULT_WAYBILL_COLUMNS: ColumnConfig[] = STANDARD_ITEM_COLUMNS.map(c => ({
    key: c.key,
    label: c.label,
    type: 'text' as const,
    visible: c.defaultVisible,
  }))

  const columns: ColumnConfig[] = columnOrder
    .filter(key => !key.startsWith('custom_'))
    .map((key) => {
      const def = DEFAULT_WAYBILL_COLUMNS.find(d => d.key === key)
      const vis = columnVisibility[key]
      return {
        key,
        label: columnTitles[key] || def?.label || key,
        type: 'text' as const,
        visibilityMode: (vis === true ? 'show' : vis === false ? 'hide_display' : def?.visible ? 'show' : 'hide_display') as ColumnVisibilityMode,
      }
    })
    .concat(
      customColumns.map(col => ({
        key: col.key,
        label: col.label,
        type: 'text' as const,
        visibilityMode: (columnVisibility[col.key] !== false ? 'show' : 'hide_display') as 'show' | 'hide_display',
      })),
    )

  const columnManagerProps = {
    columns,
    onUpdate: (key: string, field: string, value: string | boolean) => {
      if (field === 'label' && typeof value === 'string') {
        const trimmedValue = value.trim()
        if (!trimmedValue) return

        const allColumns = [
          ...Object.entries(columnTitles).map(([k, label]) => ({ key: k, label })),
          ...customColumns.map(c => ({ key: c.key, label: c.label })),
        ]
        const isDuplicate = allColumns.some(col => col.key !== key && col.label.toLowerCase() === trimmedValue.toLowerCase())
        if (isDuplicate) { feedback.error(`A column named "${trimmedValue}" already exists`); return }

        if (key.startsWith('custom_')) {
          setState((prev) => ({
            ...prev,
            customColumns: prev.customColumns.map(c => c.key === key ? { ...c, label: trimmedValue } : c),
          }))
        } else {
          setColumnTitles(prev => ({ ...prev, [key]: trimmedValue }))
        }
        markDirty()
      }
    },
    onToggle: (key: string) => {
      setColumnVisibility(prev => ({ ...prev, [key]: prev[key] === true ? false : true }))
      markDirty()
    },
    onToggleFull: (_key: string) => {},
    onAddCustom: addCustomColumn,
    onRemoveCustom: removeCustomColumn,
    onReset: () => {
      setColumnTitles(Object.fromEntries(STANDARD_ITEM_COLUMNS.map(c => [c.key, c.label])))
      setColumnVisibility(Object.fromEntries(STANDARD_ITEM_COLUMNS.map(c => [c.key, c.defaultVisible])))
      setColumnOrder(STANDARD_ITEM_COLUMNS.map(c => c.key))
      setState((prev) => ({
        ...prev,
        customColumns: [],
        items: prev.items.map(item => {
          const next = { ...item.custom_data }
          for (const key of Object.keys(next)) {
            if (key.startsWith('custom_')) delete next[key]
          }
          return { ...item, custom_data: next }
        }),
      }))
    },
    onMove: (key: string, dir: number) => {
      setColumnOrder(prev => {
        const idx = prev.indexOf(key)
        if (idx < 0) return prev
        const nextIdx = typeof dir === 'number' ? dir : idx + dir
        if (nextIdx < 0 || nextIdx >= prev.length) return prev
        const next = [...prev]
        next.splice(idx, 1)
        next.splice(nextIdx, 0, key)
        return next
      })
    },
    onClose: () => setShowTableSettings(false),
  }

  const handleApplyImport = (text: string) => {
    const parsed = JSON.parse(text)
    const adapter = type === 'external' ? externalWaybillImportAdapter : internalWaybillImportAdapter
    const result = adapter.applyResult(parsed)
    setState((prev) => ({
      ...prev,
      waybill: { ...prev.waybill, ...result.fields } as Waybill,
      items: result.items,
      customColumns: result.customColumns,
      customFields: {
        ...prev.customFields,
        ...result.customFields,
      },
    }))
    markDirty()
    setShowImportSheet(false)
  }

  const handleSave = async () => {
    if (type === 'external' && !waybill.client_id) {
      feedback.error('Validation Error', { description: 'Client account must be selected for external waybills.' })
      return
    }
    if (type === 'internal' && !waybill.receiver_name?.trim()) {
      feedback.error('Validation Error', { description: 'Recipient name is required for internal waybills.' })
      return
    }
    if (!waybill.waybill_number) {
      feedback.error('Validation Error', { description: 'Waybill number is missing or invalid.' })
      return
    }
    if (!waybill.date) {
      feedback.error('Validation Error', { description: 'Date is required.' })
      return
    }
    if (items.length === 0) {
      feedback.error('Validation Error', { description: 'Line items list cannot be empty.' })
      return
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].description || items[i].quantity <= 0) {
        feedback.error('Validation Error', { description: `Item ${i + 1} is missing a description or has quantity ≤ 0.` })
        return
      }
    }

    setSaving(true)
    try {
      const finalFields = buildWaybillCustomFields(customFields, { customColumns, columnVisibility })
      const collectedColumns = collectWaybillCustomColumns(items, customColumns)
      const data: WaybillFormData = {
        waybill: { ...waybill, notes, status: 'dispatched' },
        items,
        customColumns: collectedColumns,
        customFields: finalFields,
      }
      await onSave(data)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty && !warnedRef.current) {
        warnedRef.current = true
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  return (
    <div className="bd-form-shell bd-custom-scrollbar overflow-x-hidden px-0 pt-1 sm:pt-2">
      <div className="mx-auto w-full max-w-[780px] px-3 sm:px-4">
        <div className="space-y-6 pb-24">

          {/* Waybill Header */}
          <div>
            <SectionLabel color="indigo">
              <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Waybill Header</span>
            </SectionLabel>
            <div className="mt-4 rounded-[var(--bd-radius-lg)] border border-[var(--bd-border)] bg-[var(--bd-surface)] p-6">
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] ${type === 'external' ? 'border-[var(--bd-primary)]/20 bg-[var(--bd-primary)]/10 text-[var(--bd-primary)]' : 'border-[var(--bd-warning)]/20 bg-[var(--bd-warning)]/10 text-[var(--bd-warning)]'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${type === 'external' ? 'bg-[var(--bd-primary)]' : 'bg-[var(--bd-warning)]'}`} />
                    {type === 'external' ? 'EXTERNAL DELIVERY NOTE' : 'INTERNAL TRANSFER NOTE'}
                  </div>
                </div>

                {type === 'external' && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setClientPickerOpen(true)}
                      className="flex w-full items-center gap-3 rounded-[var(--bd-radius-lg)] border border-dashed border-[var(--bd-border)] bg-[var(--bd-surface)] px-4 py-3 text-left transition hover:border-[var(--bd-indigo-border)] hover:bg-[var(--bd-indigo-bg)]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--bd-bg2)] text-[var(--bd-text3)]">
                        <BriefcaseBusiness className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="overflow-hidden text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bd-text3)]">Client</div>
                        <div className="mt-0.5 truncate text-[14px] font-bold text-[var(--bd-text)]">
                          {waybill.client_name || 'Select a client'}
                        </div>
                      </div>
                      <ChevronRight className="h-4.5 w-4.5 text-[var(--bd-text4)]" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <MobileTextField
                    label="WAYBILL NO"
                    value={waybill.waybill_number}
                    onChange={(e) => updateWaybill('waybill_number', e.target.value)}
                    disabled={loadingNumber}
                    className="font-mono"
                  />
                  {type === 'external' && (
                    <MobileTextField
                      label="P.O. NUMBER"
                      value={waybill.po_number || ''}
                      onChange={(e) => updateWaybill('po_number', e.target.value)}
                      placeholder="PO #"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <MobileTextField
                    label="DATE"
                    type="date"
                    value={waybill.date}
                    onChange={(e) => updateWaybill('date', e.target.value)}
                  />
                  <MobileTextField
                    label="TIME"
                    type="time"
                    value={waybill.time}
                    onChange={(e) => updateWaybill('time', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {type === 'external' && (
              <div className="mt-4">
                {customFields.references?.linkedInvoiceNumber ? (
                  <div className="flex items-center gap-2 rounded-[var(--bd-radius-lg)] border border-[var(--bd-border)] bg-[var(--bd-surface)] px-4 py-3">
                    <FileText className="h-4 w-4 text-[var(--bd-text-muted)]" />
                    <div className="min-w-0 flex-1">
                      <div className="overflow-hidden text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bd-text3)]">Linked Invoice</div>
                      <div className="mt-0.5 truncate text-[14px] font-bold text-[var(--bd-text)] font-mono">
                        {customFields.references.linkedInvoiceNumber}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateCustomFields({ references: { ...customFields.references, linkedInvoiceNumber: '' } })}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--bd-text-muted)] hover:bg-[var(--bd-rose-bg)] hover:text-[var(--bd-rose)] transition"
                      title="Unlink invoice"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={waybill.client_id ? () => setInvoiceSheetOpen(true) : undefined}
                    className={`flex w-full items-center gap-3 rounded-[var(--bd-radius-lg)] border border-dashed px-4 py-3 text-left transition ${waybill.client_id ? 'border-[var(--bd-border)] bg-[var(--bd-surface)] hover:border-[var(--bd-indigo-border)] hover:bg-[var(--bd-indigo-bg)]' : 'cursor-not-allowed border-[var(--bd-border)]/60 bg-[var(--bd-surface)]/60 opacity-50'}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--bd-bg2)] text-[var(--bd-text3)]">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="overflow-hidden text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bd-text3)]">Linked Invoice</div>
                      <div className="mt-0.5 text-[14px] font-bold text-[var(--bd-text-muted)]">
                        {waybill.client_id ? 'Tap to link an invoice' : 'Select a client first'}
                      </div>
                    </div>
                    <ChevronRight className="h-4.5 w-4.5 text-[var(--bd-text4)]" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Transport Details */}
          <div>
            <SectionLabel color="amber">
              <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Transport Details</span>
            </SectionLabel>
            <div className="mt-4 rounded-[var(--bd-radius-lg)] border border-[var(--bd-border)] bg-[var(--bd-surface)] p-6">
              <div className="space-y-4">
                <MobileField label="Transport Mode">
                  <CompactSelectField
                    value={waybill.transport_mode || 'Blank'}
                    onChange={(value) => {
                      const val = value === 'Blank' ? '' : value as TransportMode
                      updateWaybill('transport_mode', val as TransportMode)
                      if (val === 'By Hand' || val === 'Courier') {
                        updateWaybill('vehicle_plate', '')
                      }
                    }}
                    options={[
                      { value: 'By Vehicle', label: 'By Vehicle' },
                      { value: 'By Hand', label: 'By Hand' },
                      { value: 'Courier', label: 'Courier' },
                      { value: 'Blank', label: 'Blank' }
                    ]}
                  />
                </MobileField>
                <div className="grid grid-cols-2 gap-4">
                  {waybill.transport_mode !== 'By Hand' && waybill.transport_mode !== 'Courier' && (
                    <MobileTextField
                      label="Vehicle Plate"
                      value={waybill.vehicle_plate}
                      onChange={(e) => updateWaybill('vehicle_plate', e.target.value)}
                      className="font-mono uppercase"
                    />
                  )}
                  <MobileTextField
                    label="Driver Name"
                    value={waybill.driver_name}
                    onChange={(e) => updateWaybill('driver_name', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <FormLineItems
            items={items}
            groups={[]}
            invoice={waybill}
            isQuotation={false}
            customColumns={customColumns}
            computedItems={items}
            computedGroups={[]}
            isVisible={isColumnVisible}
            getColumn={(key: string) => ({ label: columnTitles[key] || key, visible: isColumnVisible(key) })}
            onAddItem={addItem}
            onAddItemToGroup={() => {}}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            onMoveItem={(index, direction) => moveItem(index, direction as 1 | -1)}
            onInsertItemAfter={insertItemAfter}
            onUpdateGroupName={() => {}}
            onToggleGroupSubtotal={() => {}}
            onDeleteGroup={() => {}}
            onOpenImport={() => setShowImportSheet(true)}
            onOpenTableSettings={() => setShowTableSettings(true)}
          />

          {/* Custody Details */}
          <div>
            <SectionLabel color="indigo">
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Custody Details</span>
            </SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <MobileTextField label="DELIVERED BY" value={waybill.sender_name} onChange={(e) => updateWaybill('sender_name', e.target.value)} />
              <MobileTextField label="RECEIVED BY" value={waybill.receiver_name} onChange={(e) => updateWaybill('receiver_name', e.target.value)} />
              <div className="col-span-2">
                <MobileTextField
                  label={type === 'external' ? 'DELIVERY LOCATION' : 'MOVEMENT ROUTE / DESTINATION'}
                  value={waybill.delivery_location}
                  onChange={(e) => updateWaybill('delivery_location', e.target.value)}
                  placeholder={type === 'external' ? 'Client address, site, or drop-off location' : 'Where the items are moving within operations'}
                />
              </div>
            </div>
          </div>

          {/* Signatures */}
          <SignaturesSection
            customFields={customFields}
            updateCustomFields={updateCustomFields}
          />

          {/* Notes */}
          <CollapseCard
            icon={ScrollText}
            title={notesTitle}
            open={showNotes}
            onToggle={() => setShowNotes(!showNotes)}
            sectionColor="#6366f1"
          >
            <div className="space-y-3">
              <input
                type="text"
                value={notesTitle}
                onChange={(e) => setNotesTitle(e.target.value)}
                className="w-full rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] bg-[var(--bd-surface)] px-3 py-2 text-[13px] font-bold text-[var(--bd-text)] outline-none focus:border-[var(--bd-primary)]"
                placeholder="Notes title"
              />
              <Suspense fallback={<div className="rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] bg-[var(--bd-surface)] px-3 py-10 text-center text-[12px] text-[var(--bd-text-muted)]">Loading editor...</div>}>
                <RichTextEditor value={notes} onChange={setNotes} placeholder="Add notes..." />
              </Suspense>
            </div>
          </CollapseCard>

          {/* Terms & Conditions */}
          {showTermsInTableSettings && (
            <CollapseCard
              icon={ScrollText}
              title="Terms & Conditions"
              open={showTerms}
              onToggle={() => setShowTerms(!showTerms)}
              sectionColor="#8b5cf6"
            >
              <Suspense fallback={<div className="rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] bg-[var(--bd-surface)] px-3 py-10 text-center text-[12px] text-[var(--bd-text-muted)]">Loading editor...</div>}>
                <RichTextEditor value={terms} onChange={setTerms} placeholder="Add terms and conditions..." />
              </Suspense>
            </CollapseCard>
          )}

        </div>
      </div>

      <FormFooter
        onCancel={onClose}
        onSaveDraft={handleSave}
        onSaveSent={handleSave}
        onFloatingSave={handleSave}
        saving={saving}
        primaryLabel="Save Waybill"
      />

      {/* Client Selector */}
      <ClientSelector
        clientId={waybill.client_id}
        clientName={waybill.client_name}
        open={clientPickerOpen}
        onOpenChange={setClientPickerOpen}
        onClientChange={(id: string, name: string) => {
          updateWaybill('client_id', id)
          updateWaybill('client_name', name)
        }}
        compact
        hideTrigger
      />

      {/* Linked Invoice Search Sheet */}
      {type === 'external' && (
        <AttachExistingDocumentSheet
          open={invoiceSheetOpen}
          onOpenChange={setInvoiceSheetOpen}
          title="Link Invoice"
          description="Search for an invoice to link to this waybill"
          table="invoices"
          numberField="invoice_number"
          clientField="client_name"
          poField="po_number"
          currentClientName={waybill.client_name}
          searchPlaceholder="Search invoices by number, client, or PO..."
          onAttach={(item: any) => {
            const invoiceNumber = item.invoice_number || item.id
            updateCustomFields({ references: { ...customFields.references, linkedInvoiceNumber: invoiceNumber } })
            setInvoiceSheetOpen(false)
            feedback.success('Invoice linked', { description: `Linked ${invoiceNumber}` })
          }}
        />
      )}

      {/* Table Settings Modal */}
      {showTableSettings && (
        <>
          <ColumnManager {...columnManagerProps} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-[var(--bd-radius-lg)] bg-[var(--bd-bg-card)] p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-[var(--bd-text)]">More Settings</h3>
                <button onClick={() => setShowTableSettings(false)} className="text-[var(--bd-text-muted)] hover:text-[var(--bd-text)]"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showTermsInTableSettings}
                    onChange={(e) => setShowTermsInTableSettings(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--bd-border)] text-[var(--bd-primary)]"
                  />
                  <span className="text-[13px] font-bold text-[var(--bd-text)]">Show Terms &amp; Conditions</span>
                </div>
              </div>
              <div className="mt-6">
                <button onClick={() => setShowTableSettings(false)} className="w-full rounded-[var(--bd-radius-md)] bg-[var(--bd-button-primary-bg)] py-2 text-[14px] font-bold text-[var(--bd-button-primary-text)]">Done</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Import Sheet */}
      {showImportSheet && (
        <Suspense fallback={<div className="rounded-2xl border border-[var(--bd-border)] bg-[var(--bd-surface)] px-4 py-10 text-center text-[13px] text-[var(--bd-text-muted)]">Loading importer...</div>}>
           <WaybillImportSheet
             open={showImportSheet}
             onOpenChange={setShowImportSheet}
             onImport={handleApplyImport}
             adapter={type === 'external' ? externalWaybillImportAdapter : internalWaybillImportAdapter}
           />
        </Suspense>
      )}
    </div>
  )
}

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import {
  BriefcaseBusiness,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Import,
  List,
  Loader2,
  PenTool,
  Plus,
  Save,
  ScrollText,
  SlidersHorizontal,
  Trash2,
  Truck,
  Users,
  X,
} from 'lucide-react'

import ClientSelector from '@/components/ClientSelector'
import AttachExistingDocumentSheet from '@/components/document/AttachExistingDocumentSheet'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { feedback } from '@/lib/feedback'
import {
  CONDITION_OPTIONS,
  TRANSPORT_MODE_OPTIONS,
  PURPOSE_OPTIONS,
  WAYBILL_COLUMN_LIMIT,
  buildWaybillCustomFields,
  collectWaybillCustomColumns,
  createCustomColumnKey,
  createDefaultItem,
  createDefaultWaybill,
  getWaybillTypeContent,
  parseWaybillCustomFields,
  type Waybill,
  type WaybillCustomColumn,
  type WaybillCustomFields,
  type WaybillItem,
  type WaybillType,
  type TransportMode,
  type WaybillPurpose,
} from './waybillUtils'
import {
  ChipButton,
  CollapseCard,
  CompactSelectField,
  MobileField,
  MobileTextField,
  SectionLabel,
  fieldCls,
  labelCls,
  pageCardCls,
} from '@/components/invoice/mobile/mobileFormPrimitives'

const RichTextEditor = lazy(() => import('@/components/RichTextEditor'))

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
}

const SECTION_COLORS = {
  details: 'indigo',
  routing: 'violet',
  transport: 'amber',
  items: 'emerald',
  remarks: 'muted',
} as const

function createInitialState(type: WaybillType, initial?: Partial<WaybillFormData>): WaybillFormData {
  const defaultWb = createDefaultWaybill()
  const wb: Waybill = initial?.waybill
    ? { ...defaultWb, ...initial.waybill, type }
    : { ...defaultWb, type }
  const items = initial?.items?.length ? initial.items : [createDefaultItem()]
  const customColumns = initial?.customColumns ?? []
  const customFields = initial?.customFields ?? parseWaybillCustomFields(wb.custom_fields)
  return { waybill: wb, items, customColumns, customFields }
}

export default function WaybillForm({ type, onSave, onClose, initialData }: WaybillFormProps) {
  const [state, setState] = useState<WaybillFormData>(() => createInitialState(type, initialData))
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Top level fields specific to external vs internal
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [invoiceSheetOpen, setInvoiceSheetOpen] = useState(false)

  // Signature Toggles
  const [showSignatures, setShowSignatures] = useState(true)
  const [showSenderSignature, setShowSenderSignature] = useState(true)
  const [showReceiverSignature, setShowReceiverSignature] = useState(true)

  // Signature Sources
  const [senderSource, setSenderSource] = useState<'saved' | 'upload' | 'draw'>('saved')
  const [receiverSource, setReceiverSource] = useState<'saved' | 'upload' | 'draw'>(type === 'internal' ? 'saved' : 'upload')

  // Table Settings
  const [showTableSettings, setShowTableSettings] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [notesOpen, setNotesOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  
  // Column visibility overrides and titles
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    unit: true,
  })
  const [columnTitles, setColumnTitles] = useState<Record<string, string>>({
    description: 'Description',
    qty: 'Qty',
    unit: 'Unit',
    make: 'Make',
    partNo: 'Part No.',
    condition: 'Condition',
  })

  const warnedRef = useRef(false)

  const { waybill, items, customColumns, customFields } = state
  const typeContent = getWaybillTypeContent(waybill.type)

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

  const addCustomColumn = () => {
    if (customColumns.length >= WAYBILL_COLUMN_LIMIT) {
      feedback.warning('Limit reached', { description: `Maximum ${WAYBILL_COLUMN_LIMIT} columns allowed.` })
      return
    }
    const key = createCustomColumnKey(`custom_${Date.now()}`)
    setState((prev) => ({
      ...prev,
      customColumns: [...prev.customColumns, { key, label: 'Custom Column' }],
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

  // Auto-hide logic
  const isColumnVisible = (key: string) => {
    if (columnVisibility[key] !== undefined) return columnVisibility[key]
    
    // Auto-hide: check if any row has data
    if (key === 'make') return items.some(item => item.custom_data?.['make'])
    if (key === 'partNo') return items.some(item => item.custom_data?.['part_no'])
    if (key === 'condition') return items.some(item => item.condition && item.condition !== 'good')
    
    // For custom columns
    return items.some(item => item.custom_data?.[key])
  }

  const handleSave = async () => {
    // 4 Save Blockers
    if (type === 'external' && !waybill.client_id) {
      feedback.error('Validation Error', { description: 'Client account must be selected for external waybills.' })
      return
    }
    if (!waybill.waybill_number) {
      feedback.error('Validation Error', { description: 'Waybill number is missing or invalid.' })
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
      const finalFields = buildWaybillCustomFields(customFields, { customColumns })
      const collectedColumns = collectWaybillCustomColumns(items, customColumns)
      const data: WaybillFormData = {
        waybill: { ...waybill, status: 'dispatched' },
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
          
          {/* Form Header Block */}
          <div className="border-b border-[var(--bd-border-soft)] pb-6 pt-2">
            <div className="space-y-5">
              {/* Type Badge */}
              <div className="flex items-center gap-2">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] ${type === 'external' ? 'border-[var(--bd-primary)]/20 bg-[var(--bd-primary)]/10 text-[var(--bd-primary)]' : 'border-[var(--bd-warning)]/20 bg-[var(--bd-warning)]/10 text-[var(--bd-warning)]'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${type === 'external' ? 'bg-[var(--bd-primary)]' : 'bg-[var(--bd-warning)]'}`} />
                  {type === 'external' ? 'EXTERNAL DELIVERY NOTE' : 'INTERNAL TRANSFER NOTE'}
                </div>
              </div>

              {/* Client Picker (External only) — directly below badge */}
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
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bd-text3)]">Client</div>
                      <div className="mt-0.5 truncate text-[14px] font-bold text-[var(--bd-text)]">
                        {waybill.client_name || 'Select a client'}
                      </div>
                    </div>
                    <ChevronRight className="h-4.5 w-4.5 text-[var(--bd-text4)]" />
                  </button>
                </div>
              )}

              {/* WAYBILL NO + P.O. NUMBER row */}
              <div className="grid grid-cols-2 gap-4">
                <MobileTextField
                  label="WAYBILL NO"
                  value={waybill.waybill_number}
                  onChange={(e) => updateWaybill('waybill_number', e.target.value)}
                  placeholder="Auto-generated"
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

              {/* DATE / TIME row */}
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

          {/* Linked Invoice (External only) */}
          {type === 'external' && (
            <div>
              {customFields.references?.linkedInvoiceNumber ? (
                <div className="flex items-center gap-2 rounded-[var(--bd-radius-lg)] border border-[var(--bd-border)] bg-[var(--bd-surface)] px-4 py-3">
                  <FileText className="h-4 w-4 text-[var(--bd-text-muted)]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bd-text3)]">Linked Invoice</div>
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
                  onClick={() => setInvoiceSheetOpen(true)}
                  className="flex w-full items-center gap-3 rounded-[var(--bd-radius-lg)] border border-dashed border-[var(--bd-border)] bg-[var(--bd-surface)] px-4 py-3 text-left transition hover:border-[var(--bd-indigo-border)] hover:bg-[var(--bd-indigo-bg)]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--bd-bg2)] text-[var(--bd-text3)]">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bd-text3)]">Linked Invoice</div>
                    <div className="mt-0.5 text-[14px] font-bold text-[var(--bd-text-muted)]">
                      Tap to link an invoice
                    </div>
                  </div>
                  <ChevronRight className="h-4.5 w-4.5 text-[var(--bd-text4)]" />
                </button>
              )}
            </div>
          )}

          {/* STEP 3: Transport Details */}
          <div>
            <SectionLabel color="amber">
              <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Transport Details</span>
            </SectionLabel>
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

          {/* STEP 4: Line Items */}
          <div>
            <SectionLabel color="emerald">
              <span className="flex items-center gap-1.5"><List className="h-3.5 w-3.5" /> Line Items <span className="ml-2 rounded-full bg-[var(--bd-emerald-bg)] px-2 py-0.5 text-[10px] text-[var(--bd-emerald)]">{items.length}</span></span>
            </SectionLabel>
            
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-2">
                <button type="button" className="flex items-center gap-1.5 rounded-full border border-[var(--bd-border)] bg-[var(--bd-surface)] px-3 py-1.5 text-[11px] font-bold text-[var(--bd-text-muted)] hover:bg-[var(--bd-surface-muted)] hover:text-[var(--bd-text)]">
                  <Import className="h-3.5 w-3.5" /> Import Items
                </button>
                <button type="button" onClick={() => setShowTableSettings(true)} className="flex items-center gap-1.5 rounded-full border border-[var(--bd-border)] bg-[var(--bd-surface)] px-3 py-1.5 text-[11px] font-bold text-[var(--bd-text-muted)] hover:bg-[var(--bd-surface-muted)] hover:text-[var(--bd-text)]">
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Table Settings
                </button>
              </div>
              <div className="text-[11px] font-extrabold text-[var(--bd-text-muted)] uppercase tracking-wider">
                Rows: {items.length}
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--bd-border)] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--bd-text-muted)]">
                    <th className="pb-2 pr-2 font-medium w-8">S/N</th>
                    <th className="pb-2 px-2 font-medium min-w-[200px]">{columnTitles.description}</th>
                    <th className="pb-2 px-2 font-medium w-24">{columnTitles.qty}</th>
                    {isColumnVisible('unit') && <th className="pb-2 px-2 font-medium w-24">{columnTitles.unit}</th>}
                    {isColumnVisible('make') && <th className="pb-2 px-2 font-medium w-32">{columnTitles.make}</th>}
                    {isColumnVisible('partNo') && <th className="pb-2 px-2 font-medium w-32">{columnTitles.partNo}</th>}
                    {isColumnVisible('condition') && <th className="pb-2 px-2 font-medium w-32">{columnTitles.condition}</th>}
                    {customColumns.map(col => isColumnVisible(col.key) && (
                      <th key={col.key} className="pb-2 px-2 font-medium w-32">{col.label}</th>
                    ))}
                    <th className="pb-2 pl-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--bd-border-soft)]">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 pr-2 font-mono text-[11px] text-[var(--bd-text-muted)]">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <Input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className={fieldCls} />
                      </td>
                      <td className="py-2 px-2">
                        <NumericInput value={item.quantity} onChange={(v) => updateItem(idx, 'quantity', v)} className={fieldCls} />
                      </td>
                      {isColumnVisible('unit') && (
                        <td className="py-2 px-2">
                          <Input value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} className={fieldCls} />
                        </td>
                      )}
                      {isColumnVisible('make') && (
                        <td className="py-2 px-2">
                          <Input value={String(item.custom_data?.['make'] || '')} onChange={(e) => updateCustomItemField(idx, 'make', e.target.value)} className={fieldCls} />
                        </td>
                      )}
                      {isColumnVisible('partNo') && (
                        <td className="py-2 px-2">
                          <Input value={String(item.custom_data?.['part_no'] || '')} onChange={(e) => updateCustomItemField(idx, 'part_no', e.target.value)} className={fieldCls} />
                        </td>
                      )}
                      {isColumnVisible('condition') && (
                        <td className="py-2 px-2">
                          <Input value={item.condition} onChange={(e) => updateItem(idx, 'condition', e.target.value as any)} className={fieldCls} />
                        </td>
                      )}
                      {customColumns.map(col => isColumnVisible(col.key) && (
                        <td key={col.key} className="py-2 px-2">
                          <Input value={String(item.custom_data?.[col.key] || '')} onChange={(e) => updateCustomItemField(idx, col.key, e.target.value)} className={fieldCls} />
                        </td>
                      ))}
                      <td className="py-2 pl-2 text-right">
                        <button type="button" onClick={() => removeItem(idx)} className="text-[var(--bd-text-muted)] hover:text-[var(--bd-rose)] transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3">
                <button type="button" onClick={addItem} className="flex w-full items-center justify-center gap-2 rounded-[var(--bd-radius-lg)] border border-dashed border-[var(--bd-border)] py-3 text-[12px] font-bold text-[var(--bd-text-muted)] hover:border-[var(--bd-indigo-border)] hover:bg-[var(--bd-indigo-bg)] hover:text-[var(--bd-indigo)] transition">
                  <Plus className="h-4 w-4" /> Add Row
                </button>
              </div>
            </div>
          </div>

          {/* STEP 5: Custody Details */}
          <div>
            <SectionLabel color="indigo">
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Custody Details</span>
            </SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <MobileTextField label="DELIVERED BY" value={waybill.sender_name} onChange={(e) => updateWaybill('sender_name', e.target.value)} />
              <MobileTextField label="RECEIVED BY" value={waybill.receiver_name} onChange={(e) => updateWaybill('receiver_name', e.target.value)} />
            </div>
          </div>

          {/* STEP 6: Signatures */}
          <div>
            <SectionLabel color="violet" trailing={
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowSenderSignature(v => !v)} className="text-[var(--bd-text-muted)] hover:text-[var(--bd-text)] transition" title="Toggle Sender Signature">
                  {showSenderSignature ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => setShowReceiverSignature(v => !v)} className="text-[var(--bd-text-muted)] hover:text-[var(--bd-text)] transition" title="Toggle Receiver Signature">
                  {showReceiverSignature ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <div className="w-px h-4 bg-[var(--bd-border)]" />
                <button type="button" onClick={() => setShowSignatures(v => !v)} className="text-[var(--bd-text-muted)] hover:text-[var(--bd-text)] transition" title="Toggle Signatures Section">
                  {showSignatures ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            }>
              <span className="flex items-center gap-1.5"><PenTool className="h-3.5 w-3.5" /> Signatures</span>
            </SectionLabel>
            
            {showSignatures && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {showSenderSignature && (
                  <div className={`p-4 rounded-[var(--bd-radius-lg)] border border-dashed border-[var(--bd-border)] ${pageCardCls}`}>
                    <label className={labelCls}>Sender / Delivered By</label>
                    <div className="mt-2 flex gap-2">
                      {['saved', 'upload', 'draw'].map(src => (
                        <button key={src} type="button" onClick={() => setSenderSource(src as any)} className={`flex-1 rounded-[var(--bd-radius-sm)] py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${senderSource === src ? 'bg-[var(--bd-button-primary-bg)] text-[var(--bd-button-primary-text)]' : 'bg-[var(--bd-surface-muted)] text-[var(--bd-text-muted)]'}`}>
                          {src}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex h-24 items-center justify-center rounded-[var(--bd-radius-md)] border border-[var(--bd-border-soft)] bg-[var(--bd-surface)] text-[12px] text-[var(--bd-text-muted)]">
                      {senderSource === 'saved' ? 'Saved signature selected' : senderSource === 'upload' ? 'Upload component here' : 'Draw canvas here'}
                    </div>
                  </div>
                )}
                {showReceiverSignature && (
                  <div className={`p-4 rounded-[var(--bd-radius-lg)] border border-dashed border-[var(--bd-border)] ${pageCardCls}`}>
                    <label className={labelCls}>Receiver / Collected By</label>
                    <div className="mt-2 flex gap-2">
                      {type === 'internal' && (
                        <button type="button" onClick={() => setReceiverSource('saved')} className={`flex-1 rounded-[var(--bd-radius-sm)] py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${receiverSource === 'saved' ? 'bg-[var(--bd-button-primary-bg)] text-[var(--bd-button-primary-text)]' : 'bg-[var(--bd-surface-muted)] text-[var(--bd-text-muted)]'}`}>
                          Saved
                        </button>
                      )}
                      {['upload', 'draw'].map(src => (
                        <button key={src} type="button" onClick={() => setReceiverSource(src as any)} className={`flex-1 rounded-[var(--bd-radius-sm)] py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${receiverSource === src ? 'bg-[var(--bd-button-primary-bg)] text-[var(--bd-button-primary-text)]' : 'bg-[var(--bd-surface-muted)] text-[var(--bd-text-muted)]'}`}>
                          {src}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex h-24 items-center justify-center rounded-[var(--bd-radius-md)] border border-[var(--bd-border-soft)] bg-[var(--bd-surface)] text-[12px] text-[var(--bd-text-muted)]">
                       {receiverSource === 'saved' ? 'Saved signature selected' : receiverSource === 'upload' ? 'Upload component here' : 'Draw canvas here'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 7: Notes */}
          <CollapseCard
            icon={FileText}
            iconTone={{ bg: 'muted' }}
            title={notesTitle}
            subtitle="Additional notes"
            open={notesOpen}
            onToggle={() => setNotesOpen(v => !v)}
            sectionColor="muted"
          >
            <div className="px-4 pb-2">
              <Suspense fallback={<div className="rounded-2xl border border-[var(--bd-border)] bg-[var(--bd-surface)] px-4 py-10 text-center text-[13px] text-[var(--bd-text-muted)]">Loading editor...</div>}>
                <RichTextEditor
                  value={waybill.notes || ''}
                  onChange={(value: string) => updateWaybill('notes', value)}
                  placeholder="Notes..."
                />
              </Suspense>
            </div>
          </CollapseCard>

          {/* STEP 8: Terms & Conditions */}
          {showTerms && (
            <CollapseCard
              icon={Copy}
              iconTone={{ bg: 'muted' }}
              title="Terms & Conditions"
              subtitle="Conditions of this waybill"
              open={termsOpen}
              onToggle={() => setTermsOpen(v => !v)}
              sectionColor="muted"
            >
              <div className="px-4 pb-2">
                <Suspense fallback={<div className="rounded-2xl border border-[var(--bd-border)] bg-[var(--bd-surface)] px-4 py-10 text-center text-[13px] text-[var(--bd-text-muted)]">Loading editor...</div>}>
                  <RichTextEditor
                    value={waybill.custom_fields && typeof waybill.custom_fields === 'object' && !Array.isArray(waybill.custom_fields) && 'terms' in waybill.custom_fields ? String(waybill.custom_fields.terms || '') : ''}
                    onChange={(value: string) => updateWaybill('custom_fields', { ...(typeof waybill.custom_fields === 'object' ? waybill.custom_fields : {}), terms: value } as any)}
                    placeholder="Enter terms and conditions here..."
                  />
                </Suspense>
              </div>
            </CollapseCard>
          )}

        </div>
      </div>

      {/* STEP 9: Floating Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bd-primary)] text-[var(--bd-primary-foreground)] shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
      </button>

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-[var(--bd-radius-lg)] bg-[var(--bd-bg-card)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--bd-text)]">Table Settings</h3>
              <button onClick={() => setShowTableSettings(false)} className="text-[var(--bd-text-muted)] hover:text-[var(--bd-text)]"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-3">
                <label className={labelCls}>Column Visibility & Titles</label>
                {Object.entries(columnTitles).map(([key, title]) => (
                  <div key={key} className="flex items-center gap-3">
                    <input type="checkbox" checked={isColumnVisible(key)} onChange={e => setColumnVisibility(prev => ({ ...prev, [key]: e.target.checked }))} className="h-4 w-4 rounded border-[var(--bd-border)] text-[var(--bd-primary)]" disabled={key === 'description' || key === 'qty' || key === 'unit'} />
                    <Input value={title} onChange={e => setColumnTitles(prev => ({ ...prev, [key]: e.target.value }))} disabled={key === 'description' || key === 'qty' || key === 'unit'} className="h-8 flex-1 text-[13px]" />
                  </div>
                ))}
                {customColumns.map(col => (
                  <div key={col.key} className="flex items-center gap-3">
                    <input type="checkbox" checked={isColumnVisible(col.key)} onChange={e => setColumnVisibility(prev => ({ ...prev, [col.key]: e.target.checked }))} className="h-4 w-4 rounded border-[var(--bd-border)] text-[var(--bd-primary)]" />
                    <Input value={col.label} onChange={e => {
                      setState((prev) => ({
                        ...prev,
                        customColumns: prev.customColumns.map((entry) => entry.key === col.key ? { ...entry, label: e.target.value } : entry),
                      }))
                      markDirty()
                    }} className="h-8 flex-1 text-[13px]" />
                    <button type="button" onClick={() => removeCustomColumn(col.key)} className="text-[var(--bd-text-muted)] hover:text-[var(--bd-rose)]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={addCustomColumn} className="text-[12px] font-bold text-[var(--bd-primary)]">+ Add Custom Column</button>
              </div>

              <div className="border-t border-[var(--bd-border-soft)] pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-bold text-[var(--bd-text)]">Show Terms & Conditions</label>
                  <input type="checkbox" checked={showTerms} onChange={e => setShowTerms(e.target.checked)} className="h-4 w-4 rounded border-[var(--bd-border)] text-[var(--bd-primary)]" />
                </div>
              </div>
            </div>
            <div className="mt-6">
              <button onClick={() => setShowTableSettings(false)} className="w-full rounded-[var(--bd-radius-md)] bg-[var(--bd-button-primary-bg)] py-2 text-[14px] font-bold text-[var(--bd-button-primary-text)]">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

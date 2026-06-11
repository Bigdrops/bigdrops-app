import { useCallback, useEffect, useRef, useState } from 'react'
import { Copy, Download, Eye, EyeOff, FileUp, Plus, Trash2 } from 'lucide-react'

import ClientSelector from '@/components/ClientSelector'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Textarea } from '@/components/ui/textarea'
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
  pageCardCls,
} from '@/components/invoice/mobile/mobileFormPrimitives'

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
  const [sections, setSections] = useState({
    details: true,
    routing: true,
    transport: true,
    items: true,
    remarks: true,
    terms: false,
  })
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [showPoNumber, setShowPoNumber] = useState(false)
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

  const addCustomColumn = () => {
    if (customColumns.length >= WAYBILL_COLUMN_LIMIT) {
      feedback.warning('Limit reached', {
        description: `Maximum ${WAYBILL_COLUMN_LIMIT} columns allowed.`,
      })
      return
    }
    setState((prev) => ({
      ...prev,
      customColumns: [...prev.customColumns, { key: createCustomColumnKey(`custom_${Date.now()}`), label: '' }],
    }))
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

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }))
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

  const duplicateItem = (index: number) => {
    setState((prev) => {
      const item = prev.items[index]
      return { ...prev, items: [...prev.items, { ...item }] }
    })
    markDirty()
  }

  const handleBlankTemplate = () => {
    const header = ['Description', 'Quantity', 'Unit', 'Condition', ...customColumns.map((c) => c.label || 'Custom')]
    const row = ['', '1', '', 'good', ...customColumns.map(() => '')]
    const csv = [header.join(','), row.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waybill-template-${type}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = async () => {
    if (!waybill.sender_name) {
      feedback.error('Sender required', { description: 'Please add a sender name.' })
      return
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
    <div className="space-y-0">
      <div className="flex items-center justify-between border-b border-bd-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="text-sm font-black tracking-tight text-bd-text">
            {type === 'internal' ? 'Internal' : 'External'} Waybill
          </div>
          {waybill.waybill_number ? (
            <span className="rounded-full bg-bd-violet-bg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-tighter text-bd-violet">
              {waybill.waybill_number}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex h-9 items-center gap-1.5 rounded-[var(--bd-radius-md)] bg-bd-button-primary-bg px-4 text-[12px] font-bold text-bd-button-primary-text transition hover:bg-bd-button-primary-bg/90 active:scale-[0.97]"
          >
            <FileUp className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4">
        <div className={`${pageCardCls} overflow-hidden`}>
          <CollapseCard
            icon={Copy}
            iconTone={{ bg: 'indigo' }}
            title="Document Details"
            subtitle="Waybill number, date, and type"
            open={sections.details}
            onToggle={() => toggleSection('details')}
            sectionColor={SECTION_COLORS.details}
          >
            <div className="space-y-3 px-4">
              <MobileTextField
                label="Waybill Number"
                value={waybill.waybill_number}
                onChange={(e) => updateWaybill('waybill_number', e.target.value)}
                placeholder="Auto-generated"
                disabled
              />
              <MobileTextField
                label="Date"
                type="date"
                value={waybill.date}
                onChange={(e) => updateWaybill('date', e.target.value)}
              />
              <MobileTextField
                label="Time"
                type="time"
                value={waybill.time}
                onChange={(e) => updateWaybill('time', e.target.value)}
              />
            </div>
          </CollapseCard>

          <CollapseCard
            icon={Copy}
            iconTone={{ bg: 'violet' }}
            title="Routing"
            subtitle={typeContent.senderLabel}
            open={sections.routing}
            onToggle={() => toggleSection('routing')}
            sectionColor={SECTION_COLORS.routing}
          >
            <div className="space-y-3 px-4">
              <MobileTextField
                label={typeContent.senderLabel}
                value={waybill.sender_name}
                onChange={(e) => updateWaybill('sender_name', e.target.value)}
                placeholder={typeContent.senderPlaceholder}
              />
              <MobileTextField
                label={typeContent.receiverLabel}
                value={waybill.receiver_name}
                onChange={(e) => updateWaybill('receiver_name', e.target.value)}
                placeholder={typeContent.receiverPlaceholder}
              />

              {waybill.type === 'external' ? (
                <>
                  <MobileField label={typeContent.clientLabel}>
                    <ClientSelector
                      clientId={waybill.client_id}
                      clientName={waybill.client_name}
                      open={clientPickerOpen}
                      onOpenChange={setClientPickerOpen}
                      onClientChange={(clientId, clientName) => {
                        updateWaybill('client_id', clientId || '')
                        updateWaybill('client_name', clientName || '')
                      }}
                      compact
                    />
                  </MobileField>
                  <MobileTextField
                    label={typeContent.locationLabel}
                    value={waybill.delivery_location}
                    onChange={(e) => updateWaybill('delivery_location', e.target.value)}
                    placeholder={typeContent.locationPlaceholder}
                  />
                </>
              ) : (
                <>
                  <MobileTextField
                    label="Transfer From"
                    value={waybill.sender_name}
                    onChange={(e) => updateWaybill('sender_name', e.target.value)}
                    placeholder="Store, workshop, or releasing staff"
                  />
                  <MobileTextField
                    label="Transfer To"
                    value={waybill.receiver_name}
                    onChange={(e) => updateWaybill('receiver_name', e.target.value)}
                    placeholder="Receiving team, site, or custodian"
                  />
                </>
              )}
            </div>
          </CollapseCard>

          <CollapseCard
            icon={Copy}
            iconTone={{ bg: 'amber' }}
            title="Transport Details"
            subtitle="Mode, vehicle, and driver"
            open={sections.transport}
            onToggle={() => toggleSection('transport')}
            sectionColor={SECTION_COLORS.transport}
          >
            <div className="space-y-3 px-4">
              <MobileField label="Transport Mode">
                <CompactSelectField
                  value={waybill.transport_mode}
                  onChange={(value) => {
                    updateWaybill('transport_mode', value as TransportMode)
                    if (value === 'By Hand') {
                      updateWaybill('vehicle_plate', '')
                      updateWaybill('driver_name', '')
                    }
                  }}
                  options={TRANSPORT_MODE_OPTIONS}
                />
              </MobileField>

              <MobileField label="Purpose">
                <CompactSelectField
                  value={waybill.purpose || ''}
                  onChange={(value) => updateWaybill('purpose', value as WaybillPurpose | '')}
                  options={PURPOSE_OPTIONS}
                />
              </MobileField>

              {waybill.transport_mode !== 'By Hand' ? (
                <>
                  <MobileTextField
                    label="Driver Name"
                    value={waybill.driver_name}
                    onChange={(e) => updateWaybill('driver_name', e.target.value)}
                    placeholder="Driver name"
                  />
                  <MobileTextField
                    label="Vehicle Plate"
                    value={waybill.vehicle_plate}
                    onChange={(e) => updateWaybill('vehicle_plate', e.target.value)}
                    placeholder="ABC 1234"
                  />
                </>
              ) : null}

              <MobileField label="Linked Invoice">
                <div className="relative">
                  <Input
                    value={customFields.references?.linkedInvoiceNumber || ''}
                    onChange={(e) =>
                      updateCustomFields({
                        references: { ...customFields.references, linkedInvoiceNumber: e.target.value },
                      })
                    }
                    placeholder="Invoice #"
                    type={showInvoice ? 'text' : 'password'}
                    className="h-11 rounded-[var(--bd-radius-md)] border border-bd-border bg-bd-surface pr-10 text-[14px] text-bd-text placeholder:text-bd-text-muted"
                  />
                  <button
                    type="button"
                    onClick={() => setShowInvoice((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-bd-text-muted hover:text-bd-text"
                  >
                    {showInvoice ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </MobileField>

              <MobileField label="P.O. Number">
                <div className="relative">
                  <Input
                    value={waybill.po_number || ''}
                    onChange={(e) => updateWaybill('po_number', e.target.value)}
                    placeholder="PO #"
                    type={showPoNumber ? 'text' : 'password'}
                    className="h-11 rounded-[var(--bd-radius-md)] border border-bd-border bg-bd-surface pr-10 text-[14px] text-bd-text placeholder:text-bd-text-muted"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPoNumber((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-bd-text-muted hover:text-bd-text"
                  >
                    {showPoNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </MobileField>
            </div>
          </CollapseCard>

          <CollapseCard
            icon={Copy}
            iconTone={{ bg: 'emerald' }}
            title="Item List"
            subtitle={`${items.length} item${items.length !== 1 ? 's' : ''}`}
            open={sections.items}
            onToggle={() => toggleSection('items')}
            sectionColor={SECTION_COLORS.items}
          >
            <div className="space-y-3 px-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-bd-text-muted">
                  {customColumns.length} / {WAYBILL_COLUMN_LIMIT} columns
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleBlankTemplate}
                    className="flex h-7 items-center gap-1 rounded-full border border-bd-border bg-bd-surface px-3 text-[10px] font-bold text-bd-text-muted transition hover:bg-bd-surface-muted hover:text-bd-text"
                  >
                    <Download className="h-3 w-3" />
                    Template
                  </button>
                  <button
                    type="button"
                    onClick={addCustomColumn}
                    className="flex h-7 items-center gap-1 rounded-full border border-bd-border bg-bd-surface px-3 text-[10px] font-bold text-bd-text-muted transition hover:bg-bd-surface-muted hover:text-bd-text"
                  >
                    <Plus className="h-3 w-3" />
                    Column
                  </button>
                </div>
              </div>

              {customColumns.length > 0 ? (
                <div className="space-y-1.5">
                  {customColumns.map((column) => (
                    <div key={column.key} className="flex items-center gap-2">
                      <Input
                        value={column.label}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            customColumns: prev.customColumns.map((entry) =>
                              entry.key === column.key ? { ...entry, label: e.target.value } : entry,
                            ),
                          }))
                        }
                        placeholder="Column label"
                        className="h-8 flex-1 rounded-[var(--bd-radius-md)] border border-bd-border bg-bd-surface px-2.5 text-[12px] text-bd-text placeholder:text-bd-text-muted"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomColumn(column.key)}
                        className="flex h-8 w-8 items-center justify-center rounded-[var(--bd-radius-md)] text-bd-text-muted hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={`item-${index}`}
                    className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-card-bg p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[11px] font-bold text-bd-text">Item {index + 1}</div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateItem(index)}
                          className="flex h-7 w-7 items-center justify-center rounded-[var(--bd-radius-md)] text-bd-text-muted hover:text-bd-text"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="flex h-7 w-7 items-center justify-center rounded-[var(--bd-radius-md)] text-bd-text-muted hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <MobileTextField
                        label="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Item details"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <MobileField label="Qty">
                          <NumericInput
                            value={item.quantity}
                            onChange={(val) => updateItem(index, 'quantity', val)}
                            className="h-11 rounded-[var(--bd-radius-md)] border border-bd-border bg-bd-surface px-3 text-[14px] text-bd-text"
                          />
                        </MobileField>
                        <MobileTextField
                          label="Unit"
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          placeholder="pcs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <MobileField label="Part No.">
                          <NumericInput
                            value={String(item.custom_data?.['part_no'] || '')}
                            onChange={(val) => updateCustomItemField(index, 'part_no', String(val))}
                            className="h-11 rounded-[var(--bd-radius-md)] border border-bd-border bg-bd-surface px-3 text-[14px] text-bd-text"
                          />
                        </MobileField>
                        <MobileField label="Condition">
                          <div className="flex gap-1.5">
                            {CONDITION_OPTIONS.map((opt) => (
                              <ChipButton
                                key={opt.value}
                                active={item.condition === opt.value}
                                onClick={() => updateItem(index, 'condition', opt.value)}
                              >
                                {opt.label}
                              </ChipButton>
                            ))}
                          </div>
                        </MobileField>
                      </div>

                      {customColumns.map((column) => (
                        <MobileTextField
                          key={column.key}
                          label={column.label || 'Custom'}
                          value={String(item.custom_data?.[column.key] || '')}
                          onChange={(e) => updateCustomItemField(index, column.key, e.target.value)}
                          placeholder={column.label}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addItem}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--bd-radius-lg)] border-2 border-dashed border-bd-border py-3 text-[12px] font-bold text-bd-text-muted transition hover:border-bd-button-primary-bg hover:text-bd-button-primary-bg"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
          </CollapseCard>

          <CollapseCard
            icon={Copy}
            iconTone={{ bg: 'muted' }}
            title="Notes"
            subtitle="Additional remarks"
            open={sections.remarks}
            onToggle={() => toggleSection('remarks')}
            sectionColor={SECTION_COLORS.remarks}
          >
            <div className="space-y-3 px-4">
              <MobileField label="Notes">
                <div className="rounded-[var(--bd-radius-md)] border border-bd-border bg-bd-surface">
                  <div className="flex items-center gap-1 border-b border-bd-border px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const textarea = document.querySelector('[data-notes-field]') as HTMLTextAreaElement
                        if (textarea) {
                          const start = textarea.selectionStart
                          const end = textarea.selectionEnd
                          const text = textarea.value
                          const before = text.substring(0, start)
                          const selected = text.substring(start, end)
                          const after = text.substring(end)
                          updateWaybill('notes', `${before}**${selected || 'bold'}**${after}`)
                        }
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold text-bd-text-muted hover:bg-bd-surface-muted hover:text-bd-text"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const textarea = document.querySelector('[data-notes-field]') as HTMLTextAreaElement
                        if (textarea) {
                          const start = textarea.selectionStart
                          const end = textarea.selectionEnd
                          const text = textarea.value
                          const before = text.substring(0, start)
                          const selected = text.substring(start, end)
                          const after = text.substring(end)
                          updateWaybill('notes', `${before}_${selected || 'italic'}_${after}`)
                        }
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-[11px] italic text-bd-text-muted hover:bg-bd-surface-muted hover:text-bd-text"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const textarea = document.querySelector('[data-notes-field]') as HTMLTextAreaElement
                        if (textarea) {
                          const start = textarea.selectionStart
                          const text = textarea.value
                          const before = text.substring(0, start)
                          const after = text.substring(start)
                          const needsNewline = before.length > 0 && !before.endsWith('\n')
                          updateWaybill('notes', `${before}${needsNewline ? '\n' : ''}• ${after}`)
                        }
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-[11px] text-bd-text-muted hover:bg-bd-surface-muted hover:text-bd-text"
                      title="Bullet List"
                    >
                      •
                    </button>
                  </div>
                  <Textarea
                    data-notes-field
                    value={waybill.notes || ''}
                    onChange={(e) => updateWaybill('notes', e.target.value)}
                    placeholder="Additional instructions or remarks"
                    rows={4}
                    className="rounded-none border-0 bg-transparent text-[14px] text-bd-text placeholder:text-bd-text-muted focus-visible:ring-0"
                  />
                </div>
              </MobileField>

              <MobileField label={typeContent.senderNoteLabel}>
                <Textarea
                  value={customFields.partyNotes?.sender || ''}
                  onChange={(e) =>
                    updateCustomFields({ partyNotes: { ...customFields.partyNotes, sender: e.target.value } })
                  }
                  placeholder="Notes from sender"
                  rows={2}
                  className="rounded-[var(--bd-radius-md)] border border-bd-border bg-bd-surface text-[14px] text-bd-text placeholder:text-bd-text-muted"
                />
              </MobileField>

              <MobileField label={typeContent.receiverNoteLabel}>
                <Textarea
                  value={customFields.partyNotes?.receiver || ''}
                  onChange={(e) =>
                    updateCustomFields({ partyNotes: { ...customFields.partyNotes, receiver: e.target.value } })
                  }
                  placeholder="Notes from receiver"
                  rows={2}
                  className="rounded-[var(--bd-radius-md)] border border-bd-border bg-bd-surface text-[14px] text-bd-text placeholder:text-bd-text-muted"
                />
              </MobileField>
            </div>
          </CollapseCard>

          <CollapseCard
            icon={Copy}
            iconTone={{ bg: 'muted' }}
            title="Terms & Acknowledgement"
            subtitle="Conditions of this waybill"
            open={sections.terms}
            onToggle={() => toggleSection('terms')}
            sectionColor="muted"
          >
            <div className="space-y-2 px-4">
              <p className="text-[12px] leading-relaxed text-bd-text-muted">
                The items listed above are released on consignment basis and remain the property of the company until
                full settlement or return. The receiver acknowledges receipt in good condition unless otherwise noted.
                Any damage or shortage must be reported within 24 hours.
              </p>
              <p className="text-[12px] leading-relaxed text-bd-text-muted">
                {typeContent.signatureSectionTitle}: signatures above confirm acknowledgement of receipt and
                responsibility.
              </p>
            </div>
          </CollapseCard>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 items-center rounded-[var(--bd-radius-md)] border border-bd-border bg-bd-surface px-5 text-[13px] font-bold text-bd-text-muted transition hover:bg-bd-surface-muted hover:text-bd-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex h-10 items-center gap-2 rounded-[var(--bd-radius-md)] bg-bd-button-primary-bg px-5 text-[13px] font-bold text-bd-button-primary-text transition hover:bg-bd-button-primary-bg/90 active:scale-[0.97]"
          >
            <FileUp className="h-4 w-4" />
            {saving ? 'Saving...' : `Save ${type === 'internal' ? 'Internal' : 'External'} Waybill`}
          </button>
        </div>
      </div>
    </div>
  )
}

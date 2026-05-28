import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Copy, Plus, Trash2, X, Wand2 } from 'lucide-react'

import { supabase } from '@/supabase'
import ClientSelector from '@/components/ClientSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { canUseAndroidNativeSqlite } from '@/lib/native/capacitor'
import {
  createOfflineWaybillDraft,
  peekNextOfflineWaybillNumber,
} from '@/lib/native/waybillOffline'
import {
  CONDITION_OPTIONS,
  WAYBILL_COLUMN_LIMIT,
  buildWaybillCustomFields,
  collectWaybillCustomColumns,
  createCustomColumnKey,
  createDefaultItem,
  createDefaultWaybill,
  getNextWaybillNumber,
  getWaybillSignature,
  getWaybillTypeContent,
  mapDbWaybill,
  parseWaybillCustomFields,
  normalizeSignatureEvidence,
  normalizeWaybillImport,
  normalizeWaybillItems,
  normalizeWaybillStatus,
  type Waybill,
  type WaybillCustomColumn,
  type WaybillCustomFields,
  type WaybillItem,
  type WaybillStatus,
  type WaybillType,
} from './waybillUtils'

import { WaybillImportSheet } from './WaybillImportSheet'
import { WaybillSignatureField } from './WaybillSignatureField'

type WaybillFormProps = {
  mode: 'new' | 'edit'
  waybillId?: string
  onCancel?: () => void
  onSaved?: () => void
}

type ProjectPrefillState = {
  projectId?: string
  projectName?: string
  clientId?: string
  clientName?: string
  sourceInvoice?: {
    invoiceId?: string
    invoiceNumber?: string
    clientId?: string
    clientName?: string
    poNumber?: string
  }
}

const hasInvoicePrefillDetails = (invoice?: ProjectPrefillState['sourceInvoice']) =>
  Boolean(invoice?.invoiceNumber || invoice?.clientId || invoice?.clientName || invoice?.poNumber)

function canUseOfflineWaybillDrafts() {
  return canUseAndroidNativeSqlite() && typeof navigator !== 'undefined' && navigator.onLine === false
}

function Field({ label, help, required, children }: { label: string; help?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </Label>
      {children}
      {help ? <div className="text-xs text-muted-foreground">{help}</div> : null}
    </div>
  )
}

function SectionCard({ title, accent, subtitle, children }: { title: string; accent: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className={`border-b border-border px-4 py-3 ${accent}`}>
        <CardTitle className="text-sm font-bold text-foreground">{title}</CardTitle>
        {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
      </CardHeader>
      <CardContent className="space-y-4 p-4">{children}</CardContent>
    </Card>
  )
}

export default function WaybillForm({ mode, waybillId, onCancel, onSaved }: WaybillFormProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state as ProjectPrefillState | undefined

  const [waybill, setWaybill] = useState<Waybill>(() => createDefaultWaybill())
  const [items, setItems] = useState<WaybillItem[]>([createDefaultItem()])
  const [customColumns, setCustomColumns] = useState<WaybillCustomColumn[]>([])
  const [customFields, setCustomFields] = useState<WaybillCustomFields>({})
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceSuggestions, setInvoiceSuggestions] = useState<{ id: string; invoice_number: string }[]>([])
  const [projectName, setProjectName] = useState(prefill?.projectName || '')

  useEffect(() => {
    async function load() {
      if (mode === 'edit' && waybillId) {
        const { data, error } = await supabase.from('waybills').select(`*, project:projects(name)`).eq('id', waybillId).single()
        if (error) {
          feedback.error('Fetch failed', { description: error.message })
          navigate('/waybills')
          return
        }

        const mapped = mapDbWaybill(data)
        setWaybill(mapped)
        setItems(mapped.items || [createDefaultItem()])
        setProjectName((data.project as any)?.name || '')

        const fields = parseWaybillCustomFields(data.custom_fields)
        setCustomFields(fields)
        setCustomColumns(collectWaybillCustomColumns(mapped.items, fields.customColumns || []))

        if (fields.references?.linkedInvoiceNumber) {
          setInvoiceSearch(fields.references.linkedInvoiceNumber)
        }
      } else {
        const defaultWaybill = createDefaultWaybill()
        if (prefill?.projectId) {
          defaultWaybill.project_id = prefill.projectId
          defaultWaybill.client_id = prefill.clientId || ''
          defaultWaybill.client_name = prefill.clientName || ''
        }
        if (hasInvoicePrefillDetails(prefill?.sourceInvoice)) {
          defaultWaybill.invoice_id = prefill?.sourceInvoice?.invoiceId || ''
          defaultWaybill.po_number = prefill?.sourceInvoice?.poNumber || ''
          setInvoiceSearch(prefill?.sourceInvoice?.invoiceNumber || '')
          const initialFields = parseWaybillCustomFields({})
          setCustomFields({ ...initialFields, references: { ...initialFields.references, linkedInvoiceNumber: prefill?.sourceInvoice?.invoiceNumber || '' } })
        }

        const nextNum = canUseOfflineWaybillDrafts() 
          ? await peekNextOfflineWaybillNumber()
          : await getNextWaybillNumber(defaultWaybill.type as WaybillType, []) // Simplified
          
        setWaybill({ ...defaultWaybill, waybill_number: nextNum })
      }
      setLoading(false)
    }
    load()
  }, [mode, waybillId, navigate, prefill])

  const typeContent = getWaybillTypeContent(waybill.type)

  const updateWaybill = <K extends keyof Waybill>(key: K, value: Waybill[K]) => {
    setWaybill((current) => ({ ...current, [key]: value }))
  }

  const updateItem = <K extends keyof WaybillItem>(index: number, key: K, value: WaybillItem[K]) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
  }

  const updateCustomItemField = (index: number, key: string, value: string) => {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, custom_data: { ...item.custom_data, [key]: value } } : item
      )
    )
  }

  const addCustomColumn = () => {
    if (customColumns.length >= WAYBILL_COLUMN_LIMIT) {
      feedback.warning('Limit reached', {
        description: `Maximum ${WAYBILL_COLUMN_LIMIT} columns allowed.`,
      })
      return
    }
    setCustomColumns((current) => [...current, { key: createCustomColumnKey(`custom_${Date.now()}`), label: '' }])
  }

  const removeCustomColumn = (key: string) => {
    setCustomColumns((current) => current.filter((c) => c.key !== key))
    setItems((current) => current.map((item) => {
      const next = { ...item.custom_data }
      delete next[key]
      return { ...item, custom_data: next }
    }))
  }

  const updateCustomFields = (patch: Partial<WaybillCustomFields>) => {
    setCustomFields((current) => ({ ...current, ...patch }))
  }

  const handleApplyImport = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr)
      const normalized = normalizeWaybillImport(parsed, waybill.type)
      setWaybill((current) => ({
        ...current,
        ...normalized.fields,
        type: normalized.type,
      }))
      setItems(normalized.items)
      setCustomColumns(normalized.customColumns)
      setCustomFields(normalized.customFields)
      setImportOpen(false)
      feedback.success('Import successful', { description: 'Waybill draft updated.' })
    } catch (error) {
      feedback.error('Parse failed', {
        description: error instanceof Error ? error.message : 'Invalid JSON',
      })
    }
  }

  const searchInvoices = async (query: string) => {
    setInvoiceSearch(query)
    if (query.length < 3) {
      setInvoiceSuggestions([])
      return
    }
    const { data } = await supabase.from('invoices').select('id, invoice_number').ilike('invoice_number', `%${query}%`).limit(5)
    setInvoiceSuggestions(data || [])
  }

  const onSave = async () => {
    if (!waybill.sender_name) {
      feedback.error('Sender required', { description: 'Please add a sender name.' })
      return
    }

    setSaving(true)
    try {
      const finalFields = buildWaybillCustomFields(customFields, { customColumns })
      
      const { saveWaybill } = await import('@/domain/waybill/waybillMutations')
      
      const result = await saveWaybill({
        waybill,
        items,
        custom_fields: finalFields,
        mode,
        waybillId,
        isOffline: canUseOfflineWaybillDrafts()
      });

      if (result.status === 'offline') {
        feedback.success('Saved offline', { description: 'Draft preserved locally.' })
      } else {
        feedback.success('Waybill saved', { description: 'Database updated successfully.' })
      }
      
      if (onSaved) onSaved()
      else navigate('/waybills')
    } catch (error) {
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(error, { action: 'save' }),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse font-black uppercase tracking-widest text-[10px]">Loading Waybill…</div>

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-bd-border bg-bd-surface/80 px-4 py-4 backdrop-blur shadow-sm rounded-b-3xl -mx-4">
        <div>
          <h1 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
            {mode === 'new' ? 'Create Waybill' : 'Edit Waybill'}
            <span className="text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full bg-[hsl(var(--bd-accent))]/10 text-[hsl(var(--bd-accent))]">
              {waybill.waybill_number || 'Pending'}
            </span>
          </h1>
          <p className="text-xs font-medium text-muted-foreground">{typeContent.intro.slice(0, 50)}...</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => onCancel ? onCancel() : navigate(-1)}>
            <X className="h-4 w-4" />
          </Button>
          <Button className="rounded-xl bg-bd-button-primary-bg font-bold text-bd-button-primary-text hover:bg-bd-button-primary-bg/90 shadow-md transition-all active:scale-95" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="space-y-6 px-1">
        <SectionCard title="Basic Information" accent="bg-bd-surface-muted">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Waybill Type" required help="Internal: transfers within company. External: client deliveries.">
              <Select value={waybill.type} onValueChange={(value: WaybillType) => updateWaybill('type', value)}>
                <SelectTrigger className="rounded-xl border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal Waybill</SelectItem>
                  <SelectItem value="external">External Waybill</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Status" required>
              <Select value={waybill.status} onValueChange={(value: WaybillStatus) => updateWaybill('status', value)}>
                <SelectTrigger className="rounded-xl border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="rounded-xl h-10 px-4 font-bold border-2 border-slate-200 hover:bg-slate-50 transition-colors" onClick={() => setImportOpen(true)}>
                <Wand2 className="mr-2 h-4 w-4 text-[hsl(var(--bd-accent))]" />
                Import extraction
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="People and Movement" accent="bg-bd-surface-muted">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={typeContent.senderLabel} required>
              <Input value={waybill.sender_name || ''} onChange={(event) => updateWaybill('sender_name', event.target.value)} placeholder={typeContent.senderPlaceholder} />
            </Field>
            <Field label={typeContent.receiverLabel}>
              <Input value={waybill.receiver_name || ''} onChange={(event) => updateWaybill('receiver_name', event.target.value)} placeholder={typeContent.receiverPlaceholder} />
            </Field>

            <div className="sm:col-span-2">
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
            </div>

            <Field label="Vehicle Plate">
              <Input value={waybill.vehicle_plate || ''} onChange={(event) => updateWaybill('vehicle_plate', event.target.value)} placeholder="ABC 1234" />
            </Field>
            <Field label="P.O. Number">
              <Input value={waybill.po_number || ''} onChange={(event) => updateWaybill('po_number', event.target.value)} placeholder="Optional" />
            </Field>

            <Field label={typeContent.senderNoteLabel}>
              <Textarea value={customFields.partyNotes?.sender || ''} onChange={(event) => updateCustomFields({ partyNotes: { ...customFields.partyNotes, sender: event.target.value } })} rows={3} />
            </Field>
            <Field label={typeContent.receiverNoteLabel}>
              <Textarea value={customFields.partyNotes?.receiver || ''} onChange={(event) => updateCustomFields({ partyNotes: { ...customFields.partyNotes, receiver: event.target.value } })} rows={3} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Items and Custom Columns" accent="bg-bd-surface-muted" subtitle="Keep the item list practical for mobile and print.">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">{customColumns.length} / {WAYBILL_COLUMN_LIMIT} custom columns</div>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={addCustomColumn}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Column
                </Button>
              </div>

              {customColumns.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {customColumns.map((column) => (
                    <div key={column.key} className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-2">
                      <Input value={column.label} onChange={(event) => setCustomColumns((current) => current.map((entry) => (entry.key === column.key ? { ...entry, label: event.target.value } : entry)))} placeholder="Label" className="h-8 text-xs" />
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => removeCustomColumn(column.key)}>
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={`waybill-item-${index}`} className="rounded-2xl border border-border bg-card p-4">
                    <div className="mb-3 flex items-center justify-between border-b pb-2">
                      <div className="text-sm font-bold text-foreground">Item {index + 1}</div>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setItems((current) => (current.length === 1 ? [createDefaultItem()] : current.filter((_, itemIndex) => itemIndex !== index)))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Field label="Description" required>
                          <Textarea value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} rows={2} placeholder="Item details" className="rounded-xl" />
                        </Field>
                      </div>

                      <Field label="Qty">
                        <NumericInput value={item.quantity} onChange={(val) => updateItem(index, 'quantity', val)} className="rounded-xl" />
                      </Field>
                      <Field label="Unit">
                        <Input value={item.unit} onChange={(event) => updateItem(index, 'unit', event.target.value)} placeholder="pcs" className="rounded-xl" />
                      </Field>
                      
                      <Field label="Condition">
                        <Select value={item.condition} onValueChange={(value: any) => updateItem(index, 'condition', value)}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITION_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      {customColumns.map((column) => (
                        <Field key={column.key} label={column.label || 'Unnamed Column'}>
                          <Input value={String(item.custom_data?.[column.key] || '')} onChange={(event) => updateCustomItemField(index, column.key, event.target.value)} placeholder={column.label} className="rounded-xl" />
                        </Field>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" className="w-full rounded-2xl border-dashed h-12 text-slate-500 font-bold" onClick={() => setItems((current) => [...current, createDefaultItem()])}>
                <Plus className="mr-2 h-4 w-4" />
                Add Another Item
              </Button>
            </div>
          </SectionCard>

        <SectionCard title={typeContent.signatureSectionTitle} accent="bg-bd-surface-muted" subtitle={typeContent.ackPendingText}>
          <div className="space-y-6">
            <WaybillSignatureField role="sender" label={typeContent.senderSignatureLabel} value={getWaybillSignature(waybill, 'sender')} onChange={(next) => updateCustomFields({ signatures: { ...customFields.signatures, sender: next } })} />
            <WaybillSignatureField role="receiver" label={typeContent.receiverSignatureLabel} value={getWaybillSignature(waybill, 'receiver')} onChange={(next) => updateCustomFields({ signatures: { ...customFields.signatures, receiver: next } })} />
          </div>
        </SectionCard>
      </div>

      <WaybillImportSheet open={importOpen} onOpenChange={setImportOpen} onImport={handleApplyImport} />
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Copy, Plus, Trash2, Upload, X } from 'lucide-react'

import { supabase } from '@/supabase'
import ClientSelector from '@/components/ClientSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { canUseNativeSqlite } from '@/lib/native/capacitor'
import { type ProjectLookupClient, validateProjectAssignment } from '@/domain/projects'
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
  type SignatureRole,
  type Waybill,
  type WaybillCustomColumn,
  type WaybillCustomFields,
  type WaybillItem,
  type WaybillStatus,
  type WaybillType,
} from './waybillUtils'

type WaybillFormProps = {
  mode: 'new' | 'edit'
  waybillId?: string
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
  return canUseNativeSqlite() && typeof navigator !== 'undefined' && navigator.onLine === false
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

function ImportSheet({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (text: string) => void
}) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!open) setText('')
  }, [open])

  const prompt = `Convert a photographed or handwritten waybill into JSON only.
Do not include markdown or explanations.
Never invent monetary values.

Return this shape:
{
  "type": "internal or external",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "sender_name": "",
  "receiver_name": "",
  "client_name": "",
  "delivery_location": "",
  "vehicle_plate": "",
  "po_number": "",
  "notes": "",
  "sender_note": "",
  "receiver_note": "",
  "linked_invoice_number": "",
  "linked_project_name": "",
  "source_document_number": "",
  "sender_signature_present": true,
  "sender_signature_description": "",
  "sender_signature_confidence": "low, medium, or high",
  "receiver_signature_present": true,
  "receiver_signature_description": "",
  "receiver_signature_confidence": "low, medium, or high",
  "items": [
    {
      "description": "",
      "quantity": 1,
      "unit": "",
      "condition": "good",
      "extra fields from the source": ""
    }
  ]
}

Rules:
- Internal waybills are custody transfers within the company.
- External waybills are deliveries to clients or outside recipients.
- Detect whether signature-like marks are present and describe them.
- Never fabricate exact signature text.
- Unknown item-level fields must still be returned at item level.`

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      toast({ title: 'Copied', description: 'Waybill AI prompt copied.' })
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy prompt.', variant: 'destructive' })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] rounded-t-[28px] bg-card p-0 [&>[data-slot=sheet-close]]:hidden">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="text-base font-semibold text-foreground">Import Waybill JSON</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">Use this when a paper or photographed waybill needs to be captured digitally.</div>
            <div className="mt-2">1. Copy the prompt below.</div>
            <div>2. Give the prompt and image to any AI.</div>
            <div>3. Paste the returned JSON here.</div>
            <div>4. Review everything before saving.</div>
          </div>

          <div className="rounded-2xl border border-border bg-slate-50 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Prompt</div>
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-card p-3 text-xs text-foreground">
              {prompt}
            </div>
            <Button type="button" variant="outline" className="mt-3 rounded-xl" onClick={copyPrompt}>
              Copy Prompt
            </Button>
          </div>

          <div className="space-y-3">
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder='{"type":"external","items":[{"description":"Generator","quantity":1,"unit":"pc"}]}'
              className="min-h-64 rounded-2xl border-border bg-muted/30 font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setText('')}>
                Clear
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => onImport(text)}
              >
                Import JSON
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SignatureField({
  role,
  label,
  value,
  onChange,
}: {
  role: SignatureRole
  label: string
  value: ReturnType<typeof normalizeSignatureEvidence>
  onChange: (next: ReturnType<typeof normalizeSignatureEvidence>) => void
}) {
  const [showDraw, setShowDraw] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!showDraw || !canvasRef.current) return
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.lineWidth = 2
    context.lineCap = 'round'
    context.strokeStyle = '#0f172a'
  }, [showDraw])

  const start = (x: number, y: number) => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return
    drawingRef.current = true
    context.beginPath()
    context.moveTo(x, y)
  }

  const move = (x: number, y: number) => {
    if (!drawingRef.current) return
    const context = canvasRef.current?.getContext('2d')
    if (!context) return
    context.lineTo(x, y)
    context.stroke()
  }

  const stop = () => {
    drawingRef.current = false
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${role}_sig_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('signatures').upload(path, file, { upsert: true })
    if (error) {
      toast({ title: 'Upload failed', description: `Upload failed: ${error.message}`, variant: 'destructive' })
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('signatures').getPublicUrl(path)
    onChange({ ...value, image_url: data.publicUrl, present: true })
    setUploading(false)
    event.target.value = ''
  }

  const saveDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange({ ...value, drawn_data_url: canvas.toDataURL('image/png'), present: true })
    setShowDraw(false)
  }

  const previewUrl = value.image_url || value.drawn_data_url

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <div className="flex flex-wrap items-center gap-3">
        {previewUrl ? <img src={previewUrl} alt={`${role} signature`} className="h-20 rounded-xl border border-border bg-white object-contain" /> : null}
        <Button type="button" variant="outline" className="rounded-xl" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowDraw(true)}>
          Draw
        </Button>
        {previewUrl ? (
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onChange({ ...value, image_url: '', drawn_data_url: '', present: false })}>
            Clear
          </Button>
        ) : null}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Signature Status">
          <Select
            value={value.present === true ? 'present' : value.present === false ? 'missing' : 'unknown'}
            onValueChange={(next) => onChange({ ...value, present: next === 'unknown' ? null : next === 'present' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unknown">Unknown</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="missing">Missing / pending</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Confidence">
          <Select value={value.confidence || 'unspecified'} onValueChange={(next) => onChange({ ...value, confidence: next === 'unspecified' ? '' : next })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unspecified">Unspecified</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Evidence Description">
          <Input value={value.description || ''} onChange={(event) => onChange({ ...value, description: event.target.value })} placeholder="Signature note" />
        </Field>
      </div>

      {showDraw ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <canvas
            ref={canvasRef}
            width={500}
            height={180}
            className="w-full rounded-xl border border-border bg-white"
            onMouseDown={(event) => start(event.nativeEvent.offsetX, event.nativeEvent.offsetY)}
            onMouseMove={(event) => move(event.nativeEvent.offsetX, event.nativeEvent.offsetY)}
            onMouseUp={stop}
            onMouseLeave={stop}
            onTouchStart={(event) => {
              const rect = canvasRef.current?.getBoundingClientRect()
              if (!rect) return
              const touch = event.touches[0]
              start(touch.clientX - rect.left, touch.clientY - rect.top)
            }}
            onTouchMove={(event) => {
              const rect = canvasRef.current?.getBoundingClientRect()
              if (!rect) return
              const touch = event.touches[0]
              move(touch.clientX - rect.left, touch.clientY - rect.top)
            }}
            onTouchEnd={stop}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowDraw(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={saveDrawing}>
              Save Drawing
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function WaybillForm({ mode, waybillId }: WaybillFormProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state || {}) as ProjectPrefillState
  const isEdit = mode === 'edit'

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [waybill, setWaybill] = useState<Waybill>(createDefaultWaybill())
  const [items, setItems] = useState<WaybillItem[]>([createDefaultItem()])
  const [customColumns, setCustomColumns] = useState<WaybillCustomColumn[]>([])
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceSuggestions, setInvoiceSuggestions] = useState<{ id: string; invoice_number: string }[]>([])

  const customFields = useMemo(() => buildWaybillCustomFields(waybill.custom_fields, { customColumns }), [customColumns, waybill.custom_fields])
  const typeContent = getWaybillTypeContent(waybill.type)

  const updateWaybill = (field: keyof Waybill, value: unknown) =>
    setWaybill((current) => ({ ...current, [field]: value as never }))

  const updateCustomFields = (patch: Partial<WaybillCustomFields>) =>
    setWaybill((current) => ({ ...current, custom_fields: buildWaybillCustomFields(current.custom_fields, patch) }))

  const ensureNextNumber = async (type: WaybillType) => {
    if (!isEdit && canUseOfflineWaybillDrafts()) {
      try {
        updateWaybill('waybill_number', await peekNextOfflineWaybillNumber())
      } catch (offlineNumberError) {
        setError(
          offlineNumberError instanceof Error
            ? offlineNumberError.message
            : 'Could not generate an offline waybill number.',
        )
      }
      return
    }

    const prefix = type === 'internal' ? 'SASWB-I%' : 'SASWB-E%'
    const { data } = await supabase.from('waybills').select('waybill_number').ilike('waybill_number', prefix)
    const numbers = (data || []).map((row: { waybill_number: string }) => row.waybill_number)
    updateWaybill('waybill_number', getNextWaybillNumber(type, numbers))
  }

  useEffect(() => {
    if (!isEdit) {
      void ensureNextNumber(waybill.type)
      if (prefill.projectId || prefill.projectName || prefill.clientName || prefill.sourceInvoice?.invoiceId) {
        setWaybill((current) => ({
          ...current,
          project_id: String(prefill.projectId || ''),
          client_id: String(prefill.clientId || ''),
          client_name: String(prefill.clientName || ''),
          invoice_id: String(prefill.sourceInvoice?.invoiceId || current.invoice_id || ''),
          po_number: String(prefill.sourceInvoice?.poNumber || current.po_number || ''),
          custom_fields: buildWaybillCustomFields(current.custom_fields, {
            references: {
              linkedProjectName: String(prefill.projectName || ''),
              linkedInvoiceNumber: String(prefill.sourceInvoice?.invoiceNumber || ''),
              sourceDocumentNumber: String(prefill.sourceInvoice?.invoiceNumber || ''),
            },
          }),
        }))
        setInvoiceSearch(String(prefill.sourceInvoice?.invoiceNumber || ''))
      }
      return
    }

    supabase.from('waybills').select('*').eq('id', waybillId).single().then(({ data }) => {
      if (!data) {
        setLoading(false)
        return
      }

      const mapped = mapDbWaybill(data as Record<string, unknown>)
      const nextCustomFields = buildWaybillCustomFields(mapped.custom_fields, {})
      setWaybill({ ...mapped, custom_fields: nextCustomFields })
      setItems(normalizeWaybillItems(mapped.items, nextCustomFields.customColumns || []))
      setCustomColumns(nextCustomFields.customColumns || [])
      setInvoiceSearch(nextCustomFields.references?.linkedInvoiceNumber || '')
      setLoading(false)
    })
  }, [isEdit, prefill.clientId, prefill.clientName, prefill.projectId, prefill.projectName, waybill.type, waybillId])

  useEffect(() => {
    let active = true

    const applyInvoicePrefill = (invoice?: ProjectPrefillState['sourceInvoice']) => {
      if (!active || !invoice?.invoiceId || isEdit) return

      setWaybill((current) => ({
        ...current,
        invoice_id: current.invoice_id || String(invoice.invoiceId || ''),
        client_id: current.client_id || String(invoice.clientId || ''),
        client_name: current.client_name || String(invoice.clientName || ''),
        po_number: current.po_number || String(invoice.poNumber || ''),
        custom_fields: (() => {
          const currentFields = buildWaybillCustomFields(current.custom_fields, {})
          const nextReferences = {
            ...(currentFields.references || {}),
            linkedInvoiceNumber:
              currentFields.references?.linkedInvoiceNumber || String(invoice.invoiceNumber || ''),
            sourceDocumentNumber:
              currentFields.references?.sourceDocumentNumber || String(invoice.invoiceNumber || ''),
          }

          return buildWaybillCustomFields(current.custom_fields, { references: nextReferences })
        })(),
      }))

      if (!invoiceSearch) {
        setInvoiceSearch(String(invoice.invoiceNumber || ''))
      }
    }

    const loadInvoicePrefill = async () => {
      const invoice = prefill.sourceInvoice
      if (!invoice?.invoiceId || isEdit) return

      if (hasInvoicePrefillDetails(invoice)) {
        applyInvoicePrefill(invoice)
        return
      }

      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, client_id, client_name, po_number')
        .eq('id', invoice.invoiceId)
        .single()

      if (!data) return

      applyInvoicePrefill({
        invoiceId: data.id,
        invoiceNumber: data.invoice_number || '',
        clientId: data.client_id || '',
        clientName: data.client_name || '',
        poNumber: data.po_number || '',
      })
    }

    void loadInvoicePrefill()

    return () => {
      active = false
    }
  }, [invoiceSearch, isEdit, prefill.sourceInvoice])

  const setSignature = (role: SignatureRole, next: ReturnType<typeof normalizeSignatureEvidence>) => {
    updateCustomFields({
      signatures: {
        ...customFields.signatures,
        [role]: next,
      },
    })
    if (role === 'receiver') updateWaybill('receiver_signature_url', next.image_url || next.drawn_data_url || '')
  }

  const updateItem = (index: number, field: keyof WaybillItem, value: unknown) =>
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))

  const updateCustomItemField = (index: number, key: string, value: string) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, custom_data: { ...(item.custom_data || {}), [key]: value } } : item,
      ),
    )

  const addCustomColumn = () => {
    if (customColumns.length >= WAYBILL_COLUMN_LIMIT) {
      toast({
        title: 'Column limit reached',
        description: `Keep waybill custom columns to ${WAYBILL_COLUMN_LIMIT} or fewer so the PDF stays readable.`,
        variant: 'destructive',
      })
      return
    }
    const nextColumn = { key: createCustomColumnKey(`custom_${Date.now()}`), label: `Custom ${customColumns.length + 1}` }
    setCustomColumns((current) => [...current, nextColumn])
    setItems((current) => current.map((item) => ({ ...item, custom_data: { ...(item.custom_data || {}), [nextColumn.key]: '' } })))
  }

  const removeCustomColumn = (key: string) => {
    setCustomColumns((current) => current.filter((column) => column.key !== key))
    setItems((current) =>
      current.map((item) => {
        const nextCustomData = { ...(item.custom_data || {}) }
        delete nextCustomData[key]
        return { ...item, custom_data: nextCustomData }
      }),
    )
  }

  const searchInvoices = async (query: string) => {
    setInvoiceSearch(query)
    updateWaybill('invoice_id', '')
    updateCustomFields({ references: { ...customFields.references, linkedInvoiceNumber: query } })

    if (canUseOfflineWaybillDrafts()) {
      setInvoiceSuggestions([])
      return
    }

    if (!query.trim()) {
      setInvoiceSuggestions([])
      return
    }

    const { data } = await supabase.from('invoices').select('id, invoice_number').ilike('invoice_number', `%${query}%`).limit(6)
    setInvoiceSuggestions((data as { id: string; invoice_number: string }[]) || [])
  }

  const handleImport = (text: string) => {
    if (!text.trim()) {
      toast({ title: 'Paste JSON', description: 'Paste JSON before importing.', variant: 'destructive' })
      return
    }

    try {
      const imported = normalizeWaybillImport(JSON.parse(text), waybill.type)
      const nextCustomColumns = collectWaybillCustomColumns(imported.items, imported.customColumns)
      const nextCustomFields = buildWaybillCustomFields(waybill.custom_fields, { ...imported.customFields, customColumns: nextCustomColumns })
      setWaybill((current) => ({ ...current, ...imported.fields, type: imported.type, custom_fields: nextCustomFields }))
      setItems(normalizeWaybillItems(imported.items, nextCustomColumns))
      setCustomColumns(nextCustomColumns)
      setInvoiceSearch(imported.customFields.references?.linkedInvoiceNumber || '')
      setImportOpen(false)
      if (imported.type !== waybill.type && !isEdit) void ensureNextNumber(imported.type)
    } catch (importError) {
      toast({
        title: 'Import failed',
        description: importError instanceof Error ? importError.message : 'Could not parse the waybill JSON.',
        variant: 'destructive',
      })
    }
  }

  const handleSave = async () => {
    setError('')
    if (!waybill.date) {
      setError('Date is required.')
      return
    }

    const cleanedItems = normalizeWaybillItems(items, customColumns)
      .map((item) => ({
        ...item,
        description: String(item.description || '').trim(),
        unit: String(item.unit || '').trim(),
      }))
      .filter((item) => item.description)

    if (cleanedItems.length === 0) {
      setError('At least one item with a description is required.')
      return
    }

    const { project: validatedProject, error: projectError } = await validateProjectAssignment(
      supabase as unknown as ProjectLookupClient,
      {
        projectId: waybill.project_id,
        documentClientId: waybill.client_id,
        documentClientName: waybill.client_name,
      },
    )

    if (projectError) {
      setError(projectError)
      return
    }

    const senderSignature = getWaybillSignature(waybill, 'sender')
    const receiverSignature = getWaybillSignature(waybill, 'receiver')
    const payload = {
      waybill_number: waybill.waybill_number || null,
      type: waybill.type,
      date: waybill.date,
      time: waybill.time || null,
      sender_name: String(waybill.sender_name || '').trim() || null,
      receiver_name: String(waybill.receiver_name || '').trim() || null,
      receiver_signature_url: receiverSignature.image_url || receiverSignature.drawn_data_url || null,
      receiver_description: customFields.partyNotes?.receiver || null,
      client_id: waybill.client_id || null,
      client_name: String(waybill.client_name || '').trim() || null,
      project_id: validatedProject?.id || null,
      invoice_id: waybill.invoice_id || null,
      po_number: String(waybill.po_number || '').trim() || null,
      vehicle_plate: String(waybill.vehicle_plate || '').trim() || null,
      delivery_location: String(waybill.delivery_location || '').trim() || null,
      items: cleanedItems,
      notes: String(waybill.notes || '').trim() || null,
      status: normalizeWaybillStatus(waybill.status),
      created_by: waybill.created_by || null,
      custom_fields: JSON.stringify(
        buildWaybillCustomFields(waybill.custom_fields, {
          customColumns,
          signatures: { sender: senderSignature, receiver: receiverSignature },
          partyNotes: {
            sender: customFields.partyNotes?.sender || '',
            receiver: customFields.partyNotes?.receiver || '',
          },
          references: {
            linkedInvoiceNumber: customFields.references?.linkedInvoiceNumber || invoiceSearch || '',
            linkedProjectName: customFields.references?.linkedProjectName || '',
            sourceDocumentNumber: customFields.references?.sourceDocumentNumber || '',
          },
        }),
      ),
    }

    setSaving(true)

    if (!isEdit && canUseOfflineWaybillDrafts()) {
      try {
        const localDraft = await createOfflineWaybillDraft(payload)
        setWaybill((current) => ({ ...current, waybill_number: localDraft.waybillNumber }))
        toast({
          title: 'Saved offline',
          description: `${localDraft.waybillNumber} was saved locally and queued for sync.`,
        })
        navigate('/waybills')
      } catch (offlineSaveError) {
        setError(
          offlineSaveError instanceof Error
            ? offlineSaveError.message
            : 'Could not save this waybill offline.',
        )
      } finally {
        setSaving(false)
      }
      return
    }

    if (isEdit && canUseOfflineWaybillDrafts()) {
      setError('Offline editing is not available yet. Reconnect to update this waybill.')
      setSaving(false)
      return
    }

    const query = isEdit
      ? supabase.from('waybills').update(payload).eq('id', waybillId).select('id').single()
      : supabase.from('waybills').insert([payload]).select('id').single()
    const { data, error: dbError } = await query
    setSaving(false)

    if (dbError) {
      setError(dbError.message)
      return
    }

    navigate(`/waybills/${data.id}`)
  }

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading waybill…</div>

  const senderSignature = getWaybillSignature(waybill, 'sender')
  const receiverSignature = getWaybillSignature(waybill, 'receiver')
  const projectName = parseWaybillCustomFields(waybill.custom_fields).references?.linkedProjectName || ''

  return (
    <>
      <div className="mx-auto max-w-3xl py-4 pb-28">
        <div className="space-y-4">
          <SectionCard title={typeContent.title} accent="bg-gradient-to-r from-emerald-50 to-white" subtitle={typeContent.intro}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Waybill Type">
                  <div className="flex rounded-xl border border-border bg-muted/30 p-1">
                    {(['internal', 'external'] as WaybillType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          updateWaybill('type', type)
                          if (!isEdit) void ensureNextNumber(type)
                        }}
                        className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition ${
                          waybill.type === type ? 'bg-slate-900 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <Field label="Waybill Number">
                <Input value={waybill.waybill_number} readOnly className="bg-muted/50 font-mono font-semibold text-emerald-700" />
              </Field>
              <Field label="Date" required>
                <Input type="date" value={waybill.date} onChange={(event) => updateWaybill('date', event.target.value)} />
              </Field>
              <Field label="Time">
                <Input type="time" value={waybill.time || ''} onChange={(event) => updateWaybill('time', event.target.value)} />
              </Field>
              <Field label="Status">
                <Select value={waybill.status} onValueChange={(value) => updateWaybill('status', value as WaybillStatus)}>
                  <SelectTrigger>
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
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setImportOpen(true)}>
                  Import JSON
                </Button>
                {!waybill.project_id ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(waybill.waybill_number)
                        toast({ title: 'Copied', description: 'Waybill number copied.' })
                      } catch {
                        toast({ title: 'Copy failed', description: 'Could not copy waybill number.', variant: 'destructive' })
                      }
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Waybill Number
                  </Button>
                ) : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="People and Movement" accent="bg-gradient-to-r from-blue-50 to-white">
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
                  onClientChange={(clientId, clientName) => {
                    updateWaybill('client_id', clientId || '')
                    updateWaybill('client_name', clientName || '')
                  }}
                  isMobile={false}
                  compact
                />
                <div className="mt-1 text-xs text-muted-foreground">{typeContent.clientHelp}</div>
              </div>

              <Field label="Vehicle Plate">
                <Input value={waybill.vehicle_plate || ''} onChange={(event) => updateWaybill('vehicle_plate', event.target.value)} placeholder="e.g. ABC 1234" />
              </Field>
              <Field label="P.O. Number">
                <Input value={waybill.po_number || ''} onChange={(event) => updateWaybill('po_number', event.target.value)} placeholder="Optional" />
              </Field>

              <div className="sm:col-span-2">
                <Field label={typeContent.locationLabel}>
                  <Input value={waybill.delivery_location || ''} onChange={(event) => updateWaybill('delivery_location', event.target.value)} placeholder={typeContent.locationPlaceholder} />
                </Field>
              </div>

              <Field label={typeContent.senderNoteLabel}>
                <Textarea value={customFields.partyNotes?.sender || ''} onChange={(event) => updateCustomFields({ partyNotes: { ...customFields.partyNotes, sender: event.target.value } })} rows={3} />
              </Field>
              <Field label={typeContent.receiverNoteLabel}>
                <Textarea value={customFields.partyNotes?.receiver || ''} onChange={(event) => updateCustomFields({ partyNotes: { ...customFields.partyNotes, receiver: event.target.value } })} rows={3} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="References and Linking" accent="bg-gradient-to-r from-purple-50 to-white">
            <div className="space-y-4">
              <Field label="Linked Invoice (optional)" help="Search by invoice number when this delivery supports invoiced goods.">
                <div className="relative">
                  <Input value={invoiceSearch} onChange={(event) => void searchInvoices(event.target.value)} placeholder="Search invoice number…" />
                  {invoiceSuggestions.length > 0 ? (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-lg">
                      {invoiceSuggestions.map((invoice) => (
                        <button
                          key={invoice.id}
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50"
                          onClick={() => {
                            updateWaybill('invoice_id', invoice.id)
                            setInvoiceSearch(invoice.invoice_number)
                            updateCustomFields({ references: { ...customFields.references, linkedInvoiceNumber: invoice.invoice_number } })
                            setInvoiceSuggestions([])
                          }}
                        >
                          {invoice.invoice_number}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Field>

              {waybill.project_id ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                  <div className="font-semibold text-emerald-800">Linked to project</div>
                  <div className="mt-1 text-emerald-700">{projectName || 'Linked from project flow'}</div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="font-semibold">Not linked to a project yet</div>
                  <div className="mt-1">
                    Save this waybill, copy <span className="font-mono">{waybill.waybill_number || 'the waybill number'}</span>, then attach it from the Project page using the waybill number search.
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Items and Custom Columns" accent="bg-gradient-to-r from-amber-50 to-white" subtitle="Keep the item list practical for mobile and print.">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">{customColumns.length} / {WAYBILL_COLUMN_LIMIT} custom columns in use</div>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={addCustomColumn}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Custom Column
                </Button>
              </div>

              {customColumns.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {customColumns.map((column) => (
                    <div key={column.key} className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-3">
                      <Input value={column.label} onChange={(event) => setCustomColumns((current) => current.map((entry) => (entry.key === column.key ? { ...entry, label: event.target.value } : entry)))} placeholder="Column label" />
                      <Button type="button" variant="outline" size="icon" className="rounded-xl" onClick={() => removeCustomColumn(column.key)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={`waybill-item-${index}`} className="rounded-2xl border border-border bg-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-foreground">Item {index + 1}</div>
                      <Button type="button" variant="outline" size="icon" className="rounded-xl" onClick={() => setItems((current) => (current.length === 1 ? [createDefaultItem()] : current.filter((_, itemIndex) => itemIndex !== index)))}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Field label="Description" required>
                          <Textarea value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} rows={3} placeholder="Item description" />
                        </Field>
                      </div>

                      <Field label="Quantity">
                        <Input type="number" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', Number(event.target.value) || 0)} />
                      </Field>
                      <Field label="Unit">
                        <Input value={item.unit} onChange={(event) => updateItem(index, 'unit', event.target.value)} placeholder="pcs" />
                      </Field>
                      <Field label="Condition">
                        <Select value={item.condition} onValueChange={(value) => updateItem(index, 'condition', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITION_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      {customColumns.map((column) => (
                        <Field key={column.key} label={column.label}>
                          <Input value={String(item.custom_data?.[column.key] || '')} onChange={(event) => updateCustomItemField(index, column.key, event.target.value)} placeholder={column.label} />
                        </Field>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" className="rounded-xl border-dashed" onClick={() => setItems((current) => [...current, createDefaultItem()])}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={typeContent.signatureSectionTitle} accent="bg-gradient-to-r from-slate-50 to-white" subtitle={typeContent.ackPendingText}>
            <div className="space-y-4">
              <SignatureField role="sender" label={typeContent.senderSignatureLabel} value={senderSignature} onChange={(next) => setSignature('sender', next)} />
              <SignatureField role="receiver" label={typeContent.receiverSignatureLabel} value={receiverSignature} onChange={(next) => setSignature('receiver', next)} />
            </div>
          </SectionCard>

          <SectionCard title="Notes" accent="bg-gradient-to-r from-slate-50 to-white">
            <Field label="Operational Notes">
              <Textarea value={waybill.notes || ''} onChange={(event) => updateWaybill('notes', event.target.value)} rows={4} placeholder="Anything the field team should remember about this movement" />
            </Field>
          </SectionCard>

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => navigate(isEdit && waybillId ? `/waybills/${waybillId}` : '/waybills')}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} className="flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleSave}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Waybill'}
            </Button>
          </div>
        </div>
      </div>

      <ImportSheet open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />
    </>
  )
}

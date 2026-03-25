import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, FileText, PackageCheck, Receipt, Rows3, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { getProjectDocumentMainLabel } from '@/domain/projectDocuments'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/supabase'

type ProjectDocumentType = 'purchase_order' | 'receipt' | 'receiving_waybill' | 'other'

type PurchaseOrderItem = {
  description: string
  quantity: number
  unit: string
  unit_price: number
  amount: number
}

type WaybillItem = {
  description: string
  quantity: number
  unit: string
  condition: string
}

type DocumentFormState = {
  title: string
  reference_number: string
  voucher_number: string
  date: string
  from_party: string
  to_party: string
  notes: string
  vat: number
  wht: number
  amount: number
  payment_method: string
  received_by: string
  purchaseOrderItems: PurchaseOrderItem[]
  waybillItems: WaybillItem[]
  extraData: Record<string, unknown>
}

type ProjectDocumentSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSuccess: () => void
}

const neutralButtonClassName =
  'h-9 gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50'

const typeConfig = {
  purchase_order: {
    label: 'Purchase Order',
    accent: 'border-l-blue-500',
    iconWrap: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
    icon: ClipboardList,
    prompt: `Extract this Purchase Order into JSON only.
No explanation. Use exactly this structure:
{
  "reference_number": "",
  "voucher_number": "",
  "date": "YYYY-MM-DD",
  "from_party": "",
  "to_party": "",
  "items": [
    { "description": "", "quantity": 0,
      "unit": "", "unit_price": 0, "amount": 0 }
  ],
  "subtotal": 0,
  "vat": 0,
  "vat_rate": 0,
  "wht": 0,
  "wht_rate": 0,
  "total": 0,
  "currency": "NGN",
  "notes": ""
}
Rules:
- Use reference_number for PO Number
- Use voucher_number for Voucher No if present
- If VAT not present set vat and vat_rate to 0
- If WHT not present set wht and wht_rate to 0
- Return only the JSON object, nothing else`,
  },
  receipt: {
    label: 'Receipt',
    accent: 'border-l-emerald-500',
    iconWrap: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    icon: Receipt,
    prompt: `Extract this Receipt into JSON only.
No explanation. Use exactly this structure:
{
  "reference_number": "",
  "date": "YYYY-MM-DD",
  "from_party": "",
  "to_party": "",
  "description": "",
  "amount": 0,
  "vat": 0,
  "wht": 0,
  "payment_method": "",
  "currency": "NGN",
  "notes": ""
}
Return only the JSON object, nothing else.`,
  },
  receiving_waybill: {
    label: 'Receiving Waybill',
    accent: 'border-l-orange-500',
    iconWrap: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
    icon: PackageCheck,
    prompt: `Extract this Waybill into JSON only.
No explanation. Use exactly this structure:
{
  "reference_number": "",
  "date": "YYYY-MM-DD",
  "from_party": "",
  "to_party": "",
  "items": [
    { "description": "", "quantity": 0,
      "unit": "", "condition": "good" }
  ],
  "received_by": "",
  "notes": ""
}
Return only the JSON object, nothing else.`,
  },
  other: {
    label: 'Other',
    accent: 'border-l-slate-500',
    iconWrap: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    icon: FileText,
    prompt: `Extract this document into JSON only.
No explanation. Capture all fields you find.
Use snake_case keys.
Return only the JSON object, nothing else.`,
  },
} satisfies Record<
  ProjectDocumentType,
  { label: string; accent: string; iconWrap: string; icon: typeof ClipboardList; prompt: string }
>

function toNumber(value: unknown) {
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}

function toDateValue(value: unknown) {
  const text = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

function makeEmptyPurchaseOrderItem(): PurchaseOrderItem {
  return { description: '', quantity: 0, unit: '', unit_price: 0, amount: 0 }
}

function makeEmptyWaybillItem(): WaybillItem {
  return { description: '', quantity: 0, unit: '', condition: 'good' }
}

function makeInitialForm(): DocumentFormState {
  return {
    title: '',
    reference_number: '',
    voucher_number: '',
    date: '',
    from_party: '',
    to_party: '',
    notes: '',
    vat: 0,
    wht: 0,
    amount: 0,
    payment_method: '',
    received_by: '',
    purchaseOrderItems: [makeEmptyPurchaseOrderItem()],
    waybillItems: [makeEmptyWaybillItem()],
    extraData: {},
  }
}

function buildTitle(type: ProjectDocumentType, parsed: Record<string, unknown>) {
  if (type === 'other') {
    return String(parsed.title || '').trim()
  }
  const ref = String(parsed.reference_number || '').trim()
  return ref ? `${typeConfig[type].label} ${ref}` : typeConfig[type].label
}

function buildFormFromParsed(type: ProjectDocumentType, parsed: Record<string, unknown>): DocumentFormState {
  const purchaseOrderItems = Array.isArray(parsed.items)
    ? parsed.items.map((item) => ({
        description: String(item?.description || ''),
        quantity: toNumber(item?.quantity),
        unit: String(item?.unit || ''),
        unit_price: toNumber(item?.unit_price),
        amount: toNumber(item?.amount),
      }))
    : [makeEmptyPurchaseOrderItem()]

  const waybillItems = Array.isArray(parsed.items)
    ? parsed.items.map((item) => ({
        description: String(item?.description || ''),
        quantity: toNumber(item?.quantity),
        unit: String(item?.unit || ''),
        condition: String(item?.condition || 'good'),
      }))
    : [makeEmptyWaybillItem()]

  return {
    title: buildTitle(type, parsed),
    reference_number: String(parsed.reference_number || ''),
    voucher_number: String(parsed.voucher_number || ''),
    date: toDateValue(parsed.date),
    from_party: String(parsed.from_party || ''),
    to_party: String(parsed.to_party || ''),
    notes: String(parsed.notes || ''),
    vat: toNumber(parsed.vat),
    wht: toNumber(parsed.wht),
    amount: toNumber(parsed.amount),
    payment_method: String(parsed.payment_method || ''),
    received_by: String(parsed.received_by || ''),
    purchaseOrderItems: purchaseOrderItems.length > 0 ? purchaseOrderItems : [makeEmptyPurchaseOrderItem()],
    waybillItems: waybillItems.length > 0 ? waybillItems : [makeEmptyWaybillItem()],
    extraData: parsed,
  }
}

function buildDataFromForm(type: ProjectDocumentType, form: DocumentFormState) {
  if (type === 'purchase_order') {
    const items = form.purchaseOrderItems.map((item) => ({
      description: item.description,
      quantity: toNumber(item.quantity),
      unit: item.unit,
      unit_price: toNumber(item.unit_price),
      amount: toNumber(item.amount || toNumber(item.quantity) * toNumber(item.unit_price)),
    }))
    const subtotal = items.reduce((sum, item) => sum + toNumber(item.amount), 0)
    const total = subtotal + toNumber(form.vat) - toNumber(form.wht)
    return {
      ...form.extraData,
      reference_number: form.reference_number,
      voucher_number: form.voucher_number,
      date: form.date || null,
      from_party: form.from_party,
      to_party: form.to_party,
      items,
      subtotal,
      vat: toNumber(form.vat),
      wht: toNumber(form.wht),
      total,
      notes: form.notes,
    }
  }

  if (type === 'receipt') {
    return {
      ...form.extraData,
      reference_number: form.reference_number,
      date: form.date || null,
      from_party: form.from_party,
      to_party: form.to_party,
      description: String(form.extraData.description || form.title || ''),
      amount: toNumber(form.amount),
      vat: toNumber(form.vat),
      wht: toNumber(form.wht),
      payment_method: form.payment_method,
      notes: form.notes,
    }
  }

  if (type === 'receiving_waybill') {
    return {
      ...form.extraData,
      reference_number: form.reference_number,
      date: form.date || null,
      from_party: form.from_party,
      to_party: form.to_party,
      items: form.waybillItems.map((item) => ({
        description: item.description,
        quantity: toNumber(item.quantity),
        unit: item.unit,
        condition: item.condition || 'good',
      })),
      received_by: form.received_by,
      notes: form.notes,
    }
  }

  return {
    ...form.extraData,
    title: form.title,
    reference_number: form.reference_number,
    date: form.date || null,
    from_party: form.from_party,
    to_party: form.to_party,
    notes: form.notes,
  }
}

export default function ProjectDocumentSheet({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: ProjectDocumentSheetProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [docType, setDocType] = useState<ProjectDocumentType>('purchase_order')
  const [rawInput, setRawInput] = useState('')
  const [parseError, setParseError] = useState('')
  const [form, setForm] = useState<DocumentFormState>(makeInitialForm())
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!open) {
      setStep(1)
      setDocType('purchase_order')
      setRawInput('')
      setParseError('')
      setForm(makeInitialForm())
    }
  }, [open])

  const config = typeConfig[docType]

  const purchaseOrderTotal = useMemo(() => {
    const subtotal = form.purchaseOrderItems.reduce(
      (sum, item) => sum + toNumber(item.amount || toNumber(item.quantity) * toNumber(item.unit_price)),
      0,
    )
    return subtotal + toNumber(form.vat) - toNumber(form.wht)
  }, [form.purchaseOrderItems, form.vat, form.wht])

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(config.prompt)
      toast({ title: 'Copied', description: `${config.label} AI prompt copied.` })
    } catch {
      alert('Could not copy AI prompt.')
    }
  }

  const handleParse = () => {
    setParseError('')

    try {
      const parsed = JSON.parse(rawInput)
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        setParseError('Paste one JSON object for this document.')
        return
      }

      setForm(buildFormFromParsed(docType, parsed as Record<string, unknown>))
      setStep(3)
    } catch {
      setParseError('Invalid JSON. Paste a valid JSON object and try again.')
    }
  }

  const handleSave = async () => {
    const normalizedTitle = form.title.trim()
    if (docType === 'other' && !normalizedTitle) {
      toast({ title: 'Title required', description: 'Add a title for Other documents before saving.' })
      return
    }

    const data = buildDataFromForm(docType, form)
    const computedTotal =
      docType === 'purchase_order'
        ? purchaseOrderTotal
        : docType === 'receipt'
          ? toNumber(form.amount) + toNumber(form.vat) - toNumber(form.wht)
          : toNumber((data as { total?: unknown }).total)

    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('project_documents').insert([
      {
        project_id: projectId,
        type: docType,
        title: normalizedTitle || config.label,
        reference_number: form.reference_number || null,
        voucher_number: docType === 'purchase_order' ? form.voucher_number || null : null,
        date: form.date || null,
        from_party: form.from_party || null,
        to_party: form.to_party || null,
        data,
        raw_input: rawInput,
        vat: ['purchase_order', 'receipt'].includes(docType) ? toNumber(form.vat) : 0,
        wht: ['purchase_order', 'receipt'].includes(docType) ? toNumber(form.wht) : 0,
        total: computedTotal || 0,
        created_by: user?.id || null,
      },
    ])

    setSaving(false)
    if (error) {
      alert(`Failed to save document: ${error.message}`)
      return
    }

    toast({
      title: `${config.label} saved`,
      description: `${getProjectDocumentMainLabel({ type: docType, title: normalizedTitle, reference_number: form.reference_number, date: form.date, data })} is now ready to view or export.`,
    })
    onOpenChange(false)
    onSuccess()
  }

  const renderSharedFields = () => (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Title{docType === 'other' ? ' *' : ''}
        </label>
        <Input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder={docType === 'other' ? 'Required for Other documents' : ''}
          className="h-10 rounded-xl border-zinc-200 bg-background text-sm"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Reference Number</label>
        <Input value={form.reference_number} onChange={(event) => setForm((current) => ({ ...current, reference_number: event.target.value }))} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Date</label>
        <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">From Party</label>
        <Input value={form.from_party} onChange={(event) => setForm((current) => ({ ...current, from_party: event.target.value }))} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">To Party</label>
        <Input value={form.to_party} onChange={(event) => setForm((current) => ({ ...current, to_party: event.target.value }))} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Notes</label>
        <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-28 rounded-2xl border-zinc-200 bg-background text-sm" />
      </div>
    </div>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[94vh] rounded-t-[28px] bg-card p-0 [&>[data-slot=sheet-close]]:hidden">
        <SheetHeader className="border-b border-zinc-200 bg-zinc-50 px-5 py-4 text-left">
          <SheetTitle className="text-base font-semibold text-zinc-900">Add Project Document</SheetTitle>
          <SheetDescription className="text-sm text-zinc-500">
            Use the AI prompt to extract structured JSON, then paste only the JSON object here for review before saving.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((current) => (
              <div
                key={current}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  step === current ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-500'
                }`}
              >
                {current}
              </div>
            ))}
          </div>

          {step === 1 ? (
            <div className="space-y-3">
              <div className="rounded-[24px] border-l-4 border-l-blue-500 border border-blue-100 bg-blue-50 p-4">
                <div className="text-sm font-semibold text-zinc-900">Step 1: Pick document type</div>
                <div className="mt-1 text-sm text-zinc-600">Choose the source document you want to add to this project.</div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(Object.keys(typeConfig) as ProjectDocumentType[]).map((type) => {
                  const option = typeConfig[type]
                  const Icon = option.icon
                  const active = docType === type

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setDocType(type)
                        setStep(2)
                      }}
                      className={`rounded-[24px] border-l-4 border p-4 text-left shadow-sm transition ${
                        active ? `${option.accent} border-zinc-200 bg-white` : 'border-l-zinc-200 border-zinc-200 bg-zinc-50 hover:bg-white'
                      }`}
                    >
                      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${option.iconWrap}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-semibold text-zinc-900">{option.label}</div>
                      <div className="mt-1 text-sm text-zinc-500">Use the AI prompt, paste JSON, review, and save.</div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className={`rounded-[24px] border-l-4 border ${config.accent} border-zinc-200 bg-card p-4 shadow-sm`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Step 2: Copy AI prompt and paste JSON</div>
                    <div className="mt-1 text-sm text-zinc-500">Run the prompt on the source document, then paste the returned JSON object exactly as-is.</div>
                  </div>
                  <Button type="button" className="h-9 rounded-xl bg-blue-600 text-white hover:bg-blue-700" onClick={handleCopyPrompt}>
                    Copy AI Prompt
                  </Button>
                </div>
              </div>

              <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Prompt Preview</div>
                <div className="whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-card p-3 text-xs leading-6 text-zinc-700">
                  {config.prompt}
                </div>
              </div>

              <div className="rounded-[24px] border-l-4 border-l-emerald-500 border border-zinc-200 bg-card p-4 shadow-sm">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Paste JSON</label>
                <Textarea
                  value={rawInput}
                  onChange={(event) => {
                    setRawInput(event.target.value)
                    setParseError('')
                  }}
                  placeholder='{"reference_number":"","date":"YYYY-MM-DD","notes":""}'
                  className="min-h-52 rounded-2xl border-zinc-200 bg-zinc-50 font-mono text-sm"
                />
                {parseError ? (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{parseError}</div>
                ) : null}
                {!parseError ? (
                  <div className="mt-3 text-xs text-zinc-500">
                    Readable fields come first after parsing. Raw JSON stays available, but it is no longer the primary view.
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap justify-between gap-2">
                  <Button type="button" variant="outline" className={neutralButtonClassName} onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="button" className="h-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleParse}>
                    Parse JSON
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className={`rounded-[24px] border-l-4 border ${config.accent} border-zinc-200 bg-card p-4 shadow-sm`}>
                <div className="text-sm font-semibold text-zinc-900">Step 3: Review and edit</div>
                <div className="mt-1 text-sm text-zinc-500">Adjust the parsed values before saving the document to this project.</div>
              </div>

              <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">{renderSharedFields()}</div>

              {docType === 'purchase_order' ? (
                <div className="space-y-4 rounded-[24px] border-l-4 border-l-blue-500 border border-zinc-200 bg-card p-4 shadow-sm">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Voucher Number</label>
                      <Input value={form.voucher_number} onChange={(event) => setForm((current) => ({ ...current, voucher_number: event.target.value }))} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">VAT (₦)</label>
                      <Input type="number" value={form.vat} onChange={(event) => setForm((current) => ({ ...current, vat: toNumber(event.target.value) }))} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">WHT (₦)</label>
                      <Input type="number" value={form.wht} onChange={(event) => setForm((current) => ({ ...current, wht: toNumber(event.target.value) }))} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Total (₦)</label>
                      <Input value={purchaseOrderTotal.toLocaleString()} readOnly className="h-10 rounded-xl border-zinc-200 bg-blue-50 text-sm font-semibold text-zinc-900" />
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-zinc-900">Items</div>
                      <Button type="button" variant="outline" className={neutralButtonClassName} onClick={() => setForm((current) => ({ ...current, purchaseOrderItems: [...current.purchaseOrderItems, makeEmptyPurchaseOrderItem()] }))}>
                        <Rows3 className="h-3.5 w-3.5" />
                        Add Row
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {form.purchaseOrderItems.map((item, index) => (
                        <div key={`po-item-${index}`} className="rounded-2xl border border-zinc-200 bg-card p-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                            <Input value={item.description} onChange={(event) => setForm((current) => ({ ...current, purchaseOrderItems: current.purchaseOrderItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, description: event.target.value } : entry) }))} placeholder="Description" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm md:col-span-2" />
                            <Input type="number" value={item.quantity} onChange={(event) => setForm((current) => ({ ...current, purchaseOrderItems: current.purchaseOrderItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, quantity: toNumber(event.target.value) } : entry) }))} placeholder="Qty" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                            <Input value={item.unit} onChange={(event) => setForm((current) => ({ ...current, purchaseOrderItems: current.purchaseOrderItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, unit: event.target.value } : entry) }))} placeholder="Unit" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                            <Input type="number" value={item.unit_price} onChange={(event) => setForm((current) => ({ ...current, purchaseOrderItems: current.purchaseOrderItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, unit_price: toNumber(event.target.value) } : entry) }))} placeholder="Unit price" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <Input type="number" value={item.amount} onChange={(event) => setForm((current) => ({ ...current, purchaseOrderItems: current.purchaseOrderItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, amount: toNumber(event.target.value) } : entry) }))} placeholder="Amount" className="h-10 w-full rounded-xl border-zinc-200 bg-zinc-50 text-sm sm:max-w-[220px]" />
                            <Button type="button" variant="outline" className={neutralButtonClassName} onClick={() => setForm((current) => ({ ...current, purchaseOrderItems: current.purchaseOrderItems.length === 1 ? [makeEmptyPurchaseOrderItem()] : current.purchaseOrderItems.filter((_, itemIndex) => itemIndex !== index) }))}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              Delete Row
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {docType === 'receipt' ? (
                <div className="grid grid-cols-1 gap-3 rounded-[24px] border-l-4 border-l-emerald-500 border border-zinc-200 bg-card p-4 shadow-sm md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Amount (₦)</label>
                    <Input type="number" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: toNumber(event.target.value) }))} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Payment Method</label>
                    <Input value={form.payment_method} onChange={(event) => setForm((current) => ({ ...current, payment_method: event.target.value }))} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">VAT (₦)</label>
                    <Input type="number" value={form.vat} onChange={(event) => setForm((current) => ({ ...current, vat: toNumber(event.target.value) }))} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">WHT (₦)</label>
                    <Input type="number" value={form.wht} onChange={(event) => setForm((current) => ({ ...current, wht: toNumber(event.target.value) }))} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
                  </div>
                </div>
              ) : null}

              {docType === 'receiving_waybill' ? (
                <div className="space-y-4 rounded-[24px] border-l-4 border-l-orange-500 border border-zinc-200 bg-card p-4 shadow-sm">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Received By</label>
                    <Input value={form.received_by} onChange={(event) => setForm((current) => ({ ...current, received_by: event.target.value }))} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
                  </div>
                  <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-zinc-900">Items</div>
                      <Button type="button" variant="outline" className={neutralButtonClassName} onClick={() => setForm((current) => ({ ...current, waybillItems: [...current.waybillItems, makeEmptyWaybillItem()] }))}>
                        <Rows3 className="h-3.5 w-3.5" />
                        Add Row
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {form.waybillItems.map((item, index) => (
                        <div key={`waybill-item-${index}`} className="rounded-2xl border border-zinc-200 bg-card p-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <Input value={item.description} onChange={(event) => setForm((current) => ({ ...current, waybillItems: current.waybillItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, description: event.target.value } : entry) }))} placeholder="Description" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                            <Input type="number" value={item.quantity} onChange={(event) => setForm((current) => ({ ...current, waybillItems: current.waybillItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, quantity: toNumber(event.target.value) } : entry) }))} placeholder="Qty" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                            <Input value={item.unit} onChange={(event) => setForm((current) => ({ ...current, waybillItems: current.waybillItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, unit: event.target.value } : entry) }))} placeholder="Unit" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                            <Input value={item.condition} onChange={(event) => setForm((current) => ({ ...current, waybillItems: current.waybillItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, condition: event.target.value } : entry) }))} placeholder="Condition" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="outline" className={neutralButtonClassName} onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="button" className="h-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Document'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

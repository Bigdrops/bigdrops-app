import { useEffect, useMemo, useState } from 'react'
import { Wand2 } from 'lucide-react'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getProjectDocumentMainLabel } from '@/domain/projectDocuments'
import { getProjectDocumentPrompt } from '@/domain/projectDocumentPrompts'
import { JsonImportUI } from '@/components/import/JsonImportLayout'
import { useToast } from '@/hooks/use-toast'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { supabase } from '@/supabase'
import { 
  ProjectDocumentType, 
  DOCUMENT_TYPE_CONFIG, 
  ProjectDocumentTypeSelector 
} from './ProjectDocumentTypeSelector'
import { 
  DocumentFormState, 
  ProjectDocumentStep3Review, 
  PurchaseOrderItem, 
  WaybillItem 
} from './ProjectDocumentStep3Review'

type ProjectDocumentSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSuccess: () => void
}

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
  return ref ? `${DOCUMENT_TYPE_CONFIG[type].label} ${ref}` : DOCUMENT_TYPE_CONFIG[type].label
}

function buildFormFromParsed(type: ProjectDocumentType, parsed: Record<string, unknown>): DocumentFormState {
  const itemsArray = Array.isArray(parsed.items) ? parsed.items : []
  
  const purchaseOrderItems = itemsArray.map((item) => ({
    description: String(item?.description || ''),
    quantity: toNumber(item?.quantity),
    unit: String(item?.unit || ''),
    unit_price: toNumber(item?.unit_price),
    amount: toNumber(item?.amount),
  }))

  const waybillItems = itemsArray.map((item) => ({
    description: String(item?.description || ''),
    quantity: toNumber(item?.quantity),
    unit: String(item?.unit || ''),
    condition: String(item?.condition || 'good'),
  }))

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
  const common = {
    ...form.extraData,
    reference_number: form.reference_number,
    date: form.date || null,
    from_party: form.from_party,
    to_party: form.to_party,
    notes: form.notes,
  }

  if (type === 'purchase_order') {
    const items = form.purchaseOrderItems.map((item) => ({
      ...item,
      amount: item.amount || toNumber(item.quantity) * toNumber(item.unit_price),
    }))
    const subtotal = items.reduce((sum, item) => sum + toNumber(item.amount), 0)
    return { ...common, voucher_number: form.voucher_number, items, subtotal, vat: form.vat, wht: form.wht, total: subtotal + form.vat - form.wht }
  }

  if (type === 'receipt') {
    return { ...common, description: String(form.extraData.description || form.title || ''), amount: form.amount, vat: form.vat, wht: form.wht, payment_method: form.payment_method }
  }

  if (type === 'receiving_waybill') {
    return { ...common, items: form.waybillItems, received_by: form.received_by }
  }

  return { ...common, title: form.title, images: form.extraData.images }
}

export default function ProjectDocumentSheet({ open, onOpenChange, projectId, onSuccess }: ProjectDocumentSheetProps) {
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

  const config = DOCUMENT_TYPE_CONFIG[docType]
  const promptText = useMemo(() => getProjectDocumentPrompt(docType), [docType])

  const purchaseOrderTotal = useMemo(() => {
    const subtotal = form.purchaseOrderItems.reduce((sum, item) => sum + (item.amount || (toNumber(item.quantity) * toNumber(item.unit_price))), 0)
    return subtotal + toNumber(form.vat) - toNumber(form.wht)
  }, [form.purchaseOrderItems, form.vat, form.wht])

  const handleParse = () => {
    setParseError('')
    try {
      const parsed = JSON.parse(rawInput)
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error('Paste one JSON object.')
      }
      setForm(buildFormFromParsed(docType, parsed as Record<string, unknown>))
      setStep(3)
    } catch (e: any) {
      setParseError(e.message || 'Invalid JSON format.')
    }
  }

  const handleSave = async () => {
    const normalizedTitle = form.title.trim()
    if (docType === 'other' && !normalizedTitle) {
      toast({ title: 'Title required', description: 'Add a title for Other documents.' })
      return
    }

    const data = buildDataFromForm(docType, form)
    const computedTotal = docType === 'purchase_order' ? purchaseOrderTotal : docType === 'receipt' ? (toNumber(form.amount) + toNumber(form.vat) - toNumber(form.wht)) : (data as any).total

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: insertedDoc, error } = await supabase.from('project_documents').insert([{
      project_id: projectId, type: docType, title: normalizedTitle || config.label,
      reference_number: form.reference_number || null, voucher_number: docType === 'purchase_order' ? form.voucher_number || null : null,
      date: form.date || null, from_party: form.from_party || null, to_party: form.to_party || null,
      data, raw_input: rawInput, vat: ['purchase_order', 'receipt'].includes(docType) ? toNumber(form.vat) : 0,
      wht: ['purchase_order', 'receipt'].includes(docType) ? toNumber(form.wht) : 0,
      total: computedTotal || 0, created_by: user?.id || null,
    }]).select().single()

    setSaving(false)
    if (error) {
      toast({
        title: 'Save failed',
        description: getUserFacingMutationMessage(error, { action: 'save' }),
        variant: 'destructive',
      })
      return
    }

    // Audit Trail
    try {
      const { recordProjectDocumentAdded } = await import('@/lib/audit')
      if (insertedDoc) {
        await recordProjectDocumentAdded(projectId, insertedDoc.id, docType)
      }
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }

    toast({ title: `${config.label} saved`, description: 'Ready to view or export.' })
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[94vh] rounded-t-[28px] bg-slate-50 p-0 border-none sm:mx-auto sm:max-w-3xl overflow-y-auto [&>[data-slot=sheet-close]]:hidden">
        <SheetHeader className="p-4 border-b bg-white rounded-t-[28px] flex flex-row items-center justify-between text-left shrink-0">
          <div className="space-y-0.5">
            <SheetTitle className="text-base font-black text-slate-900 flex items-center gap-1.5 leading-tight">
              <Wand2 className="h-4 w-4 text-emerald-600" />
              Project Document
            </SheetTitle>
            <SheetDescription className="text-[11px] font-medium text-slate-500 leading-tight">
              Step {step}: {step === 1 ? 'Select Type' : step === 2 ? 'Import Data' : 'Review & Save'}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-1.5 mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full ${step >= s ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            ))}
          </div>

          {step === 1 && <ProjectDocumentTypeSelector selectedType={docType} onSelect={(t) => { setDocType(t); setStep(2) }} />}
          
          {step === 2 && (
            <JsonImportUI
              title={`Import ${config.label}`}
              description={`Paste JSON extraction for this ${config.label}.`}
              promptText={promptText}
              rawInput={rawInput}
              onRawInputChange={(val) => { setRawInput(val); setParseError('') }}
              onPreview={handleParse}
              onSave={handleParse}
              error={parseError}
              helpText="Quick Guide: Copy the AI prompt, extract your document's data into JSON using any AI, then paste it here to review and save."
              tutorial={{
                title: `How ${config.label} import works`,
                description: `You can populate this ${config.label} document by pasting a JSON extraction from your source file.`,
                steps: [
                  'Copy the AI prompt for this document type',
                  'Extract the document data into JSON using any AI tool',
                  'Paste the resulting JSON here to review the form',
                  'Review all fields and save to the project'
                ],
                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
              }}
              additionalActions={<button onClick={() => setStep(1)} className="text-xs font-bold text-slate-400 hover:text-slate-600 w-full pt-4">Change Document Type</button>}
            />
          )}

          {step === 3 && (
            <ProjectDocumentStep3Review
              type={docType}
              form={form}
              setForm={setForm}
              saving={saving}
              onBack={() => setStep(2)}
              onSave={handleSave}
              purchaseOrderTotal={purchaseOrderTotal}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

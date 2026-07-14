import * as React from 'react'
import { Loader2, Rows3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Textarea } from '@/components/ui/textarea'
import { ProjectDocumentType, DOCUMENT_TYPE_CONFIG } from './ProjectDocumentTypeSelector'

export type PurchaseOrderItem = {
  description: string
  quantity: number
  unit: string
  unit_price: number
  amount: number
}

export type WaybillItem = {
  description: string
  quantity: number
  unit: string
  condition: string
}

export type DocumentFormState = {
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

interface ProjectDocumentStep3ReviewProps {
  type: ProjectDocumentType
  form: DocumentFormState
  setForm: React.Dispatch<React.SetStateAction<DocumentFormState>>
  saving: boolean
  onBack: () => void
  onSave: () => void
  purchaseOrderTotal: number
}

const neutralButtonClassName =
  'h-9 gap-1.5 rounded-xl border border-zinc-200 bg-bd-surface px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50'

function toNumber(value: unknown) {
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}

function makeEmptyPurchaseOrderItem(): PurchaseOrderItem {
  return { description: '', quantity: 0, unit: '', unit_price: 0, amount: 0 }
}

function makeEmptyWaybillItem(): WaybillItem {
  return { description: '', quantity: 0, unit: '', condition: 'good' }
}

export function ProjectDocumentStep3Review({
  type,
  form,
  setForm,
  saving,
  onBack,
  onSave,
  purchaseOrderTotal,
}: ProjectDocumentStep3ReviewProps) {
  const config = DOCUMENT_TYPE_CONFIG[type]

  const updateForm = (patch: Partial<DocumentFormState>) => {
    setForm((current) => ({ ...current, ...patch }))
  }

  const renderSharedFields = () => (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Title{type === 'other' ? ' *' : ''}
        </label>
        <Input
          value={form.title}
          onChange={(event) => updateForm({ title: event.target.value })}
          placeholder={type === 'other' ? 'Required for Other documents' : ''}
          className="h-10 rounded-xl border-zinc-200 bg-background text-sm"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Reference Number</label>
        <Input value={form.reference_number} onChange={(event) => updateForm({ reference_number: event.target.value })} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Date</label>
        <Input type="date" value={form.date} onChange={(event) => updateForm({ date: event.target.value })} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">From Party</label>
        <Input value={form.from_party} onChange={(event) => updateForm({ from_party: event.target.value })} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">To Party</label>
        <Input value={form.to_party} onChange={(event) => updateForm({ to_party: event.target.value })} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Notes</label>
        <Textarea value={form.notes} onChange={(event) => updateForm({ notes: event.target.value })} className="min-h-24 rounded-2xl border-zinc-200 bg-background text-sm" />
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className={`rounded-[24px] border-l-4 border ${config.accent} border-zinc-200 bg-card p-4 shadow-sm`}>
        <div className="text-sm font-semibold text-zinc-900">Step 3: Review and edit</div>
        <div className="mt-1 text-[11px] text-zinc-500">Adjust the parsed values before saving the document to this project.</div>
      </div>

      <div className="rounded-[24px] border border-zinc-200 bg-bd-card-bg p-4">{renderSharedFields()}</div>

      {type === 'purchase_order' && (
        <div className="space-y-4 rounded-[24px] border-l-4 border-l-blue-500 border border-zinc-200 bg-card p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Voucher</label>
              <Input value={form.voucher_number} onChange={(event) => updateForm({ voucher_number: event.target.value })} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">VAT (₦)</label>
              <NumericInput value={form.vat} onChange={(val) => updateForm({ vat: val })} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">WHT (₦)</label>
              <NumericInput value={form.wht} onChange={(val) => updateForm({ wht: val })} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Total (₦)</label>
              <Input value={purchaseOrderTotal.toLocaleString()} readOnly className="h-10 rounded-xl border-zinc-200 bg-blue-50 text-sm font-semibold text-zinc-900" />
            </div>
          </div>

          <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-900">Items</div>
              <Button type="button" variant="outline" className={neutralButtonClassName} onClick={() => updateForm({ purchaseOrderItems: [...form.purchaseOrderItems, makeEmptyPurchaseOrderItem()] })}>
                <Rows3 className="h-3.5 w-3.5" />
                Add Row
              </Button>
            </div>

            <div className="space-y-3">
              {form.purchaseOrderItems.map((item, index) => (
                <div key={`po-item-${index}`} className="rounded-2xl border border-zinc-200 bg-card p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                    <Input value={item.description} onChange={(event) => setForm((current) => ({ ...current, purchaseOrderItems: current.purchaseOrderItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, description: event.target.value } : entry) }))} placeholder="Description" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm md:col-span-2" />
                    <NumericInput value={item.quantity} onChange={(val) => setForm((current) => ({ ...current, purchaseOrderItems: current.purchaseOrderItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, quantity: val } : entry) }))} placeholder="Qty" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                    <Input value={item.unit} onChange={(event) => setForm((current) => ({ ...current, purchaseOrderItems: current.purchaseOrderItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, unit: event.target.value } : entry) }))} placeholder="Unit" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                    <NumericInput value={item.unit_price} onChange={(val) => setForm((current) => ({ ...current, purchaseOrderItems: current.purchaseOrderItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, unit_price: val } : entry) }))} placeholder="Unit price" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <NumericInput value={item.amount} onChange={(val) => setForm((current) => ({ ...current, purchaseOrderItems: current.purchaseOrderItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, amount: val } : entry) }))} placeholder="Amount" className="h-10 w-full rounded-xl border-zinc-200 bg-zinc-50 text-sm sm:max-w-[220px]" />
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
      )}

      {type === 'receipt' && (
        <div className="grid grid-cols-2 gap-3 rounded-[24px] border-l-4 border-l-emerald-500 border border-zinc-200 bg-card p-4 shadow-sm">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Amount (₦)</label>
            <NumericInput value={form.amount} onChange={(val) => updateForm({ amount: val })} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Payment Method</label>
            <Input value={form.payment_method} onChange={(event) => updateForm({ payment_method: event.target.value })} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">VAT (₦)</label>
            <NumericInput value={form.vat} onChange={(val) => updateForm({ vat: val })} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">WHT (₦)</label>
            <NumericInput value={form.wht} onChange={(val) => updateForm({ wht: val })} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
          </div>
        </div>
      )}

      {type === 'receiving_waybill' && (
        <div className="space-y-4 rounded-[24px] border-l-4 border-l-orange-500 border border-zinc-200 bg-card p-4 shadow-sm">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Received By</label>
            <Input value={form.received_by} onChange={(event) => updateForm({ received_by: event.target.value })} className="h-10 rounded-xl border-zinc-200 bg-background text-sm" />
          </div>
          <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-900">Items</div>
              <Button type="button" variant="outline" className={neutralButtonClassName} onClick={() => updateForm({ waybillItems: [...form.waybillItems, makeEmptyWaybillItem()] })}>
                <Rows3 className="h-3.5 w-3.5" />
                Add Row
              </Button>
            </div>
            <div className="space-y-3">
              {form.waybillItems.map((item, index) => (
                <div key={`waybill-item-${index}`} className="rounded-2xl border border-zinc-200 bg-card p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <Input value={item.description} onChange={(event) => setForm((current) => ({ ...current, waybillItems: current.waybillItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, description: event.target.value } : entry) }))} placeholder="Description" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                    <NumericInput value={item.quantity} onChange={(val) => setForm((current) => ({ ...current, waybillItems: current.waybillItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, quantity: val } : entry) }))} placeholder="Qty" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                    <Input value={item.unit} onChange={(event) => setForm((current) => ({ ...current, waybillItems: current.waybillItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, unit: event.target.value } : entry) }))} placeholder="Unit" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                    <Input value={item.condition} onChange={(event) => setForm((current) => ({ ...current, waybillItems: current.waybillItems.map((entry, itemIndex) => itemIndex === index ? { ...entry, condition: event.target.value } : entry) }))} placeholder="Condition" className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2 pt-4 pb-8">
        <Button 
          type="button" 
          variant="outline" 
          className={neutralButtonClassName + " h-10 px-6"} 
          onClick={onBack}
          disabled={saving}
        >
          Back
        </Button>
        <Button 
          type="button" 
          className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 px-8 font-bold" 
          onClick={onSave} 
          disabled={saving}
        >
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Document'}
        </Button>
      </div>
    </div>
  )
}

import type { DiscountTiming, DiscountType, ExtraCharge, InvoiceFieldEntry, WhtType } from '@/domain/invoice'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X } from 'lucide-react'
import { ChipButton, CompactSelectField, fieldCls, labelCls, pageCardCls, SectionLabel } from '@/components/invoice/mobile/mobileFormPrimitives'

type CommercialTermsSectionProps = {
  invoice: Record<string, unknown>
  isQuotation: boolean
  updateInvoice: (field: string, value: unknown) => void
  discountType: DiscountType
  setDiscountType: (value: DiscountType) => void
  discountTiming: DiscountTiming
  setDiscountTiming: (value: DiscountTiming) => void
  whtType: WhtType
  setWhtType: (value: WhtType) => void
  extraCharges: ExtraCharge[]
  onAddExtraCharge: (withTax: boolean) => void
  onUpdateExtraCharge: (id: string | undefined, field: string, value: unknown) => void
  onRemoveExtraCharge: (id: string | undefined) => void
  additionalFields: InvoiceFieldEntry[]
  onAddAdditionalField: () => void
  onUpdateAdditionalField: (id: string | undefined, field: 'label' | 'value', value: string) => void
  onRemoveAdditionalField: (id: string | undefined) => void
}

export default function CommercialTermsSection({
  invoice,
  isQuotation,
  updateInvoice,
  discountType,
  setDiscountType,
  discountTiming,
  setDiscountTiming,
  whtType,
  setWhtType,
  extraCharges,
  onAddExtraCharge,
  onUpdateExtraCharge,
  onRemoveExtraCharge,
  additionalFields,
  onAddAdditionalField,
  onUpdateAdditionalField,
  onRemoveAdditionalField,
}: CommercialTermsSectionProps) {
  const paymentTermValue = String(invoice.payment_terms || '') || undefined

  return (
    <div>
      <SectionLabel color="#d97706">Commercial Terms</SectionLabel>
      <div className={`${pageCardCls} space-y-3 p-4`}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Payment Terms</label>
            <Select value={paymentTermValue} onValueChange={(value) => updateInvoice('payment_terms', value)}>
              <SelectTrigger className={fieldCls}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="50% advance · 50% on delivery">50% advance · 50% on delivery</SelectItem>
                <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                <SelectItem value="Net 15">Net 15</SelectItem>
                <SelectItem value="Net 30">Net 30</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={labelCls}>Due / Validity</label>
            <Input value={String(invoice.custom_payment_terms || '')} onChange={(event) => updateInvoice('custom_payment_terms', event.target.value)} placeholder={isQuotation ? 'e.g. 14 days validity' : 'e.g. Due in 14 days'} className={fieldCls} />
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_78px_96px_88px_78px] gap-2 max-[620px]:grid-cols-2">
          <div>
            <label className={labelCls}>Discount</label>
            <Input type="number" min="0" value={Number(invoice.discount || 0)} onChange={(e) => updateInvoice('discount', Number(e.target.value))} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <CompactSelectField value={discountType} onChange={(value) => setDiscountType(value as DiscountType)} options={[{ value: 'fixed', label: 'NGN' }, { value: 'percent', label: '%' }]} />
          </div>
          <div>
            <label className={labelCls}>Apply</label>
            <CompactSelectField value={discountTiming} onChange={(value) => setDiscountTiming(value as DiscountTiming)} options={[{ value: 'before', label: 'Before' }, { value: 'after', label: 'After' }]} />
          </div>
          <div>
            <label className={labelCls}>WHT</label>
            <Input type="number" min="0" value={Number(invoice.wht || 0)} onChange={(e) => updateInvoice('wht', Number(e.target.value))} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>WHT Type</label>
            <CompactSelectField value={whtType} onChange={(value) => setWhtType(value as WhtType)} options={[{ value: 'fixed', label: 'NGN' }, { value: 'percent', label: '%' }]} />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className={labelCls}>Notes / Terms helpers</label>
            <div className="flex gap-2">
              <ChipButton className="bg-[#fffbeb] text-[#d97706]" onClick={() => onAddExtraCharge(true)}><Plus className="h-3.5 w-3.5" />Add charge</ChipButton>
              <ChipButton className="bg-[#eff6ff] text-[#2563eb]" onClick={onAddAdditionalField}><Plus className="h-3.5 w-3.5" />Add field</ChipButton>
            </div>
          </div>
          <div className="space-y-2">
            {extraCharges.map((charge) => (
              <div key={charge.id} className="grid grid-cols-[minmax(0,1fr)_86px_90px_38px] gap-2">
                <Input value={String(charge.label || '')} onChange={(event) => onUpdateExtraCharge(charge.id, 'label', event.target.value)} placeholder="Charge label" className={fieldCls} />
                <Input type="number" min="0" value={Number(charge.value || 0)} onChange={(event) => onUpdateExtraCharge(charge.id, 'value', Number(event.target.value))} className={fieldCls} />
                <CompactSelectField value={charge.withTax === false ? 'after_tax' : 'before_tax'} onChange={(value) => onUpdateExtraCharge(charge.id, 'withTax', value === 'before_tax')} options={[{ value: 'before_tax', label: 'Before' }, { value: 'after_tax', label: 'After' }]} />
                <button type="button" onClick={() => onRemoveExtraCharge(charge.id)} className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#fecaca] bg-[#fff5f5] text-[#ef4444]"><X className="h-4 w-4" /></button>
              </div>
            ))}
            {additionalFields.map((field) => (
              <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_38px] gap-2">
                <Input value={String(field.label || '')} onChange={(event) => onUpdateAdditionalField(field.id, 'label', event.target.value)} placeholder="Field label" className={fieldCls} />
                <Input value={String(field.value || '')} onChange={(event) => onUpdateAdditionalField(field.id, 'value', event.target.value)} placeholder="Value" className={fieldCls} />
                <button type="button" onClick={() => onRemoveAdditionalField(field.id)} className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#e2e8f0] bg-white text-[#94a3b8]"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

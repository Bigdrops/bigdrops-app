import { useMemo, useState } from 'react'
import type { DiscountTiming, DiscountType, ExtraCharge, InvoiceFieldEntry, WhtType } from '@/domain/invoice'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Percent, Plus, X } from 'lucide-react'
import {
  fieldCls,
  SectionLabel,
  labelCls,
  CollapseCard,
  SegmentedControl,
} from '@/components/invoice/mobile/mobileFormPrimitives'

type CommercialTermsSectionProps = {
  invoice: Record<string, any>
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

export function FormCommercialTerms({
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
  const [openSections, setOpenSections] = useState({
    discount: false,
    vat: false,
    wht: false,
    charges: false,
    fields: false,
  })

  const discountSummary = Number(invoice.discount || 0) > 0 
    ? `${invoice.discount}${discountType === 'percent' ? '%' : ' NGN'}` 
    : 'Not set'
  const vatSummary = Number(invoice.vat || 0) > 0 ? `${invoice.vat}%` : 'Not set'
  const whtSummary = Number(invoice.wht || 0) > 0 
    ? `${invoice.wht}${whtType === 'percent' ? '%' : ' NGN'}` 
    : 'Not set'
  
  const chargesSummary = useMemo(() => {
    if (extraCharges.length === 0) return 'None'
    return `${extraCharges.length} ${extraCharges.length === 1 ? 'charge' : 'charges'}`
  }, [extraCharges.length])

  const fieldsSummary = useMemo(() => {
    if (additionalFields.length === 0) return 'None'
    return `${additionalFields.length} ${additionalFields.length === 1 ? 'field' : 'fields'}`
  }, [additionalFields.length])

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((current) => ({ ...current, [key]: !current[key] }))

  return (
    <div className="border-b border-[var(--bd-border-soft)] pb-4">
      <div>
        <SectionLabel color="amber">Commercial Terms</SectionLabel>
        <div className="grid grid-cols-2 gap-4 border-b border-bd-border pb-4">
            <div>
              <label className={labelCls}>Payment Terms</label>
              <Select 
                value={String(invoice.payment_terms || 'Custom')} 
                onValueChange={(value) => updateInvoice('payment_terms', value)}
              >
                <SelectTrigger className={fieldCls}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Custom">Custom</SelectItem>
                  <SelectItem value="Net 7">Net 7 Days</SelectItem>
                  <SelectItem value="Net 14">Net 14 Days</SelectItem>
                  <SelectItem value="Net 30">Net 30 Days</SelectItem>
                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelCls}>Due / Validity</label>
              <Input
                value={String(invoice.custom_payment_terms || '')}
                onChange={(event) => updateInvoice('custom_payment_terms', event.target.value)}
                placeholder={isQuotation ? 'e.g. 14 days validity' : 'e.g. Due in 14 days'}
                className={fieldCls}
              />
            </div>
        </div>
      </div>

      <div className="space-y-0 pt-1">
        {/* Discount Section */}
        <CollapseCard
          title="Discount"
          subtitle={discountSummary}
          open={openSections.discount}
          onToggle={() => toggleSection('discount')}
          icon={Percent}
          iconTone={{ bg: 'amber', fg: 'amber' }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Value</label>
                <NumericInput
                  min={0}
                  value={Number(invoice.discount || 0)}
                  onChange={(val) => updateInvoice('discount', val)}
                  className={fieldCls}
                />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <SegmentedControl
                  value={discountType}
                  onChange={(val) => setDiscountType(val as DiscountType)}
                  options={[
                    { label: 'NGN', value: 'fixed' },
                    { label: '%', value: 'percent' },
                  ]}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Discount Timing</label>
              <SegmentedControl
                value={discountTiming}
                onChange={(val) => setDiscountTiming(val as DiscountTiming)}
                options={[
                  { label: 'After VAT', value: 'after' },
                  { label: 'Before VAT', value: 'before' },
                ]}
              />
            </div>
          </div>
        </CollapseCard>

        {/* VAT Section */}
        <CollapseCard
          title="VAT"
          subtitle={vatSummary}
          open={openSections.vat}
          onToggle={() => toggleSection('vat')}
          icon={Percent}
          iconTone={{ bg: 'emerald', fg: 'emerald' }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>VAT Rate (%)</label>
              <NumericInput
                min={0}
                value={Number(invoice.vat || 0)}
                onChange={(val) => updateInvoice('vat', val)}
                className={fieldCls}
              />
            </div>
          </div>
        </CollapseCard>

        {/* WHT Section */}
        <CollapseCard
          title="Withholding Tax (WHT)"
          subtitle={whtSummary}
          open={openSections.wht}
          onToggle={() => toggleSection('wht')}
          icon={Percent}
          iconTone={{ bg: 'violet', fg: 'violet' }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>WHT Rate</label>
              <NumericInput
                min={0}
                value={Number(invoice.wht || 0)}
                onChange={(val) => updateInvoice('wht', val)}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <SegmentedControl
                value={whtType}
                onChange={(val) => setWhtType(val as WhtType)}
                options={[
                  { label: '%', value: 'percent' },
                  { label: 'NGN', value: 'fixed' },
                ]}
              />
            </div>
          </div>
        </CollapseCard>

        {/* Extra Charges Section */}
        <CollapseCard
          title="Additional Charges"
          subtitle={chargesSummary}
          open={openSections.charges}
          onToggle={() => toggleSection('charges')}
          icon={Plus}
          iconTone={{ bg: 'amber-strong', fg: 'amber-strong' }}
        >
          <div className="space-y-3">
            {extraCharges.map((charge) => (
              <div key={charge.id} className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={String(charge.label || '')}
                    onChange={(event) => onUpdateExtraCharge(charge.id, 'label', event.target.value)}
                    placeholder="Label (e.g. Transport)"
                    className={`${fieldCls} ${charge.withTax !== false ? 'pr-9' : ''}`}
                  />
                  {charge.withTax !== false ? (
                    <span className="pointer-events-none absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-bd-text-muted">
                      <Percent className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </div>
                <div className="w-28">
                  <NumericInput
                    min={0}
                    value={Number(charge.value || 0)}
                    onChange={(val) => onUpdateExtraCharge(charge.id, 'value', val)}
                    className={`${fieldCls} text-right font-bold`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveExtraCharge(charge.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-bd-status-danger-border bg-bd-status-danger-bg text-bd-status-danger-text transition hover:brightness-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
               <button
                 type="button"
                 onClick={() => onAddExtraCharge(true)}
                 className="flex-1 rounded-[var(--bd-radius)] border border-dashed border-bd-border bg-bd-surface py-2 text-[12px] font-bold text-bd-text transition hover:border-bd-button-primary-bg hover:bg-bd-surface-muted"
               >
                 + Charge (with Tax)
               </button>
               <button
                 type="button"
                 onClick={() => onAddExtraCharge(false)}
                 className="flex-1 rounded-[var(--bd-radius)] border border-dashed border-bd-border bg-bd-surface py-2 text-[12px] font-bold text-bd-text transition hover:border-bd-border hover:bg-bd-surface-muted"
               >
                 + Charge (No Tax)
               </button>
            </div>
          </div>
        </CollapseCard>

        {/* Custom Additional Fields */}
        <CollapseCard
          title="Additional Fields"
          subtitle={fieldsSummary}
          open={openSections.fields}
          onToggle={() => toggleSection('fields')}
          icon={Plus}
          iconTone={{ bg: 'indigo', fg: 'indigo' }}
        >
          <div className="space-y-3">
            {additionalFields.map((field) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  value={String(field.label || '')}
                  onChange={(event) => onUpdateAdditionalField(field.id, 'label', event.target.value)}
                  placeholder="Label"
                  className={`${fieldCls} flex-1`}
                />
                <Input
                  value={String(field.value || '')}
                  onChange={(event) => onUpdateAdditionalField(field.id, 'value', event.target.value)}
                  placeholder="Value"
                  className={`${fieldCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => onRemoveAdditionalField(field.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-bd-border bg-bd-surface-muted text-bd-text-muted transition hover:bg-bd-status-danger-bg hover:text-bd-status-danger-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={onAddAdditionalField}
              className="mt-2 w-full rounded-[var(--bd-radius)] border border-dashed border-bd-border bg-bd-surface py-2 text-[12px] font-bold text-bd-text transition hover:border-bd-button-primary-bg hover:bg-bd-surface-muted"
            >
              Add Additional Field
            </button>
          </div>
        </CollapseCard>
      </div>
    </div>
  )
}

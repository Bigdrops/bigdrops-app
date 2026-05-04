import { useMemo, useState, type ReactNode } from 'react'
import type { DiscountTiming, DiscountType, ExtraCharge, InvoiceFieldEntry, WhtType } from '@/domain/invoice'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDown, Percent, Plus, Trash2 } from 'lucide-react'
import { fieldCls, SectionLabel, pageCardCls, labelCls } from '@/components/invoice/mobile/mobileFormPrimitives'

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

function AccordionCard({
  title,
  summary,
  open,
  onToggle,
  children,
  last = false,
}: {
  title: string
  summary: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  last?: boolean
}) {
  return (
    <div className={`${last ? '' : 'border-b border-[hsl(var(--bd-border))]'}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div>
          <div className="text-[14px] font-bold text-[hsl(var(--bd-text))]">{title}</div>
          <div className="text-[12px] text-[hsl(var(--bd-text-muted))]">{summary}</div>
        </div>
        <ChevronDown className={`h-4 w-4 text-[hsl(var(--bd-text-muted))] transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  )
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
  const [openSections, setOpenSections] = useState({
    discount: true,
    vat: false,
    wht: false,
    charges: false,
    fields: false,
  })
  const [chargeChoiceOpen, setChargeChoiceOpen] = useState(false)

  const discountSummary = Number(invoice.discount || 0) > 0 ? `${invoice.discount}${discountType === 'percent' ? '%' : ' NGN'}` : 'Not set'
  const vatSummary = Number(invoice.vat || 0) > 0 ? `${invoice.vat}%` : 'Not set'
  const whtSummary = Number(invoice.wht || 0) > 0 ? `${invoice.wht}${whtType === 'percent' ? '%' : ' NGN'}` : 'Not set'
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
    <div>
      <SectionLabel color="amber">Commercial Terms</SectionLabel>
      <div className={`${pageCardCls} overflow-hidden p-0`}>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Payment Terms</label>
              <Select value={paymentTermValue} onValueChange={(value) => updateInvoice('payment_terms', value)}>
                <SelectTrigger className={fieldCls}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Custom">Custom</SelectItem>
                  <SelectItem value="Net 7">Net 7</SelectItem>
                  <SelectItem value="Net 14">Net 14</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
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

        <AccordionCard
          title="Discount"
          summary={discountSummary}
          open={openSections.discount}
          onToggle={() => toggleSection('discount')}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_86px_108px] gap-2">
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
              <Select value={discountType} onValueChange={(value) => setDiscountType(value as DiscountType)}>
                <SelectTrigger className={fieldCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">NGN</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelCls}>Apply</label>
              <Select value={discountTiming} onValueChange={(value) => setDiscountTiming(value as DiscountTiming)}>
                <SelectTrigger className={fieldCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="after">After VAT</SelectItem>
                  <SelectItem value="before">Before VAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AccordionCard>

        <AccordionCard title="VAT" summary={vatSummary} open={openSections.vat} onToggle={() => toggleSection('vat')}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>VAT Rate (%)</label>
              <NumericInput
                min={0}
                value={Number(invoice.vat || 0)}
                onChange={(val) => updateInvoice('vat', val)}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Apply On</label>
              <Input value="Subtotal" readOnly className={`${fieldCls} text-[hsl(var(--bd-text-muted))]`} />
            </div>
          </div>
        </AccordionCard>

        <AccordionCard title="WHT" summary={whtSummary} open={openSections.wht} onToggle={() => toggleSection('wht')}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>WHT Rate (%)</label>
              <NumericInput
                min={0}
                value={Number(invoice.wht || 0)}
                onChange={(val) => updateInvoice('wht', val)}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <Select value={whtType} onValueChange={(value) => setWhtType(value as WhtType)}>
                <SelectTrigger className={fieldCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent %</SelectItem>
                  <SelectItem value="fixed">Fixed NGN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AccordionCard>

        <AccordionCard
          title="Additional Charges"
          summary={chargesSummary}
          open={openSections.charges}
          onToggle={() => toggleSection('charges')}
        >
          <div className="text-[12px] text-[hsl(var(--bd-text-muted))]">Add surcharges: transport, workmanship, installation.</div>
          {chargeChoiceOpen ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onAddExtraCharge(true)
                  setChargeChoiceOpen(false)
                }}
                className="h-10 rounded-[12px] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-[12.5px] font-bold text-[hsl(var(--bd-text))]"
              >
                Tax applies
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddExtraCharge(false)
                  setChargeChoiceOpen(false)
                }}
                className="h-10 rounded-[12px] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-[12.5px] font-bold text-[hsl(var(--bd-text))]"
              >
                No tax
              </button>
            </div>
          ) : null}

          <div className="mt-3 space-y-2">
            {extraCharges.map((charge) => (
              <div key={charge.id} className="grid grid-cols-[minmax(0,1fr)_96px_34px] gap-2">
                <div className="relative">
                  <Input
                    value={String(charge.label || '')}
                    onChange={(event) => onUpdateExtraCharge(charge.id, 'label', event.target.value)}
                    placeholder="Label e.g. Transport"
                    className={`${fieldCls} ${charge.withTax !== false ? 'pr-8' : ''}`}
                  />
                  {charge.withTax !== false ? (
                    <span
                      className="pointer-events-none absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-[hsl(var(--bd-text-muted))]"
                      title="Tax applies"
                    >
                      <Percent className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </div>
                <NumericInput
                  min={0}
                  value={Number(charge.value || 0)}
                  onChange={(val) => onUpdateExtraCharge(charge.id, 'value', val)}
                  className={`${fieldCls} text-right`}
                />
                <button
                  type="button"
                  onClick={() => onRemoveExtraCharge(charge.id)}
                  className="flex h-11 w-[34px] items-center justify-center rounded-[12px] border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setChargeChoiceOpen((current) => !current)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-3 text-[12px] font-bold text-[hsl(var(--bd-text))] transition hover:bg-[hsl(var(--bd-surface-muted))]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Charge
            </button>
          </div>
        </AccordionCard>

        <AccordionCard
          title="Additional Fields"
          summary={fieldsSummary}
          open={openSections.fields}
          onToggle={() => toggleSection('fields')}
          last
        >
          <div className="space-y-2">
            {additionalFields.length === 0 ? (
              <div className="text-[12px] text-[hsl(var(--bd-text-muted))]">No additional fields.</div>
            ) : null}
            {additionalFields.map((field) => (
              <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_34px] gap-2">
                <Input
                  value={String(field.label || '')}
                  onChange={(event) => onUpdateAdditionalField(field.id, 'label', event.target.value)}
                  placeholder="Field label"
                  className={fieldCls}
                />
                <Input
                  value={String(field.value || '')}
                  onChange={(event) => onUpdateAdditionalField(field.id, 'value', event.target.value)}
                  placeholder="Value"
                  className={fieldCls}
                />
                <button
                  type="button"
                  onClick={() => onRemoveAdditionalField(field.id)}
                  className="flex h-11 w-[34px] items-center justify-center rounded-[12px] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))] transition hover:bg-[hsl(var(--bd-status-danger-bg))] hover:text-[hsl(var(--bd-status-danger-text))]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onAddAdditionalField}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-3 text-[12px] font-bold text-[hsl(var(--bd-text))] transition hover:bg-[hsl(var(--bd-surface-muted))]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Field
            </button>
          </div>
        </AccordionCard>
      </div>
    </div>
  )
}

import { type ReactNode, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'

import type { DiscountTiming, DiscountType, ExtraCharge, InvoiceFieldEntry, WhtType } from '@/domain/invoice'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ChipButton,
  CompactSelectField,
  fieldCls,
  labelCls,
  pageCardCls,
  SectionLabel,
} from '@/components/invoice/mobile/mobileFormPrimitives'

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

function DisclosureCard({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string
  summary: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="rounded-[18px] border border-[#e2e8f0] bg-[#f8fafc]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="text-[12px] font-bold text-[#0f172a]">{title}</div>
          <div className="mt-1 text-[12px] text-[#64748b]">{summary}</div>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-[#475569]">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {open ? <div className="border-t border-[#e2e8f0] px-4 pb-4 pt-4">{children}</div> : null}
    </div>
  )
}

function formatCurrency(value: number) {
  return `NGN ${value.toLocaleString()}`
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
  const [showDiscount, setShowDiscount] = useState(false)
  const [showWht, setShowWht] = useState(false)
  const [showExtraCharges, setShowExtraCharges] = useState(false)
  const [showAdditionalFields, setShowAdditionalFields] = useState(false)

  const paymentTermValue = String(invoice.payment_terms || '') || undefined
  const dueValidityLabel = isQuotation ? 'Due / Validity' : 'Due / Validity'
  const discountValue = Number(invoice.discount || 0)
  const whtValue = Number(invoice.wht || 0)
  const workDuration = String(invoice.work_duration || '')

  const discountSummary = useMemo(() => {
    if (discountValue <= 0) return 'Not set'
    const valueLabel = discountType === 'percent' ? `${discountValue}%` : formatCurrency(discountValue)
    const timingLabel = discountTiming === 'before' ? 'Before tax' : 'After tax'
    return `${valueLabel} · ${timingLabel}`
  }, [discountTiming, discountType, discountValue])

  const whtSummary = useMemo(() => {
    if (whtValue <= 0) return 'Not set'
    return `${whtType === 'percent' ? `${whtValue}%` : formatCurrency(whtValue)} deducted from payable`
  }, [whtType, whtValue])

  const extraChargeSummary = useMemo(() => {
    if (extraCharges.length === 0) return 'No additional charges'
    const total = extraCharges.reduce((sum, charge) => sum + Number(charge.value || 0), 0)
    return `${extraCharges.length} ${extraCharges.length === 1 ? 'charge' : 'charges'} · ${formatCurrency(total)}`
  }, [extraCharges])

  const additionalFieldSummary = useMemo(() => {
    const parts: string[] = []
    if (additionalFields.length > 0) {
      parts.push(`${additionalFields.length} ${additionalFields.length === 1 ? 'field' : 'fields'}`)
    }
    if (workDuration) parts.push('Work duration set')
    return parts.length > 0 ? parts.join(' · ') : 'No additional fields'
  }, [additionalFields.length, workDuration])

  return (
    <div>
      <SectionLabel color="#d97706">Commercial Terms</SectionLabel>
      <div className={`${pageCardCls} space-y-4 p-4`}>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <div className="min-w-0">
            <label className={labelCls}>Payment Terms</label>
            <Select value={paymentTermValue} onValueChange={(value) => updateInvoice('payment_terms', value)}>
              <SelectTrigger className={`${fieldCls} justify-between`}>
                <SelectValue placeholder="Select payment terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50% advance · 50% on delivery">50% advance · 50% on delivery</SelectItem>
                <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                <SelectItem value="Net 15">Net 15</SelectItem>
                <SelectItem value="Net 30">Net 30</SelectItem>
                <SelectItem value="Net 45">Net 45</SelectItem>
                <SelectItem value="Net 60">Net 60</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <label className={labelCls}>{dueValidityLabel}</label>
            <Input
              value={String(invoice.custom_payment_terms || '')}
              onChange={(event) => updateInvoice('custom_payment_terms', event.target.value)}
              placeholder={isQuotation ? 'e.g. Valid for 14 days' : 'e.g. Due in 14 days'}
              className={fieldCls}
            />
          </div>
        </div>

        <DisclosureCard
          title="Configure Discount"
          summary={discountSummary}
          open={showDiscount}
          onToggle={() => setShowDiscount((current) => !current)}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_88px_112px] items-end gap-2">
            <div className="min-w-0">
              <label className={labelCls}>Discount Value</label>
              <Input
                type="number"
                min="0"
                value={discountValue}
                onChange={(event) => updateInvoice('discount', Number(event.target.value))}
                className={fieldCls}
              />
            </div>
            <div className="min-w-0">
              <label className={labelCls}>Type</label>
              <CompactSelectField
                value={discountType}
                onChange={(value) => setDiscountType(value as DiscountType)}
                options={[
                  { value: 'fixed', label: 'NGN' },
                  { value: 'percent', label: '%' },
                ]}
              />
            </div>
            <div className="min-w-0">
              <label className={labelCls}>Apply</label>
              <CompactSelectField
                value={discountTiming}
                onChange={(value) => setDiscountTiming(value as DiscountTiming)}
                options={[
                  { value: 'before', label: 'Before' },
                  { value: 'after', label: 'After' },
                ]}
              />
            </div>
          </div>
        </DisclosureCard>

        <DisclosureCard
          title="Configure WHT"
          summary={whtSummary}
          open={showWht}
          onToggle={() => setShowWht((current) => !current)}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_88px] items-end gap-2">
            <div className="min-w-0">
              <label className={labelCls}>WHT Value</label>
              <Input
                type="number"
                min="0"
                value={whtValue}
                onChange={(event) => updateInvoice('wht', Number(event.target.value))}
                className={fieldCls}
              />
            </div>
            <div className="min-w-0">
              <label className={labelCls}>Type</label>
              <CompactSelectField
                value={whtType}
                onChange={(value) => setWhtType(value as WhtType)}
                options={[
                  { value: 'fixed', label: 'NGN' },
                  { value: 'percent', label: '%' },
                ]}
              />
            </div>
          </div>
        </DisclosureCard>

        <DisclosureCard
          title="Add Additional Charges"
          summary={extraChargeSummary}
          open={showExtraCharges}
          onToggle={() => setShowExtraCharges((current) => !current)}
        >
          <div className="space-y-3">
            <div className="rounded-[14px] border border-dashed border-[#fcd34d] bg-[#fffbeb] px-3 py-3 text-[12px] leading-5 text-[#92400e]">
              Add charges like workmanship, transportation, or shipping here when needed.
            </div>

            <div className="flex justify-end">
              <ChipButton
                className="bg-[#fffbeb] text-[#d97706]"
                onClick={() => {
                  setShowExtraCharges(true)
                  onAddExtraCharge(true)
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Charge
              </ChipButton>
            </div>

            {extraCharges.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-[#e2e8f0] bg-white px-4 py-5 text-[13px] text-[#64748b]">
                No additional charges yet.
              </div>
            ) : (
              <div className="space-y-2">
                {extraCharges.map((charge) => (
                  <div
                    key={charge.id}
                    className="grid grid-cols-[minmax(0,1fr)_88px_94px_42px] items-center gap-2"
                  >
                    <Input
                      value={String(charge.label || '')}
                      onChange={(event) => onUpdateExtraCharge(charge.id, 'label', event.target.value)}
                      placeholder="Charge label"
                      className={fieldCls}
                    />
                    <Input
                      type="number"
                      min="0"
                      value={Number(charge.value || 0)}
                      onChange={(event) => onUpdateExtraCharge(charge.id, 'value', Number(event.target.value))}
                      className={`${fieldCls} text-right`}
                    />
                    <CompactSelectField
                      value={charge.withTax === false ? 'after_tax' : 'before_tax'}
                      onChange={(value) => onUpdateExtraCharge(charge.id, 'withTax', value === 'before_tax')}
                      options={[
                        { value: 'before_tax', label: 'Before' },
                        { value: 'after_tax', label: 'After' },
                      ]}
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveExtraCharge(charge.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#fecaca] bg-[#fff5f5] text-[#ef4444]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DisclosureCard>

        <DisclosureCard
          title="Add Additional Fields"
          summary={additionalFieldSummary}
          open={showAdditionalFields}
          onToggle={() => setShowAdditionalFields((current) => !current)}
        >
          <div className="space-y-3">
            <div className="min-w-0">
              <label className={labelCls}>Work Duration</label>
              <Input
                value={workDuration}
                onChange={(event) => updateInvoice('work_duration', event.target.value)}
                placeholder="e.g. 7 working days"
                className={fieldCls}
              />
            </div>

            <div className="flex justify-end">
              <ChipButton
                className="bg-[#eff6ff] text-[#2563eb]"
                onClick={() => {
                  setShowAdditionalFields(true)
                  onAddAdditionalField()
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Field
              </ChipButton>
            </div>

            {additionalFields.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-[#e2e8f0] bg-white px-4 py-5 text-[13px] text-[#64748b]">
                No additional fields yet.
              </div>
            ) : (
              <div className="space-y-2">
                {additionalFields.map((field) => (
                  <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_42px] gap-2">
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
                      className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#e2e8f0] bg-white text-[#94a3b8]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DisclosureCard>
      </div>
    </div>
  )
}

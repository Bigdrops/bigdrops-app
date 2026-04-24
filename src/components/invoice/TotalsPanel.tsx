import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

const sectionLabelCls = 'mb-3 flex items-center gap-2 px-0.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#64748b]'
const inputCls =
  'h-11 rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 text-[14px] text-[#0f172a] shadow-none transition focus:border-[#94a3b8] focus:bg-white focus:ring-0 focus-visible:ring-0'
const cardCls =
  'rounded-[20px] border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]'

function formatCurrency(value: number | string) {
  return `NGN ${Number(value || 0).toLocaleString()}`
}

interface SectionHeaderProps {
  color: string
  label: string
}

function SectionHeader({ color, label }: SectionHeaderProps) {
  return (
    <div className={sectionLabelCls}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}

interface CollapseCardProps {
  color: string
  title: string
  subtitle: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}

function CollapseCard({ color, title, subtitle, open, onToggle, children }: CollapseCardProps) {
  return (
    <div className={cardCls}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div>
          <div className="text-[14px] font-bold text-[#0f172a]">{title}</div>
          <div className="mt-0.5 text-[11px] text-[#64748b]">{subtitle}</div>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
        >
          {open ? (
            <ChevronUp className="h-4 w-4 text-white" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white" />
          )}
        </div>
      </button>

      {open ? <div className="border-t border-[#e2e8f0] px-4 pb-4 pt-4">{children}</div> : null}
    </div>
  )
}

interface SegmentOption {
  value: string
  label: string
}

interface SegmentProps {
  value: string
  onChange: (value: any) => void
  options: SegmentOption[]
}

function Segment({ value, onChange, options }: SegmentProps) {
  return (
    <div className="flex gap-[3px] rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] p-[3px]">
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-9 flex-1 rounded-[9px] text-[12px] font-extrabold transition ${
              active ? 'bg-[#0f172a] text-white' : 'text-[#64748b]'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export interface ExtraCharge {
  id: string | number
  label: string | null
  value: number | null
  withTax: boolean
}

export interface ChargeLabels {
  workmanship?: string
  transportation?: string
  shipping?: string
}

interface TotalsPanelProps {
  rawSubtotal: number
  installRateTotal: number
  workmanship: number
  transportation: number
  shipping: number
  chargeLabels: ChargeLabels
  extraCharges: ExtraCharge[]
  onAddExtraCharge: (withTax: boolean) => void
  onUpdateExtraCharge: (id: string | number, field: string, value: any) => void
  onRemoveExtraCharge: (id: string | number) => void
  discountValue: number
  discountType: string
  discountTiming: string
  onDiscountValueChange: (value: number) => void
  onDiscountTypeChange: (type: any) => void
  onDiscountTimingChange: (timing: any) => void
  discountAmount: number
  vatAmount: number
  whtValue: number
  whtType: string
  onWhtValueChange: (value: number) => void
  onWhtTypeChange: (type: any) => void
  whtAmount: number
  grandTotal: number
  totalPayable: number
  amountInWords: string
}

export default function TotalsPanel({
  rawSubtotal,
  installRateTotal,
  workmanship,
  transportation,
  shipping,
  chargeLabels,
  extraCharges,
  onAddExtraCharge,
  onUpdateExtraCharge,
  onRemoveExtraCharge,
  discountValue,
  discountType,
  discountTiming,
  onDiscountValueChange,
  onDiscountTypeChange,
  onDiscountTimingChange,
  discountAmount,
  vatAmount,
  whtValue,
  whtType,
  onWhtValueChange,
  onWhtTypeChange,
  whtAmount,
  grandTotal,
  totalPayable,
  amountInWords,
}: TotalsPanelProps) {
  const [showCharges, setShowCharges] = useState(false)
  const [showDiscount, setShowDiscount] = useState(false)
  const [showWht, setShowWht] = useState(false)

  const summaryRows = useMemo(
    () =>
      [
        { label: 'Subtotal', value: rawSubtotal, negative: false },
        installRateTotal > 0 ? { label: 'Install Rate', value: installRateTotal, negative: false } : null,
        workmanship > 0 ? { label: chargeLabels.workmanship || 'Workmanship', value: workmanship, negative: false } : null,
        transportation > 0 ? { label: chargeLabels.transportation || 'Transportation', value: transportation, negative: false } : null,
        shipping > 0 ? { label: chargeLabels.shipping || 'Shipping', value: shipping, negative: false } : null,
        discountAmount > 0 ? { label: 'Discount', value: -discountAmount, negative: true } : null,
        { label: 'VAT', value: vatAmount, negative: false },
        whtAmount > 0 ? { label: 'WHT', value: -whtAmount, negative: true } : null,
      ].filter((row): row is { label: string; value: number; negative: boolean } => row !== null),
    [
      chargeLabels.shipping,
      chargeLabels.transportation,
      chargeLabels.workmanship,
      discountAmount,
      installRateTotal,
      rawSubtotal,
      shipping,
      transportation,
      vatAmount,
      workmanship,
      whtAmount,
    ],
  )

  return (
    <div className="space-y-4">
      <div>
        <SectionHeader color="#059669" label="Summary" />
        <div className={`${cardCls} p-4`}>
          <div className="space-y-3">
            {summaryRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 text-[14px]">
                <span className="text-[#64748b]">{row.label}</span>
                <span className={`font-bold ${row.negative ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                  {row.negative ? '-' : ''}
                  {formatCurrency(Math.abs(Number(row.value || 0)))}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[18px] bg-[#0f172a] px-4 py-5 text-white">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">
              Total Payable
            </div>
            <div className="mt-2 text-[36px] font-black leading-none tracking-[-0.04em] text-[#34d399]">
              {formatCurrency(totalPayable)}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[12px] text-[#cbd5e1]">
              <span>Grand Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
            {amountInWords ? (
              <div className="mt-3 border-t border-white/10 pt-3 text-[12px] italic text-[#cbd5e1]">
                {amountInWords}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <SectionHeader color="#d97706" label="Adjustments" />
        <CollapseCard
          color="#d97706"
          title="Additional Charges"
          subtitle="Add taxable or non-taxable charges only when needed"
          open={showCharges}
          onToggle={() => setShowCharges((current) => !current)}
        >
          <div className="space-y-3">
            <div className="rounded-[14px] border border-dashed border-[#fcd34d] bg-[#fffbeb] px-3 py-3 text-[12px] leading-5 text-[#92400e]">
              Add charges like workmanship, transportation, or shipping here instead of using dedicated rows.
            </div>

            <div className="pt-1">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">
                  Extra Charges
                </div>
                <button
                  type="button"
                  onClick={() => onAddExtraCharge(true)}
                  className="inline-flex h-8 items-center gap-2 rounded-full border-[1.5px] border-[#e2e8f0] bg-white px-[13px] text-[12px] font-bold text-[#334155]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Charge
                </button>
              </div>

              <div className="space-y-2">
                {extraCharges.map((charge) => (
                  <div
                    key={charge.id}
                    className="grid grid-cols-[minmax(0,1.35fr)_108px_92px_42px] items-center gap-2 max-[520px]:grid-cols-1"
                  >
                    <Input
                      value={charge.label || ''}
                      onChange={(event) => onUpdateExtraCharge(charge.id, 'label', event.target.value)}
                      placeholder="Charge label"
                      className={inputCls}
                    />
                    <Input
                      type="number"
                      min="0"
                      value={charge.value || 0}
                      onChange={(event) => onUpdateExtraCharge(charge.id, 'value', Number(event.target.value))}
                      className={`${inputCls} text-right`}
                    />
                    <div className="flex h-11 items-center justify-between rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">
                        VAT
                      </span>
                      <Switch
                        checked={charge.withTax !== false}
                        onCheckedChange={(value) => onUpdateExtraCharge(charge.id, 'withTax', value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveExtraCharge(charge.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#fecaca] bg-[#fff5f5] text-[#ef4444]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CollapseCard>
      </div>

      <CollapseCard
        color="#7c3aed"
        title="Discount"
        subtitle="Choose how discount is applied"
        open={showDiscount}
        onToggle={() => setShowDiscount((current) => !current)}
      >
        <div className="space-y-3">
          <Segment
            value={discountType}
            onChange={onDiscountTypeChange}
            options={[
              { value: 'percent', label: '%' },
              { value: 'fixed', label: 'NGN' },
            ]}
          />
          <Segment
            value={discountTiming}
            onChange={onDiscountTimingChange}
            options={[
              { value: 'before', label: 'Before Tax' },
              { value: 'after', label: 'After Tax' },
            ]}
          />
          <Input
            type="number"
            min="0"
            value={discountValue}
            onChange={(event) => onDiscountValueChange(Number(event.target.value))}
            className={inputCls}
          />
          {discountAmount > 0 ? (
            <div className="flex items-center justify-between rounded-[14px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] font-bold text-[#dc2626]">
              <span>Discount Amount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          ) : null}
        </div>
      </CollapseCard>

      <CollapseCard
        color="#2563eb"
        title="WHT"
        subtitle="Deduct withholding tax from payable amount"
        open={showWht}
        onToggle={() => setShowWht((current) => !current)}
      >
        <div className="space-y-3">
          <Segment
            value={whtType}
            onChange={onWhtTypeChange}
            options={[
              { value: 'percent', label: '%' },
              { value: 'fixed', label: 'NGN' },
            ]}
          />
          <Input
            type="number"
            min="0"
            value={whtValue}
            onChange={(event) => onWhtValueChange(Number(event.target.value))}
            className={inputCls}
          />
          {whtAmount > 0 ? (
            <div className="flex items-center justify-between rounded-[14px] border border-[#fee2e2] bg-[#fff1f2] px-3 py-2 text-[13px] font-bold text-[#be123c]">
              <span>WHT Amount</span>
              <span>-{formatCurrency(whtAmount)}</span>
            </div>
          ) : null}
          <div className="flex items-start gap-2 rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-3 text-[12px] text-[#64748b]">
            <Minus className="mt-0.5 h-4 w-4 shrink-0 text-[#94a3b8]" />
            WHT is deducted from the payable amount
          </div>
        </div>
      </CollapseCard>
    </div>
  )
}

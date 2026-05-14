import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Switch } from '@/components/ui/switch'
import { formatNaira } from '@/lib/formatters/money'
import { buildSummaryRows } from '@/domain/invoice/calculations'

const sectionLabelCls = 'mb-3 flex items-center gap-2 px-0.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--bd-text-muted))]'
const inputCls =
  'h-11 rounded-[12px] border-[1.5px] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-3 text-[14px] text-[hsl(var(--bd-text))] shadow-none transition placeholder:text-[hsl(var(--bd-text-muted))] focus:border-[hsl(var(--bd-button-primary-bg))] focus:bg-[hsl(var(--bd-card-bg))] focus:ring-0 focus-visible:ring-2 focus-visible:ring-[hsl(var(--bd-button-primary-bg))]/15'
const cardCls =
  'rounded-[20px] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] shadow-sm'

function getToneColor(tone: string) {
  if (tone === 'emerald') return 'hsl(var(--bd-emerald))'
  if (tone === 'amber') return 'hsl(var(--bd-amber))'
  if (tone === 'violet') return 'hsl(var(--bd-violet))'
  if (tone === 'indigo') return 'hsl(var(--bd-indigo))'
  return 'hsl(var(--bd-text-muted))'
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
          <div className="text-[14px] font-bold text-[hsl(var(--bd-text))]">{title}</div>
          <div className="mt-0.5 text-[11px] text-[hsl(var(--bd-text-muted))]">{subtitle}</div>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: getToneColor(color) }}
        >
          {open ? (
            <ChevronUp className="h-4 w-4 text-[hsl(var(--bd-card-bg))]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[hsl(var(--bd-card-bg))]" />
          )}
        </div>
      </button>

      {open ? <div className="border-t border-[hsl(var(--bd-border))] px-4 pb-4 pt-4">{children}</div> : null}
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
    <div className="flex gap-[3px] rounded-[12px] border-[1.5px] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] p-[3px]">
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-9 flex-1 rounded-[9px] text-[12px] font-extrabold transition ${
              active
                ? 'border border-[hsl(var(--bd-button-primary-bg))] bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))]'
                : 'border border-transparent text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface))] hover:text-[hsl(var(--bd-text))]'
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
      buildSummaryRows({
        invoice: { workmanship, transportation, shipping } as any,
        totals: { rawSubtotal, vatAmount, discountAmount, whtAmount, installRateTotal },
        customFields: { chargeLabels, discountTiming } as any,
        chargeLabels,
      }).map((row) => ({
        label: row.label,
        value: row.amount,
        negative: row.tone === 'danger',
      })),
    [
      chargeLabels,
      discountAmount,
      discountTiming,
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
        <SectionHeader color="emerald" label="Summary" />
        <div className={`${cardCls} p-4`}>
          <div className="space-y-3">
            {summaryRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 text-[14px]">
                <span className="text-[hsl(var(--bd-text-muted))]">{row.label}</span>
                <span className={`font-bold ${row.negative ? 'text-[hsl(var(--bd-status-danger-text))]' : 'text-[hsl(var(--bd-text))]'}`}>
                  {row.negative ? '-' : ''}
                  {formatNaira(Math.abs(Number(row.value || 0)))}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[18px] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-4 py-5 text-[hsl(var(--bd-text))]">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[hsl(var(--bd-text-muted))]">
              Total Payable
            </div>
            <div className="mt-2 text-[36px] font-black leading-none tracking-[-0.04em] text-[hsl(var(--bd-button-primary-bg))]">
              {formatNaira(totalPayable)}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[hsl(var(--bd-border))] pt-3 text-[12px] text-[hsl(var(--bd-text-muted))]">
              <span>Grand Total</span>
              <span>{formatNaira(grandTotal)}</span>
            </div>
            {amountInWords ? (
              <div className="mt-3 border-t border-[hsl(var(--bd-border))] pt-3 text-[12px] italic text-[hsl(var(--bd-text-muted))]">
                {amountInWords}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <SectionHeader color="amber" label="Adjustments" />
        <CollapseCard
          color="amber"
          title="Additional Charges"
          subtitle="Add taxable or non-taxable charges only when needed"
          open={showCharges}
          onToggle={() => setShowCharges((current) => !current)}
        >
          <div className="space-y-3">
            <div className="rounded-[14px] border border-dashed border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-3 py-3 text-[12px] leading-5 text-[hsl(var(--bd-text-muted))]">
              Add charges like workmanship, transportation, or shipping here instead of using dedicated rows.
            </div>

            <div className="pt-1">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[hsl(var(--bd-text-muted))]">
                  Extra Charges
                </div>
                <button
                  type="button"
                  onClick={() => onAddExtraCharge(true)}
                  className="inline-flex h-8 items-center gap-2 rounded-full border-[1.5px] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-[13px] text-[12px] font-bold text-[hsl(var(--bd-text))] transition hover:bg-[hsl(var(--bd-surface-muted))]"
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
                    <NumericInput
                      min={0}
                      value={charge.value || 0}
                      onChange={(val) => onUpdateExtraCharge(charge.id, 'value', val)}
                      className={`${inputCls} text-right`}
                    />
                    <div className="flex h-11 items-center justify-between rounded-[12px] border-[1.5px] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[hsl(var(--bd-text-muted))]">
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
                      className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]"
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
        color="violet"
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
          <NumericInput
            min={0}
            value={discountValue}
            onChange={(val) => onDiscountValueChange(val)}
            className={inputCls}
          />
          {discountAmount > 0 ? (
            <div className="flex items-center justify-between rounded-[14px] border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] px-3 py-2 text-[13px] font-bold text-[hsl(var(--bd-status-danger-text))]">
              <span>Discount Amount</span>
              <span>-{formatNaira(discountAmount)}</span>
            </div>
          ) : null}
        </div>
      </CollapseCard>

      <CollapseCard
        color="indigo"
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
          <NumericInput
            min={0}
            value={whtValue}
            onChange={(val) => onWhtValueChange(val)}
            className={inputCls}
          />
          {whtAmount > 0 ? (
            <div className="flex items-center justify-between rounded-[14px] border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] px-3 py-2 text-[13px] font-bold text-[hsl(var(--bd-status-danger-text))]">
              <span>WHT Amount</span>
              <span>-{formatNaira(whtAmount)}</span>
            </div>
          ) : null}
          <div className="flex items-start gap-2 rounded-[14px] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-3 py-3 text-[12px] text-[hsl(var(--bd-text-muted))]">
            <Minus className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--bd-text-muted))]" />
            WHT is deducted from the payable amount
          </div>
        </div>
      </CollapseCard>
    </div>
  )
}

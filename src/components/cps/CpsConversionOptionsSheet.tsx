import { useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { makeExtraCharge, normalizeExtraCharges } from '@/domain/invoice/factories'
import type { ExtraCharge } from '@/domain/invoice/types'
import { DEFAULT_CONVERSION_OPTIONS, type CpsConversionOptions } from '@/domain/cps/conversion'
import { cn } from '@/lib/utils'

export type { CpsConversionOptions }

interface CpsConversionOptionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: (options: CpsConversionOptions) => void
}

function toNumber(value: string): number {
  const numeric = Number(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0
}

export function CpsConversionOptionsSheet({ open, onOpenChange, onContinue }: CpsConversionOptionsSheetProps) {
  const [vatRate, setVatRate] = useState('0')
  const [discountValue, setDiscountValue] = useState('0')
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountTiming, setDiscountTiming] = useState<'before' | 'after'>('after')
  const [charges, setCharges] = useState<ExtraCharge[]>([])

  useEffect(() => {
    if (!open) return
    setVatRate(String(DEFAULT_CONVERSION_OPTIONS.vatRate))
    setDiscountValue(String(DEFAULT_CONVERSION_OPTIONS.discountValue))
    setDiscountType(DEFAULT_CONVERSION_OPTIONS.discountType)
    setDiscountTiming(DEFAULT_CONVERSION_OPTIONS.discountTiming)
    setCharges([])
  }, [open ])

  const updateCharge = (index: number, patch: Partial<ExtraCharge>) => {
    setCharges((current) => current.map((charge, chargeIndex) =>
      chargeIndex === index ? { ...charge, ...patch } : charge,
    ))
  }

  const removeCharge = (index: number) => {
    setCharges((current) => current.filter((_, chargeIndex) => chargeIndex !== index))
  }

  const handleContinue = () => {
    onContinue({
      vatRate: toNumber(vatRate),
      discountValue: toNumber(discountValue),
      discountType,
      discountTiming,
      extraCharges: normalizeExtraCharges(
        charges.filter((charge) => String(charge.label || '').trim() || Number(charge.value || 0) > 0),
      ),
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-auto max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border-t border-bd-border bg-bd-card-bg p-0 shadow-lg sm:mx-auto sm:max-w-md [&>[data-slot=sheet-close]]:hidden"
      >
        <div className="flex shrink-0 justify-center pb-1 pt-2.5">
          <div className="h-1 w-8 rounded-full bg-bd-surface-muted" />
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-black uppercase tracking-[0.08em] text-bd-text">
              Quotation options
            </h2>
            <p className="mt-0.5 text-xs text-bd-text-muted">
              VAT, discount, and extra charges for the new quotation only
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close quotation options"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-bd-border text-bd-text transition-colors hover:bg-bd-surface-muted active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-2">
          <section>
            <label
              htmlFor="cps-convert-vat"
              className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted"
            >
              VAT rate (%)
            </label>
            <Input
              id="cps-convert-vat"
              inputMode="decimal"
              value={vatRate}
              onChange={(event) => setVatRate(event.target.value)}
              className="h-11 rounded-xl bg-bd-surface font-mono text-base font-bold text-bd-text"
            />
          </section>

          <section>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">
              Discount
            </div>
            <div className="rounded-xl border border-bd-border bg-bd-surface p-3">
              <Input
                inputMode="decimal"
                aria-label="Discount value"
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
                className="h-11 rounded-xl bg-bd-card-bg font-mono text-base font-bold text-bd-text"
              />
              <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Discount type">
                {(['fixed', 'percent'] as const).map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setDiscountType(entry)}
                    aria-pressed={discountType === entry}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-[12px] font-extrabold uppercase tracking-[0.08em] transition-colors',
                      discountType === entry
                        ? 'border-bd-button-primary-bg bg-bd-button-primary-bg/10 text-bd-text'
                        : 'border-bd-border text-bd-text-muted',
                    )}
                  >
                    {entry === 'fixed' ? 'Fixed' : 'Percent'}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Discount timing">
                {(['before', 'after'] as const).map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setDiscountTiming(entry)}
                    aria-pressed={discountTiming === entry}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-[12px] font-extrabold uppercase tracking-[0.08em] transition-colors',
                      discountTiming === entry
                        ? 'border-bd-button-primary-bg bg-bd-button-primary-bg/10 text-bd-text'
                        : 'border-bd-border text-bd-text-muted',
                    )}
                  >
                    {entry === 'before' ? 'Before tax' : 'After tax'}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">
              Additional charges
            </div>
            <div className="overflow-hidden rounded-xl border border-bd-border bg-bd-surface">
              {charges.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-bd-text-muted">
                  No extra charges.
                </div>
              ) : (
                charges.map((charge, index) => (
                  <div
                    key={charge.id || index}
                    className="flex items-center gap-2 border-b border-bd-border/50 px-2 py-2 last:border-b-0"
                  >
                    <Input
                      value={String(charge.label || '')}
                      onChange={(event) => updateCharge(index, { label: event.target.value })}
                      placeholder="Label"
                      aria-label={`Charge ${index + 1} label`}
                      className="h-9 min-w-0 flex-1 rounded-lg border-transparent bg-transparent px-2 text-[13px] font-medium text-bd-text hover:border-bd-border focus:bg-bd-surface-muted focus:border-bd-border"
                    />
                    <Input
                      inputMode="decimal"
                      value={String(charge.value ?? '')}
                      onChange={(event) => updateCharge(index, { value: event.target.value })}
                      placeholder="0"
                      aria-label={`Charge ${index + 1} value`}
                      className="h-9 w-20 shrink-0 rounded-lg border-bd-border bg-bd-card-bg px-2 font-mono text-[13px] text-bd-text"
                    />
                    <Switch
                      size="sm"
                      checked={charge.withTax === true}
                      onCheckedChange={(next) => updateCharge(index, { withTax: next })}
                      aria-label={`Charge ${index + 1} taxable`}
                    />
                    <button
                      type="button"
                      onClick={() => removeCharge(index)}
                      aria-label={`Remove charge ${index + 1}`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-bd-text-muted transition-colors hover:bg-bd-status-danger-bg hover:text-bd-status-danger-text"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setCharges((current) => [...current, makeExtraCharge({})])}
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-semibold text-bd-button-primary-bg transition-colors hover:bg-bd-surface-muted"
            >
              <Plus size={12} /> Add charge
            </button>
          </section>
        </div>

        <div className="shrink-0 space-y-1 border-t border-bd-border bg-bd-card-bg px-4 py-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          <Button
            type="button"
            onClick={handleContinue}
            className="h-11 w-full rounded-xl text-[14px] font-black uppercase tracking-[0.06em]"
          >
            Continue
          </Button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full py-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-bd-text-muted transition-colors hover:text-bd-text"
          >
            Cancel
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

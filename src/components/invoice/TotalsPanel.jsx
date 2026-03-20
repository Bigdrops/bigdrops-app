import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

const labelCls = 'text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500'
const inputCls = 'h-10 rounded-2xl border-zinc-200 bg-white text-sm'

export default function TotalsPanel({
  rawSubtotal,
  installRateTotal,
  workmanship,
  transportation,
  shipping,
  chargeLabels,
  onChargeLabelChange,
  onWorkmanshipChange,
  onTransportationChange,
  onShippingChange,
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
  vatPercent,
  onVatPercentChange,
  vatAmount,
  whtValue,
  whtType,
  onWhtValueChange,
  onWhtTypeChange,
  whtAmount,
  grandTotal,
  totalPayable,
  amountInWords,
}) {
  const [showCharges, setShowCharges] = useState(true)

  const summaryRows = [
    { label: 'Subtotal', value: rawSubtotal },
    installRateTotal > 0 ? { label: 'Install Rate Total', value: installRateTotal } : null,
    vatAmount > 0 ? { label: 'VAT', value: vatAmount } : null,
    discountAmount > 0 ? { label: 'Discount', value: -discountAmount } : null,
    whtAmount > 0 ? { label: 'WHT', value: -whtAmount } : null,
  ].filter(Boolean)

  return (
    <div className="space-y-4">
      <Card className="rounded-[24px] border-zinc-200 bg-white shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Totals</h3>
            <p className="text-xs text-zinc-500">The saved values still come from the existing invoice calculation logic.</p>
          </div>

          <div className="space-y-1 rounded-[20px] border border-zinc-200 bg-zinc-50 p-3">
            {summaryRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-zinc-600">{row.label}</span>
                <span className={`font-semibold ${row.value < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                  {row.value < 0 ? '-' : ''}NGN {Math.abs(Number(row.value || 0)).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-[22px] bg-zinc-900 p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Total Payable</span>
              <span className="text-2xl font-bold text-emerald-400">NGN {Number(totalPayable || 0).toLocaleString()}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-zinc-700 pt-3 text-xs text-zinc-400">
              <span>Grand Total</span>
              <span>NGN {Number(grandTotal || 0).toLocaleString()}</span>
            </div>
            {amountInWords ? (
              <p className="mt-3 border-t border-zinc-700 pt-3 text-[11px] italic text-zinc-400">{amountInWords}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[24px] border-zinc-200 bg-white shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Tax & Discount Settings</h3>
            <p className="text-xs text-zinc-500">Charges, discount, VAT and WHT stay grouped in the lower summary flow.</p>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-zinc-200">
            <button
              type="button"
              onClick={() => setShowCharges((current) => !current)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Charges & Adjustments</span>
              {showCharges ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
            </button>

            {showCharges ? (
              <div className="space-y-3 border-t border-zinc-200 p-4">
                {[
                  ['workmanship', workmanship, onWorkmanshipChange],
                  ['transportation', transportation, onTransportationChange],
                  ['shipping', shipping, onShippingChange],
                ].map(([key, value, onChange]) => (
                  <div key={key} className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
                    <Input
                      value={chargeLabels[key]}
                      onChange={(e) => onChargeLabelChange(key, e.target.value)}
                      placeholder={key}
                      className={inputCls}
                    />
                    <Input
                      type="number"
                      min="0"
                      value={value}
                      onChange={(e) => onChange(Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                ))}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={labelCls}>Extra Charges</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl border-zinc-200 px-3 text-xs"
                        onClick={() => onAddExtraCharge(true)}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        With VAT
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl border-zinc-200 px-3 text-xs"
                        onClick={() => onAddExtraCharge(false)}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        No VAT
                      </Button>
                    </div>
                  </div>

                  {extraCharges.map((charge) => (
                    <div key={charge.id} className="grid grid-cols-[minmax(0,1fr)_92px_auto_auto] items-center gap-2">
                      <Input
                        value={charge.label || ''}
                        onChange={(e) => onUpdateExtraCharge(charge.id, 'label', e.target.value)}
                        placeholder="Charge label"
                        className={inputCls}
                      />
                      <Input
                        type="number"
                        min="0"
                        value={charge.value || 0}
                        onChange={(e) => onUpdateExtraCharge(charge.id, 'value', Number(e.target.value))}
                        className={inputCls}
                      />
                      <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 px-3 py-2">
                        <Switch
                          checked={charge.withTax !== false}
                          onCheckedChange={(value) => onUpdateExtraCharge(charge.id, 'withTax', value)}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">+ VAT</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => onRemoveExtraCharge(charge.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-[20px] border border-zinc-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className={labelCls}>Discount</span>
              <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-0.5">
                <button
                  type="button"
                  onClick={() => onDiscountTypeChange('percent')}
                  className={`rounded-[10px] px-3 py-1.5 text-[11px] font-medium ${discountType === 'percent' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => onDiscountTypeChange('fixed')}
                  className={`rounded-[10px] px-3 py-1.5 text-[11px] font-medium ${discountType === 'fixed' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
                >
                  NGN
                </button>
              </div>
            </div>

            <div className="mt-3 flex overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-0.5">
              <button
                type="button"
                onClick={() => onDiscountTimingChange('before')}
                className={`flex-1 rounded-[10px] px-3 py-2 text-[11px] font-medium ${discountTiming === 'before' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
              >
                Before Tax
              </button>
              <button
                type="button"
                onClick={() => onDiscountTimingChange('after')}
                className={`flex-1 rounded-[10px] px-3 py-2 text-[11px] font-medium ${discountTiming === 'after' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
              >
                After Tax
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <Input
                type="number"
                min="0"
                value={discountValue}
                onChange={(e) => onDiscountValueChange(Number(e.target.value))}
                className={inputCls}
              />
              {discountAmount > 0 ? <span className="text-xs text-red-600">-NGN {Number(discountAmount).toLocaleString()}</span> : null}
            </div>
          </div>

          <div className="rounded-[20px] border border-zinc-200 p-4">
            <label className={labelCls}>VAT %</label>
            <div className="mt-3 flex items-center gap-3">
              <Input
                type="number"
                min="0"
                max="100"
                value={vatPercent}
                onChange={(e) => onVatPercentChange(Number(e.target.value))}
                className={inputCls}
              />
              <span className="text-xs text-zinc-500">+NGN {Number(vatAmount || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-[20px] border border-zinc-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className={labelCls}>WHT</span>
              <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-0.5">
                <button
                  type="button"
                  onClick={() => onWhtTypeChange('percent')}
                  className={`rounded-[10px] px-3 py-1.5 text-[11px] font-medium ${whtType === 'percent' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => onWhtTypeChange('fixed')}
                  className={`rounded-[10px] px-3 py-1.5 text-[11px] font-medium ${whtType === 'fixed' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
                >
                  NGN
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Input
                type="number"
                min="0"
                value={whtValue}
                onChange={(e) => onWhtValueChange(Number(e.target.value))}
                className={inputCls}
              />
              {whtAmount > 0 ? <span className="text-xs text-zinc-500">-NGN {Number(whtAmount).toLocaleString()}</span> : null}
            </div>
            <p className="mt-2 text-[10px] text-zinc-400">WHT is deducted from the payable amount, not added to the total.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

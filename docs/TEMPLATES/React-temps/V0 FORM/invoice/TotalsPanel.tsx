"use client"

import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import type { ExtraCharge, DiscountType, WhtType } from "@/lib/invoice-types"

interface TotalsPanelProps {
  rawSubtotal: number
  installRateTotal: number
  workmanship: number
  transportation: number
  shipping: number
  onWorkmanshipChange: (v: number) => void
  onTransportationChange: (v: number) => void
  onShippingChange: (v: number) => void
  extraCharges: ExtraCharge[]
  onAddExtraCharge: () => void
  onUpdateExtraCharge: (id: string, field: keyof ExtraCharge, value: unknown) => void
  onRemoveExtraCharge: (id: string) => void
  discountValue: number
  discountType: DiscountType
  onDiscountValueChange: (v: number) => void
  onDiscountTypeChange: (t: DiscountType) => void
  discountAmount: number
  vatPercent: number
  onVatPercentChange: (v: number) => void
  vatAmount: number
  whtValue: number
  whtType: WhtType
  onWhtValueChange: (v: number) => void
  onWhtTypeChange: (t: WhtType) => void
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
  onWorkmanshipChange,
  onTransportationChange,
  onShippingChange,
  extraCharges,
  onAddExtraCharge,
  onUpdateExtraCharge,
  onRemoveExtraCharge,
  discountValue,
  discountType,
  onDiscountValueChange,
  onDiscountTypeChange,
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
}: TotalsPanelProps) {
  const [showCharges, setShowCharges] = useState(false)

  const labelCls = "text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
  const inputCls = "h-9 rounded-xl border-zinc-200 bg-white text-sm"
  const rowCls = "flex items-center justify-between py-2"

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border-zinc-200 bg-white">
        <CardContent className="space-y-4 p-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Totals</h3>
            <p className="text-xs text-zinc-500">
              Quotation-style summary with the payable amount emphasized.
            </p>
          </div>

          <div className="space-y-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className={rowCls}>
              <span className="text-xs text-zinc-600">Subtotal</span>
              <span className="text-sm font-semibold text-zinc-900">
                N{rawSubtotal.toLocaleString()}
              </span>
            </div>
            {installRateTotal > 0 && (
              <div className={rowCls}>
                <span className="text-xs text-zinc-600">Install Rate</span>
                <span className="text-sm font-semibold text-zinc-900">
                  N{installRateTotal.toLocaleString()}
                </span>
              </div>
            )}
            <div className={rowCls}>
              <span className="text-xs text-zinc-600">VAT</span>
              <span className="text-sm font-semibold text-zinc-900">
                N{vatAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-900 p-4 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Total Payable</span>
              <span className="text-2xl font-bold text-emerald-400">
                N{totalPayable.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-zinc-700 pt-2 text-xs text-zinc-400">
              <span>Grand Total</span>
              <span>N{grandTotal.toLocaleString()}</span>
            </div>
            {amountInWords && (
              <p className="mt-3 border-t border-zinc-700 pt-3 text-[11px] italic text-zinc-400">
                {amountInWords}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200 bg-white">
        <CardContent className="space-y-4 p-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Tax & Discount Settings</h3>
            <p className="text-xs text-zinc-500">
              All adjustments stay grouped here without changing the invoice calculations.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
              onClick={() => setShowCharges(!showCharges)}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Charges & Adjustments
              </span>
              {showCharges ? (
                <ChevronUp className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            {showCharges && (
              <div className="space-y-3 border-t border-zinc-200 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelCls}>Workmanship</label>
                    <Input
                      type="number"
                      min={0}
                      value={workmanship}
                      onChange={(e) => onWorkmanshipChange(Number(e.target.value))}
                      className={`mt-1 ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Transport</label>
                    <Input
                      type="number"
                      min={0}
                      value={transportation}
                      onChange={(e) => onTransportationChange(Number(e.target.value))}
                      className={`mt-1 ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Shipping</label>
                    <Input
                      type="number"
                      min={0}
                      value={shipping}
                      onChange={(e) => onShippingChange(Number(e.target.value))}
                      className={`mt-1 ${inputCls}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={labelCls}>Custom Charges</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onAddExtraCharge}
                      className="h-7 gap-1 px-2 text-xs text-zinc-600"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>

                  {extraCharges.map((charge) => (
                    <div key={charge.id} className="flex items-center gap-2">
                      <Input
                        value={charge.label}
                        onChange={(e) => onUpdateExtraCharge(charge.id, "label", e.target.value)}
                        placeholder="Label"
                        className={`flex-1 ${inputCls}`}
                      />
                      <Input
                        type="number"
                        min={0}
                        value={charge.value}
                        onChange={(e) => onUpdateExtraCharge(charge.id, "value", Number(e.target.value))}
                        placeholder="0"
                        className={`w-24 ${inputCls}`}
                      />
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={charge.withTax}
                          onCheckedChange={(v) => onUpdateExtraCharge(charge.id, "withTax", v)}
                          className="scale-75"
                        />
                        <span className="text-[9px] text-zinc-400">+VAT</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveExtraCharge(charge.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-200 p-3">
            <div className="flex items-center justify-between">
              <span className={labelCls}>Discount</span>
              <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
                <button
                  type="button"
                  onClick={() => onDiscountTypeChange("percent")}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${
                    discountType === "percent" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => onDiscountTypeChange("fixed")}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${
                    discountType === "fixed" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                  }`}
                >
                  N
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={discountValue}
                onChange={(e) => onDiscountValueChange(Number(e.target.value))}
                placeholder="0"
                className={inputCls}
              />
              {discountAmount > 0 && (
                <span className="text-xs text-red-600">-N{discountAmount.toLocaleString()}</span>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-200 p-3">
            <label className={labelCls}>VAT %</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                value={vatPercent}
                onChange={(e) => onVatPercentChange(Number(e.target.value))}
                className={inputCls}
              />
              <span className="text-xs text-zinc-600">+N{vatAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-200 p-3">
            <div className="flex items-center justify-between">
              <span className={labelCls}>WHT (Withholding Tax)</span>
              <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
                <button
                  type="button"
                  onClick={() => onWhtTypeChange("percent")}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${
                    whtType === "percent" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => onWhtTypeChange("fixed")}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${
                    whtType === "fixed" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                  }`}
                >
                  N
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={whtValue}
                onChange={(e) => onWhtValueChange(Number(e.target.value))}
                placeholder="0"
                className={inputCls}
              />
              {whtAmount > 0 && (
                <span className="text-xs text-zinc-500">-N{whtAmount.toLocaleString()}</span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400">
              WHT is deducted from payable, not added to total.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

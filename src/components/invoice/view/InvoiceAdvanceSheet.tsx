import { type Dispatch, type SetStateAction } from 'react'

import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import {
  ADVANCE_PRIMARY_LABEL_DEFAULT,
  ADVANCE_SECONDARY_LABEL_DEFAULT,
  ADVANCE_SUFFIX_DEFAULT,
} from '@/domain/invoice/advanceChildFlow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { parseCustomFields } from '@/domain/invoice'

type AdvanceMode = 'percent' | 'fixed'
type AdvanceSheetMode = 'create' | 'edit' | 'view'

interface AdvanceInvoiceSummary {
  id?: string | null
  invoice_number?: string | null
  total?: number | string | null
  custom_fields?: any | null
}

interface InvoiceAdvanceSheetProps {
  open: boolean
  onOpenChange: (nextOpen: boolean) => void
  invoiceNumber?: string | null
  contractValue: number
  formatMoney: (value: number | string | null | undefined) => string
  advanceSheetMode: AdvanceSheetMode
  advanceInvoice: AdvanceInvoiceSummary | null
  advanceSaving: boolean
  advancePdfGenerating: boolean
  advanceMode: AdvanceMode
  setAdvanceMode: Dispatch<SetStateAction<AdvanceMode>>
  advanceInputValue: string
  setAdvanceInputValue: Dispatch<SetStateAction<string>>
  advanceSuffixValue: string
  setAdvanceSuffixValue: Dispatch<SetStateAction<string>>
  advancePrimaryLabel: string
  setAdvancePrimaryLabel: Dispatch<SetStateAction<string>>
  advanceSecondaryLabel: string
  setAdvanceSecondaryLabel: Dispatch<SetStateAction<string>>
  advanceAmount: number
  balanceRemaining: number
  onSave: () => void
  onDownloadPdf: () => void
  onEdit: () => void
  onRequestDelete: () => void
  deleteConfirmOpen: boolean
  onDeleteConfirmOpenChange: (open: boolean) => void
  onDeleteConfirm: () => void
}

export default function InvoiceAdvanceSheet({
  open,
  onOpenChange,
  invoiceNumber,
  contractValue,
  formatMoney,
  advanceSheetMode,
  advanceInvoice,
  advanceSaving,
  advancePdfGenerating,
  advanceMode,
  setAdvanceMode,
  advanceInputValue,
  setAdvanceInputValue,
  advanceSuffixValue,
  setAdvanceSuffixValue,
  advancePrimaryLabel,
  setAdvancePrimaryLabel,
  advanceSecondaryLabel,
  setAdvanceSecondaryLabel,
  advanceAmount,
  balanceRemaining,
  onSave,
  onDownloadPdf,
  onEdit,
  onRequestDelete,
  deleteConfirmOpen,
  onDeleteConfirmOpenChange,
  onDeleteConfirm,
}: InvoiceAdvanceSheetProps) {
  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (advanceSaving || advancePdfGenerating) return
          onOpenChange(nextOpen)
        }}
      >
        <SheetContent side="bottom" className="h-[75vh] max-h-[90vh] overflow-hidden rounded-t-[32px] border-t-0 bg-[#fafaf9] p-0 shadow-[0_-12px_44px_-10px_rgba(0,0,0,0.15)] [&>[data-slot=sheet-close]]:hidden">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-[#e7e5e4] bg-[#f5f5f4]/60 px-6 pb-5 pt-6 text-left backdrop-blur-md">
              <SheetTitle className="text-lg font-black tracking-tight text-slate-900">
                {advanceSheetMode === 'edit'
                  ? 'Edit Advance Invoice'
                  : advanceInvoice && advanceSheetMode === 'view'
                    ? 'Advance Invoice Details'
                    : 'Create Advance Invoice'}
              </SheetTitle>
              <SheetDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Child invoice for {invoiceNumber || '—'}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="rounded-[28px] border border-[#e7e5e4] bg-[#f5f5f4] p-5 shadow-sm">
                <div className="grid grid-cols-2 gap-8">
                  <MetricBlock label="Parent Invoice" value={invoiceNumber || '—'} />
                  <MetricBlock label="Contract Value" value={formatMoney(contractValue)} />
                </div>
              </div>

              {advanceSheetMode === 'view' && advanceInvoice ? (() => {
                const cf = parseCustomFields(advanceInvoice.custom_fields)
                const advConfig = cf.advance_invoice
                const pLabel = advConfig?.primaryLabel || ADVANCE_PRIMARY_LABEL_DEFAULT
                const sLabel = advConfig?.secondaryLabel || ADVANCE_SECONDARY_LABEL_DEFAULT
                const advTotal = Number(advanceInvoice.total || 0)
                const advPercent = contractValue > 0 ? Math.round((advTotal / contractValue) * 100) : 0

                return (
                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-slate-200/60 bg-white p-5 shadow-sm">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Advance Invoice</div>
                      <div className="mt-1.5 flex items-baseline justify-between">
                        <div className="text-lg font-extrabold tracking-tight text-slate-900">{advanceInvoice.invoice_number || 'Advance Invoice'}</div>
                        <div className="text-xl font-black text-slate-950">{formatMoney(advTotal)}</div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[32px] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/40">
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Contract Value</div>
                          <div className="text-sm font-bold text-slate-400">{formatMoney(contractValue)}</div>
                        </div>
                        
                        <div className="h-px bg-white/5" />

                        <div className="flex flex-col">
                          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500">
                            {pLabel} · {advPercent}%
                          </div>
                          <div className="mt-2 text-[2.4rem] font-black leading-none tracking-[-0.04em]">{formatMoney(advTotal)}</div>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between rounded-2xl bg-white/5 p-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                            {sLabel}
                          </div>
                          <div className="text-base font-extrabold text-white">{formatMoney(Math.max(0, contractValue - advTotal))}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })() : (
                <>
                  <div className="rounded-[28px] border border-slate-200/60 bg-white p-6 shadow-sm">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Advance Invoice Setup</div>
                    
                    <div className="mt-5 space-y-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Advance Type</Label>
                        <div className="flex w-full gap-1 rounded-2xl bg-slate-100 p-1.5">
                          <button
                            type="button"
                            onClick={() => setAdvanceMode('percent')}
                            className={`flex-1 rounded-xl py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                              advanceMode === 'percent' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Percent
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdvanceMode('fixed')}
                            className={`flex-1 rounded-xl py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                              advanceMode === 'fixed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Fixed
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2.5">
                          <Label htmlFor="advance-value" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                            {advanceMode === 'fixed' ? 'Advance Amount' : 'Advance Percentage'}
                          </Label>
                          <Input
                            id="advance-value"
                            type="number"
                            min="0"
                            max={advanceMode === 'fixed' ? String(contractValue) : '100'}
                            step={advanceMode === 'fixed' ? '0.01' : '1'}
                            inputMode="decimal"
                            value={advanceInputValue}
                            onChange={(event) => setAdvanceInputValue(event.target.value)}
                            disabled={advanceSaving}
                            className="h-14 rounded-[18px] border-slate-200 bg-slate-50 text-base font-bold shadow-none ring-offset-0 focus:border-slate-400 focus:bg-white focus:ring-0"
                          />
                        </div>
                        <div className="space-y-2.5">
                          <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Invoice Suffix</Label>
                          <div className="flex items-center gap-3">
                            <div className="flex h-14 flex-1 items-center rounded-[18px] bg-slate-100 px-4 text-sm font-bold text-slate-400">
                              {invoiceNumber || 'INV-000'} <span className="mx-2 text-slate-300">-</span>
                            </div>
                            <Input
                              id="advance-suffix"
                              type="text"
                              placeholder={ADVANCE_SUFFIX_DEFAULT}
                              value={advanceSuffixValue}
                              onChange={(event) => setAdvanceSuffixValue(event.target.value)}
                              disabled={advanceSaving}
                              className="h-14 w-20 rounded-[18px] border-slate-200 bg-slate-50 text-center text-lg font-black shadow-none ring-offset-0 focus:border-slate-400 focus:bg-white focus:ring-0"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2.5">
                          <Label htmlFor="primary-label" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Primary Label</Label>
                          <Input
                            id="primary-label"
                            placeholder={ADVANCE_PRIMARY_LABEL_DEFAULT}
                            value={advancePrimaryLabel}
                            onChange={(e) => setAdvancePrimaryLabel(e.target.value)}
                            disabled={advanceSaving}
                            className="h-12 rounded-xl border-slate-200 bg-slate-50 text-sm font-semibold shadow-none ring-offset-0 focus:border-slate-400 focus:bg-white focus:ring-0"
                          />
                        </div>
                        <div className="space-y-2.5">
                          <Label htmlFor="secondary-label" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Secondary Label</Label>
                          <Input
                            id="secondary-label"
                            placeholder={ADVANCE_SECONDARY_LABEL_DEFAULT}
                            value={advanceSecondaryLabel}
                            onChange={(e) => setAdvanceSecondaryLabel(e.target.value)}
                            disabled={advanceSaving}
                            className="h-12 rounded-xl border-slate-200 bg-slate-50 text-sm font-semibold shadow-none ring-offset-0 focus:border-slate-400 focus:bg-white focus:ring-0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[32px] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/40">
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Contract Value</div>
                        <div className="text-sm font-bold text-slate-400">{formatMoney(contractValue)}</div>
                      </div>
                      
                      <div className="h-px bg-white/5" />
                      
                      <div className="flex flex-col">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500">
                          {(advancePrimaryLabel || 'Advance due now') + ` · ${Math.round((advanceAmount / contractValue) * 100)}%`}
                        </div>
                        <div className="mt-2 text-[2.4rem] font-black leading-none tracking-[-0.04em]">{formatMoney(advanceAmount)}</div>
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between rounded-2xl bg-white/5 p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                          {advanceSecondaryLabel || 'Balance after advance'}
                        </div>
                        <div className="text-base font-extrabold text-white">{formatMoney(balanceRemaining)}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-[#e7e5e4] bg-[#f5f5f4]/80 px-6 py-5 backdrop-blur-md">
              {advanceSheetMode === 'view' && advanceInvoice ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onRequestDelete}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="h-12 rounded-2xl font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Delete Advance Invoice
                  </Button>
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onDownloadPdf}
                      disabled={advanceSaving || advancePdfGenerating}
                      className="h-12 rounded-2xl border-[#d6d3d1] bg-white font-bold text-slate-600 shadow-sm"
                    >
                      {advancePdfGenerating ? 'Preparing...' : 'Download PDF'}
                    </Button>
                    <Button
                      type="button"
                      onClick={onEdit}
                      disabled={advanceSaving || advancePdfGenerating}
                      className="h-12 rounded-2xl bg-slate-950 font-black uppercase tracking-widest text-white shadow-lg hover:bg-slate-800"
                    >
                      Edit Advance Invoice
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      onOpenChange(false)
                    }}
                    disabled={advanceSaving}
                    className="h-12 rounded-2xl font-bold text-slate-500"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={onSave}
                    disabled={advanceSaving}
                    className="h-12 flex-1 rounded-2xl bg-slate-950 font-black uppercase tracking-widest text-white shadow-lg hover:bg-slate-800 sm:flex-none sm:px-10"
                  >
                    {advanceSaving
                      ? advanceSheetMode === 'edit' ? 'Saving...' : 'Creating...'
                      : advanceSheetMode === 'edit' ? 'Save Advance Invoice' : 'Create Advance Invoice'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmActionDialog
        open={deleteConfirmOpen}
        onOpenChange={onDeleteConfirmOpenChange}
        title="Delete Advance Invoice?"
        description="This will delete the selected advance child invoice. The parent invoice will remain unchanged."
        confirmLabel="Delete Advance Invoice"
        onConfirm={onDeleteConfirm}
      />
    </>
  )
}

interface MetricBlockProps {
  label: string
  value: string
  subtle?: boolean
}

function MetricBlock({ label, value }: MetricBlockProps) {
  return (
    <div>
      <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</div>
      <div className="mt-2 font-mono text-[16px] font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  )
}

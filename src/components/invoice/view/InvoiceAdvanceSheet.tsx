import { type Dispatch, type SetStateAction } from 'react'

import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { parseCustomFields } from '@/domain/invoice'
import {
  ADVANCE_PRIMARY_LABEL_DEFAULT,
  ADVANCE_SECONDARY_LABEL_DEFAULT,
  ADVANCE_SUFFIX_DEFAULT,
} from '@/domain/invoice/advanceChildFlow'

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
  const isViewMode = advanceSheetMode === 'view' && Boolean(advanceInvoice)
  const advanceConfig = (
    advanceInvoice ? parseCustomFields(advanceInvoice.custom_fields)?.advance_invoice : null
  ) as {
    primaryLabel?: string
    secondaryLabel?: string
    suffix?: string
  } | null
  const activePrimaryLabel = isViewMode
    ? String(advanceConfig?.primaryLabel || ADVANCE_PRIMARY_LABEL_DEFAULT)
    : String(advancePrimaryLabel || ADVANCE_PRIMARY_LABEL_DEFAULT)
  const activeSecondaryLabel = isViewMode
    ? String(advanceConfig?.secondaryLabel || ADVANCE_SECONDARY_LABEL_DEFAULT)
    : String(advanceSecondaryLabel || ADVANCE_SECONDARY_LABEL_DEFAULT)
  const activeTotal = isViewMode ? Number(advanceInvoice?.total || 0) : advanceAmount
  const activePercent = contractValue > 0 ? Math.round((activeTotal / contractValue) * 100) : 0
  const activeBalance = isViewMode ? Math.max(0, contractValue - activeTotal) : balanceRemaining

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (advanceSaving || advancePdfGenerating) return
          onOpenChange(nextOpen)
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[calc(100vh-16px)] overflow-hidden rounded-t-[28px] border-t-0 bg-[#fafaf9] p-0 shadow-[0_-12px_44px_-10px_rgba(0,0,0,0.15)] [&>[data-slot=sheet-close]]:hidden"
        >
          <div className="flex flex-col">
            <SheetHeader className="border-b border-[#e7e5e4] bg-[#f5f5f4]/70 px-6 pb-4 pt-5 text-left">
              <SheetTitle className="text-lg font-black tracking-tight text-slate-900">
                Advance Invoice
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-4 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <CompactField label="Parent Invoice" value={invoiceNumber || '—'} />
                <CompactField
                  label="Invoice Suffix"
                  value={`${invoiceNumber || 'INV-000'}-${(isViewMode ? advanceConfig?.suffix : advanceSuffixValue) || ADVANCE_SUFFIX_DEFAULT}`}
                />
              </div>

              {isViewMode ? (
                <div className="rounded-[24px] border border-[#e7e5e4] bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-base font-black tracking-tight text-slate-900">
                        {advanceInvoice?.invoice_number || 'Advance Invoice'}
                      </div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {activePrimaryLabel} · {activePercent}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Total</div>
                      <div className="mt-1 text-xl font-black text-slate-950">{formatMoney(activeTotal)}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-semibold text-slate-600">{activeSecondaryLabel}</span>
                      <span className="font-black text-slate-900">{formatMoney(activeBalance)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 rounded-[24px] border border-[#e7e5e4] bg-white p-5 shadow-sm">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Advance Type</Label>
                    <div className="flex gap-1 rounded-2xl bg-slate-100 p-1.5">
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="advance-value" className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        {advanceMode === 'fixed' ? 'Amount' : 'Percentage'}
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
                        className="h-12 rounded-[16px] border-slate-200 bg-slate-50 text-base font-bold shadow-none ring-offset-0 focus:border-slate-400 focus:bg-white focus:ring-0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="advance-suffix" className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Invoice Suffix
                      </Label>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 flex-1 items-center rounded-[16px] bg-slate-100 px-4 text-sm font-bold text-slate-400">
                          {invoiceNumber || 'INV-000'}
                          <span className="mx-2 text-slate-300">-</span>
                        </div>
                        <Input
                          id="advance-suffix"
                          type="text"
                          placeholder={ADVANCE_SUFFIX_DEFAULT}
                          value={advanceSuffixValue}
                          onChange={(event) => setAdvanceSuffixValue(event.target.value)}
                          disabled={advanceSaving}
                          className="h-12 w-20 rounded-[16px] border-slate-200 bg-slate-50 text-center text-lg font-black shadow-none ring-offset-0 focus:border-slate-400 focus:bg-white focus:ring-0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="primary-label" className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Primary Label
                      </Label>
                      <Input
                        id="primary-label"
                        placeholder={ADVANCE_PRIMARY_LABEL_DEFAULT}
                        value={advancePrimaryLabel}
                        onChange={(event) => setAdvancePrimaryLabel(event.target.value)}
                        disabled={advanceSaving}
                        className="h-12 rounded-[16px] border-slate-200 bg-slate-50 text-sm font-semibold shadow-none ring-offset-0 focus:border-slate-400 focus:bg-white focus:ring-0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondary-label" className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Secondary Label
                      </Label>
                      <Input
                        id="secondary-label"
                        placeholder={ADVANCE_SECONDARY_LABEL_DEFAULT}
                        value={advanceSecondaryLabel}
                        onChange={(event) => setAdvanceSecondaryLabel(event.target.value)}
                        disabled={advanceSaving}
                        className="h-12 rounded-[16px] border-slate-200 bg-slate-50 text-sm font-semibold shadow-none ring-offset-0 focus:border-slate-400 focus:bg-white focus:ring-0"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-stone-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-semibold text-slate-600">
                        {activePrimaryLabel} · {activePercent}%
                      </span>
                      <span className="font-black text-slate-900">{formatMoney(activeTotal)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-4 border-t border-stone-200 pt-3 text-sm">
                      <span className="font-semibold text-slate-600">{activeSecondaryLabel}</span>
                      <span className="font-black text-slate-900">{formatMoney(activeBalance)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-4 border-t border-stone-200 pt-3 text-sm">
                      <span className="font-semibold text-slate-600">Total</span>
                      <span className="font-black text-slate-950">{formatMoney(activeTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#e7e5e4] bg-[#f5f5f4]/80 px-6 py-5">
              {isViewMode ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onDownloadPdf}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="h-12 rounded-2xl border-[#d6d3d1] bg-white font-bold text-slate-700 shadow-sm"
                  >
                    {advancePdfGenerating ? 'Preparing...' : 'Download'}
                  </Button>
                  <Button
                    type="button"
                    onClick={onEdit}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="h-12 rounded-2xl bg-slate-950 font-black uppercase tracking-widest text-white shadow-lg hover:bg-slate-800"
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onRequestDelete}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="h-12 rounded-2xl font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
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

interface CompactFieldProps {
  label: string
  value: string
}

function CompactField({ label, value }: CompactFieldProps) {
  return (
    <div className="rounded-2xl border border-[#e7e5e4] bg-[#f5f5f4] px-4 py-3 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-1.5 truncate font-mono text-[15px] font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  )
}

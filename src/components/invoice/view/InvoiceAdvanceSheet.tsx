import { type Dispatch, type SetStateAction } from 'react'

import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type AdvanceMode = 'percent' | 'fixed'
type AdvanceSheetMode = 'create' | 'edit' | 'view'

interface AdvanceInvoiceSummary {
  invoice_number?: string | null
  total?: number | string | null
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
        <SheetContent side="bottom" className="max-h-[92vh] rounded-t-[28px] bg-card p-0 [&>[data-slot=sheet-close]]:hidden">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border px-5 pb-4 pt-5 text-left">
              <SheetTitle className="text-base font-semibold text-foreground">
                {advanceSheetMode === 'edit'
                  ? 'Edit Advance'
                  : advanceInvoice && advanceSheetMode === 'view'
                    ? 'View Advance'
                    : 'Create Advance'}
              </SheetTitle>
              <SheetDescription>
                For {invoiceNumber || 'this invoice'}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricBlock label="Invoice No" value={invoiceNumber || 'Invoice'} subtle />
                  <MetricBlock label="Contract Value" value={formatMoney(contractValue)} subtle />
                </div>
              </div>

              {advanceSheetMode === 'view' && advanceInvoice ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Advance Invoice</div>
                    <div className="mt-1 text-sm font-bold text-foreground">{advanceInvoice.invoice_number || 'Advance Invoice'}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{formatMoney(advanceInvoice.total || 0)}</div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-950 px-6 py-6 text-white shadow-xl">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Advance Payable Now</div>
                        <div className="mt-1 text-3xl font-black tracking-tight">{formatMoney(Number(advanceInvoice.total || 0))}</div>
                      </div>
                      <div className="h-px bg-white/10" />
                      <div className="flex items-center justify-between opacity-70">
                        <div className="text-[11px] font-bold uppercase tracking-[0.1em]">Remaining Balance upon completion</div>
                        <div className="text-sm font-bold">{formatMoney(Math.max(0, contractValue - Number(advanceInvoice.total || 0)))}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Mode</div>
                    <div className="inline-flex rounded-full border border-border bg-muted/30 p-1">
                      <button
                        type="button"
                        onClick={() => setAdvanceMode('percent')}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                          advanceMode === 'percent' ? 'bg-slate-950 text-white' : 'text-slate-600'
                        }`}
                      >
                        Percent
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdvanceMode('fixed')}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                          advanceMode === 'fixed' ? 'bg-slate-950 text-white' : 'text-slate-600'
                        }`}
                      >
                        Fixed
                      </button>
                    </div>
                  </div>

                   <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="advance-value">
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
                        className="h-12 rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice Numbering</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex h-12 flex-1 items-center rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-500">
                          {invoiceNumber || 'INV-000'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl font-bold text-slate-400">-</span>
                          <Input
                            id="advance-suffix"
                            type="text"
                            placeholder="e.g. A"
                            value={advanceSuffixValue}
                            onChange={(event) => setAdvanceSuffixValue(event.target.value)}
                            disabled={advanceSaving}
                            className="h-12 w-20 rounded-2xl text-center font-black"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-950 px-6 py-6 text-white shadow-xl">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col">
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Advance Payable Now</div>
                        <div className="mt-1 text-3xl font-black tracking-tight">{formatMoney(advanceAmount)}</div>
                      </div>
                      <div className="h-px bg-white/10" />
                      <div className="flex items-center justify-between opacity-70">
                        <div className="text-[11px] font-bold uppercase tracking-[0.1em]">Remaining Balance upon completion</div>
                        <div className="text-sm font-bold">{formatMoney(balanceRemaining)}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-border bg-card px-5 py-4">
              {advanceSheetMode === 'view' && advanceInvoice ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onRequestDelete}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Remove
                  </Button>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onDownloadPdf}
                      disabled={advanceSaving || advancePdfGenerating}
                    >
                      {advancePdfGenerating ? 'Preparing...' : 'Download PDF'}
                    </Button>
                    <Button
                      type="button"
                      onClick={onEdit}
                      disabled={advanceSaving || advancePdfGenerating}
                      className="bg-slate-950 text-white hover:bg-slate-800"
                    >
                      Edit Advance
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false)
                    }}
                    disabled={advanceSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={onSave}
                    disabled={advanceSaving}
                    className="bg-slate-950 text-white hover:bg-slate-800"
                  >
                    {advanceSaving
                      ? advanceSheetMode === 'edit' ? 'Saving...' : 'Creating...'
                      : advanceSheetMode === 'edit' ? 'Save Advance' : 'Create Advance'}
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
        title="Remove Advance?"
        description="This will clear the advance configuration from this invoice. Any legacy advance child rows will also be removed."
        confirmLabel="Remove Advance"
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

function MetricBlock({ label, value, subtle = false }: MetricBlockProps) {
  return (
    <div>
      <div className={`text-[11px] font-bold uppercase tracking-[0.16em] ${subtle ? 'text-muted-foreground' : 'text-slate-400'}`}>{label}</div>
      <div className="mt-1 text-sm font-bold text-foreground sm:text-base sm:font-extrabold">{value}</div>
    </div>
  )
}

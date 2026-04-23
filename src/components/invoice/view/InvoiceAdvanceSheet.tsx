import { type Dispatch, type SetStateAction } from 'react'

import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
  onSave,
  onDownloadPdf,
  onEdit,
  onRequestDelete,
  deleteConfirmOpen,
  onDeleteConfirmOpenChange,
  onDeleteConfirm,
}: InvoiceAdvanceSheetProps) {
  const isViewMode = advanceSheetMode === 'view' && Boolean(advanceInvoice)

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
          className="max-h-[75vh] overflow-y-auto rounded-t-[28px] border-t-0 bg-[#fafaf9] p-0 shadow-[0_-12px_44px_-10px_rgba(0,0,0,0.15)] [&>[data-slot=sheet-close]]:hidden"
        >
          <div className="flex flex-col">
            <SheetHeader className="border-b border-[#e7e5e4] bg-[#f5f5f4]/70 px-6 pb-3 pt-4 text-left">
              <SheetTitle className="text-base font-black tracking-tight text-slate-900">
                Advance Invoice
              </SheetTitle>
            </SheetHeader>

            <div className="px-6 py-4">
              <div className="mb-4 space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Invoice Number</Label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 pr-3 shadow-sm focus-within:border-slate-400 transition-colors">
                  <div className="flex h-8 items-center rounded-lg bg-slate-50 px-3 text-[12px] font-black tracking-tight text-slate-400 select-none">
                    {invoiceNumber || 'INV-000'}
                  </div>
                  <div className="h-4 w-[1px] bg-slate-200" />
                  <div className="relative flex-1">
                    <Input
                      id="advance-suffix"
                      type="text"
                      placeholder={ADVANCE_SUFFIX_DEFAULT}
                      value={advanceSuffixValue}
                      onChange={(event) => setAdvanceSuffixValue(event.target.value.toUpperCase())}
                      disabled={isViewMode || advanceSaving}
                      className="h-8 w-full border-none bg-transparent px-0 text-center font-mono text-sm font-black text-slate-900 shadow-none ring-0 ring-offset-0 focus:ring-0 focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Advance Type</Label>
                  <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      disabled={isViewMode || advanceSaving}
                      onClick={() => setAdvanceMode('percent')}
                      className={`flex-1 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                        advanceMode === 'percent' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      } disabled:opacity-50`}
                    >
                      Percent
                    </button>
                    <button
                      type="button"
                      disabled={isViewMode || advanceSaving}
                      onClick={() => setAdvanceMode('fixed')}
                      className={`flex-1 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                        advanceMode === 'fixed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      } disabled:opacity-50`}
                    >
                      Fixed
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="advance-value" className="text-[10px] font-black uppercase tracking-widest text-slate-500">
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
                    disabled={isViewMode || advanceSaving}
                    className="h-10 rounded-xl border-slate-200 bg-white text-sm font-bold shadow-none ring-offset-0 focus:border-slate-400 focus:ring-0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="primary-label" className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Primary Label
                    </Label>
                    <Input
                      id="primary-label"
                      placeholder={ADVANCE_PRIMARY_LABEL_DEFAULT}
                      value={advancePrimaryLabel}
                      onChange={(event) => setAdvancePrimaryLabel(event.target.value)}
                      disabled={isViewMode || advanceSaving}
                      className="h-10 rounded-xl border-slate-200 bg-white text-[11px] font-semibold shadow-none ring-offset-0 focus:border-slate-400 focus:ring-0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="secondary-label" className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Secondary Label
                    </Label>
                    <Input
                      id="secondary-label"
                      placeholder={ADVANCE_SECONDARY_LABEL_DEFAULT}
                      value={advanceSecondaryLabel}
                      onChange={(event) => setAdvanceSecondaryLabel(event.target.value)}
                      disabled={isViewMode || advanceSaving}
                      className="h-10 rounded-xl border-slate-200 bg-white text-[11px] font-semibold shadow-none ring-offset-0 focus:border-slate-400 focus:ring-0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#e7e5e4] bg-[#f5f5f4]/80 px-6 py-4">
              {isViewMode ? (
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onDownloadPdf}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="h-10 rounded-xl border-[#d6d3d1] bg-white text-xs font-bold shadow-sm"
                  >
                    {advancePdfGenerating ? '...' : 'Download'}
                  </Button>
                  <Button
                    type="button"
                    onClick={onEdit}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="h-10 rounded-xl bg-slate-900 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800"
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onRequestDelete}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="h-10 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    disabled={advanceSaving}
                    className="h-10 rounded-xl text-xs font-bold text-slate-500"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={onSave}
                    disabled={advanceSaving}
                    className="h-10 flex-1 rounded-xl bg-slate-900 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800"
                  >
                    {advanceSaving ? 'Saving...' : advanceSheetMode === 'edit' ? 'Save' : 'Create'}
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
        description="This will delete the selected advance child invoice."
        confirmLabel="Delete"
        onConfirm={onDeleteConfirm}
      />
    </>
  )
}


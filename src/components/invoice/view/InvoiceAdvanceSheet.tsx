import { useEffect, useMemo, useState, useRef, type Dispatch, type SetStateAction } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { NumericInput } from '@/components/ui/numeric-input'
import {
  ADVANCE_PRIMARY_LABEL_DEFAULT,
  ADVANCE_SECONDARY_LABEL_DEFAULT,
  ADVANCE_SUFFIX_DEFAULT,
} from '@/domain/invoice/advanceChildFlow'
import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import { formatCurrency } from '@/lib/formatters/money'

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
  advanceInputValue: number | string
  setAdvanceInputValue: Dispatch<SetStateAction<number>>
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
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth < 768
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const lastWidth = { current: window.innerWidth }

    const handleResize = () => {
      const currentWidth = window.innerWidth
      if (currentWidth === lastWidth.current) return
      lastWidth.current = currentWidth
      setIsMobile(currentWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const segmentedButtonClass = (active: boolean) =>
    [
      'flex-1 rounded-[var(--bd-radius-md)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-colors',
      active
        ? 'bg-bd-card-bg text-bd-text shadow-sm'
        : 'text-bd-text-muted hover:text-bd-text',
    ].join(' ')

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
          side={isMobile ? 'bottom' : 'right'}
          showCloseButton={false}
          className={
            isMobile
              ? 'flex h-auto max-h-[88vh] w-full max-w-full flex-col overflow-hidden rounded-t-[var(--bd-overlay-radius)] border-bd-border bg-bd-card-bg p-0'
              : 'flex h-full w-full max-w-full flex-col overflow-hidden border-bd-border bg-bd-card-bg p-0 sm:max-w-xl'
          }
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-bd-border px-6 pb-4 pt-5 text-left">
              <SheetTitle className="text-base font-black tracking-tight text-bd-text">
                Advance Invoice
              </SheetTitle>
              <SheetDescription className="text-sm leading-relaxed text-bd-text-muted">
                Set numbering, advance mode, and labels stored on the parent invoice.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="mb-4 space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-[0.14em] text-bd-text-muted">Invoice Number</Label>
                <div className="flex items-center gap-2 rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-1 pr-3 transition-colors focus-within:border-bd-input-focus">
                  <div className="select-none rounded-[var(--bd-radius-md)] bg-bd-surface-muted px-3 text-[12px] font-black tracking-tight text-bd-text-muted">
                    {invoiceNumber || 'INV-000'}
                  </div>
                  <div className="h-5 w-px bg-bd-border" />
                  <div className="relative flex-1">
                    <Input
                      id="advance-suffix"
                      type="text"
                      placeholder={ADVANCE_SUFFIX_DEFAULT}
                      value={advanceSuffixValue}
                      onChange={(event) => setAdvanceSuffixValue(event.target.value.toUpperCase())}
                      disabled={isViewMode || advanceSaving}
                      className="h-8 w-full border-none bg-transparent px-0 text-center font-mono text-sm font-black text-bd-text shadow-none ring-0 ring-offset-0 focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-[0.14em] text-bd-text-muted">Advance Type</Label>
                  <div className="flex gap-1 rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface-muted p-1">
                    <button
                      type="button"
                      disabled={isViewMode || advanceSaving}
                      onClick={() => setAdvanceMode('percent')}
                      className={`${segmentedButtonClass(advanceMode === 'percent')} disabled:opacity-50`}
                    >
                      Percent
                    </button>
                    <button
                      type="button"
                      disabled={isViewMode || advanceSaving}
                      onClick={() => setAdvanceMode('fixed')}
                      className={`${segmentedButtonClass(advanceMode === 'fixed')} disabled:opacity-50`}
                    >
                      Fixed
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="advance-value" className="text-[10px] font-black uppercase tracking-[0.14em] text-bd-text-muted">
                      {advanceMode === 'fixed' ? 'Amount' : 'Percentage'}
                    </Label>
                    {advanceMode === 'percent' && (
                      <span className="text-[10px] font-black tracking-tight text-bd-text-muted">
                        {formatCurrency(contractValue * (Number(advanceInputValue) || 0) / 100)}
                      </span>
                    )}
                  </div>
                  <NumericInput
                    id="advance-value"
                    min={0}
                    max={advanceMode === 'fixed' ? contractValue : 100}
                    step={advanceMode === 'fixed' ? 0.01 : 1}
                    value={advanceInputValue}
                    onChange={(val) => setAdvanceInputValue(Number(val))}
                    disabled={isViewMode || advanceSaving}
                    className="h-10 rounded-[var(--bd-radius-lg)] border-bd-border bg-bd-surface text-sm font-bold text-bd-text shadow-none ring-offset-0 focus:border-bd-input-focus focus:ring-0"
                  />
                  {advanceMode === 'fixed' && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-black tracking-tight text-bd-text-muted">Fixed Amount</span>
                      <span className="text-[10px] font-black tracking-tight text-bd-text-muted">
                        {Number(advanceInputValue) > 0 && contractValue > 0
                          ? `${((Number(advanceInputValue) / contractValue) * 100).toFixed(1)}%`
                          : '0%'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="primary-label" className="text-[10px] font-black uppercase tracking-[0.14em] text-bd-text-muted">
                      Primary Label
                    </Label>
                    <Input
                      id="primary-label"
                      placeholder={ADVANCE_PRIMARY_LABEL_DEFAULT}
                      value={advancePrimaryLabel}
                      onChange={(event) => setAdvancePrimaryLabel(event.target.value)}
                      disabled={isViewMode || advanceSaving}
                      className="h-10 rounded-[var(--bd-radius-lg)] border-bd-border bg-bd-surface text-[11px] font-semibold text-bd-text shadow-none ring-offset-0 focus:border-bd-input-focus focus:ring-0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="secondary-label" className="text-[10px] font-black uppercase tracking-[0.14em] text-bd-text-muted">
                      Secondary Label
                    </Label>
                    <Input
                      id="secondary-label"
                      placeholder={ADVANCE_SECONDARY_LABEL_DEFAULT}
                      value={advanceSecondaryLabel}
                      onChange={(event) => setAdvanceSecondaryLabel(event.target.value)}
                      disabled={isViewMode || advanceSaving}
                      className="h-10 rounded-[var(--bd-radius-lg)] border-bd-border bg-bd-surface text-[11px] font-semibold text-bd-text shadow-none ring-offset-0 focus:border-bd-input-focus focus:ring-0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter className="border-t border-bd-border bg-bd-card-bg px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {isViewMode ? (
                <div className="grid w-full gap-2 sm:grid-cols-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onDownloadPdf}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="h-10 rounded-[var(--bd-radius-lg)] border-bd-border bg-bd-card-bg text-xs font-semibold text-bd-text"
                  >
                    {advancePdfGenerating ? '...' : 'Download'}
                  </Button>
                  <Button
                    type="button"
                    onClick={onEdit}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="h-10 rounded-[var(--bd-radius-lg)] bg-bd-button-primary-bg text-[10px] font-black uppercase tracking-[0.14em] text-bd-button-primary-text hover:bg-bd-button-primary-hover-bg"
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onRequestDelete}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="h-10 rounded-[var(--bd-radius-lg)] border border-bd-status-danger-border bg-bd-status-danger-bg text-xs font-semibold text-bd-status-danger-text hover:opacity-90"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={advanceSaving}
                    className="h-10 rounded-[var(--bd-radius-lg)] text-xs font-semibold sm:min-w-28"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={onSave}
                    disabled={advanceSaving}
                    className="h-10 rounded-[var(--bd-radius-lg)] bg-bd-button-primary-bg text-[10px] font-black uppercase tracking-[0.14em] text-bd-button-primary-text hover:bg-bd-button-primary-hover-bg sm:min-w-36"
                  >
                    {advanceSaving ? 'Saving...' : advanceSheetMode === 'edit' ? 'Save' : 'Create'}
                  </Button>
                </div>
              )}
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      <DocumentConfirmDialog
        open={deleteConfirmOpen}
        title="Remove Advance Details?"
        description="This removes the advance section from the parent invoice. Historical audit records remain available."
        cancelLabel="Cancel"
        confirmLabel="Remove"
        destructive
        onConfirm={onDeleteConfirm}
        onCancel={() => onDeleteConfirmOpenChange(false)}
      />
    </>
  )
}

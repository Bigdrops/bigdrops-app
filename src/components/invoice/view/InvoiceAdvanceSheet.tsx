import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

import ConfirmActionDialog from '@/components/ConfirmActionDialog'
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

    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const segmentedButtonClass = (active: boolean) =>
    [
      'flex-1 rounded-[var(--bd-radius-md)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-colors',
      active
        ? 'bg-[hsl(var(--bd-card-bg))] text-[hsl(var(--bd-text))] shadow-sm'
        : 'text-[hsl(var(--bd-text-muted))] hover:text-[hsl(var(--bd-text))]',
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
              ? 'flex h-auto max-h-[88vh] w-full max-w-full flex-col overflow-hidden rounded-t-[var(--bd-overlay-radius)] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-0'
              : 'flex h-full w-full max-w-full flex-col overflow-hidden border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-0 sm:max-w-xl'
          }
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-[hsl(var(--bd-border))] px-6 pb-4 pt-5 text-left">
              <SheetTitle className="text-base font-black tracking-tight text-[hsl(var(--bd-text))]">
                Advance Invoice
              </SheetTitle>
              <SheetDescription className="text-sm leading-relaxed text-[hsl(var(--bd-text-muted))]">
                Set numbering, advance mode, and labels for the child invoice.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="mb-4 space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-[0.14em] text-[hsl(var(--bd-text-muted))]">Invoice Number</Label>
                <div className="flex items-center gap-2 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-1 pr-3 transition-colors focus-within:border-[hsl(var(--bd-input-focus))]">
                  <div className="select-none rounded-[var(--bd-radius-md)] bg-[hsl(var(--bd-surface-muted))] px-3 text-[12px] font-black tracking-tight text-[hsl(var(--bd-text-muted))]">
                    {invoiceNumber || 'INV-000'}
                  </div>
                  <div className="h-5 w-px bg-[hsl(var(--bd-border))]" />
                  <div className="relative flex-1">
                    <Input
                      id="advance-suffix"
                      type="text"
                      placeholder={ADVANCE_SUFFIX_DEFAULT}
                      value={advanceSuffixValue}
                      onChange={(event) => setAdvanceSuffixValue(event.target.value.toUpperCase())}
                      disabled={isViewMode || advanceSaving}
                      className="h-8 w-full border-none bg-transparent px-0 text-center font-mono text-sm font-black text-[hsl(var(--bd-text))] shadow-none ring-0 ring-offset-0 focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-[0.14em] text-[hsl(var(--bd-text-muted))]">Advance Type</Label>
                  <div className="flex gap-1 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] p-1">
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
                  <Label htmlFor="advance-value" className="text-[10px] font-black uppercase tracking-[0.14em] text-[hsl(var(--bd-text-muted))]">
                    {advanceMode === 'fixed' ? 'Amount' : 'Percentage'}
                  </Label>
                  <NumericInput
                    id="advance-value"
                    min={0}
                    max={advanceMode === 'fixed' ? contractValue : 100}
                    step={advanceMode === 'fixed' ? 0.01 : 1}
                    value={advanceInputValue}
                    onChange={(val) => setAdvanceInputValue(Number(val))}
                    disabled={isViewMode || advanceSaving}
                    className="h-10 rounded-[var(--bd-radius-lg)] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-sm font-bold text-[hsl(var(--bd-text))] shadow-none ring-offset-0 focus:border-[hsl(var(--bd-input-focus))] focus:ring-0"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="primary-label" className="text-[10px] font-black uppercase tracking-[0.14em] text-[hsl(var(--bd-text-muted))]">
                      Primary Label
                    </Label>
                    <Input
                      id="primary-label"
                      placeholder={ADVANCE_PRIMARY_LABEL_DEFAULT}
                      value={advancePrimaryLabel}
                      onChange={(event) => setAdvancePrimaryLabel(event.target.value)}
                      disabled={isViewMode || advanceSaving}
                      className="h-10 rounded-[var(--bd-radius-lg)] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-[11px] font-semibold text-[hsl(var(--bd-text))] shadow-none ring-offset-0 focus:border-[hsl(var(--bd-input-focus))] focus:ring-0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="secondary-label" className="text-[10px] font-black uppercase tracking-[0.14em] text-[hsl(var(--bd-text-muted))]">
                      Secondary Label
                    </Label>
                    <Input
                      id="secondary-label"
                      placeholder={ADVANCE_SECONDARY_LABEL_DEFAULT}
                      value={advanceSecondaryLabel}
                      onChange={(event) => setAdvanceSecondaryLabel(event.target.value)}
                      disabled={isViewMode || advanceSaving}
                      className="h-10 rounded-[var(--bd-radius-lg)] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-[11px] font-semibold text-[hsl(var(--bd-text))] shadow-none ring-offset-0 focus:border-[hsl(var(--bd-input-focus))] focus:ring-0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter className="border-t border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {isViewMode ? (
                <div className="grid w-full gap-2 sm:grid-cols-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onDownloadPdf}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="h-10 rounded-[var(--bd-radius-lg)] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] text-xs font-semibold text-[hsl(var(--bd-text))]"
                  >
                    {advancePdfGenerating ? '...' : 'Download'}
                  </Button>
                  <Button
                    type="button"
                    onClick={onEdit}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="h-10 rounded-[var(--bd-radius-lg)] bg-[hsl(var(--bd-button-primary-bg))] text-[10px] font-black uppercase tracking-[0.14em] text-[hsl(var(--bd-button-primary-text))] hover:bg-[hsl(var(--bd-button-primary-hover-bg))]"
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onRequestDelete}
                    disabled={advanceSaving || advancePdfGenerating}
                    className="h-10 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] text-xs font-semibold text-[hsl(var(--bd-status-danger-text))] hover:opacity-90"
                  >
                    Delete
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
                    className="h-10 rounded-[var(--bd-radius-lg)] bg-[hsl(var(--bd-button-primary-bg))] text-[10px] font-black uppercase tracking-[0.14em] text-[hsl(var(--bd-button-primary-text))] hover:bg-[hsl(var(--bd-button-primary-hover-bg))] sm:min-w-36"
                  >
                    {advanceSaving ? 'Saving...' : advanceSheetMode === 'edit' ? 'Save' : 'Create'}
                  </Button>
                </div>
              )}
            </SheetFooter>
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

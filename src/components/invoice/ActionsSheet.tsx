import * as React from 'react'
import {
  Check,
  ChevronRight,
  FileText,
  type LucideIcon,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getActionsSheetItems } from './mobileFormHelpers.js'

interface ActionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenColumnManager: () => void
  onImport: () => void
  onAddGroup: () => void
  onScrollToAdditionalInfo: () => void
  onSaveDraft: () => void
  onCancel: () => void
  onScrollToLinks: () => void
  mergeQtyUnit: boolean
  onToggleMergeQtyUnit: () => void
}

export default function ActionsSheet({
  open,
  onOpenChange,
  onOpenColumnManager,
  onImport,
  onAddGroup,
  onScrollToAdditionalInfo,
  onSaveDraft,
  onCancel,
  onScrollToLinks,
  mergeQtyUnit,
  onToggleMergeQtyUnit,
}: ActionsSheetProps) {
  const actions = getActionsSheetItems({ mergeQtyUnit })
  const actionMap: Record<string, (() => void) | undefined> = {
    draft: onSaveDraft,
    cancel: onCancel,
    columns: onOpenColumnManager,
    import: onImport,
    qtyUnitMerge: onToggleMergeQtyUnit,
    group: onAddGroup,
    notes: onScrollToAdditionalInfo,
    links: onScrollToLinks,
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[28px] border-0 bg-[#f2f4f8] p-0 [&>[data-slot=sheet-close]]:hidden"
      >
        <SheetHeader className="border-b border-[#e2e8f0] px-5 pb-4 pt-5 text-left">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#cbd5e1]" />
          <SheetTitle className="text-[18px] font-extrabold tracking-[-0.02em] text-[#0f172a]">
            Quick Actions
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-2 px-4 pb-6 pt-4">
          {actions.map((action: any) => (
            <button
              key={action.key}
              type="button"
              onClick={() => {
                actionMap[action.key]?.()
                if (action.key !== 'qtyUnitMerge') {
                  onOpenChange(false)
                }
              }}
              className={`flex min-h-14 w-full items-center gap-3 rounded-[18px] border px-3 py-2 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] transition-colors ${
                action.key === 'qtyUnitMerge' && mergeQtyUnit
                  ? 'border-[#bfdbfe] bg-[#eff6ff] ring-1 ring-[#dbeafe]'
                  : 'border-[#e2e8f0] bg-white hover:bg-[#f8fafc] active:bg-[#eef2f7]'
              }`}
            >
              <div className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] ${action.tone}`}>
                <action.icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-[#0f172a]">{action.label}</div>
                <div className="truncate text-[11px] text-[#64748b]">{action.description}</div>
              </div>
              {action.key === 'qtyUnitMerge' ? (
                <div
                  className={`inline-flex h-8 min-w-[58px] items-center justify-center gap-1 rounded-full border px-2.5 text-[10px] font-extrabold uppercase tracking-[0.16em] ${
                    mergeQtyUnit
                      ? 'border-[#2563eb] bg-[#2563eb] text-white'
                      : 'border-[#cbd5e1] bg-white text-[#64748b]'
                  }`}
                >
                  {mergeQtyUnit ? <Check className="h-3.5 w-3.5" /> : null}
                  {mergeQtyUnit ? 'On' : 'Off'}
                </div>
              ) : (
                <ChevronRight className="h-4 w-4 text-[#94a3b8]" />
              )}
            </button>
          ))}

          <div className="flex items-center gap-2 rounded-[18px] border border-dashed border-[#d8e1ec] bg-[#f8fafc] px-4 py-3 text-[11px] font-medium text-[#64748b]">
            <FileText className="h-4 w-4 text-[#94a3b8]" />
            Most actions close after you tap one. Qty + Unit merge stays inline.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

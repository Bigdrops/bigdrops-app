import {
  ChevronRight,
  FileText,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getActionsSheetItems } from './mobileFormHelpers.js'

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
}) {
  const actions = getActionsSheetItems({ mergeQtyUnit })
  const actionMap = {
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
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => {
                actionMap[action.key]?.()
                onOpenChange(false)
              }}
              className="flex h-14 w-full items-center gap-3 rounded-[18px] border border-[#e2e8f0] bg-white px-3 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] transition-colors hover:bg-[#f8fafc] active:bg-[#eef2f7]"
            >
              <div className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] ${action.tone}`}>
                <action.icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-[#0f172a]">{action.label}</div>
                <div className="truncate text-[11px] text-[#64748b]">{action.description}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#94a3b8]" />
            </button>
          ))}

          <div className="flex items-center gap-2 rounded-[18px] border border-dashed border-[#d8e1ec] bg-[#f8fafc] px-4 py-3 text-[11px] font-medium text-[#64748b]">
            <FileText className="h-4 w-4 text-[#94a3b8]" />
            Actions close automatically after you tap one.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

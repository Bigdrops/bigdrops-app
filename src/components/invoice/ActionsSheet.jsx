import {
  ChevronRight,
  FileInput,
  FileText,
  Layers3,
  Link2,
  NotebookText,
  Save,
  Settings2,
  XCircle,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const actions = [
  { key: 'draft', icon: Save, label: 'Save Draft', description: 'Keep progress without sending', tone: 'bg-emerald-50 text-emerald-700' },
  { key: 'cancel', icon: XCircle, label: 'Cancel', description: 'Leave this document editor', tone: 'bg-rose-50 text-rose-700' },
  { key: 'columns', icon: Settings2, label: 'Open Column Manager', description: 'Adjust columns and overrides', tone: 'bg-slate-100 text-slate-700' },
  { key: 'import', icon: FileInput, label: 'Open Import', description: 'Paste JSON items into the table', tone: 'bg-amber-50 text-amber-700' },
  { key: 'group', icon: Layers3, label: 'Add Group', description: 'Create a grouped item section', tone: 'bg-orange-50 text-orange-700' },
  { key: 'notes', icon: NotebookText, label: 'Scroll to Notes & Terms', description: 'Jump to rich text sections', tone: 'bg-violet-50 text-violet-700' },
  { key: 'links', icon: Link2, label: 'Scroll to Reference Links', description: 'Jump to link attachments', tone: 'bg-green-50 text-green-700' },
]

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
}) {
  const actionMap = {
    draft: onSaveDraft,
    cancel: onCancel,
    columns: onOpenColumnManager,
    import: onImport,
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

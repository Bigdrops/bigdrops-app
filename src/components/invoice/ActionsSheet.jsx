import { FileText, Layers, Paperclip, Settings2, Upload } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export default function ActionsSheet({
  open,
  onOpenChange,
  onOpenColumnManager,
  onImport,
  onAddGroup,
  onScrollToAdditionalInfo,
}) {
  const actions = [
    {
      icon: Settings2,
      label: 'Settings',
      description: 'Columns, VAT and WHT',
      onClick: onOpenColumnManager,
    },
    {
      icon: Upload,
      label: 'Import',
      description: 'Import line items from CSV',
      onClick: onImport,
    },
    {
      icon: Layers,
      label: 'Add Group',
      description: 'Create a grouped section',
      onClick: onAddGroup,
    },
    {
      icon: FileText,
      label: 'Notes & Terms',
      description: 'Jump to the rich text section',
      onClick: onScrollToAdditionalInfo,
    },
    {
      icon: Paperclip,
      label: 'Attachments',
      description: 'Jump to supporting documents',
      onClick: onScrollToAdditionalInfo,
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] bg-white p-0 [&>[data-slot=sheet-close]]:hidden">
        <SheetHeader className="border-b border-zinc-200 px-5 py-4 text-left">
          <SheetTitle className="text-base font-semibold text-zinc-900">More Actions</SheetTitle>
        </SheetHeader>

        <div className="divide-y divide-zinc-100 pb-6">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                action.onClick?.()
                onOpenChange(false)
              }}
              className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-zinc-50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
                <action.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-zinc-900">{action.label}</div>
                <div className="text-xs text-zinc-500">{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

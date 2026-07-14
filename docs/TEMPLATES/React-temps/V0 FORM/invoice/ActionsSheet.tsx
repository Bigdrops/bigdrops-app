"use client"

import {
  Settings2,
  Layers,
  Upload,
  FileText,
  Paperclip,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface ActionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenColumnManager: () => void
  onAddGroup: () => void
  onImportCSV: () => void
  onToggleNotesTerm: () => void
  showNotesTerm: boolean
  onToggleAttachments: () => void
  showAttachments: boolean
}

export default function ActionsSheet({
  open,
  onOpenChange,
  onOpenColumnManager,
  onAddGroup,
  onImportCSV,
  onToggleNotesTerm,
  showNotesTerm,
  onToggleAttachments,
  showAttachments,
}: ActionsSheetProps) {
  const actions = [
    {
      icon: Settings2,
      label: "Table & Tax Settings",
      description: "Configure columns, VAT, WHT",
      onClick: onOpenColumnManager,
    },
    {
      icon: Layers,
      label: "Add Group",
      description: "Create item grouping with subtotal",
      onClick: onAddGroup,
    },
    {
      icon: Upload,
      label: "Import CSV",
      description: "Bulk import line items",
      onClick: onImportCSV,
    },
    {
      icon: FileText,
      label: showNotesTerm ? "Hide Notes & Terms" : "Show Notes & Terms",
      description: "Rich text notes and terms sections",
      onClick: onToggleNotesTerm,
      active: showNotesTerm,
    },
    {
      icon: Paperclip,
      label: showAttachments ? "Hide Attachments" : "Show Attachments",
      description: "Invoice file attachments",
      onClick: onToggleAttachments,
      active: showAttachments,
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl bg-white p-0 [&>[data-slot=sheet-close]]:hidden">
        <SheetHeader className="border-b border-zinc-200 px-4 py-3">
          <SheetTitle className="text-base font-semibold text-zinc-900">
            More Actions
          </SheetTitle>
        </SheetHeader>

        <div className="divide-y divide-zinc-100 pb-6">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                action.onClick()
                onOpenChange(false)
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 active:bg-zinc-100"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  action.active
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
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

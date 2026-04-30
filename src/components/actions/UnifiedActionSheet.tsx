import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type ActionTone = "default" | "success" | "warning" | "danger" | "info"

export type ActionItem = {
  label: string
  icon?: ReactNode
  tone?: ActionTone
  onClick: () => void
  closeOnClick?: boolean
  description?: string
  key?: string
}

export type ActionGroup = {
  label: string
  actions: ActionItem[]
}

export type UnifiedActionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions?: ActionItem[]
  groups?: ActionGroup[]
  layout?: "list" | "grid"
  title?: string
  eyebrow?: string
  description?: string
  deleteAction?: ActionItem
  showHandle?: boolean
  className?: string
}

const TONE_CLASSES = {
  default: {
    iconBg: "bg-[hsl(var(--bd-action-icon-bg))] text-[hsl(var(--bd-action-icon-text))]",
    text: "text-[hsl(var(--bd-surface-action-text))]",
    row: "border-[hsl(var(--bd-surface-action-border))] bg-[hsl(var(--bd-surface-action))] hover:bg-[hsl(var(--bd-surface-action-hover))]",
  },
  success: {
    iconBg: "bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))]",
    text: "text-[hsl(var(--bd-status-success-text))]",
    row: "border-[hsl(var(--bd-status-success-border))] bg-[hsl(var(--bd-status-success-bg))] hover:brightness-95",
  },
  warning: {
    iconBg: "bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]",
    text: "text-[hsl(var(--bd-status-warning-text))]",
    row: "border-[hsl(var(--bd-status-warning-border))] bg-[hsl(var(--bd-status-warning-bg))] hover:brightness-95",
  },
  danger: {
    iconBg: "bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]",
    text: "text-[hsl(var(--bd-status-danger-text))]",
    row: "border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] hover:brightness-95",
  },
  info: {
    iconBg: "bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]",
    text: "text-[hsl(var(--bd-status-info-text))]",
    row: "border-[hsl(var(--bd-status-info-border))] bg-[hsl(var(--bd-status-info-bg))] hover:brightness-95",
  },
}

export function UnifiedActionSheet({
  open,
  onOpenChange,
  actions,
  groups,
  layout = "list",
  title,
  eyebrow,
  description,
  deleteAction,
  showHandle = true,
  className,
}: UnifiedActionSheetProps) {
  const handleActionClick = (action: ActionItem) => {
    action.onClick()
    if (action.closeOnClick !== false) {
      onOpenChange(false)
    }
  }

  const renderAction = (action: ActionItem, idx: number | string, isGrid: boolean) => {
    const tone = TONE_CLASSES[action.tone || "default"]
    
    if (isGrid) {
      return (
        <button
          key={action.key || idx}
          type="button"
          onClick={() => handleActionClick(action)}
          className="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-[var(--bd-overlay-radius)] border border-[hsl(var(--bd-surface-action-border))] bg-[hsl(var(--bd-surface-action))] px-2 py-3 text-center transition hover:bg-[hsl(var(--bd-surface-action-hover))] active:scale-[0.98]"
        >
          <div
            className={cn(
              "flex h-[34px] w-[34px] items-center justify-center rounded-[12px] shadow-sm",
              tone.iconBg,
              "[&_svg]:h-[18px] [&_svg]:w-[18px]"
            )}
          >
            {action.icon}
          </div>
          <div className={cn("text-[11px] font-bold leading-[1.2]", tone.text)}>
            {action.label}
          </div>
        </button>
      )
    }

    return (
      <button
        key={action.key || idx}
        type="button"
        onClick={() => handleActionClick(action)}
        className={cn(
          "grid w-full grid-cols-[44px,minmax(0,1fr),auto] items-center gap-3.5 rounded-[var(--bd-overlay-radius)] border px-4 py-4 text-left transition-all active:scale-[0.99]",
          tone.row
        )}
      >
        <div className={cn("grid h-11 w-11 place-items-center rounded-[14px] shadow-sm ring-1 ring-black/5", tone.iconBg)}>
          {action.icon}
        </div>
        <div className="min-w-0">
          <div className={cn("text-[14px] font-bold tracking-tight", tone.text)}>
            {action.label}
          </div>
          {action.description && (
            <div className="truncate text-[12px] text-[hsl(var(--bd-overlay-muted))] font-medium mt-0.5">
              {action.description}
            </div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 opacity-30" />
      </button>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={cn(
          "h-[min(640px,84vh)] overflow-hidden border-x-0 border-b-0 border-t border-[hsl(var(--bd-overlay-border))] bg-[hsl(var(--bd-overlay-bg))] p-0 shadow-2xl transition-all duration-300",
          "rounded-t-[var(--bd-overlay-radius)]",
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          {(showHandle || title || eyebrow || description) && (
            <div className="shrink-0 border-b border-[hsl(var(--bd-overlay-border))] px-6 pb-5 pt-4">
              {showHandle && (
                <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[hsl(var(--bd-overlay-handle-bg))]" />
              )}
              {eyebrow && (
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--bd-overlay-muted))]">
                  {eyebrow}
                </div>
              )}
              {(title || description) && (
                <SheetHeader className="mt-1 space-y-1 p-0 text-left">
                  {title && (
                    <SheetTitle className="text-[22px] font-black tracking-[-0.04em] text-[hsl(var(--bd-overlay-text))]">
                      {title}
                    </SheetTitle>
                  )}
                  {description && (
                    <SheetDescription className="text-[13px] font-medium leading-relaxed text-[hsl(var(--bd-overlay-muted))]">
                      {description}
                    </SheetDescription>
                  )}
                </SheetHeader>
              )}
            </div>
          )}

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 bd-custom-scrollbar">
            {groups ? (
              <div className="space-y-6">
                {groups.map((group, gIdx) => (
                  <div key={group.label || gIdx}>
                    {group.label && (
                      <div className="mb-3 px-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--bd-overlay-muted))]">
                        {group.label}
                      </div>
                    )}
                    <div className="space-y-2.5">
                      {group.actions.map((action, aIdx) => renderAction(action, `${gIdx}-${aIdx}`, layout === "grid"))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={cn(layout === "grid" ? "grid grid-cols-3 gap-2.5" : "space-y-2.5")}>
                {actions?.map((action, idx) => renderAction(action, idx, layout === "grid"))}
              </div>
            )}

            {deleteAction && (
              <button
                type="button"
                onClick={() => handleActionClick(deleteAction)}
                className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[var(--bd-overlay-radius)] border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] px-4 text-[15px] font-black text-[hsl(var(--bd-status-danger-text))] transition hover:brightness-95 active:scale-[0.99]"
              >
                <div className="shrink-0 [&_svg]:h-[18px] [&_svg]:w-[18px]">
                  {deleteAction.icon}
                </div>
                <span>{deleteAction.label}</span>
                <ChevronRight className="h-5 w-5 opacity-40" />
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

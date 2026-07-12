import type { ReactNode } from "react"
import { ChevronRight, Loader2 } from "lucide-react"
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
  isLoading?: boolean
  isSwitch?: boolean
  isActive?: boolean
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
  layout?: "list" | "grid" | "list-compact"
  title?: string
  eyebrow?: string
  description?: string
  deleteAction?: ActionItem
  showHandle?: boolean
  showDescriptions?: boolean
  hideIcons?: boolean
  className?: string
}

const TONE_CLASSES = {
  default: {
    iconBg: "bg-bd-action-icon-bg text-bd-action-icon-text",
    text: "text-bd-surface-action-text",
    row: "border-bd-surface-action-border bg-bd-surface-action hover:bg-bd-surface-action-hover",
  },
  success: {
    iconBg: "bg-bd-status-success-bg text-bd-status-success-text",
    text: "text-bd-status-success-text",
    row: "border-bd-status-success-border bg-bd-status-success-bg hover:brightness-95",
  },
  warning: {
    iconBg: "bg-bd-status-warning-bg text-bd-status-warning-text",
    text: "text-bd-status-warning-text",
    row: "border-bd-status-warning-border bg-bd-status-warning-bg hover:brightness-95",
  },
  danger: {
    iconBg: "bg-bd-status-danger-bg text-bd-status-danger-text",
    text: "text-bd-status-danger-text",
    row: "border-bd-status-danger-border bg-bd-status-danger-bg hover:brightness-95",
  },
  info: {
    iconBg: "bg-bd-status-info-bg text-bd-status-info-text",
    text: "text-bd-status-info-text",
    row: "border-bd-status-info-border bg-bd-status-info-bg hover:brightness-95",
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
  showDescriptions = false,
  hideIcons = false,
  className,
}: UnifiedActionSheetProps) {
  const handleActionClick = (action: ActionItem) => {
    if (action.isLoading) return
    action.onClick()
    if (action.closeOnClick !== false && !action.isLoading) {
      onOpenChange(false)
    }
  }

  const renderAction = (action: ActionItem, idx: number | string, isGrid: boolean) => {
    const tone = TONE_CLASSES[action.tone || "default"]
    const isCompact = layout === "list-compact"
    
    if (isGrid) {
      return (
        <button
          key={action.key || idx}
          type="button"
          disabled={action.isLoading}
          onClick={() => handleActionClick(action)}
          className={cn(
            "flex flex-col items-center justify-center rounded-[var(--bd-overlay-radius)] border border-bd-surface-action-border bg-bd-surface-action transition hover:bg-bd-surface-action-hover active:scale-[0.97]",
            "min-h-[84px] gap-1.5 px-2 py-2",
            action.isLoading && "opacity-70 cursor-not-allowed"
          )}
        >
          {!hideIcons && action.icon && (
            <div
              className={cn(
                "flex items-center justify-center rounded-[10px] shadow-sm",
                tone.iconBg,
                "h-[26px] w-[26px] [&_svg]:h-[13px] [&_svg]:w-[13px]",
                action.isLoading && "animate-pulse"
              )}
            >
              {action.isLoading ? <Loader2 className="animate-spin" /> : action.icon}
            </div>
          )}
          <div className={cn("font-bold leading-tight text-[10px] truncate w-full px-1", tone.text)}>
            {action.isLoading ? "Working..." : action.label}
          </div>
        </button>
      )
    }

    return (
      <button
        key={action.key || idx}
        type="button"
        disabled={action.isLoading}
        onClick={() => handleActionClick(action)}
        className={cn(
          "grid w-full items-center gap-3 rounded-[var(--bd-overlay-radius)] border text-left transition-all active:scale-[0.99]",
          isCompact 
            ? "grid-cols-[28px,minmax(0,1fr),auto] px-3 py-2" 
            : "grid-cols-[36px,minmax(0,1fr),auto] px-4 py-2.5",
          action.isSwitch && action.isActive
            ? "border-bd-status-success-border bg-bd-status-success-bg ring-1 ring-bd-status-success-border"
            : tone.row,
          action.isLoading && "opacity-70 cursor-not-allowed"
        )}
      >
        {!hideIcons && action.icon && (
          <div className={cn(
            "grid place-items-center shadow-sm ring-1 ring-[hsl(var(--bd-border)/0.2)]", 
            action.isSwitch && action.isActive
              ? "bg-bd-status-success-text text-bd-surface"
              : tone.iconBg,
            isCompact ? "h-7 w-7 rounded-[8px] [&_svg]:h-3.5 [&_svg]:w-3.5" : "h-9 w-9 rounded-[10px] [&_svg]:h-4.5 [&_svg]:w-4.5"
          )}>
            {action.isLoading ? <Loader2 className="animate-spin" /> : action.icon}
          </div>
        )}
        {hideIcons && <div />}
        <div className="min-w-0">
          <div className={cn("font-bold tracking-tight", isCompact ? "text-[12px]" : "text-[13px]", action.isSwitch && action.isActive ? "text-bd-status-success-text" : tone.text)}>
            {action.isLoading ? "Processing..." : action.label}
          </div>
          {showDescriptions && action.description && !action.isLoading && (
            <div className="truncate text-[10px] text-bd-overlay-muted font-medium mt-0.5 opacity-70">
              {action.description}
            </div>
          )}
        </div>
        {action.isSwitch ? (
           <div className={cn(
             "h-5 w-9 rounded-full border-2 transition-colors relative",
             action.isActive ? "bg-bd-status-success-text border-transparent" : "bg-bd-surface-muted border-bd-border"
           )}>
              <div className={cn(
                "absolute top-0.5 h-3 w-3 rounded-full bg-bd-card-bg transition-all shadow-sm",
                action.isActive ? "left-[1.125rem]" : "left-0.5"
              )} />
           </div>
        ) : (
          <ChevronRight className="h-3.5 w-3.5 opacity-25" />
        )}
      </button>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={cn(
          "overflow-hidden border-x-0 border-b-0 border-t border-bd-overlay-border bg-bd-overlay-bg p-0 shadow-2xl transition-all duration-300",
          "rounded-t-[var(--bd-overlay-radius)]",
          "h-auto max-h-[var(--bd-overlay-sheet-max-height)]",
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          {(showHandle || title || eyebrow || description) && (
            <div className="shrink-0 border-b border-bd-overlay-border px-4 pb-3 pt-3">
              {showHandle && (
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-bd-overlay-handle-bg" />
              )}
              {eyebrow && (
                <div className="text-[9px] font-black uppercase tracking-wider text-bd-overlay-muted">
                  {eyebrow}
                </div>
              )}
              {(title || description) && (
                <SheetHeader className="mt-1 space-y-0.5 p-0 text-left">
                  {title && (
                    <SheetTitle className="text-[17px] font-black tracking-tight text-bd-overlay-text">
                      {title}
                    </SheetTitle>
                  )}
                  {description && (
                    <SheetDescription className="text-[11px] font-medium leading-normal text-bd-overlay-muted">
                      {description}
                    </SheetDescription>
                  )}
                </SheetHeader>
              )}
            </div>
          )}

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 bd-custom-scrollbar">
            {groups ? (
              <div className="space-y-4">
                {groups.map((group, gIdx) => (
                  <div key={group.label || gIdx}>
                    {group.label && (
                      <div className="mb-2 px-1 text-[9px] font-black uppercase tracking-wider text-bd-overlay-muted">
                        {group.label}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      {group.actions.map((action, aIdx) => renderAction(action, `${gIdx}-${aIdx}`, layout.startsWith("grid")))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={cn(
                layout === "grid" && (actions?.length === 4 ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"),
                layout.startsWith("list") && "space-y-1.5"
              )}>
                {actions?.map((action, idx) => renderAction(action, idx, layout.startsWith("grid")))}
              </div>
            )}

            {deleteAction && (
              <button
                type="button"
                onClick={() => handleActionClick(deleteAction)}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[var(--bd-overlay-radius)] border border-bd-status-danger-border bg-bd-status-danger-bg px-4 text-[13px] font-black text-bd-status-danger-text transition hover:brightness-95 active:scale-[0.99]"
              >
                <div className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">
                  {deleteAction.icon}
                </div>
                <span>{deleteAction.label}</span>
                <ChevronRight className="h-4 w-4 opacity-30" />
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

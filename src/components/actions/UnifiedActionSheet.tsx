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
  layout?: "list" | "grid" | "grid-scroll" | "list-compact"
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
  showDescriptions = false,
  hideIcons = false,
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
    const isCompact = layout === "list-compact" || layout === "grid-scroll"
    
    if (isGrid) {
      return (
        <button
          key={action.key || idx}
          type="button"
          onClick={() => handleActionClick(action)}
          className={cn(
            "flex flex-col items-center justify-center rounded-[var(--bd-overlay-radius)] border border-[hsl(var(--bd-surface-action-border))] bg-[hsl(var(--bd-surface-action))] transition hover:bg-[hsl(var(--bd-surface-action-hover))] active:scale-[0.97]",
            layout === "grid-scroll" ? "min-w-[calc((100vw-var(--bd-sheet-padding,1rem)*2-var(--bd-space-sm,0.5rem)*3)/4.25)] h-[88px] flex-col justify-center text-center p-1" : "min-h-[92px] gap-[var(--bd-space-sm)] px-[var(--bd-space-xs)] py-[var(--bd-space-sm)]"
          )}
        >
          {!hideIcons && action.icon && (
            <div
              className={cn(
                "flex items-center justify-center rounded-[12px] shadow-sm",
                tone.iconBg,
                isCompact ? "h-[28px] w-[28px] [&_svg]:h-[14px] [&_svg]:w-[14px]" : "h-[34px] w-[34px] [&_svg]:h-[18px] [&_svg]:w-[18px]"
              )}
            >
              {action.icon}
            </div>
          )}
          <div className={cn("font-bold leading-[1.2]", isCompact ? "text-[10px]" : "text-[11px]", tone.text)}>
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
          "grid w-full items-center gap-[var(--bd-row-gap)] rounded-[var(--bd-overlay-radius)] border text-left transition-all active:scale-[0.985]",
          isCompact 
            ? "grid-cols-[32px,minmax(0,1fr),auto] px-[var(--bd-space-sm)] py-[var(--bd-space-sm)]" 
            : "grid-cols-[44px,minmax(0,1fr),auto] px-[var(--bd-space-md)] py-[var(--bd-space-md)]",
          tone.row
        )}
      >
        {!hideIcons && action.icon && (
          <div className={cn(
            "grid place-items-center shadow-sm ring-1 ring-black/5", 
            tone.iconBg,
            isCompact ? "h-8 w-8 rounded-[10px] [&_svg]:h-4 [&_svg]:w-4" : "h-11 w-11 rounded-[14px] [&_svg]:h-5 [&_svg]:w-5"
          )}>
            {action.icon}
          </div>
        )}
        {hideIcons && <div />}
        <div className="min-w-0">
          <div className={cn("font-bold tracking-[-0.03em]", isCompact ? "text-[13px]" : "text-[14px]", tone.text)}>
            {action.label}
          </div>
          {(showDescriptions || action.description) && action.description && (
            <div className="truncate text-[11px] text-[hsl(var(--bd-overlay-muted))] font-medium mt-[2px]">
              {action.description}
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 opacity-30" />
      </button>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={cn(
          "overflow-hidden border-x-0 border-b-0 border-t border-[hsl(var(--bd-overlay-border))] bg-[hsl(var(--bd-overlay-bg))] p-0 shadow-2xl transition-all duration-300",
          "rounded-t-[var(--bd-overlay-radius)]",
          layout === "grid-scroll" ? "h-auto" : "h-[min(640px,84vh)]",
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          {(showHandle || title || eyebrow || description) && (
            <div className="shrink-0 border-b border-[hsl(var(--bd-overlay-border))] px-[var(--bd-sheet-padding)] pb-[var(--bd-space-md)] pt-[var(--bd-space-md)]">
              {showHandle && (
                <div className="mx-auto mb-[var(--bd-space-md)] h-1.5 w-12 rounded-full bg-[hsl(var(--bd-overlay-handle-bg))]" />
              )}
              {eyebrow && (
                <div className="text-[10px] font-extrabold uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(var(--bd-overlay-muted))]">
                  {eyebrow}
                </div>
              )}
              {(title || description) && (
                <SheetHeader className="mt-[var(--bd-space-xs)] space-y-[var(--bd-space-xs)] p-0 text-left">
                  {title && (
                    <SheetTitle className="text-[20px] font-black tracking-[-0.04em] text-[hsl(var(--bd-overlay-text))]">
                      {title}
                    </SheetTitle>
                  )}
                  {description && (
                    <SheetDescription className="text-[12px] font-medium leading-relaxed text-[hsl(var(--bd-overlay-muted))]">
                      {description}
                    </SheetDescription>
                  )}
                </SheetHeader>
              )}
            </div>
          )}

          {/* Content */}
          <div className={cn(
            "min-h-0 flex-1 overflow-y-auto px-[var(--bd-sheet-padding)] pb-[calc(var(--bd-space-lg)+env(safe-area-inset-bottom))] pt-[var(--bd-space-md)] bd-custom-scrollbar",
            layout === "grid-scroll" && "overflow-y-hidden"
          )}>
            {groups ? (
              <div className="space-y-[var(--bd-section-gap)]">
                {groups.map((group, gIdx) => (
                  <div key={group.label || gIdx}>
                    {group.label && (
                      <div className="mb-[var(--bd-space-sm)] px-[var(--bd-space-xs)] text-[10px] font-extrabold uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(var(--bd-overlay-muted))]">
                        {group.label}
                      </div>
                    )}
                    <div className="space-y-[var(--bd-row-gap)]">
                      {group.actions.map((action, aIdx) => renderAction(action, `${gIdx}-${aIdx}`, layout.startsWith("grid")))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={cn(
                layout === "grid" && "grid grid-cols-3 gap-[var(--bd-space-sm)]",
                layout === "grid-scroll" && "flex gap-[var(--bd-space-sm)] overflow-x-auto pb-2 snap-x bd-hide-scrollbar",
                layout.startsWith("list") && "space-y-[var(--bd-row-gap)]"
              )}>
                {actions?.map((action, idx) => renderAction(action, idx, layout.startsWith("grid")))}
              </div>
            )}

            {deleteAction && (
              <button
                type="button"
                onClick={() => handleActionClick(deleteAction)}
                className="mt-[var(--bd-space-md)] flex h-14 w-full items-center justify-center gap-[var(--bd-space-sm)] rounded-[var(--bd-overlay-radius)] border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] px-[var(--bd-space-md)] text-[15px] font-black text-[hsl(var(--bd-status-danger-text))] transition hover:brightness-95 active:scale-[0.99]"
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

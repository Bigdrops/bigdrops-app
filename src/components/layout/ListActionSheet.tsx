import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"

function getActionTone(key: string, label: string, danger = false) {
  if (danger) {
    return {
      tile: "bg-red-600 text-white",
      chevron: "text-red-300",
      row: "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15",
    }
  }

  const value = `${key} ${label}`.toLowerCase()

  if (value.includes("view") || value.includes("open")) {
    return {
      tile: "bg-sky-600 text-white",
      chevron: "text-sky-300",
      row: "border-border bg-background text-foreground hover:bg-sky-50/60",
    }
  }
  if (value.includes("edit")) {
    return {
      tile: "bg-violet-600 text-white",
      chevron: "text-violet-300",
      row: "border-border bg-background text-foreground hover:bg-violet-50/60",
    }
  }
  if (value.includes("project")) {
    return {
      tile: "bg-emerald-600 text-white",
      chevron: "text-emerald-300",
      row: "border-border bg-background text-foreground hover:bg-emerald-50/60",
    }
  }
  if (value.includes("document") || value.includes("link")) {
    return {
      tile: "bg-cyan-700 text-white",
      chevron: "text-cyan-300",
      row: "border-border bg-background text-foreground hover:bg-cyan-50/60",
    }
  }
  if (value.includes("archive")) {
    return {
      tile: "bg-amber-500 text-slate-950",
      chevron: "text-amber-300",
      row: "border-border bg-background text-foreground hover:bg-amber-50/60",
    }
  }

  return {
    tile: "bg-[hsl(var(--primary))] text-primary-foreground",
    chevron: "text-primary/35",
    row: "border-border bg-background text-foreground hover:bg-primary/5",
  }
}

export default function ListActionSheet({
  open,
  onOpenChange,
  eyebrow,
  title,
  amount,
  actions,
  deleteAction,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  eyebrow: string
  title: string
  amount?: string | null
  actions: Array<{ key: string; label: string; icon: ReactNode; onClick: () => void; tone?: "default" | "danger"; closeOnClick?: boolean }>
  deleteAction?: { label: string; icon: ReactNode; onClick: () => void; closeOnClick?: boolean }
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-[50vh] max-h-[50vh] overflow-hidden rounded-t-[24px] border-x-0 border-b-0 border-t border-border bg-card p-0 shadow-xl"
      >
        <div className="flex h-full flex-col px-4 pb-4 pt-4">
          <div className="mx-auto mb-5 h-[5px] w-10 rounded-full bg-border" />

          <div className="mb-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {eyebrow}
            </div>
            <div className="mt-1 text-[24px] font-bold leading-[1.05] tracking-[-0.03em] text-foreground">
              {title}
            </div>
            {amount ? (
              <div className="mt-1.5 text-[20px] font-bold tracking-[-0.03em] text-foreground">
                {amount}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid gap-2.5 pb-1">
              {actions.map((action) => {
                const tone = getActionTone(action.key, action.label, action.tone === "danger")

                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => {
                      action.onClick()
                      if (action.closeOnClick !== false) onOpenChange(false)
                    }}
                    className={`grid w-full grid-cols-[44px,minmax(0,1fr),auto] items-center gap-3 rounded-[18px] border px-3.5 py-3.5 text-left ${tone.row}`}
                  >
                    <div className={`grid h-11 w-11 place-items-center rounded-[14px] shadow-sm ${tone.tile}`}>
                      {action.icon}
                    </div>
                    <span className="truncate text-[14px] font-semibold leading-[1.2]">{action.label}</span>
                    <ChevronRight className={`h-4 w-4 ${tone.chevron}`} />
                  </button>
                )
              })}
            </div>
          </div>

          {deleteAction ? (
            <button
              type="button"
              onClick={() => {
                deleteAction.onClick()
                if (deleteAction.closeOnClick !== false) onOpenChange(false)
              }}
              className="mt-3 grid w-full shrink-0 grid-cols-[44px,minmax(0,1fr),auto] items-center gap-3 rounded-[18px] border border-destructive/20 bg-destructive/10 px-3.5 py-3.5 text-left text-destructive hover:bg-destructive/15"
            >
              <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-red-600 text-white shadow-sm">
                {deleteAction.icon}
              </div>
              <span className="text-[14px] font-semibold">{deleteAction.label}</span>
              <ChevronRight className="h-4 w-4 text-destructive/70" />
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"

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
        className="rounded-t-[24px] border-x-0 border-b-0 border-t border-border bg-card p-0 shadow-xl"
      >
        <div className="px-4 pb-7 pt-4">
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

          <div className="grid gap-2.5">
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => {
                  action.onClick()
                  if (action.closeOnClick !== false) onOpenChange(false)
                }}
                className={`grid w-full grid-cols-[44px,minmax(0,1fr),auto] items-center gap-3 rounded-[18px] border px-3.5 py-3.5 text-left ${
                  action.tone === "danger"
                    ? "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15"
                    : "border-border bg-background text-foreground hover:bg-muted/40"
                }`}
              >
                <div
                  className={`grid h-11 w-11 place-items-center rounded-[14px] ${
                    action.tone === "danger"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-muted text-foreground/80"
                  }`}
                >
                  {action.icon}
                </div>
                <span className="truncate text-[14px] font-semibold leading-[1.2]">{action.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>

          {deleteAction ? (
            <button
              type="button"
              onClick={() => {
                deleteAction.onClick()
                if (deleteAction.closeOnClick !== false) onOpenChange(false)
              }}
              className="mt-3 grid w-full grid-cols-[44px,minmax(0,1fr),auto] items-center gap-3 rounded-[18px] border border-destructive/20 bg-destructive/10 px-3.5 py-3.5 text-left text-destructive hover:bg-destructive/15"
            >
              <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-destructive/15">
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

import type { ReactNode } from "react"
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
        <div className="px-4 pb-7 pt-5">
          <div className="mx-auto mb-[22px] h-[5px] w-10 rounded-full bg-border" />

          <div className="mb-[22px]">
            <div className="text-sm font-medium text-muted-foreground">{eyebrow}</div>
            <div className="mt-2 text-[24px] font-bold leading-[1.05] tracking-[-0.03em] text-foreground">{title}</div>
            {amount ? <div className="mt-2 text-[22px] font-bold tracking-[-0.03em] text-foreground">{amount}</div> : null}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => {
                  action.onClick()
                  if (action.closeOnClick !== false) onOpenChange(false)
                }}
                className={`flex min-h-[92px] flex-col items-center justify-center gap-[10px] rounded-[16px] px-[10px] py-[18px] ${
                  action.tone === "danger"
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
                    : "bg-muted text-foreground/90 hover:bg-muted/80"
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center">{action.icon}</div>
                <span className="text-center text-[13px] font-medium leading-[1.2]">{action.label}</span>
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
              className="mt-[14px] flex w-full flex-col items-center gap-[10px] rounded-[16px] bg-destructive/15 px-4 py-[18px] text-destructive hover:bg-destructive/20"
            >
              <div className="flex h-7 w-7 items-center justify-center">{deleteAction.icon}</div>
              <span className="text-[15px] font-semibold">{deleteAction.label}</span>
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

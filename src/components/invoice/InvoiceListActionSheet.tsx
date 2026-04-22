import type { ReactNode } from "react"

import { ChevronRight } from "lucide-react"

import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type InvoiceListAction = {
  key: string
  label: string
  icon: ReactNode
  onClick: () => void
  closeOnClick?: boolean
}

type InvoiceListActionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eyebrow: string
  title: string
  subtitle?: string | null
  actions: InvoiceListAction[]
  deleteAction?: InvoiceListAction
}

function getActionTone(key: string) {
  const value = key.toLowerCase()

  if (value === "view" || value === "edit") {
    return "bg-muted text-foreground"
  }
  if (value.includes("project") || value === "payment" || value === "advance") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
  }
  if (value.includes("document")) {
    return "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
  }
  if (value === "clone") {
    return "bg-primary/12 text-primary"
  }
  if (value.includes("quote") || value.includes("convert")) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
  }
  if (value.includes("csr") || value.includes("waybill")) {
    return "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
  }
  if (value.includes("archive")) {
    return "bg-muted text-foreground"
  }

  return "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
}

export default function InvoiceListActionSheet({
  open,
  onOpenChange,
  eyebrow,
  title,
  subtitle,
  actions,
  deleteAction,
}: InvoiceListActionSheetProps) {
  const runAction = (action: InvoiceListAction) => {
    action.onClick()
    if (action.closeOnClick !== false) {
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-[min(640px,84vh)] overflow-hidden rounded-t-[26px] border-x-0 border-b-0 border-t border-border bg-background p-0 shadow-2xl"
      >
        <div className="flex h-full flex-col">
          <div className="shrink-0 border-b border-border/80 px-5 pb-4 pt-3">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {eyebrow}
            </div>
            <div className="mt-1 text-[20px] font-extrabold leading-[1.15] tracking-[-0.03em] text-foreground">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
                {subtitle}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
            <div className="grid grid-cols-3 gap-2">
              {actions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => runAction(action)}
                  className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[16px] border border-border bg-muted/20 px-2 py-3 text-center transition hover:bg-muted/40"
                >
                  <div
                    className={cn(
                      "flex h-[30px] w-[30px] items-center justify-center rounded-[11px]",
                      getActionTone(action.key),
                      "[&_svg]:h-[17px] [&_svg]:w-[17px]",
                    )}
                  >
                    {action.icon}
                  </div>
                  <div className="text-[11px] font-bold leading-[1.2] text-foreground">
                    {action.label}
                  </div>
                </button>
              ))}
            </div>

            {deleteAction ? (
              <button
                type="button"
                onClick={() => runAction(deleteAction)}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[15px] border border-destructive/20 bg-destructive/10 px-4 text-sm font-extrabold text-destructive transition hover:bg-destructive/15"
              >
                <span className="[&_svg]:h-[17px] [&_svg]:w-[17px]">{deleteAction.icon}</span>
                <span>{deleteAction.label}</span>
                <ChevronRight className="h-4 w-4 text-destructive" />
              </button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

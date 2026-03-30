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
        className="rounded-t-[24px] border-x-0 border-b-0 border-t border-border bg-white p-0 shadow-[0_-12px_32px_rgba(15,23,42,0.16)]"
      >
        <div className="px-4 pb-7 pt-5">
          <div className="mx-auto mb-5 h-[5px] w-10 rounded-full bg-zinc-200" />

          <div className="mb-5">
            <div className="text-sm font-medium text-zinc-500">{eyebrow}</div>
            <div className="mt-1 text-[24px] font-bold leading-none tracking-[-0.03em] text-zinc-900">{title}</div>
            {amount ? <div className="mt-2 text-[22px] font-bold tracking-[-0.03em] text-zinc-900">{amount}</div> : null}
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
                className={`flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-[16px] px-2 py-4 ${
                  action.tone === "danger"
                    ? "bg-red-50 text-red-700 hover:bg-red-100"
                    : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center">{action.icon}</div>
                <span className="text-center text-[13px] font-medium leading-4">{action.label}</span>
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
              className="mt-3 flex w-full flex-col items-center gap-2 rounded-[16px] bg-red-100 px-4 py-4 text-red-800 hover:bg-red-200"
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

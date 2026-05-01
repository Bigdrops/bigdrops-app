import type { ReactNode } from "react"
import { UnifiedActionSheet, type ActionItem } from "@/components/actions/UnifiedActionSheet"

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
  const unifiedActions: ActionItem[] = actions.map(a => ({
    ...a,
    tone: a.tone === "danger" ? "danger" : "default"
  }))

  const unifiedDelete: ActionItem | undefined = deleteAction ? {
    ...deleteAction,
    tone: "danger"
  } : undefined

  return (
    <UnifiedActionSheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={eyebrow}
      title={title}
      description={amount || undefined}
      actions={unifiedActions}
      deleteAction={unifiedDelete}
      layout="list-compact"
    />
  )
}

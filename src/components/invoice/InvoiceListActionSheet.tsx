import { UnifiedActionSheet, type ActionItem, type ActionTone } from "@/components/actions/UnifiedActionSheet"

type InvoiceListAction = {
  key: string
  label: string
  icon: React.ReactNode
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

function getActionTone(key: string): ActionTone {
  const value = key.toLowerCase()

  if (value === "view" || value === "edit") return "default"
  if (value.includes("project") || value === "payment" || value === "advance") return "success"
  if (value.includes("document")) return "info"
  if (value === "clone") return "info"
  if (value.includes("quote") || value.includes("convert")) return "warning"
  if (value.includes("csr") || value.includes("waybill")) return "success"
  if (value.includes("archive")) return "default"

  return "info"
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
  const unifiedActions: ActionItem[] = actions.map(action => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    onClick: action.onClick,
    closeOnClick: action.closeOnClick,
    tone: getActionTone(action.key)
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
      description={subtitle || undefined}
      actions={unifiedActions}
      deleteAction={unifiedDelete}
      layout="grid"
    />
  )
}

import DocumentSheet from './DocumentSheet'

export interface DocumentAction {
  label: string
  onClick: () => void
  destructive?: boolean
  icon?: React.ReactNode
}

interface DocumentActionSheetProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  actions: DocumentAction[]
}

export default function DocumentActionSheet({
  open,
  title,
  subtitle,
  onClose,
  actions,
}: DocumentActionSheetProps) {
  return (
    <DocumentSheet open={open} title={title} subtitle={subtitle} onClose={onClose}>
      <div className="flex flex-col gap-2">
        {actions.map((action, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              action.onClick()
              onClose()
            }}
            className={
              action.destructive
                ? 'flex items-center gap-3 rounded-[var(--bd-radius-lg)] border border-bd-status-danger-border bg-bd-status-danger-bg px-4 py-4 text-left text-bd-status-danger-text transition-colors hover:brightness-95 disabled:border-bd-border disabled:bg-bd-surface-muted disabled:text-bd-text-muted disabled:opacity-100'
                : 'flex items-center gap-3 rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface px-4 py-4 text-left text-bd-text transition-colors hover:bg-bd-surface-muted disabled:border-bd-border disabled:bg-bd-surface-muted disabled:text-bd-text-muted disabled:opacity-100'
            }
          >
            {action.icon}
            <span className="text-sm font-semibold">{action.label}</span>
          </button>
        ))}
      </div>
    </DocumentSheet>
  )
}

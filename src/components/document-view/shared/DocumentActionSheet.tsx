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
                ? 'flex items-center gap-3 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] px-4 py-4 text-left text-[hsl(var(--bd-status-danger-text))] transition-opacity hover:opacity-90'
                : 'flex items-center gap-3 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-4 py-4 text-left text-[hsl(var(--bd-text))] transition-colors hover:bg-[hsl(var(--bd-surface-muted))]'
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

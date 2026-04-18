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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {actions.map((action, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              action.onClick()
              onClose()
            }}
            style={{
              padding: '16px',
              textAlign: 'left',
              background: '#f9fafb',
              border: '1px solid #e7e5e4',
              borderRadius: 12,
              color: action.destructive ? '#ef4444' : '#1f2937',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {action.icon}
            <span style={{ fontWeight: 500 }}>{action.label}</span>
          </button>
        ))}
      </div>
    </DocumentSheet>
  )
}

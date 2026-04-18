import DocumentModal from './DocumentModal'

interface DocumentConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function DocumentConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: DocumentConfirmDialogProps) {
  return (
    <DocumentModal
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #e7e5e4',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              onCancel()
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: destructive ? '#ef4444' : '#1f2937',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div />
    </DocumentModal>
  )
}

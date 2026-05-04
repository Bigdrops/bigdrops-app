import DocumentModal from './DocumentModal'
import { Button } from '@/components/ui/button'

interface DocumentConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  confirmDisabled?: boolean
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
  confirmDisabled = false,
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
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 min-w-28 rounded-[var(--bd-radius-lg)] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] px-4 text-sm font-semibold text-[hsl(var(--bd-text))] hover:bg-[hsl(var(--bd-surface))]"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={confirmDisabled}
            onClick={() => {
              onConfirm()
              onCancel()
            }}
            className={
              destructive
                ? 'h-10 min-w-32 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] px-4 text-sm font-semibold text-[hsl(var(--bd-status-danger-text))] hover:opacity-90 disabled:opacity-60'
                : 'h-10 min-w-32 rounded-[var(--bd-radius-lg)] bg-[hsl(var(--bd-button-primary-bg))] px-4 text-sm font-semibold text-[hsl(var(--bd-button-primary-text))] hover:bg-[hsl(var(--bd-button-primary-hover-bg))] disabled:opacity-60'
            }
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div />
    </DocumentModal>
  )
}

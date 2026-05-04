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
  const cancelButtonClass =
    'h-10 min-w-28 rounded-[var(--bd-radius-lg)] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-4 text-sm font-semibold text-[hsl(var(--bd-text))] hover:bg-[hsl(var(--bd-surface-muted))] disabled:border-[hsl(var(--bd-border))] disabled:bg-[hsl(var(--bd-surface-muted))] disabled:text-[hsl(var(--bd-text-muted))] disabled:opacity-100'

  const confirmButtonClass = destructive
    ? 'h-10 min-w-32 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] px-4 text-sm font-semibold text-[hsl(var(--bd-status-danger-text))] hover:brightness-95 disabled:border-[hsl(var(--bd-border))] disabled:bg-[hsl(var(--bd-surface-muted))] disabled:text-[hsl(var(--bd-text-muted))] disabled:opacity-100'
    : 'h-10 min-w-32 rounded-[var(--bd-radius-lg)] border border-transparent bg-[hsl(var(--bd-button-primary-bg))] px-4 text-sm font-semibold text-[hsl(var(--bd-button-primary-text))] hover:bg-[hsl(var(--bd-button-primary-hover-bg))] disabled:border-[hsl(var(--bd-border))] disabled:bg-[hsl(var(--bd-surface-muted))] disabled:text-[hsl(var(--bd-text-muted))] disabled:opacity-100'

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
            className={cancelButtonClass}
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
            className={confirmButtonClass}
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

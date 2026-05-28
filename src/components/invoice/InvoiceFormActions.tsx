import { Button } from '@/components/ui/button'

interface InvoiceFormActionsProps {
  saving: boolean
  primaryLabel: string
  onSaveSent: () => void
  onSaveDraft: () => void
  onCancel: () => void
}

export default function InvoiceFormActions({
  saving,
  primaryLabel,
  onSaveSent,
  onSaveDraft,
  onCancel,
}: InvoiceFormActionsProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-card px-4 pb-4 pt-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-8 sm:pt-0">
      <div className="ml-auto flex max-w-[400px] flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          onClick={onSaveSent}
          className="h-11 px-6 text-[14px] font-bold"
          loading={saving}
        >
          {primaryLabel}
        </Button>
        <Button
          type="button"
          onClick={onSaveDraft}
          variant="secondary"
          className="h-11 px-6 text-[14px] font-medium"
          loading={saving}
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          className="h-11 border border-bd-border px-6 text-[14px] font-medium text-bd-text-muted hover:bg-bd-surface-muted"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

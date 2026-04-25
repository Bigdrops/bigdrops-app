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
          className="h-12 rounded-none bg-[#0f62fe] px-6 text-[15px] font-bold hover:bg-[#0353e9]"
        >
          {saving ? 'Saving...' : primaryLabel}
        </Button>
        <Button
          type="button"
          onClick={onSaveDraft}
          variant="secondary"
          className="h-11 rounded-none bg-muted px-6 text-[14px] text-foreground hover:bg-slate-200"
        >
          {saving ? 'Saving...' : 'Save as Draft'}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="h-11 rounded-none border-border px-6 text-[14px] text-muted-foreground"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

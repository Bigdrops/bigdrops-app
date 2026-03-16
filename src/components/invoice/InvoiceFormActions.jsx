import { Button } from '@/components/ui/button'

export default function InvoiceFormActions({
  saving,
  primaryLabel,
  onSaveSent,
  onSaveDraft,
  onCancel,
}) {
  return (
    <div className="ml-auto flex max-w-[400px] flex-col gap-2.5 pb-10">
      <Button
        type="button"
        onClick={onSaveSent}
        className="h-auto bg-red-700 px-6 py-3.5 text-[15px] font-bold hover:bg-red-800"
      >
        {saving ? 'Saving...' : primaryLabel}
      </Button>
      <Button
        type="button"
        onClick={onSaveDraft}
        variant="secondary"
        className="h-auto bg-slate-600 px-6 py-3.5 text-[15px] text-white hover:bg-slate-700"
      >
        {saving ? 'Saving...' : 'Save as Draft'}
      </Button>
      <Button
        type="button"
        onClick={onCancel}
        variant="outline"
        className="h-auto px-6 py-3.5 text-[15px] text-slate-600"
      >
        Cancel
      </Button>
    </div>
  )
}

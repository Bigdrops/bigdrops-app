import { Loader2, SaveAll } from 'lucide-react'
import { pageCardCls } from '@/components/invoice/mobile/mobileFormPrimitives'

interface FormFooterProps {
  onCancel: () => void
  onSaveDraft: () => void
  onSaveSent: () => void
  onFloatingSave: () => void
  saving: boolean
  primaryLabel: string
}

export function FormFooter({
  onCancel,
  onSaveDraft,
  onSaveSent,
  onFloatingSave,
  saving,
  primaryLabel,
}: FormFooterProps) {
  return (
    <>
      <div className="sticky bottom-0 z-10 border-t border-bd-border bg-bd-card-bg/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-sm">
        <div className="mx-auto max-w-[760px]">
          <div className={`${pageCardCls} p-2`}>
            <div className="grid grid-cols-[1fr_1fr_1.35fr] gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="h-11 rounded-[var(--bd-radius)] border border-bd-border bg-bd-surface text-[13px] font-bold text-bd-text transition hover:bg-bd-surface-muted disabled:border-bd-border disabled:bg-bd-surface-muted disabled:text-bd-text-muted disabled:opacity-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={saving}
                className="h-11 rounded-[var(--bd-radius)] border border-bd-border bg-bd-surface-muted text-[13px] font-bold text-bd-text transition hover:bg-bd-surface disabled:border-bd-border disabled:bg-bd-surface-muted disabled:text-bd-text-muted disabled:opacity-100"
              >
                Draft
              </button>
              <button
                type="button"
                onClick={onSaveSent}
                disabled={saving}
                className="h-11 rounded-[var(--bd-radius)] border border-transparent bg-bd-button-primary-bg text-[14px] font-black text-bd-button-primary-text shadow-sm transition-all active:scale-[0.98] disabled:border-bd-border disabled:bg-bd-surface-muted disabled:text-bd-text-muted disabled:opacity-100"
              >
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : primaryLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onFloatingSave}
        disabled={saving}
        className="fixed bottom-[calc(var(--bd-app-bottom-nav-offset,72px)+env(safe-area-inset-bottom,0px)+16px)] right-4 z-[60] flex h-[50px] w-[50px] items-center justify-center rounded-[18px] border border-transparent bg-bd-button-primary-bg text-bd-button-primary-text shadow-lg animate-in fade-in slide-in-from-bottom-4 sm:right-8 transition-transform active:scale-95 disabled:border-bd-border disabled:bg-bd-surface-muted disabled:text-bd-text-muted disabled:opacity-100"
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <SaveAll className="h-5 w-5" />}
      </button>
    </>
  )
}

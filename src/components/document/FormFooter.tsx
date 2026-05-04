import { Save } from 'lucide-react'
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
      <div className="sticky bottom-0 z-10 border-t border-[var(--bd-border-soft)] bg-[var(--bd-bg)] px-4 pb-5 pt-3">
        <div className="mx-auto max-w-[760px]">
          <div className={`${pageCardCls} p-2`}>
            <div className="grid grid-cols-[1fr_1fr_1.35fr] gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="h-11 rounded-[var(--bd-radius)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-[13px] font-bold text-[hsl(var(--bd-text-muted))] disabled:opacity-40 disabled:bg-[hsl(var(--bd-surface-muted))]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={saving}
                className="h-11 rounded-[var(--bd-radius)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[13px] font-bold text-[hsl(var(--bd-text))] disabled:opacity-40"
              >
                Draft
              </button>
              <button
                type="button"
                onClick={onSaveSent}
                disabled={saving}
                className="h-11 rounded-[var(--bd-radius)] border-0 bg-[hsl(var(--bd-button-primary-bg))] text-[14px] font-black text-[hsl(var(--bd-button-primary-text))] shadow-sm transition-all active:scale-[0.98] disabled:bg-[hsl(var(--bd-surface-muted))] disabled:text-[hsl(var(--bd-text-soft))] disabled:opacity-100"
              >
                {saving ? 'Saving…' : primaryLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onFloatingSave}
        disabled={saving}
        className="fixed bottom-[94px] right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--bd-fab-bg))] text-[hsl(var(--bd-fab-text))] shadow-lg animate-in fade-in slide-in-from-bottom-4 sm:right-8 transition-transform active:scale-95 disabled:bg-[hsl(var(--bd-surface-muted))] disabled:text-[hsl(var(--bd-text-soft))] disabled:opacity-100"
      >
        <Save className="h-5 w-5" />
      </button>
    </>
  )
}

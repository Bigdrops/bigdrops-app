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
                className="h-11 rounded-[var(--bd-radius)] border border-[var(--bd-border)] bg-[var(--bd-surface)] text-[13px] font-bold text-[var(--bd-text2)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={saving}
                className="h-11 rounded-[var(--bd-radius)] border border-[var(--bd-border)] bg-[var(--bd-bg2)] text-[13px] font-bold text-[var(--bd-text2)] disabled:opacity-60"
              >
                Draft
              </button>
              <button
                type="button"
                onClick={onSaveSent}
                disabled={saving}
                className="h-11 rounded-[var(--bd-radius)] border-0 bg-[var(--bd-text)] text-[14px] font-black text-white disabled:opacity-60"
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
        className="fixed bottom-[98px] right-4 z-[60] flex h-[48px] w-[48px] items-center justify-center rounded-[var(--bd-radius)] bg-[var(--bd-text)] text-white shadow-lg animate-in fade-in slide-in-from-bottom-4 sm:right-8"
      >
        <Save className="h-5 w-5" />
      </button>
    </>
  )
}

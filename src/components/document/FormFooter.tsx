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
      <div className="sticky bottom-0 z-10 border-t border-[var(--bd-border-soft)] bg-[var(--bd-bg)] px-3 pb-6 pt-3 sm:px-4">
        <div className="mx-auto max-w-2xl">
          <div className={`${pageCardCls} p-2 shadow-lg`}>
            <div className="grid grid-cols-[1fr_1fr_1.35fr] gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="h-12 rounded-[var(--bd-radius)] border border-[var(--bd-border)] bg-[var(--bd-surface)] text-[14px] font-bold text-[var(--bd-text2)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={saving}
                className="h-12 rounded-[var(--bd-radius)] border border-[var(--bd-border)] bg-[var(--bd-bg2)] text-[14px] font-bold text-[var(--bd-text2)] disabled:opacity-60"
              >
                Draft
              </button>
              <button
                type="button"
                onClick={onSaveSent}
                disabled={saving}
                className="h-12 rounded-[var(--bd-radius)] border-0 bg-[var(--bd-text)] text-[15px] font-black text-white shadow-md disabled:opacity-60"
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
        className="fixed bottom-[104px] right-4 z-[60] flex h-[52px] w-[52px] items-center justify-center rounded-[var(--bd-radius-lg)] bg-[var(--bd-text)] text-white shadow-xl animate-in fade-in slide-in-from-bottom-4 sm:right-8"
      >
        <Save className="h-5 w-5" />
      </button>
    </>
  )
}

import { Square, ArrowUp } from 'lucide-react'
import { useLayoutEffect, type FormEvent, type KeyboardEvent, type RefObject } from 'react'

/**
 * AssistantComposer — Bolu 2.0 Unified Composer
 * Provides auto-resizing input, thumb-zone send/stop buttons with streaming lockout,
 * safe-area bottom inset padding, and clean responsive helper text.
 */
export function AssistantComposer({
  value,
  busy,
  disabled,
  awaiting,
  inputRef,
  onChange,
  onSubmit,
  onKeyDown,
  onStop,
}: {
  value: string
  busy: boolean
  disabled?: boolean
  awaiting?: boolean
  contextLabel?: string
  inputRef: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onStop: () => void
}) {
  useLayoutEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const height = Math.min(textarea.scrollHeight, 160)
    textarea.style.height = `${height}px`
    textarea.style.overflowY = textarea.scrollHeight > 160 ? 'auto' : 'hidden'
  }, [inputRef, value])

  const isLocked = busy || Boolean(disabled)

  return (
    <div className="ac-composer px-3 py-2.5 sm:px-4 sm:py-3 border-t border-[var(--ac-line)] bg-[var(--ac-surface)]">
      <form className="ac-compose flex items-end gap-2 p-2 rounded-2xl border border-[var(--ac-line)] bg-[var(--ac-muted-surface)] transition-all focus-within:border-[var(--ac-accent)] focus-within:ring-1 focus-within:ring-[var(--ac-accent)]" onSubmit={onSubmit}>
        <textarea
          ref={inputRef}
          className="ac-input flex-1 bg-transparent border-0 resize-none outline-none text-xs sm:text-sm text-[var(--ac-ink)] placeholder-[var(--ac-muted)] leading-relaxed min-h-[36px] max-h-[160px] p-1 disabled:opacity-60 disabled:cursor-not-allowed"
          rows={1}
          value={value}
          disabled={isLocked}
          placeholder={
            isLocked
              ? (awaiting ? 'Review the proposed card above…' : 'Bolu is working…')
              : 'Ask Bolu or describe an invoice or quotation change…'
          }
          aria-label="Message Bolu assistant"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          aria-describedby="ac-composer-hint"
        />

        <div className="flex items-center shrink-0 mb-0.5">
          {busy ? (
            <button
              type="button"
              className="ac-send ac-send--stop size-8 sm:size-9 rounded-xl bg-rose-600 text-white flex items-center justify-center transition active:scale-95 shadow-sm"
              onClick={onStop}
              aria-label="Stop response generation"
              title="Stop generating"
            >
              <Square className="size-3.5 fill-current" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              className="ac-send size-8 sm:size-9 rounded-xl bg-[var(--ac-accent)] text-white flex items-center justify-center transition active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              disabled={!value.trim() || isLocked}
              aria-label="Send message"
              title="Send message"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </form>

      {/* Helper text hidden on mobile, visible on desktop with physical keyboards */}
      <p className="ac-foot hidden sm:block text-center mt-1.5 text-[11px] text-[var(--ac-muted)]" id="ac-composer-hint">
        Enter to send · Shift + Enter for a new line · Two-Gate human verification enforced
      </p>
    </div>
  )
}

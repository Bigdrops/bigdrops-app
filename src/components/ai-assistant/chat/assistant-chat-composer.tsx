import { Square, ArrowUp, FileText } from 'lucide-react'
import { useLayoutEffect, type FormEvent, type KeyboardEvent, type RefObject } from 'react'

/**
 * AssistantComposer — Unified Composer Card
 * Provides auto-resizing input, active document context pill,
 * and thumb-zone send / stop buttons with streaming lockout.
 */
export function AssistantComposer({
  value,
  busy,
  disabled,
  awaiting,
  contextLabel = 'Active Session',
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
    <div className="ac-composer">
      <form className="ac-compose" onSubmit={onSubmit}>
        <textarea
          ref={inputRef}
          className="ac-input disabled:opacity-60 disabled:cursor-not-allowed"
          rows={1}
          value={value}
          disabled={isLocked}
          placeholder={
            isLocked
              ? (awaiting ? 'Confirm or reject the card above…' : 'Bolu is working…')
              : 'Ask Bolu or describe an invoice change…'
          }
          aria-label="Message Bolu assistant"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          aria-describedby="ac-composer-hint"
        />

        <div className="ac-compose-bar">
          <div className="ac-compose-pills">
            <span className="ac-ctx-pill shrink-0" title="Current operations scope">
              <FileText className="size-3" aria-hidden="true" />
              {contextLabel}
            </span>
          </div>

          {busy ? (
            <button
              type="button"
              className="ac-send ac-send--stop"
              onClick={onStop}
              aria-label="Stop response generation"
            >
              <Square className="size-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              className="ac-send disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!value.trim() || isLocked}
              aria-label="Send message"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </form>
      <p className="ac-foot" id="ac-composer-hint">
        Enter to send · Shift + Enter for a new line · Two-Gate human verification enforced
      </p>
    </div>
  )
}

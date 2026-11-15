import { Sparkles, Square, ArrowUp, FileText, Wand2 } from 'lucide-react'
import { useLayoutEffect, type FormEvent, type KeyboardEvent, type RefObject } from 'react'

/**
 * AssistantComposer — Unified Composer Card
 * Provides auto-resizing input, active document context pill, quick-action chips,
 * and thumb-zone send / stop buttons.
 */
export function AssistantComposer({
  value,
  busy,
  awaiting,
  contextLabel = 'Active Session',
  suggestions = [],
  inputRef,
  onChange,
  onSubmit,
  onKeyDown,
  onStop,
  onInsert,
}: {
  value: string
  busy: boolean
  awaiting?: boolean
  contextLabel?: string
  suggestions?: string[]
  inputRef: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onStop: () => void
  onInsert: (text: string) => void
}) {
  useLayoutEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const height = Math.min(textarea.scrollHeight, 160)
    textarea.style.height = `${height}px`
    textarea.style.overflowY = textarea.scrollHeight > 160 ? 'auto' : 'hidden'
  }, [inputRef, value])

  const defaultSuggestions = suggestions.length > 0 ? suggestions : [
    'Show outstanding invoices',
    'Find an invoice',
    'Find a quotation',
  ]

  return (
    <div className="ac-composer">
      <form className="ac-compose" onSubmit={onSubmit}>
        <textarea
          ref={inputRef}
          className="ac-input"
          rows={1}
          value={value}
          placeholder={
            busy
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
            {defaultSuggestions.slice(0, 3).map((sug, idx) => (
              <button
                key={idx}
                type="button"
                className="ac-pill-btn shrink-0"
                onClick={() => onInsert(sug)}
              >
                {idx === 0 ? (
                  <Sparkles className="size-3" aria-hidden="true" />
                ) : (
                  <Wand2 className="size-3" aria-hidden="true" />
                )}
                <span className="truncate max-w-[140px]">{sug}</span>
              </button>
            ))}
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
              className="ac-send"
              disabled={!value.trim()}
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

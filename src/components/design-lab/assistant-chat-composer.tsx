import { Sparkles, Square, ArrowUp, Wand2, FileText } from 'lucide-react'
import { useLayoutEffect } from 'react'
import type { FormEvent, KeyboardEvent, RefObject } from 'react'

/**
 * The unified composer card: one rounded surface, action pills on the lower
 * left, send or stop on the lower right. The pills fill the input so the user
 * can edit before sending; they never send on their own.
 */
export function AssistantComposer({
  value,
  busy,
  awaiting,
  invoiceNumber,
  inputRef,
  onChange,
  onSubmit,
  onKeyDown,
  onStop,
  onInsert,
}: {
  value: string
  busy: boolean
  awaiting: boolean
  invoiceNumber: string
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

  return (
    <div className="ac-composer">
      <form className="ac-compose" onSubmit={onSubmit}>
        <textarea
          ref={inputRef}
          className="ac-input"
          rows={1}
          value={value}
          placeholder={
            busy ? (awaiting ? 'Confirm or reject the card above' : 'Working…') : 'Describe the invoice change'
          }
          aria-label="Message the assistant"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          aria-describedby="ac-composer-hint"
        />

        <div className="ac-compose-bar">
          <div className="ac-compose-pills">
            <span className="ac-ctx-pill" title="The assistant reads this form only">
              <FileText className="size-3" aria-hidden="true" />
              {invoiceNumber}
            </span>
            <button type="button" className="ac-pill-btn" onClick={() => onInsert('Create the sample invoice.')}>
              <Sparkles className="size-3" aria-hidden="true" />
              Sample
            </button>
            <button type="button" className="ac-pill-btn" onClick={() => onInsert('The price is 95,000 not 9,500.')}>
              <Wand2 className="size-3" aria-hidden="true" />
              Fix price
            </button>
          </div>

          {busy ? (
            <button type="button" className="ac-send ac-send--stop" onClick={onStop} aria-label="Stop the assistant">
              <Square className="size-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button type="submit" className="ac-send" disabled={!value.trim()} aria-label="Send message">
              <ArrowUp className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </form>
      <p className="ac-foot" id="ac-composer-hint">Enter to send · Shift + Enter for a new line · sample script, no data is saved</p>
    </div>
  )
}

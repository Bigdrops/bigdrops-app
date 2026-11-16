import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, Copy } from 'lucide-react'

import { copyToClipboard } from '@/lib/clipboard'

export type CopyFeedbackState = 'idle' | 'copied' | 'failed'

/**
 * useCopyFeedback — one clipboard interaction with honest result feedback.
 *
 * The state only becomes `copied` when `copyToClipboard` reports success.
 * On failure it becomes `failed`, so the UI never claims a copy that did not
 * happen. The state resets to `idle` after the reset window.
 */
export function useCopyFeedback(resetMs = 2000) {
  const [state, setState] = useState<CopyFeedbackState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const copy = useCallback(
    async (value: string) => {
      const ok = await copyToClipboard(value)
      setState(ok ? 'copied' : 'failed')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setState('idle'), resetMs)
      return ok
    },
    [resetMs],
  )

  return { copy, state }
}

/**
 * CopyButton — the single copy affordance for responses, code blocks and
 * artifacts. It copies the `value` it is given (never rendered HTML), keeps an
 * accessible label and tooltip, and stays a touch-sized target on coarse
 * pointers. `disabled` is used while streamed content is still incomplete.
 */
export function CopyButton({
  value,
  label = 'Copy',
  ariaLabel,
  copiedLabel = 'Copied',
  failedLabel = 'Copy failed',
  disabled = false,
  disabledHint,
  iconOnly = false,
  className = '',
}: {
  value: string
  label?: string
  ariaLabel?: string
  copiedLabel?: string
  failedLabel?: string
  disabled?: boolean
  disabledHint?: string
  iconOnly?: boolean
  className?: string
}) {
  const { copy, state } = useCopyFeedback()
  const accessibleLabel = ariaLabel ?? label
  const visibleLabel = state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : label
  const title = disabled ? (disabledHint ?? accessibleLabel) : accessibleLabel

  const icon =
    state === 'copied' ? (
      <Check className="size-3.5" aria-hidden="true" />
    ) : state === 'failed' ? (
      <AlertCircle className="size-3.5" aria-hidden="true" />
    ) : (
      <Copy className="size-3.5" aria-hidden="true" />
    )

  return (
    <span className={`ac-copy-wrap ${className}`.trim()}>
      <button
        type="button"
        className={`ac-copy${iconOnly ? ' ac-copy--icon' : ''}`}
        data-state={state}
        disabled={disabled}
        title={title}
        aria-label={accessibleLabel}
        onClick={() => void copy(value)}
      >
        {icon}
        {iconOnly ? null : <span>{visibleLabel}</span>}
      </button>
      <span className="ac-sr" role="status" aria-live="polite">
        {state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : ''}
      </span>
    </span>
  )
}

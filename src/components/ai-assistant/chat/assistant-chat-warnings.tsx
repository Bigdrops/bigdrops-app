import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * Reads the `warnings` array from a message's metadata.
 *
 * Warnings are produced by the application executor (Stage 0.2 catalog
 * discards, Stage 1/2 advance and document notices). They persist verbatim on
 * the assistant execution message; the UI must never reword, summarize or
 * drop them. Empty/absent/invalid values return `[]` so no empty container
 * ever renders.
 */
export function readMessageWarnings(metadata?: Record<string, unknown> | null): string[] {
  const raw = metadata?.warnings
  if (!Array.isArray(raw)) return []
  return raw.filter((warning): warning is string => typeof warning === 'string' && warning.trim().length > 0)
}

/**
 * Visible warnings banner for assistant execution messages.
 *
 * Each message owns its banner (keyed by message id at the call site) and
 * dismissal hides presentation only; it never mutates the message, the
 * underlying operation result, or any business data.
 */
export function MessageWarnings({ warnings, label }: { warnings: string[]; label?: string }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || warnings.length === 0) return null
  const heading = label ?? (warnings.length === 1 ? 'Bolu reported 1 warning' : `Bolu reported ${warnings.length} warnings`)
  return (
    <div className="ac-warnings" role="status" aria-live="polite" aria-label="Warnings reported by Bolu">
      <div className="ac-warnings-head">
        <AlertTriangle size={14} aria-hidden="true" />
        <span>{heading}</span>
        <button
          type="button"
          className="ac-warnings-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss warnings"
          title="Dismiss warnings"
        >
          <X size={12} aria-hidden="true" />
        </button>
      </div>
      <ul className="ac-warnings-list">
        {warnings.map((warning, index) => (
          <li key={index}>{warning}</li>
        ))}
      </ul>
    </div>
  )
}

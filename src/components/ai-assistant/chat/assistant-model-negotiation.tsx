import React from 'react'
import { AlertCircle, Clock, Sparkles, X } from 'lucide-react'
import type { CandidateAlternative } from '@/lib/ai-assistant/routing/bolu-alternative-discovery'

export interface ModelNegotiationPromptProps {
  failedModelName: string
  alternatives: CandidateAlternative[]
  secondsRemaining: number
  onSelectAlternative: (alt: CandidateAlternative) => void
  onDismiss: () => void
}

/**
 * Compact Manual Mode Fallback Negotiation Prompt
 *
 * Implements approved product requirements:
 * - Displays 3–5 eligible alternatives when pinned manual model retries are exhausted.
 * - 10-second visible countdown with automatic fallback to strongest candidate on expiry.
 * - Immediate selection capability (updates Manual selection and resubmits pending turn).
 * - Dismissal hides the prompt from view without cancelling the active background countdown.
 * - Meets 4-viewport responsive design standards (touch target >= 44px on mobile, wrapped flex, high-contrast badges).
 */
export function ModelNegotiationPrompt({
  failedModelName,
  alternatives,
  secondsRemaining,
  onSelectAlternative,
  onDismiss,
}: ModelNegotiationPromptProps) {
  if (alternatives.length === 0) return null

  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 10) * 100))

  return (
    <div
      role="region"
      aria-label="Model fallback choices"
      className="relative mx-3 mb-2 overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/40 dark:border-amber-500/30 backdrop-blur-md p-3 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {/* Header row: Status, timer, dismiss */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
          <div className="text-xs font-semibold text-amber-950 dark:text-amber-200 truncate">
            <span>{failedModelName || 'Selected model'}</span> unavailable
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
            <Clock className="size-3" aria-hidden="true" />
            <span>Auto-switching in {secondsRemaining}s</span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-amber-800/70 hover:text-amber-950 dark:text-amber-300/70 dark:hover:text-amber-100 hover:bg-amber-500/20 transition-colors"
            aria-label="Dismiss fallback prompt"
            title="Dismiss prompt (timer continues)"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Alternatives choices row */}
      <div className="text-[11px] text-amber-900/80 dark:text-amber-300/80 mb-1.5 font-medium">
        Select an alternative model now, or wait for automatic fallback:
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto py-0.5">
        {alternatives.map((alt, idx) => (
          <button
            key={`${alt.connectionId}:${alt.modelId}`}
            type="button"
            onClick={() => onSelectAlternative(alt)}
            className={`min-h-[44px] sm:min-h-[38px] flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              idx === 0
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-100 border-amber-500/40 shadow-xs font-semibold'
                : 'bg-white/80 dark:bg-slate-900/80 hover:bg-amber-500/15 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 hover:border-amber-500/30'
            }`}
          >
            {idx === 0 && <Sparkles className="size-3 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />}
            <span className="truncate max-w-[180px]">{alt.modelName}</span>
            {alt.isFree && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold uppercase tracking-wider">
                Free
              </span>
            )}
            {idx === 0 && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/30 text-amber-900 dark:text-amber-200 font-bold uppercase tracking-wider">
                Strongest
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Visual countdown progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/20">
        <div
          className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}

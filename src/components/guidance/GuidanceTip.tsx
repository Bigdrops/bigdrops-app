/**
 * Product Guidance presentation layer.
 *
 * One renderer for every guidance surface: ambient inline hints, contextual
 * cards, attention moments, and recovery guidance paired with errors. The
 * recovery action always stays dominant — guidance never covers primary
 * controls and never navigates the user away from unfinished work.
 *
 * Motion: single 200ms ease-out entrance (transform + opacity only),
 * instant under prefers-reduced-motion. Character/illustration slots reuse
 * the existing CSS avatar families.
 *
 * @see docs/prd/Adaptive\ Mobile-First\ UIUX\ Facelift\ PRD/Product-Guidance-Engagement-System.md §13, §14
 */

import { useEffect, useState } from 'react'
/* eslint-disable react-refresh/only-export-components -- single renderer file:
   GuidanceTip owns the avatar slot and inactivity nudge by design. */
import { cn } from '@/lib/utils'
import {
  IDLE_FOCUSED_MS,
  IDLE_PASSIVE_MS,
  getGuidanceEngine,
  type GuidanceLevel,
} from '@/domain/guidance/guidanceEngine'
import { TIP_LIBRARY, type LoadingTip } from '@/lib/tipContent'

// ── Illustration slot ──────────────────────────────────────────────

export type AvatarFamily =
  | 'payment'
  | 'document'
  | 'search'
  | 'archive'
  | 'compliance'
  | 'workspace'

const CONTEXT_FAMILY_MAP: Record<string, AvatarFamily> = {
  invoices: 'payment',
  waybills: 'document',
  clients: 'search',
  projects: 'archive',
  compliance: 'compliance',
  csr: 'compliance',
  quotations: 'document',
}

/** Contextual illustration family for a tip. Static slot, CSS-animated. */
export function familyForTip(tip: LoadingTip | null): AvatarFamily {
  if (!tip?.context) return 'workspace'
  return CONTEXT_FAMILY_MAP[tip.context] ?? 'workspace'
}

const FAMILY_GLYPH: Record<AvatarFamily, string> = {
  payment: '💳',
  document: '📄',
  search: '🔍',
  archive: '📦',
  compliance: '🛡️',
  workspace: '⚙️',
}

/**
 * Guidance illustration. Decorative motion only — always aria-hidden with
 * the full message carried as text beside it.
 */
export function GuidanceAvatar({
  family,
  large = false,
}: {
  family: AvatarFamily
  large?: boolean
}) {
  return (
    <div className={cn('relative', large ? 'h-12 w-12' : 'h-8 w-8')} aria-hidden="true">
      <div
        className={cn(
          `bd-avatar-${family} absolute inset-0 flex items-center justify-center`,
          large ? 'text-3xl' : 'text-lg',
        )}
      >
        {FAMILY_GLYPH[family]}
      </div>
    </div>
  )
}

// ── Guidance tip ─────────────────────────────────────────────────────

type GuidanceTipProps = {
  /** Selected guidance item. Renders nothing when null. */
  tip: LoadingTip | null
  /** Presentation intensity. Recovery stays subordinate to its error. */
  level?: GuidanceLevel
  /** Dismiss control. Required at Contextual and above. */
  onDismiss?: () => void
  /** Optional extra class on the outer wrapper. */
  className?: string
}

/**
 * Single guidance renderer. Key on the tip id replays the entrance when
 * the message changes. Informational only — no navigation actions.
 */
export default function GuidanceTip({
  tip,
  level = 2,
  onDismiss,
  className,
}: GuidanceTipProps) {
  if (!tip) return null

  if (level === 1) {
    return (
      <p
        role="status"
        aria-live="polite"
        className={cn('text-xs leading-relaxed text-muted-foreground', className)}
      >
        <span className="font-semibold">Tip: </span>
        {tip.message}
      </p>
    )
  }

  const attention = level === 3
  const recovery = level === 4

  return (
    <div
      key={tip.id}
      role="status"
      aria-live="polite"
      className={cn(
        'bd-guidance-enter w-full rounded-[18px] border bg-card',
        attention ? 'max-w-[360px] px-5 py-4' : 'max-w-[320px] px-4 py-3',
        recovery ? 'border-border/70' : 'border-border',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <GuidanceAvatar family={familyForTip(tip)} large={attention} />
        <div className="min-w-0 flex-1">
          <p className="text-[8px] font-extrabold uppercase tracking-[0.11em] text-muted-foreground/60">
            {recovery ? 'While you recover' : 'Quick Tip'}
          </p>
          <p className="mt-0.5 text-xs font-semibold leading-relaxed text-muted-foreground">
            {tip.message}
          </p>
        </div>
        {onDismiss && !recovery ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss tip"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg text-muted-foreground hover:bg-muted"
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ── Inactivity nudge ─────────────────────────────────────────────────

function isEditableFocused(): boolean {
  const active = typeof document !== 'undefined' ? document.activeElement : null
  if (!active || !(active instanceof HTMLElement)) return false
  const tag = active.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    active.isContentEditable
  )
}

/**
 * Session-level inactivity guidance. Passive inline banner, fixed above
 * the bottom nav with safe-area offset. Never navigates, never touches
 * form state, never appears while the user types. Maximum twice per
 * session with a ten-minute gap, enforced by the engine.
 */
export function InactivityNudge({ pathname }: { pathname: string }) {
  const engine = getGuidanceEngine()
  const [, setVersion] = useState(() => engine.getVersion())
  const [nudgeId, setNudgeId] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => engine.subscribe(() => setVersion(engine.getVersion())), [engine])

  useEffect(() => {
    let lastInput = Date.now()
    const touch = () => {
      lastInput = Date.now()
      setDismissed(false)
    }
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const
    events.forEach((event) => window.addEventListener(event, touch, { passive: true }))

    const id = setInterval(() => {
      if (document.hidden) return
      if (!engine.canPromptInactivity()) return
      const threshold = isEditableFocused() ? IDLE_FOCUSED_MS : IDLE_PASSIVE_MS
      if (Date.now() - lastInput < threshold) return
      const context = pathname.startsWith('/invoices')
        ? 'invoices'
        : pathname.startsWith('/quotations')
          ? 'quotations'
          : null
      const tip = engine.selectTip(context)
      if (!tip) return
      engine.recordExposure(tip.id)
      engine.recordInactivityPrompt()
      setDismissed(false)
      setNudgeId(tip.id)
    }, 5_000)

    return () => {
      clearInterval(id)
      events.forEach((event) => window.removeEventListener(event, touch))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  if (dismissed || !nudgeId) return null

  // Above the bottom nav on desktop, above the FAB on phones.
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(158px+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-[calc(78px+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-[320px]">
        <GuidanceTip
          tip={TIP_LIBRARY.find((tip) => tip.id === nudgeId) ?? null}
          level={1}
          className="rounded-2xl border-border bg-card/95 px-4 py-2.5 shadow-lg"
        />
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss suggestion"
          className="pointer-events-auto mx-auto mt-1 flex h-11 min-w-11 items-center justify-center px-3 text-xs font-semibold text-muted-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

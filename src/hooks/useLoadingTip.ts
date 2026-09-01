/**
 * Tip selection hook for the loading-tip system.
 *
 * Implements the priority-based selection and anti-repetition strategy
 * defined in §6 of the loading PRD.
 *
 * @see docs/prd/Adaptive\ Mobile-First\ UIUX\ Facelift\ PRD/10-loading-and-refresh.md §6
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  TIP_LIBRARY,
  type LoadingTip,
} from '@/lib/tipContent'

// ── Constants ──────────────────────────────────────────────────────

/** Maximum tips shown in a single loading session before recycling. */
const MAX_TIPS_PER_SESSION = 3

/** Minimum interval (ms) between tip rotations during long operations. */
const ROTATION_INTERVAL_MS = 8_000

/** How many recent tips to exclude when alternatives exist. */
const RECENT_HISTORY_SIZE = 5

// ── State ──────────────────────────────────────────────────────────

/** Module-context mapping: routing path prefix → context value. */
const CONTEXT_MAP: Record<string, string> = {
  '/invoices': 'invoices',
  '/quotations': 'quotations',
  '/waybills': 'waybills',
  '/clients': 'clients',
  '/csr': 'csr',
  '/projects': 'projects',
  '/compliance': 'compliance',
}

// ── Helpers ────────────────────────────────────────────────────────

function getActiveTips(): LoadingTip[] {
  return TIP_LIBRARY.filter((tip) => tip.active)
}

function getTipsForContext(context: string | null): LoadingTip[] {
  const all = getActiveTips()
  if (!context) return all
  return all.filter(
    (tip) => tip.context === context || tip.context === null,
  )
}

function resolveContext(pathname: string): string | null {
  for (const [prefix, context] of Object.entries(CONTEXT_MAP)) {
    if (pathname.startsWith(prefix)) return context
  }
  return null
}

/**
 * Select the next tip using the priority order from §6:
 * 1. Contextually relevant tip
 * 2. Feature or workflow tip relevant to the current module
 * 3. General productivity tip
 * 4. General product knowledge tip
 *
 * Excludes recently shown tips when alternatives exist.
 */
function selectTip(opts: {
  context: string | null
  recentIds: string[]
  sessionCount: number
}): LoadingTip | null {
  const { context, recentIds, sessionCount } = opts

  // Session cap: after MAX_TIPS_PER_SESSION, allow recycling
  const pool =
    sessionCount >= MAX_TIPS_PER_SESSION
      ? getActiveTips()
      : getTipsForContext(context)

  if (pool.length === 0) return null

  // Prefer non-recent tips
  const fresh = pool.filter((tip) => !recentIds.includes(tip.id))
  const candidates = fresh.length > 0 ? fresh : pool

  // Sort by priority (lower = first)
  candidates.sort((a, b) => a.priority - b.priority)

  return candidates[0] ?? null
}

// ── Hook ───────────────────────────────────────────────────────────

export type UseLoadingTipOptions = {
  /** Current pathname. Used for contextual tip selection. */
  pathname: string
  /** Whether the loading state is active. */
  active: boolean
  /** Interval between rotations in ms. Defaults to ROTATION_INTERVAL_MS. */
  rotationInterval?: number
}

export type UseLoadingTipResult = {
  /** The currently selected tip, or null if no tip should display. */
  tip: LoadingTip | null
  /** Advance to the next tip manually. */
  nextTip: () => void
}

export function useLoadingTip({
  pathname,
  active,
  rotationInterval = ROTATION_INTERVAL_MS,
}: UseLoadingTipOptions): UseLoadingTipResult {
  const [tip, setTip] = useState<LoadingTip | null>(null)
  const recentIdsRef = useRef<string[]>([])
  const sessionCountRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep pathname in a ref so the interval callback always reads the
  // latest value without restarting the timer on route changes.
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  const selectNext = useCallback(() => {
    const context = resolveContext(pathnameRef.current)
    const next = selectTip({
      context,
      recentIds: recentIdsRef.current,
      sessionCount: sessionCountRef.current,
    })

    if (next) {
      setTip(next)
      sessionCountRef.current += 1

      // Update recent history
      recentIdsRef.current = [next.id, ...recentIdsRef.current].slice(
        0,
        RECENT_HISTORY_SIZE,
      )
    }
  }, [])

  // Select first tip when becoming active.
  // Reset state when deactivated.
  useEffect(() => {
    if (active) {
      selectNext()
    } else {
      setTip(null)
      sessionCountRef.current = 0
      recentIdsRef.current = []
    }
  }, [active])

  // Rotate tips during long operations.
  // selectNext reads from refs, so the interval never restarts due to
  // pathname or tip state changes.
  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      selectNext()
    }, rotationInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [active, rotationInterval])

  const nextTip = useCallback(() => {
    selectNext()
  }, [])

  return { tip, nextTip }
}

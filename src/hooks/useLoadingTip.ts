/**
 * Tip selection hook for the loading-tip system.
 *
 * Selection and history live in the session-scoped Product Guidance
 * engine (`src/domain/guidance/guidanceEngine.ts`). Each mounted loader
 * owns an engine slot; deactivating hides the tip but never clears
 * history, so repeated mounts and second loading passes continue the
 * rotation instead of restarting it.
 *
 * @see docs/prd/Adaptive\ Mobile-First\ UIUX\ Facelift\ PRD/10-loading-and-refresh.md §6
 * @see docs/prd/Adaptive\ Mobile-First\ UIUX\ Facelift\ PRD/Product-Guidance-Engagement-System.md
 */

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import {
  GUIDANCE_ROTATION_INTERVAL_MS,
  RECONNECTING_WINDOW_MS,
  SAFE_WORKFLOW,
  getGuidanceEngine,
  resolveLaunchStatus,
  type Connectivity,
  type GuidanceLevel,
  type LaunchStage,
  type WorkflowSafety,
} from '@/domain/guidance/guidanceEngine'
import type { LoadingTip } from '@/lib/tipContent'

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

function resolveContext(pathname: string): string | null {
  for (const [prefix, context] of Object.entries(CONTEXT_MAP)) {
    if (pathname.startsWith(prefix)) return context
  }
  return null
}

function readOnline(): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
  return true
}

// ── Hook ───────────────────────────────────────────────────────────

export type UseLoadingTipOptions = {
  /** Current pathname. Used for contextual tip selection. */
  pathname: string
  /** Whether the loading state is active. */
  active: boolean
  /** Interval between rotations in ms. Defaults to 8s per §6. */
  rotationInterval?: number
  /** Live-launch stage, when the caller knows it. Drives status lines. */
  stage?: LaunchStage
  /** Workflow-safety flags. Caps presentation while the user works. */
  safety?: WorkflowSafety
}

export type UseLoadingTipResult = {
  /** The currently selected tip, or null if no tip should display. */
  tip: LoadingTip | null
  /** Advance to the next tip manually. */
  nextTip: () => void
  /** Dismiss the current tip for the rest of the session. */
  dismissTip: () => void
  /** Honest status line for the current launch/connectivity state. */
  status: string
  /** Current connectivity as seen by the guidance layer. */
  connectivity: Connectivity
  /** Presentation ceiling for the current workflow state. */
  cap: GuidanceLevel
}

export function useLoadingTip({
  pathname,
  active,
  rotationInterval = GUIDANCE_ROTATION_INTERVAL_MS,
  stage = 'workspace',
  safety = SAFE_WORKFLOW,
}: UseLoadingTipOptions): UseLoadingTipResult {
  const engine = getGuidanceEngine()
  const [online, setOnline] = useState<boolean>(() => readOnline())
  const onlineRef = useRef<boolean>(online)
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  const [reconnectedAtMs, setReconnectedAtMs] = useState<number | null>(null)
  // Stable per-mount slot id. The engine pins this loader's tip to it.
  const slot = useId()

  // Re-render when the engine state changes (activation, rotation, dismiss).
  useSyncExternalStore(
    useCallback((notify: () => void) => engine.subscribe(notify), [engine]),
    useCallback(() => engine.getVersion(), [engine]),
  )

  // Track connectivity. The offline→online flip latches a brief
  // reconnecting window so recovery guidance acknowledges the transition
  // without forcing reloads.
  useEffect(() => {
    const markOnline = () => {
      if (!onlineRef.current) {
        onlineRef.current = true
        setOnline(true)
        setReconnectedAtMs(Date.now())
      }
    }
    const markOffline = () => {
      onlineRef.current = false
      setOnline(false)
    }
    markOnline()
    window.addEventListener('online', markOnline)
    window.addEventListener('offline', markOffline)
    return () => {
      window.removeEventListener('online', markOnline)
      window.removeEventListener('offline', markOffline)
    }
  }, [])

  // Tick while active so prolonged waits can transition to the slow
  // state. Idle hooks never tick.
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNowMs(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [active])

  // Effective connectivity is a pure engine read: slow reflects elapsed
  // waiting from the slot's activation only, reconnecting holds briefly
  // after the link returns.
  const connectivity: Connectivity = engine.slotConnectivity(slot, {
    online,
    reconnectedAtMs:
      reconnectedAtMs !== null && nowMs - reconnectedAtMs < RECONNECTING_WINDOW_MS
        ? reconnectedAtMs
        : null,
    nowMs,
  })

  const context = resolveContext(pathname)

  // Pin the slot's tip while active; release on deactivation. The engine
  // owns all state — the effect body calls engine methods only.
  useEffect(() => {
    if (!active) {
      engine.deactivateSlot(slot)
      return
    }
    engine.activateSlot(slot, context, connectivity === 'offline')
    return () => {
      engine.deactivateSlot(slot)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, slot, active, pathname, connectivity])

  // Rotate during long operations. History guarantees the sequence
  // continues across passes instead of restarting.
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      engine.advanceSlot(slot, resolveContext(pathname))
    }, rotationInterval)
    return () => clearInterval(id)
  }, [engine, slot, active, rotationInterval, pathname])

  const nextTip = useCallback(() => {
    engine.advanceSlot(slot, resolveContext(pathname))
  }, [engine, slot, pathname])

  const dismissTip = useCallback(() => {
    engine.dismissSlot(slot)
  }, [engine, slot])

  return {
    tip: active ? engine.currentFor(slot) : null,
    nextTip,
    dismissTip,
    status: resolveLaunchStatus({ stage, connectivity }),
    connectivity,
    cap: engine.presentationCap(safety),
  }
}

/**
 * Product Guidance engine — single session-scoped guidance system.
 *
 * One engine serves every consumer (splash, loading surfaces, error and
 * offline states, inactivity). It answers: what state is the app in, what
 * is the user doing, how long has it lasted, what was already shown, and
 * what guidance (if any) is appropriate.
 *
 * Selection is deterministic (context → priority → least-recently-shown →
 * lowest session count → stable id order). No pure random: repeated loader
 * mounts and second loading passes continue the rotation instead of
 * restarting it.
 *
 * Guidance is informational only. It never navigates, submits, mutates,
 * resets, or discards user work.
 *
 * @see docs/prd/Adaptive\ Mobile-First\ UIUX\ Facelift\ PRD/Product-Guidance-Engagement-System.md
 * @see docs/prd/Adaptive\ Mobile-First\ UIUX\ Facelift\ PRD/10-loading-and-refresh.md
 */

import { TIP_LIBRARY, type LoadingTip } from '@/lib/tipContent'

// ── Constants ──────────────────────────────────────────────────────────

/** Minimum interval (ms) between tip rotations during long operations. */
export const GUIDANCE_ROTATION_INTERVAL_MS = 8_000

/** How many recent tips to exclude when alternatives exist. */
export const RECENT_HISTORY_SIZE = 5

/** Max exposures of one item per session before it retires. */
export const MAX_VIEWS_PER_ITEM_PER_SESSION = 3

/** An active load older than this is "slow" — guidance may acknowledge it. */
export const SLOW_OPERATION_THRESHOLD_MS = 12_000

/** How long the reconnecting state stays visible after reconnection. */
export const RECONNECTING_WINDOW_MS = 8_000

/** Inactivity thresholds (ms): passive viewing, focused input, dirty form. */
export const IDLE_PASSIVE_MS = 45_000
export const IDLE_FOCUSED_MS = 90_000
export const IDLE_DIRTY_FORM_MS = 120_000

/** Inactivity caps: max prompts per session, minimum gap between them. */
export const MAX_INACTIVITY_PROMPTS_PER_SESSION = 2
export const INACTIVITY_COOLDOWN_MS = 10 * 60_000

// ── Types ──────────────────────────────────────────────────────────────

/** Live-launch journey stage. Onboarding is not a stage — it has no tips. */
export type LaunchStage =
  | 'splash'
  | 'profile'
  | 'workspace'
  | 'provisioning'
  | 'waiting'
  | 'ready'

export type Connectivity = 'online' | 'slow' | 'offline' | 'reconnecting'

/** Presentation intensity. Recovery never outranks its error surface. */
export type GuidanceLevel = 1 | 2 | 3 | 4

export type WorkflowSafety = {
  /** Focus is inside an editable control. Caps presentation at Passive. */
  inputFocused: boolean
  /** Unsaved user work exists. Caps presentation at Passive. */
  formDirty: boolean
  /** User is inside a workflow that must not be interrupted. */
  inWorkflow: boolean
}

export const SAFE_WORKFLOW: WorkflowSafety = {
  inputFocused: false,
  formDirty: false,
  inWorkflow: false,
}

export type ExposureOutcome = 'expired' | 'dismissed' | 'acted'

type Exposure = { count: number; lastShownAt: number; dismissed: boolean }

// ── Launch status lines (contextual, §9) ───────────────────────────────

const STAGE_STATUS: Record<LaunchStage, string> = {
  splash: 'Preparing your workspace...',
  profile: 'Loading your account. This takes only a moment.',
  workspace: 'Getting documents and projects in order...',
  provisioning: 'Setting up your company...',
  waiting: 'Waiting for approval. This page refreshes automatically.',
  ready: 'Ready.',
}

/**
 * Status line for the current launch state. Honest about connectivity:
 * slow acknowledges the wait without claiming progress, offline states
 * the connection fact, reconnecting confirms recovery without reload.
 */
export function resolveLaunchStatus(opts: {
  stage: LaunchStage
  connectivity: Connectivity
}): string {
  const { stage, connectivity } = opts
  if (connectivity === 'offline') return 'Connect to the internet to continue.'
  if (connectivity === 'reconnecting')
    return 'Connection restored. Finishing your workspace setup.'
  if (connectivity === 'slow') return 'Still working. This is taking longer than expected.'
  return STAGE_STATUS[stage]
}

// ── Tip-context routing ────────────────────────────────────────────────

/**
 * Which tip context a launch state should draw from. Errors select
 * error-relevant guidance, offline selects offline guidance, long waits
 * select waiting guidance — never a generic global tip everywhere.
 */
export function resolveTipContext(opts: {
  stage: LaunchStage
  connectivity: Connectivity
  moduleContext: string | null
}): string | null {
  const { connectivity, moduleContext } = opts
  if (connectivity === 'offline') return null
  return moduleContext
}

/** Offline tip id: the sync-on-reconnect workflow tip. */
export const OFFLINE_TIP_ID = 'tip.workflow.offline-drafts'

/**
 * Effective connectivity for guidance. Pure and testable.
 *
 * - Offline wins whenever the browser reports no connection.
 * - Reconnecting holds briefly after the connection returns, so recovery
 *   guidance acknowledges the transition without forcing reloads.
 * - Slow reflects elapsed waiting time only. It never claims the network
 *   is slow — the status copy states the wait, not a diagnosis.
 */
export function resolveEffectiveConnectivity(opts: {
  online: boolean
  active: boolean
  activeSinceMs: number | null
  reconnectedAtMs: number | null
  nowMs: number
}): Connectivity {
  const { online, active, activeSinceMs, reconnectedAtMs, nowMs } = opts
  if (!online) return 'offline'
  if (
    reconnectedAtMs !== null &&
    nowMs - reconnectedAtMs < RECONNECTING_WINDOW_MS
  )
    return 'reconnecting'
  if (
    active &&
    activeSinceMs !== null &&
    nowMs - activeSinceMs >= SLOW_OPERATION_THRESHOLD_MS
  )
    return 'slow'
  return 'online'
}

/** Long-wait tip id: record-payments guidance for prolonged waits. */
export const LONG_WAIT_TIP_ID = 'tip.workflow.record-payment'

// ── Engine ─────────────────────────────────────────────────────────────

export class GuidanceEngine {
  private exposures = new Map<string, Exposure>()
  private recent: string[] = []
  private inactivityPrompts = 0
  private lastInactivityPromptAt = 0
  private version = 0
  private listeners = new Set<() => void>()

  /** Subscribe to selection changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getVersion(): number {
    return this.version
  }

  private emit(): void {
    this.version += 1
    for (const listener of this.listeners) listener()
  }

  private exposureFor(id: string): Exposure {
    let exposure = this.exposures.get(id)
    if (!exposure) {
      exposure = { count: 0, lastShownAt: 0, dismissed: false }
      this.exposures.set(id, exposure)
    }
    return exposure
  }

  /**
   * Deterministic selection per plan §7: contextual match first, then
   * priority, then least-recently-shown, then lowest session view count,
   * ties broken by stable id order. Dismissed and over-cap items are
   * excluded; recent items are excluded while alternatives exist.
   */
  selectTip(context: string | null): LoadingTip | null {
    const pool = TIP_LIBRARY.filter((tip) => tip.active)
    if (pool.length === 0) return null

    const inContext = context
      ? pool.filter((tip) => tip.context === context || tip.context === null)
      : pool

    const eligible = inContext.filter((tip) => {
      const exposure = this.exposureFor(tip.id)
      if (exposure.dismissed) return false
      if (exposure.count >= MAX_VIEWS_PER_ITEM_PER_SESSION) return false
      return true
    })

    const candidates = eligible.length > 0 ? eligible : inContext
    if (candidates.length === 0) return null

    const fresh = candidates.filter((tip) => !this.recent.includes(tip.id))
    const shortlist = fresh.length > 0 ? fresh : candidates

    const ranked = [...shortlist].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      const aLast = this.exposureFor(a.id).lastShownAt
      const bLast = this.exposureFor(b.id).lastShownAt
      if (aLast !== bLast) return aLast - bLast
      const aCount = this.exposureFor(a.id).count
      const bCount = this.exposureFor(b.id).count
      if (aCount !== bCount) return aCount - bCount
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })

    return ranked[0] ?? null
  }

  /** Record an exposure. History survives loader remounts and passes. */
  recordExposure(id: string, outcome: ExposureOutcome = 'expired'): void {
    const exposure = this.exposureFor(id)
    exposure.count += 1
    exposure.lastShownAt = Date.now()
    if (outcome === 'dismissed') exposure.dismissed = true
    this.recent = [id, ...this.recent.filter((recent) => recent !== id)].slice(
      0,
      RECENT_HISTORY_SIZE,
    )
    this.emit()
  }

  /** Dismiss locks the item for the rest of the session. */
  dismiss(id: string): void {
    this.recordExposure(id, 'dismissed')
  }

  // ── Loader slots ─────────────────────────────────────────────────
  // Each mounted loader owns a slot. The engine holds the slot's current
  // tip, so React effects only ever call engine methods (no setState in
  // effect bodies) and read through subscription.

  private slots = new Map<string, string>()

  /** Select, expose, and pin the current tip for a loader slot. */
  activateSlot(slot: string, context: string | null, offline: boolean): void {
    let tip: LoadingTip | null = null
    if (offline) {
      tip = TIP_LIBRARY.find((item) => item.id === OFFLINE_TIP_ID && item.active) ?? null
    }
    tip = tip ?? this.selectTip(context)
    if (!tip) {
      this.slots.delete(slot)
      return
    }
    this.slots.set(slot, tip.id)
    this.recordExposure(tip.id)
  }

  /** Release a loader slot. History is kept — nothing resets. */
  deactivateSlot(slot: string): void {
    if (this.slots.delete(slot)) this.emit()
  }

  /** Advance a slot to the next tip (rotation, manual advance). */
  advanceSlot(slot: string, context: string | null): void {
    const tip = this.selectTip(context)
    if (!tip) {
      this.slots.delete(slot)
      return
    }
    this.slots.set(slot, tip.id)
    this.recordExposure(tip.id)
  }

  /** Dismiss a slot's current tip for the rest of the session. */
  dismissSlot(slot: string): void {
    const id = this.slots.get(slot)
    this.slots.delete(slot)
    if (id) this.dismiss(id)
    else this.emit()
  }

  /** Current tip pinned to a slot, or null. */
  currentFor(slot: string): LoadingTip | null {
    const id = this.slots.get(slot)
    if (!id) return null
    return TIP_LIBRARY.find((tip) => tip.id === id) ?? null
  }

  /**
   * Suppression always wins over eligibility. Active typing, focused
   * input, visible errors, and an already-visible item suppress new
   * presentations above Passive.
   */
  presentationCap(safety: WorkflowSafety): GuidanceLevel {
    if (safety.inputFocused || safety.formDirty) return 1
    return 2
  }

  /** Inactivity prompt eligibility with mandatory caps and cooldowns. */
  canPromptInactivity(now: number = Date.now()): boolean {
    if (this.inactivityPrompts >= MAX_INACTIVITY_PROMPTS_PER_SESSION) return false
    if (now - this.lastInactivityPromptAt < INACTIVITY_COOLDOWN_MS) return false
    return true
  }

  recordInactivityPrompt(now: number = Date.now()): void {
    this.inactivityPrompts += 1
    this.lastInactivityPromptAt = now
    this.emit()
  }

  /** Idle threshold for the current workflow state. */
  idleThresholdMs(safety: WorkflowSafety): number {
    if (safety.formDirty) return IDLE_DIRTY_FORM_MS
    if (safety.inputFocused) return IDLE_FOCUSED_MS
    return IDLE_PASSIVE_MS
  }
}

// ── Session singleton ──────────────────────────────────────────────────

let singleton: GuidanceEngine | null = null

/** Session-scoped engine. One instance per session, never per loader. */
export function getGuidanceEngine(): GuidanceEngine {
  if (!singleton) singleton = new GuidanceEngine()
  return singleton
}

/** Test seam: discard the session engine. */
export function resetGuidanceEngine(): void {
  singleton = null
}

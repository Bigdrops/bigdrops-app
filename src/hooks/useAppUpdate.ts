import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

import {
  MIN_POLICY_FETCH_INTERVAL_MS,
  resolveUpdateState,
  describeGraceRemaining,
  type GraceRemaining,
  type UpdateState,
} from '@/domain/appUpdate/updateStateMachine'
import type { ApprovedRelease } from '@/lib/appUpdate/releaseDiscovery'
import { fetchReleasePolicy } from '@/lib/appUpdate/releasePolicyClient'
import { fetchApprovedRelease } from '@/lib/appUpdate/releaseDiscovery'
import { getAppVersionInfo } from '@/lib/appUpdate/appVersion'
import {
  logAppUpdateDiagnostic,
  type CheckDiagnostics,
  type CheckReason,
  type DiscoveryOutcome,
} from '@/lib/appUpdate/updateDiagnostics'
import { createCheckCoordinator } from '@/lib/appUpdate/checkCoordinator'
import {
  loadPersistedGraceState,
  savePersistedGraceState,
  clearPersistedGraceState,
} from '@/lib/appUpdate/graceState'
import {
  downloadApkNative,
  installApkNative,
  cancelDownloadNative,
  deleteDownloadNative,
  onApkDownloadProgress,
  hasApkUpdatePlugin,
} from '@/lib/native/apkUpdate'

/**
 * Update orchestration hook: discovery, grace-state persistence, and the
 * in-app download/install actions.
 *
 * Check cadence: launch + resume, throttled by MIN_POLICY_FETCH_INTERVAL_MS.
 * Repeated resumes never create a metadata fetch loop. The persisted grace
 * anchor re-evaluates locally on every tick, so enforcement does not
 * depend on fetching.
 */
export type DownloadPhase =
  | { kind: 'idle' }
  | { kind: 'downloading'; downloadedBytes: number; totalBytes: number | null }
  | { kind: 'downloaded'; fileName: string; uri: string }
  | { kind: 'failed'; message: string }
  | { kind: 'installing' }

/**
 * Result of one completed update check. Returned directly (not via React
 * state) so callers can act on the exact check they awaited without
 * depending on re-render timing.
 */
export interface CheckResult {
  state: UpdateState
  /** Approved release detail for the policy target, null when none applies. */
  release: ApprovedRelease | null
  /** Supplemental safe diagnostics. Product state stays in `state`. */
  diagnostics: CheckDiagnostics
}

export interface UseAppUpdateResult {
  /** Resolved update state (up_to_date/available/grace/blocked/unavailable). */
  state: UpdateState
  /** Approved release detail, when discovered for the policy target. */
  release: ApprovedRelease | null
  /** Human-readable remaining grace time, null when not in grace. */
  graceRemaining: GraceRemaining | null
  /** True once initial discovery has settled (prevents splash flicker). */
  ready: boolean
  downloadPhase: DownloadPhase
  startInAppDownload: () => Promise<void>
  cancelInAppDownload: () => Promise<void>
  installDownloadedApk: () => Promise<void>
  openWebDownload: () => Promise<void>
  /** Clears a finished/failed download file from app cache. */
  cleanupDownload: () => Promise<void>
  /** Manual check for updates. Bypasses the 6-hour throttle. Resolves with
   * the exact completed check result, or null when no check ran. */
  checkForUpdate: () => Promise<CheckResult | null>
}

export function useAppUpdate(options: { enabled: boolean }): UseAppUpdateResult {
  const { enabled } = options
  const isAndroid = Capacitor.getPlatform() === 'android'

  const [state, setState] = useState<UpdateState>({
    status: enabled ? 'unavailable' : 'up_to_date',
    policy: null,
    graceDeadlineMs: null,
    graceAnchorToPersist: null,
    clearPersistedState: false,
  })
  const [release, setRelease] = useState<ApprovedRelease | null>(null)
  const [ready, setReady] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [downloadPhase, setDownloadPhase] = useState<DownloadPhase>({ kind: 'idle' })

  const lastCheckAtRef = useRef(0)
  const coordinatorRef = useRef(createCheckCoordinator<CheckResult | null>())
  const downloadingUrlRef = useRef<string | null>(null)
  const serverNowRef = useRef<number | null>(null)
  const deviceNowAtServerRef = useRef<number | null>(null)
  const downloadedFileRef = useRef<{ fileName: string; uri: string } | null>(null)
  const progressHandleRef = useRef<PluginListenerHandle | null>(null)

  const tick = useCallback(() => setNowMs(Date.now()), [])

  // Re-evaluate grace/blocked locally every 30s while visible. This keeps
  // the deadline enforced without any network dependency.
  useEffect(() => {
    if (!enabled || !isAndroid) return
    const interval = window.setInterval(tick, 30_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, isAndroid, tick])

  const runCheckInner = useCallback(
    async (force: boolean): Promise<CheckResult | null> => {
      const now = Date.now()
      if (!force && now - lastCheckAtRef.current < MIN_POLICY_FETCH_INTERVAL_MS) {
        // Throttled resume: still re-run the pure state machine against
        // persisted state so local enforcement continues without fetching.
        const persisted = loadPersistedGraceState()
        const version = await getAppVersionInfo()
        const throttledState = resolveUpdateState({
          policyAvailable: false,
          installedVersionCode: version.versionCode,
          rawPolicy: null,
          persisted,
          nowMs: now,
        })
        setState(throttledState)
        // No fetch attempted on this path: the diagnostic fields carry no
        // fresh signal. Manual callers never receive this result (a forced
        // request chains a fresh check instead of joining a stale one).
        return {
          state: throttledState,
          release: null,
          diagnostics: {
            reason: 'throttled-local',
            forced: false,
            joinedInFlight: false,
            policy: 'no-row',
            discovery: 'not-attempted',
            errorCode: null,
          },
        }
      }

      lastCheckAtRef.current = now

      try {
        const [version, policyResult] = await Promise.all([
          getAppVersionInfo(),
          fetchReleasePolicy(),
        ])

        serverNowRef.current = policyResult.serverNowMs
        deviceNowAtServerRef.current = policyResult.serverNowMs !== null ? Date.now() : null

        // Trusted-time anchor: prefer the policy's effective_at (already a
        // server timestamp validated against server_now). When absent, the
        // state machine anchors at first-seen using the best available now.
        const persisted = loadPersistedGraceState()

        const nextState = resolveUpdateState({
          policyAvailable: policyResult.available,
          installedVersionCode: version.versionCode,
          rawPolicy: policyResult.policy,
          persisted,
          nowMs: policyResult.serverNowMs ?? Date.now(),
        })

        // Persist anchor transitions exactly as the machine prescribes.
        if (nextState.graceAnchorToPersist) {
          savePersistedGraceState(nextState.graceAnchorToPersist)
        }
        if (nextState.clearPersistedState) {
          clearPersistedGraceState()
        }

        setState(nextState)

        let reason: CheckReason = 'ok'
        if (policyResult.diagnosis === 'transport-error') {
          reason = 'policy-fetch-error'
        } else if (policyResult.diagnosis === 'malformed') {
          reason = 'policy-malformed'
        } else if (version.versionCode === null) {
          reason = 'version-unknown'
        }

        // Release detail (approved asset URL) only matters when a policy
        // target exists; never fetch it otherwise. Discovery never controls
        // the product state resolved above.
        let approved: ApprovedRelease | null = null
        let discovery: DiscoveryOutcome = 'not-attempted'
        if (nextState.policy) {
          if (force) {
            // Awaited so the caller receives the exact completed result.
            // A null outcome clears stale detail instead of reusing it.
            approved = await fetchApprovedRelease(
              nextState.policy.versionCode,
              nextState.policy.apkAssetPrefix,
            )
            setRelease(approved)
            discovery = approved ? 'success' : 'failed'
          } else {
            void fetchApprovedRelease(
              nextState.policy.versionCode,
              nextState.policy.apkAssetPrefix,
            ).then((fetched) => {
              if (fetched) setRelease(fetched)
            })
          }
        } else {
          setRelease(null)
        }

        const diagnostics: CheckDiagnostics = {
          reason,
          forced: force,
          joinedInFlight: false,
          policy: policyResult.diagnosis,
          discovery,
          errorCode: policyResult.errorCode,
        }
        logAppUpdateDiagnostic(diagnostics)

        return { state: nextState, release: approved, diagnostics }
      } catch {
        // Truly unexpected failure (leaf operations already fail safe on
        // their own). Preserve persisted enforcement, never block the app
        // on missing metadata, and report a safe reason.
        const persisted = loadPersistedGraceState()
        const fallback = resolveUpdateState({
          policyAvailable: false,
          installedVersionCode: null,
          rawPolicy: null,
          persisted,
          nowMs: Date.now(),
        })
        setState(fallback)
        setRelease(null)
        const fallbackDiagnostics: CheckDiagnostics = {
          reason: 'unexpected-error',
          forced: force,
          joinedInFlight: false,
          policy: 'transport-error',
          discovery: 'not-attempted',
          errorCode: null,
        }
        logAppUpdateDiagnostic(fallbackDiagnostics)
        return { state: fallback, release: null, diagnostics: fallbackDiagnostics }
      } finally {
        setReady(true)
      }
    },
    [enabled, isAndroid],
  )

  // Shared in-flight routing: concurrent launch/resume/manual triggers
  // never cause two simultaneous authoritative fetches. A caller joins a
  // fresh operation already running; a forced request arriving while only
  // a stale local-only operation runs chains one fresh check after it
  // settles instead of inheriting the stale result.
  const runCheck = useCallback(
    (force: boolean): Promise<CheckResult | null> => {
      if (!enabled || !isAndroid) return Promise.resolve(null)
      const desiresFresh =
        force || Date.now() - lastCheckAtRef.current >= MIN_POLICY_FETCH_INTERVAL_MS
      const { promise, joined } = coordinatorRef.current.submit(desiresFresh, (forced) =>
        runCheckInner(forced),
      )
      if (!joined) return promise
      return promise.then((result) =>
        result
          ? { ...result, diagnostics: { ...result.diagnostics, joinedInFlight: true } }
          : result,
      )
    },
    [enabled, isAndroid, runCheckInner],
  )

  // Launch + resume discovery. appStateChange covers background/foreground;
  // visibilitychange covers browser contexts. Throttling prevents loops.
  useEffect(() => {
    if (!enabled || !isAndroid) {
      setReady(true)
      return
    }

    void runCheck(false)

    let resumeHandle: PluginListenerHandle | null = null
    let cancelled = false

    void (async () => {
      try {
        const App = (await import('@capacitor/app')).App
        const handle = await App.addListener('appStateChange', (appState) => {
          if (appState.isActive && !cancelled) void runCheck(false)
        })
        if (cancelled) {
          void handle.remove()
        } else {
          resumeHandle = handle
        }
      } catch {
        // Resume-based recheck is best-effort.
      }
    })()

    return () => {
      cancelled = true
      resumeHandle?.remove()
    }
  }, [enabled, isAndroid, runCheck])

  const registerProgressListener = useCallback(async () => {
    if (progressHandleRef.current) return
    progressHandleRef.current = await onApkDownloadProgress((event) => {
      if (downloadingUrlRef.current === null) return
      setDownloadPhase({
        kind: 'downloading',
        downloadedBytes: event.downloadedBytes,
        totalBytes: event.totalBytes,
      })
    })
  }, [])

  const startInAppDownload = useCallback(async () => {
    const apkAsset = release?.assets[0]
    if (!apkAsset || !hasApkUpdatePlugin()) return
    if (downloadingUrlRef.current !== null) return // duplicate-download guard
    if (downloadPhase.kind === 'downloading') return

    downloadingUrlRef.current = apkAsset.downloadUrl
    setDownloadPhase({ kind: 'downloading', downloadedBytes: 0, totalBytes: apkAsset.sizeBytes })

    try {
      await registerProgressListener()
      const result = await downloadApkNative({
        url: apkAsset.downloadUrl,
        expectedPrefix: state.policy?.apkAssetPrefix,
      })
      downloadedFileRef.current = { fileName: result.fileName, uri: result.uri }
      setDownloadPhase({ kind: 'downloaded', fileName: result.fileName, uri: result.uri })
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Download failed. Check your connection and try again.'
      setDownloadPhase({ kind: 'failed', message })
    } finally {
      downloadingUrlRef.current = null
    }
  }, [release, state.policy, downloadPhase.kind, registerProgressListener])

  const cancelInAppDownload = useCallback(async () => {
    if (downloadPhase.kind !== 'downloading') return
    try {
      await cancelDownloadNative()
    } finally {
      downloadingUrlRef.current = null
      setDownloadPhase({ kind: 'idle' })
    }
  }, [downloadPhase.kind])

  const installDownloadedApk = useCallback(async () => {
    const downloaded = downloadedFileRef.current
    if (!downloaded) return
    setDownloadPhase({ kind: 'installing' })
    try {
      await installApkNative({ uri: downloaded.uri })
      // Installer takes over; the app may be backgrounded or replaced.
      // State stays 'installing' until the user returns.
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Installation could not start. Try the download again.'
      setDownloadPhase({ kind: 'failed', message })
    }
  }, [])

  const openWebDownload = useCallback(async () => {
    // Web path: approved destination only. Policy URL wins; GitHub release
    // page is the fallback. Never fabricate a URL from parts.
    const webUrl = state.policy?.webReleaseUrl ?? release?.webUrl ?? null
    if (!webUrl) return

    try {
      if (isAndroid) {
        const Browser = (await import('@capacitor/browser')).Browser
        await Browser.open({ url: webUrl })
        return
      }
      window.open(webUrl, '_blank', 'noopener,noreferrer')
    } catch {
      window.open(webUrl, '_blank', 'noopener,noreferrer')
    }
  }, [state.policy, release, isAndroid])

  const cleanupDownload = useCallback(async () => {
    const downloaded = downloadedFileRef.current
    if (!downloaded) return
    downloadedFileRef.current = null
    setDownloadPhase({ kind: 'idle' })
    try {
      await deleteDownloadNative({ fileName: downloaded.fileName })
    } catch {
      // Cache cleanup is best-effort; Android clears cache dirs under pressure.
    }
  }, [])

  useEffect(() => {
    return () => {
      void progressHandleRef.current?.remove()
      progressHandleRef.current = null
    }
  }, [])

  const checkForUpdate = useCallback(() => {
    return runCheck(true)
  }, [runCheck])

  const graceRemaining = useMemo(() => {
    if (state.graceDeadlineMs === null) return null
    return describeGraceRemaining(state.graceDeadlineMs, nowMs)
  }, [state.graceDeadlineMs, nowMs])

  // Terminal stale-download hygiene: a downloaded APK from a previous
  // session cannot be reused safely across restarts (cache may be purged),
  // so nothing is restored here — the file simply expires in cache.

  return {
    state,
    release,
    graceRemaining,
    ready,
    downloadPhase,
    startInAppDownload,
    cancelInAppDownload,
    installDownloadedApk,
    openWebDownload,
    cleanupDownload,
    checkForUpdate,
  }
}

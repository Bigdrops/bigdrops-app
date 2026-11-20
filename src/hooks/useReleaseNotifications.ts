/** Automatic, non-blocking release-note presentation for Web and Android. */

import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/supabase'
import { useAppUpdateContext } from '@/contexts/AppUpdateContext'
import { parseReleaseNotes } from '@/domain/appUpdate/changelog'
import { isReleaseAcknowledgedByUser, markReleaseAcknowledgedByUser } from '@/lib/appUpdate/releaseAcknowledgementClient'
import {
  dismissReleaseNotification,
  isReleaseAcknowledgedLocally,
  isReleaseNotificationDismissed,
  markReleaseAcknowledgedLocally,
  observeInstalledVersion,
  observeWebRelease,
  type InstalledVersionObservation,
} from '@/lib/appUpdate/releaseAcknowledgementLocalStorage'
import { getAppVersionInfo } from '@/lib/appUpdate/appVersion'
import { validateReleasePolicy, type ReleasePolicyInput } from '@/domain/appUpdate/updateStateMachine'
import {
  resolveReleaseDiscovery,
  type ReleaseDiscoveryState,
} from '@/domain/appUpdate/releaseDiscovery'
import type { ChangelogEntry } from '@/domain/appUpdate/changelog'

export interface ReleaseNotificationBannerContent {
  key: string
  versionLabel: string
  versionCode: number
  entries: ChangelogEntry[]
  releasedLabel: string | null
  isMandatory: boolean
}

export type { ReleaseDiscoveryState }

export interface UseReleaseNotificationsResult {
  bannerOpen: boolean
  currentBanner: ReleaseNotificationBannerContent | null
  /** Discovery outcome for the current release. */
  discovery: ReleaseDiscoveryState
  /** True when the current release is permanently acknowledged. */
  acknowledged: boolean
  /** True when the notice is dismissed for this device and account. */
  dismissed: boolean
  acknowledgeCurrent: () => Promise<void>
  dismissCurrent: () => Promise<void>
}

const emptyReleaseNotifications: UseReleaseNotificationsResult = {
  bannerOpen: false,
  currentBanner: null,
  discovery: 'loading',
  acknowledged: false,
  dismissed: false,
  acknowledgeCurrent: async () => {},
  dismissCurrent: async () => {},
}

export const ReleaseNotificationsContext = React.createContext<UseReleaseNotificationsResult>(
  emptyReleaseNotifications,
)

export function ReleaseNotificationsProvider({ children }: { children: React.ReactNode }) {
  const value = useReleaseNotifications({ enabled: true })
  return React.createElement(ReleaseNotificationsContext.Provider, { value }, children)
}

export function useReleaseNotificationContext() {
  return React.useContext(ReleaseNotificationsContext)
}

function getPlatform(): 'web' | 'android' {
  return Capacitor.getPlatform() === 'android' ? 'android' : 'web'
}

export function useReleaseNotifications(options: { enabled: boolean }): UseReleaseNotificationsResult {
  const { enabled } = options
  const { state, ready } = useAppUpdateContext()
  const [bannerOpen, setBannerOpen] = useState(false)
  const [currentBanner, setCurrentBanner] = useState<ReleaseNotificationBannerContent | null>(null)
  const [discovery, setDiscovery] = useState<ReleaseDiscoveryState>('loading')
  const [acknowledged, setAcknowledged] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [webPolicy, setWebPolicy] = useState<ReleasePolicyInput | null>(null)
  const [authRevision, setAuthRevision] = useState(0)
  const [lifecycleRevision, setLifecycleRevision] = useState(0)
  const evaluationId = useRef(0)
  const accountId = useRef<string | null | undefined>(undefined)
  const bannerAccountId = useRef<string | null>(null)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      accountId.current = undefined
      bannerAccountId.current = null
      setBannerOpen(false)
      setCurrentBanner(null)
      setDiscovery('loading')
      setAcknowledged(false)
      setDismissed(false)
      setAuthRevision((revision) => revision + 1)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!enabled || getPlatform() !== 'android') return
    let active = true
    let removeListener: (() => void) | undefined
    void import('@capacitor/app').then(({ App }) =>
      App.addListener('appStateChange', ({ isActive }) => {
        if (active && isActive) setLifecycleRevision((revision) => revision + 1)
      }).then((handle) => {
        if (active) removeListener = () => void handle.remove()
        else void handle.remove()
      }),
    ).catch(() => {})
    return () => {
      active = false
      removeListener?.()
    }
  }, [enabled])

  // Read the authoritative policy for Web. Android's update hook already owns
  // policy discovery and must remain the only provider for its enforcement state.
  useEffect(() => {
    if (!enabled || getPlatform() !== 'web') return
    let active = true
    const refresh = async () => {
      const { data, error } = await supabase.rpc('get_active_android_release_policy')
      if (!active) return
      if (error) {
        // A transport failure is not "no release". Report it as an error so
        // the page does not claim the release is absent.
        setDiscovery((current) =>
          current === 'available'
            ? current
            : resolveReleaseDiscovery({ pending: false, failed: true, applicable: false, entryCount: 0 }),
        )
        return
      }
      const policy = validateReleasePolicy(Array.isArray(data) ? data[0] : data)
      setWebPolicy((prev) => {
        if (!policy) return null
        if (
          prev &&
          prev.versionCode === policy.versionCode &&
          prev.versionName === policy.versionName &&
          prev.releaseNotes === policy.releaseNotes &&
          prev.effectiveAtMs === policy.effectiveAtMs &&
          prev.mandatory === policy.mandatory &&
          prev.webReleaseUrl === policy.webReleaseUrl
        ) {
          return prev
        }
        return policy
      })
      // A resolved fetch with no valid policy is genuinely "no release",
      // not an unresolved discovery.
      if (!policy) {
        setDiscovery(resolveReleaseDiscovery({ pending: false, failed: false, applicable: false, entryCount: 0 }))
      }
    }
    void refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    let active = true
    const id = ++evaluationId.current

    const evaluate = async () => {
      const platform = getPlatform()
      let versionCode: number
      let versionName: string | null
      let releaseNotes: string | null
      let effectiveAtMs: number | null
      let publicationMs: number | null = null
      let mandatory: boolean
      let androidTransition: InstalledVersionObservation | null = null

      if (platform === 'android') {
        // Wait for policy discovery before advancing the durable installed
        // version baseline; otherwise a slow/failed first fetch could erase
        // the prior version before a real upgrade is detected.
        const policy = state.policy
        if (!ready) return
        if (!policy) {
          if (!active || evaluationId.current !== id) return
          setDiscovery(
            resolveReleaseDiscovery({
              pending: false,
              failed: state.status === 'unavailable',
              applicable: false,
              entryCount: 0,
            }),
          )
          return
        }
        const version = await getAppVersionInfo()
        if (!active || version.versionCode === null) return
        androidTransition = observeInstalledVersion(version.versionCode)
        if (androidTransition?.kind !== 'upgrade-pending') {
          // Not a post-upgrade launch: there is no release to announce yet.
          // This is a settled outcome, never an unresolved discovery.
          if (active && evaluationId.current === id) {
            setDiscovery(resolveReleaseDiscovery({ pending: false, failed: false, applicable: false, entryCount: 0 }))
          }
          return
        }
        if (policy.versionCode !== version.versionCode) {
          if (active && evaluationId.current === id) {
            setDiscovery(resolveReleaseDiscovery({ pending: false, failed: false, applicable: false, entryCount: 0 }))
          }
          return
        }
        versionCode = policy.versionCode
        versionName = policy.versionName
        releaseNotes = policy.releaseNotes
        effectiveAtMs = policy.effectiveAtMs
        publicationMs = policy.effectiveAtMs ?? policy.updatedAtMs ?? null
        mandatory = policy.mandatory
      } else {
        const policy = webPolicy
        if (!policy) return
        versionCode = policy.versionCode
        versionName = policy.versionName
        releaseNotes = policy.releaseNotes
        effectiveAtMs = policy.effectiveAtMs
        publicationMs = policy.effectiveAtMs ?? policy.updatedAtMs ?? null
        mandatory = policy.mandatory
      }

      const parsed = parseReleaseNotes(releaseNotes)
      if (!active || evaluationId.current !== id) return
      if (parsed.entries.length === 0) {
        // A release exists but carries no parseable notes. This is not the
        // same as having no release, and it is not an error.
        setCurrentBanner(null)
        setBannerOpen(false)
        setAcknowledged(false)
        setDismissed(false)
        setDiscovery(resolveReleaseDiscovery({ pending: false, failed: false, applicable: true, entryCount: 0 }))
        return
      }

      const { data: authData, error: authError } = await supabase.auth.getSession()
      if (!active || evaluationId.current !== id || authError) return
      const currentUser = authData.session?.user
      const userId = currentUser && !currentUser.is_anonymous ? currentUser.id : null
      if (accountId.current !== userId) {
        accountId.current = userId
        bannerAccountId.current = null
        setBannerOpen(false)
        setCurrentBanner(null)
      }

      // Check both local and remote acknowledgement so auth transitions
      // never resurrect an acknowledged release
      const localAck = isReleaseAcknowledgedLocally(versionCode, platform)
      let userAck = false
      if (userId) {
        const res = await isReleaseAcknowledgedByUser(versionCode, platform)
        userAck = Boolean(res && (typeof res === 'boolean' ? res : res.acknowledged))
        if (userAck && !localAck) {
          markReleaseAcknowledgedLocally(versionCode, platform)
        }
      }
      if (!active || evaluationId.current !== id) return
      const isAcknowledged = Boolean(localAck || userAck)

      const key = `${versionCode}-${platform}-${userId ?? 'anonymous'}`
      const isDismissed = isReleaseNotificationDismissed(versionCode, platform, userId)

      // On Web, evaluate publication age and seen-version baseline
      let webEligible = true
      if (platform === 'web') {
        const observation = observeWebRelease({
          versionCode,
          publicationMs,
          nowMs: Date.now(),
        })
        webEligible = observation.eligible
      }

      const banner: ReleaseNotificationBannerContent = {
        key,
        versionLabel: versionName || `v${versionCode}`,
        versionCode,
        entries: parsed.entries,
        releasedLabel: effectiveAtMs ? new Date(effectiveAtMs).toLocaleDateString('en-GB') : null,
        isMandatory: mandatory,
      }
      bannerAccountId.current = userId
      setCurrentBanner(banner)
      setDiscovery(
        resolveReleaseDiscovery({
          pending: false,
          failed: false,
          applicable: true,
          entryCount: parsed.entries.length,
        }),
      )
      setAcknowledged(isAcknowledged)
      setDismissed(isDismissed)
      setBannerOpen(webEligible && !isAcknowledged && !isDismissed && parsed.entries.length > 0)
    }

    void evaluate().catch(() => {
      // Release notes are supplemental. Persistence or network failures never
      // block startup or alter the mandatory-update state machine.
      if (active && evaluationId.current === id) {
        setDiscovery((current) =>
          current === 'available'
            ? current
            : resolveReleaseDiscovery({ pending: false, failed: true, applicable: false, entryCount: 0 }),
        )
      }
    })

    return () => {
      active = false
    }
  }, [enabled, webPolicy, authRevision, lifecycleRevision, state.policy, ready])

  const acknowledgeCurrent = useCallback(async () => {
    const banner = currentBanner
    if (!banner) return
    const platform = getPlatform()
    const { data, error } = await supabase.auth.getSession()
    if (error) return
    const currentUser = data.session?.user
    const userId = currentUser && !currentUser.is_anonymous ? currentUser.id : null
    if (userId !== bannerAccountId.current) {
      setBannerOpen(false)
      setCurrentBanner(null)
      return
    }

    try {
      if (userId) {
        await markReleaseAcknowledgedByUser(banner.versionCode, platform, userId)
        markReleaseAcknowledgedLocally(banner.versionCode, platform)
      } else {
        const result = markReleaseAcknowledgedLocally(banner.versionCode, platform)
        if (!result.persisted) return
      }
      bannerAccountId.current = null
      setAcknowledged(true)
      setBannerOpen(false)
      setCurrentBanner(null)
    } catch {
      // Keep the banner available when permanent acknowledgement was not saved.
    }
  }, [currentBanner])

  const dismissCurrent = useCallback(async () => {
    if (!currentBanner) return
    const platform = getPlatform()
    const { data, error } = await supabase.auth.getSession()
    if (error) return
    const currentUser = data.session?.user
    const userId = currentUser && !currentUser.is_anonymous ? currentUser.id : null
    if (userId !== bannerAccountId.current) {
      setBannerOpen(false)
      setCurrentBanner(null)
      return
    }
    if (!dismissReleaseNotification(currentBanner.versionCode, platform, userId)) return
    setDismissed(true)
    setBannerOpen(false)
  }, [currentBanner])

  return useMemo(
    () => ({
      bannerOpen,
      currentBanner,
      discovery,
      acknowledged,
      dismissed,
      acknowledgeCurrent,
      dismissCurrent,
    }),
    [bannerOpen, currentBanner, discovery, acknowledged, dismissed, acknowledgeCurrent, dismissCurrent],
  )
}

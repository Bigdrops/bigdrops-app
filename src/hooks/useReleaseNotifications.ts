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
  type InstalledVersionObservation,
} from '@/lib/appUpdate/releaseAcknowledgementLocalStorage'
import { getAppVersionInfo } from '@/lib/appUpdate/appVersion'
import { validateReleasePolicy, type ReleasePolicyInput } from '@/domain/appUpdate/updateStateMachine'
import type { ChangelogEntry } from '@/domain/appUpdate/changelog'

export interface ReleaseNotificationBannerContent {
  key: string
  versionLabel: string
  versionCode: number
  entries: ChangelogEntry[]
  releasedLabel: string | null
  isMandatory: boolean
}

export interface UseReleaseNotificationsResult {
  bannerOpen: boolean
  currentBanner: ReleaseNotificationBannerContent | null
  acknowledgeCurrent: () => Promise<void>
  dismissCurrent: () => Promise<void>
}

const emptyReleaseNotifications: UseReleaseNotificationsResult = {
  bannerOpen: false,
  currentBanner: null,
  acknowledgeCurrent: async () => {},
  dismissCurrent: async () => {},
}

const ReleaseNotificationsContext = React.createContext<UseReleaseNotificationsResult>(emptyReleaseNotifications)

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
      if (!active || error) return
      const policy = validateReleasePolicy(Array.isArray(data) ? data[0] : data)
      setWebPolicy(policy)
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
      let mandatory: boolean
      let androidTransition: InstalledVersionObservation | null = null

      if (platform === 'android') {
        // Wait for policy discovery before advancing the durable installed
        // version baseline; otherwise a slow/failed first fetch could erase
        // the prior version before a real upgrade is detected.
        const policy = state.policy
        if (!ready || !policy) return
        const version = await getAppVersionInfo()
        if (!active || version.versionCode === null) return
        androidTransition = observeInstalledVersion(version.versionCode)
        if (androidTransition?.kind !== 'upgrade-pending') return
        if (policy.versionCode !== version.versionCode) return
        versionCode = policy.versionCode
        versionName = policy.versionName
        releaseNotes = policy.releaseNotes
        effectiveAtMs = policy.effectiveAtMs
        mandatory = policy.mandatory
      } else {
        const policy = webPolicy
        if (!policy) return
        versionCode = policy.versionCode
        versionName = policy.versionName
        releaseNotes = policy.releaseNotes
        effectiveAtMs = policy.effectiveAtMs
        mandatory = policy.mandatory
      }

      const parsed = parseReleaseNotes(releaseNotes)
      if (parsed.entries.length === 0 || !active || evaluationId.current !== id) return

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

      const acknowledged = userId
        ? await isReleaseAcknowledgedByUser(versionCode, platform)
        : isReleaseAcknowledgedLocally(versionCode, platform)
      if (!active || evaluationId.current !== id) return
      const isAcknowledged = Boolean(
        acknowledged && (typeof acknowledged === 'boolean' ? acknowledged : acknowledged.acknowledged),
      )
      const key = `${versionCode}-${platform}-${userId ?? 'anonymous'}`
      const isDismissed = isReleaseNotificationDismissed(versionCode, platform, userId)
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
      setBannerOpen(!isAcknowledged && !isDismissed)
    }

    void evaluate().catch(() => {
      // Release notes are supplemental. Persistence or network failures never
      // block startup or alter the mandatory-update state machine.
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
      } else {
        const result = markReleaseAcknowledgedLocally(banner.versionCode, platform)
        if (!result.persisted) return
      }
      bannerAccountId.current = null
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
    setBannerOpen(false)
  }, [currentBanner])

  return useMemo(
    () => ({ bannerOpen, currentBanner, acknowledgeCurrent, dismissCurrent }),
    [bannerOpen, currentBanner, acknowledgeCurrent, dismissCurrent],
  )
}

/**
 * Release notifications hook: manages auto-presenting "What's New" banners/dialogs
 * for both Web and Android platforms.
 *
 * Features:
 * - Auto-presents when a new eligible, unacknowledged release is detected
 * - Uses existing ChangelogTimeline for release notes rendering
 * - Handles acknowledgement persistence (Supabase for authenticated, localStorage for anonymous)
 * - Prevents repeatedly displaying acknowledged releases
 * - Does not block normal application navigation
 * - Handles network failures gracefully
 * - Integrates with existing useAppUpdate state without modifying existing files
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAppUpdateContext } from '@/contexts/AppUpdateContext'
import { isReleaseAcknowledgedByUser, markReleaseAcknowledgedByUser, isReleaseAcknowledgedLocally, markReleaseAcknowledgedLocally } from '@/lib/appUpdate/releaseAcknowledgementClient'
import { parseReleaseNotes } from '@/domain/appUpdate/changelog'
import type { UseAppUpdateResult } from '@/hooks/useAppUpdate'
import type { ChangelogEntry } from '@/domain/appUpdate/changelog'
import { Capacitor } from '@capacitor/core'

export interface ReleaseNotificationBannerContent {
  /** Unique key for this banner (version + platform) */
  key: string
  /** Version label (e.g. "v1.2.3") */
  versionLabel: string
  /** Release notes entries */
  entries: ChangelogEntry[]
  /** Release effective date label */
  releasedLabel: string | null
  /** Whether this is a mandatory update */
  isMandatory: boolean
}

export interface UseReleaseNotificationsResult {
  /** Open/close control for the auto-present banner */
  bannerOpen: boolean
  /** Toggle the banner open/closed */
  setBannerOpen: (open: boolean) => void
  /** Current release notes data, if a banner is active */
  currentBanner: ReleaseNotificationBannerContent | null
  /** Acknowledge the currently displayed release */
  acknowledgeCurrent: () => Promise<void>
  /** Dismiss the currently displayed banner without acknowledging */
  dismissCurrent: () => Promise<void>
}

function getPlatform(): 'web' | 'android' {
  // Detect platform using Capacitor; fall back to 'web' for non-native environments.
  // The check is wrapped in a try/catch because Capacitor APIs may not be available
  // (e.g., when running in a browser-only context or during SSR).
  try {
    const platform = Capacitor.getPlatform()
    if (platform === 'android') return 'android'
    if (platform === 'web') return 'web'
  } catch {
    // Capacitor not available — best-effort fallback to 'web'
  }
  return 'web'
}

export function useReleaseNotifications(options: { enabled: boolean }): UseReleaseNotificationsResult {
  const { enabled } = options
  const [bannerOpen, setBannerOpen] = useState(false)
  const [currentBanner, setCurrentBanner] = useState<ReleaseNotificationBannerContent | null>(null)
  const checkRef = useRef<boolean>(false) // debounce guard against rapid double-fires

  // Subscribe to update state changes via context (read-only; no modifications to context)
  const { state, release } = useAppUpdateContext()

  // When update state changes, check if we should present a "What's New" banner.
  useEffect(() => {
    if (!enabled) return

    const checkAndPresent = async () => {
      // Prevent rapid double-firing across consecutive effect runs
      if (checkRef.current) return
      checkRef.current = true

      try {
        const platform = getPlatform()

        // No policy = nothing to show
        if (!state.policy) return

        // Check if this release has already been acknowledged.
        // Device-local check first (anonymous users), then Supabase (authenticated users).
        let alreadyAcknowledged = false

        // Device-local check (works for both anon and auth, as a first line of defense)
        try {
          alreadyAcknowledged = await isReleaseAcknowledgedLocally(state.policy.versionCode, platform)
        } catch {
          // Best-effort only; if check fails, assume not acknowledged to be safe
        }

        // Supabase check for authenticated users (second line of defense, cross-device sync)
        if (!alreadyAcknowledged) {
          try {
            const { acknowledged } = await isReleaseAcknowledgedByUser(state.policy.versionCode, platform)
            alreadyAcknowledged = acknowledged
          } catch {
            // Best-effort only; if check fails, assume not acknowledged to be safe
          }
        }

        // If already acknowledged, don't present the banner again
        if (alreadyAcknowledged) return

        // Parse release notes from the policy row using the shared domain parser.
        const notes = parseReleaseNotes(state.policy.releaseNotes)
        if (notes.entries.length === 0) return // nothing to display

        // Build banner content from the parsed release notes.
        const versionLabel = state.policy.versionName || `v${state.policy.versionCode}`
        const releasedLabel = state.policy.effectiveAtMs ? new Date(state.policy.effectiveAtMs).toLocaleDateString('en-GB') : null

        const content: ReleaseNotificationBannerContent = {
          key: `${state.policy.versionCode}-${platform}`,
          versionLabel,
          entries: notes.entries,
          releasedLabel,
          isMandatory: state.policy.mandatory,
        }

        setCurrentBanner(content)
        setBannerOpen(true)
      } catch (err) {
        // Network/DB failure — never block navigation or force banner on error.
        // tslint:disable-next-line:no-console
        // console.error('Release notification error:', err)
      } finally {
        checkRef.current = false
      }
    }

    checkAndPresent()
  }, [enabled, state, currentBanner, bannerOpen]) // eslint-disable-react-hooks/exhaustive-deps — controlled by checkRef guard

  // When the banner is dismissed without acknowledging, no persistence action is needed.
  useEffect(() => {
    if (!bannerOpen && currentBanner) {
      // intentional no-op: dismiss without acknowledge leaves no state change
    }
  }, [bannerOpen, currentBanner])

  /** Acknowledge the currently displayed release. */
  const acknowledgeCurrent = useCallback(async () => {
    if (!currentBanner) return

    const platform = getPlatform()
    const versionCode = parseInt(currentBanner.versionLabel.replace('v', '')) || 0

    try {
      let persisted = false
      // Try authenticated (Supabase) path first; fall back to device-local localStorage for anonymous.
      try {
        await markReleaseAcknowledgedByUser(versionCode, platform)
        persisted = true
      } catch {
        // Authenticated path failed (maybe not logged in); fall back to localStorage.
        markReleaseAcknowledgedLocally(versionCode, platform)
        persisted = true // localStorage persistence succeeded at device level
      }

      // Hide the banner after successfully acknowledging.
      setBannerOpen(false)
      setCurrentBanner(null)
    } catch (err) {
      // tslint:disable-next-line:no-console
      // console.error('Failed to acknowledge release:', err)
    }
  }, [currentBanner])

  /** Dismiss the currently displayed banner without acknowledging the release. */
  const dismissCurrent = useCallback(async () => {
    // Hide the banner without persisting any acknowledgement.
    setBannerOpen(false)
    setCurrentBanner(null)
  }, [bannerOpen, currentBanner])

  return { bannerOpen, setBannerOpen, currentBanner, acknowledgeCurrent, dismissCurrent }
}
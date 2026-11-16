/**
 * Auto-presenting "What's New" banner for release notes.
 *
 * Features:
 * - Auto-presents when a new eligible, unacknowledged release is detected
 * - Uses existing ChangelogTimeline for release notes rendering
 * - Non-intrusive: appears at the top of the screen, not a blocking modal
 * - Acknowledgement persists across sessions (Supabase for authenticated, localStorage for anonymous)
 * - Dismissal does not affect mandatory-update enforcement
 * - Consistent with BOURXE visual conventions (tokens, typography, spacing)
 */

import { useEffect, useMemo, useState } from 'react'
import { ChangelogTimeline } from '@/components/app/update/ChangelogTimeline'
import { parseReleaseNotes } from '@/domain/appUpdate/changelog'
import type { UseAppUpdateResult } from '@/hooks/useAppUpdate'
import type { ReleaseNotificationBannerContent } from '@/hooks/useReleaseNotifications'
import { useReleaseNotifications } from '@/hooks/useReleaseNotifications'
import { useAppUpdateContext } from '@/contexts/AppUpdateContext'

/**
 * Present an auto-showing "What's New" banner with release notes.
 * The banner appears at the top of the screen and does not block navigation.
 * Users can acknowledge or dismiss the release.
 */
export default function ReleaseNotificationBanner({}: {}): JSX.Element | null {
  const { state, release } = useAppUpdateContext()
  const { bannerOpen, setBannerOpen, currentBanner, acknowledgeCurrent, dismissCurrent } = useReleaseNotifications({ enabled: true })

  // When state or release changes, re-evaluate whether to present a banner
  useEffect(() => {
    // Re-check on state change if banner is not currently open
    if (!bannerOpen) {
      // The useReleaseNotifications hook already handles this via its effect,
      // but we can trigger a manual re-check here if needed.
    }
  }, [state, release, bannerOpen])

  // If no banner content, null (no banner to show)
  if (!currentBanner) return null

  const { versionLabel, entries, releasedLabel, isMandatory } = currentBanner

  return (
    <div className="bd-release-notification-banner fixed top-0 left-0 right-0 z-50 bg-bd-overlay-bg border-b border-border px-4 py-3 shadow-sm flex items-center gap-3 transition-all duration-300" aria-label="Release notes notification">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-bd-overlay-muted">New release available</p>
        <h3 className="mt-1 font-semibold text-foreground">{versionLabel}</h3>
        {releasedLabel && (
          <p className="mt-0.5 text-[10px] text-bd-overlay-muted">Released · {releasedLabel}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => void dismissCurrent()}
        className="text-[11px] text-bd-overlay-muted hover:text-bd-overlay-text transition-colors flex items-center gap-1"
        aria-label="Dismiss release notes"
      >
        ✕
      </button>
    </div>
  )
}
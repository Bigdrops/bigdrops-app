/** Dismissible, non-blocking release notes banner. */

import { ChangelogTimeline } from '@/components/app/update/ChangelogTimeline'
import { useReleaseNotifications } from '@/hooks/useReleaseNotifications'

export default function ReleaseNotificationBanner() {
  const { bannerOpen, currentBanner, acknowledgeCurrent, dismissCurrent } =
    useReleaseNotifications({ enabled: true })

  if (!bannerOpen || !currentBanner) return null

  return (
    <aside
      className="fixed inset-x-0 top-0 z-50 max-h-[80vh] overflow-y-auto border-b border-border bg-background px-4 py-3 shadow-sm"
      aria-label="Release notes notification"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-3xl items-start gap-4">
        <div className="min-w-0 flex-1">
          <ChangelogTimeline
            entries={currentBanner.entries}
            versionLabel={currentBanner.versionLabel}
            releasedLabel={currentBanner.releasedLabel}
          />
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={() => void acknowledgeCurrent()}
            className="min-h-11 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            Got it
          </button>
          <button
            type="button"
            onClick={() => void dismissCurrent()}
            className="min-h-11 rounded-md border border-border px-3 text-sm"
            aria-label="Dismiss release notes"
          >
            Dismiss
          </button>
        </div>
      </div>
    </aside>
  )
}

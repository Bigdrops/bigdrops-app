import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Layout from '@/components/Layout'
import { ChangelogTimeline } from '@/components/app/update/ChangelogTimeline'
import {
  useReleaseNotificationContext,
  type ReleaseDiscoveryState,
  type ReleaseNotificationBannerContent,
} from '@/hooks/useReleaseNotifications'

/**
 * What's New.
 *
 * Presents the single active release from the release policy. The page owns
 * presentation and action state only: acknowledgement and dismissal keep
 * their existing persistence, scope, and semantics in
 * `useReleaseNotifications`.
 */
export default function WhatsNew() {
  const navigate = useNavigate()
  const { currentBanner, discovery, acknowledged, dismissed, acknowledgeCurrent, dismissCurrent } =
    useReleaseNotificationContext()

  // Keep the last resolved release on screen so the notes do not disappear
  // when acknowledging clears the banner in the provider.
  const [displayedRelease, setDisplayedRelease] = React.useState<ReleaseNotificationBannerContent | null>(
    currentBanner,
  )

  React.useEffect(() => {
    if (currentBanner) setDisplayedRelease(currentBanner)
  }, [currentBanner])

  const showRelease = discovery === 'available' && displayedRelease !== null

  return (
    <Layout title="What's New" hidePageHeader contentClassName="!px-0 !pt-0 md:!px-6 md:!pt-4">
      <main className="mx-auto w-full max-w-[var(--bd-layout-content-max,1200px)] px-4 pb-10 pt-4 md:px-0 md:pt-0">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-3 -ml-2 md:mb-4"
        >
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>

        <header className="border-b border-bd-border pb-5 md:pb-6">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-bd-text-soft">
            Release notes
          </p>
          <h1 className="mt-1 text-bd-text">What&rsquo;s New</h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-bd-text-muted">
            The changes included in the release currently available to this app.
          </p>
        </header>

        <div className="mt-6 md:mt-8">
          {showRelease && displayedRelease ? (
            <div className="min-w-0">
              <ChangelogTimeline
                variant="editorial"
                entries={displayedRelease.entries}
                versionLabel={displayedRelease.versionLabel}
                releasedLabel={displayedRelease.releasedLabel}
                isMandatory={displayedRelease.isMandatory}
              />

              <ReleaseActions
                acknowledged={acknowledged}
                dismissed={dismissed}
                onAcknowledge={() => void acknowledgeCurrent()}
                onDismiss={() => void dismissCurrent()}
              />
            </div>
          ) : (
            <ReleaseStatus state={discovery} />
          )}
        </div>
      </main>
    </Layout>
  )
}

/**
 * Actions are state-aware: acknowledgement is offered only while it is still
 * needed, and dismissal is never presented as an equivalent to it.
 */
function ReleaseActions({
  acknowledged,
  dismissed,
  onAcknowledge,
  onDismiss,
}: {
  acknowledged: boolean
  dismissed: boolean
  onAcknowledge: () => void
  onDismiss: () => void
}) {
  return (
    <div className="mt-8 border-t border-bd-border pt-5">
      {acknowledged ? (
        <p className="flex items-center gap-2 text-sm text-bd-text-muted">
          <Check aria-hidden="true" className="size-4 shrink-0 text-bd-status-success-text" />
          You have acknowledged this release.
        </p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button type="button" size="lg" onClick={onAcknowledge} className="w-full sm:w-auto">
            <Check data-icon="inline-start" />
            Got it
          </Button>
          {dismissed ? (
            <p className="text-sm leading-6 text-bd-text-muted">
              This notice is hidden on this device.
            </p>
          ) : (
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={onDismiss}
              className="w-full sm:w-auto"
            >
              Dismiss notice
            </Button>
          )}
        </div>
      )}

      <p className="mt-3 text-xs leading-5 text-bd-text-soft">
        {acknowledged
          ? 'This release stays acknowledged on every device you sign in to.'
          : dismissed
            ? 'Dismissing hides the notice on this device only. It does not acknowledge the release.'
            : 'Acknowledging marks this release as read on every device you sign in to. Dismissing only hides the notice here.'}
      </p>
    </div>
  )
}

/**
 * Honest status presentation. Each state says only what is actually known:
 * an unresolved discovery is never reported as an absent release.
 */
function ReleaseStatus({ state }: { state: ReleaseDiscoveryState }) {
  if (state === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 rounded-lg border border-bd-border bg-bd-surface-muted/60 px-4 py-5"
      >
        <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-bd-text-soft" />
        <p className="text-sm text-bd-text-muted">Checking for release notes&hellip;</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="rounded-lg border border-bd-border bg-bd-surface-muted/60 px-4 py-5">
        <p className="text-sm font-medium text-bd-text">Release notes could not be loaded.</p>
        <p className="mt-1 text-sm leading-6 text-bd-text-muted">
          The release service did not respond. Your app keeps working, and the notes will appear
          here once the service is reachable.
        </p>
      </div>
    )
  }

  if (state === 'no-notes') {
    return (
      <div className="rounded-lg border border-bd-border bg-bd-surface-muted/60 px-4 py-5">
        <p className="text-sm font-medium text-bd-text">This release has no published notes.</p>
        <p className="mt-1 text-sm leading-6 text-bd-text-muted">
          A release is available, but no notes were published with it.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-bd-border bg-bd-surface-muted/60 px-4 py-5">
      <p className="text-sm font-medium text-bd-text">There is no current release to show.</p>
      <p className="mt-1 text-sm leading-6 text-bd-text-muted">
        No release is published for this app right now.
      </p>
    </div>
  )
}

export { ReleaseActions, ReleaseStatus }

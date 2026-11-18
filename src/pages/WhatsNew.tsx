import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Layout from '@/components/Layout'
import { ChangelogTimeline } from '@/components/app/update/ChangelogTimeline'
import { useReleaseNotificationContext } from '@/hooks/useReleaseNotifications'
import type { ReleaseNotificationBannerContent } from '@/hooks/useReleaseNotifications'

export default function WhatsNew() {
  const navigate = useNavigate()
  const { currentBanner, acknowledgeCurrent, dismissCurrent } = useReleaseNotificationContext()
  const [displayedRelease, setDisplayedRelease] = React.useState<ReleaseNotificationBannerContent | null>(currentBanner)

  React.useEffect(() => {
    if (currentBanner) setDisplayedRelease(currentBanner)
  }, [currentBanner])

  return (
    <Layout title="What’s New" hidePageHeader contentClassName="!px-4 !pt-4 md:!px-6">
      <main className="mx-auto w-full max-w-3xl pb-8">
        <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>

        <section className="rounded-xl border border-border bg-card p-5 md:p-7" aria-labelledby="whats-new-title">
          <h1 id="whats-new-title" className="text-xl font-semibold tracking-tight text-foreground">
            What’s New
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Release notes for the current release available to this app.
          </p>

          {displayedRelease ? (
            <div className="mt-6">
              <ChangelogTimeline
                entries={displayedRelease.entries}
                versionLabel={displayedRelease.versionLabel}
                releasedLabel={displayedRelease.releasedLabel}
              />
              <div className="mt-7 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button type="button" onClick={() => void acknowledgeCurrent()}>
                  Got it
                </Button>
                <Button type="button" variant="outline" onClick={() => void dismissCurrent()}>
                  Dismiss notice
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-6 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              There are no current release notes to show.
            </p>
          )}
        </section>
      </main>
    </Layout>
  )
}

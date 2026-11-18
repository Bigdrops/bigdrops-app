import { Badge } from '@/components/ui/badge'
import type { ChangelogEntry } from '@/domain/appUpdate/changelog'

/**
 * Shared release-note presentation for the What's New page, notification
 * surface, and Android update dialog. The active policy supplies one release
 * with plain-text notes, so optional template fields appear only when the
 * existing release data contract can support them.
 */
export function ChangelogTimeline({
  entries,
  versionLabel,
  releasedLabel,
}: {
  entries: ChangelogEntry[]
  versionLabel: string
  releasedLabel?: string | null
}) {
  return (
    <section aria-label="What's new" className="w-full max-w-4xl">
      <article className="grid min-w-0 gap-4 sm:grid-cols-[minmax(8.5rem,0.65fr)_minmax(0,1.35fr)] sm:gap-6 md:grid-cols-[minmax(11rem,0.65fr)_minmax(0,1.35fr)] md:gap-10 lg:gap-14">
        <aside className="flex min-w-0 flex-row flex-wrap items-center gap-x-3 gap-y-2 sm:flex-col sm:items-start sm:gap-3 md:pt-1">
          <Badge variant="secondary" className="h-7 px-2.5 font-mono text-[11px] tabular-nums">
            {versionLabel}
          </Badge>
          {releasedLabel ? (
            <time className="text-xs font-medium text-bd-overlay-muted">
              {releasedLabel}
            </time>
          ) : null}
        </aside>

        <div className="min-w-0">
          {entries.length === 0 ? (
            <p className="text-sm leading-6 text-bd-overlay-muted">
              No release notes are available for this build.
            </p>
          ) : (
            <ol aria-label="Release notes" className="divide-y divide-bd-overlay-border">
              {entries.map((entry, index) => (
                <li key={`${entry.title}-${index}`} className="py-4 first:pt-0 last:pb-0 md:py-5">
                  <h3 className="text-base font-semibold leading-tight tracking-tight text-bd-overlay-text md:text-lg">
                    {entry.title}
                  </h3>
                  {entry.detail ? (
                    <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-bd-overlay-muted">
                      {entry.detail}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </article>
    </section>
  )
}

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ChangelogEntry } from '@/domain/appUpdate/changelog'

/**
 * Shared release-note presentation for the What's New page, notification
 * surface, and Android update dialog. The active policy supplies one release
 * with plain-text notes, so optional template fields appear only when the
 * existing release data contract can support them.
 *
 * Two variants exist because the consumers have different jobs:
 * - `compact` keeps the original single-rail layout for the notification
 *   drawer and the Android update dialog, where space is constrained.
 * - `editorial` is the What's New page composition: a metadata rail beside a
 *   wider reading column, with a numbered entry rhythm.
 *
 * Every field rendered here is derived from the release contract. No author,
 * category, screenshot, or per-entry date is invented.
 */
export function ChangelogTimeline({
  entries,
  versionLabel,
  releasedLabel,
  isMandatory = false,
  variant = 'compact',
  className,
}: {
  entries: ChangelogEntry[]
  versionLabel: string
  releasedLabel?: string | null
  /** Mandatory-update status from the policy row. Omitted when false. */
  isMandatory?: boolean
  variant?: 'compact' | 'editorial'
  className?: string
}) {
  if (variant === 'editorial') {
    return (
      <EditorialChangelog
        entries={entries}
        versionLabel={versionLabel}
        releasedLabel={releasedLabel}
        isMandatory={isMandatory}
        className={className}
      />
    )
  }

  return (
    <section aria-label="What's new" className={cn('w-full max-w-4xl', className)}>
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

/**
 * What's New page composition.
 *
 * Metadata rail on the left from `lg`, reading column on the right. Below
 * `lg` the rail becomes a horizontal metadata strip so the entries keep a
 * comfortable measure on phones and tablets.
 */
function EditorialChangelog({
  entries,
  versionLabel,
  releasedLabel,
  isMandatory,
  className,
}: {
  entries: ChangelogEntry[]
  versionLabel: string
  releasedLabel?: string | null
  isMandatory: boolean
  className?: string
}) {
  return (
    <section aria-label="Release notes" className={cn('w-full min-w-0', className)}>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)] lg:gap-10 xl:gap-14">
        <ReleaseMetadataRail
          versionLabel={versionLabel}
          releasedLabel={releasedLabel}
          isMandatory={isMandatory}
          entryCount={entries.length}
        />

        <div className="min-w-0">
          {entries.length === 0 ? (
            <p className="rounded-lg border border-bd-border bg-bd-surface-muted px-4 py-3 text-sm leading-6 text-bd-text-muted">
              This release has no published notes.
            </p>
          ) : (
            <ol className="min-w-0 divide-y divide-bd-border">
              {entries.map((entry, index) => (
                <li
                  key={`${entry.title}-${index}`}
                  className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[2rem_minmax(0,1fr)] sm:gap-x-4 sm:py-6"
                >
                  <span
                    aria-hidden="true"
                    className="pt-0.5 font-mono text-xs tabular-nums text-bd-text-soft sm:text-sm"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-semibold leading-snug tracking-tight text-bd-text sm:text-lg">
                      {entry.title}
                    </h3>
                    {entry.detail ? (
                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-bd-text-muted">
                        {entry.detail}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Release metadata, visually separate from the release content.
 *
 * Renders only values the release contract actually provides. A missing date
 * or a non-mandatory release produces no row rather than a placeholder.
 */
function ReleaseMetadataRail({
  versionLabel,
  releasedLabel,
  isMandatory,
  entryCount,
}: {
  versionLabel: string
  releasedLabel?: string | null
  isMandatory: boolean
  entryCount: number
}) {
  return (
    <aside
      aria-label="Release metadata"
      className="min-w-0 lg:sticky lg:top-4 lg:self-start"
    >
      <div className="rounded-lg border border-bd-border bg-bd-surface-muted/60 p-4 sm:px-5 sm:py-4 lg:p-4">
        <div className="sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-6 sm:gap-y-1 lg:block">
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-bd-text-soft">
              Release
            </p>
            <p className="mt-1.5 break-words font-mono text-lg font-semibold tabular-nums leading-tight text-bd-text lg:mt-1.5">
              {versionLabel}
            </p>
          </div>

          <dl className="mt-4 flex min-w-0 flex-wrap gap-x-8 gap-y-3 border-t border-bd-border pt-4 text-sm sm:mt-0 sm:flex-1 sm:border-t-0 sm:pt-0 lg:mt-4 lg:block lg:space-y-3 lg:border-t lg:pt-4">
            {releasedLabel ? (
              <div className="min-w-0">
                <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-bd-text-soft">
                  Released
                </dt>
                <dd className="mt-0.5 text-bd-text">
                  <time>{releasedLabel}</time>
                </dd>
              </div>
            ) : null}

            <div className="min-w-0">
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-bd-text-soft">
                Changes
              </dt>
              <dd className="mt-0.5 tabular-nums text-bd-text">
                {entryCount === 1 ? '1 entry' : `${entryCount} entries`}
              </dd>
            </div>

            {isMandatory ? (
              <div className="min-w-0">
                <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-bd-text-soft">
                  Update type
                </dt>
                <dd className="mt-1">
                  <Badge
                    variant="outline"
                    className="border-bd-status-warning-border bg-bd-status-warning-bg text-bd-status-warning-text"
                  >
                    Required
                  </Badge>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </aside>
  )
}

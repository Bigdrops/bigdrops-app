import type { ChangelogEntry } from '@/domain/appUpdate/changelog'

/**
 * Reading surface for "What's New". One hairline rail, one solid dot per
 * entry, no badges and no icons. The parent owns scrolling, so this stays
 * a flat list with generous line height.
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
    <section aria-label="What's new" className="space-y-4">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-overlay-muted">
          What&apos;s new
        </h3>
        <p className="font-mono text-[11px] tabular-nums text-bd-overlay-muted">
          {versionLabel}
          {releasedLabel ? ` · ${releasedLabel}` : ''}
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="text-[12px] text-bd-overlay-muted">
          No release notes for this build.
        </p>
      ) : (
        <ol className="relative ml-[3px] space-y-5 border-l border-bd-overlay-border pl-4">
          {entries.map((entry, index) => (
            <li key={`${entry.title}-${index}`} className="relative">
              <span
                aria-hidden="true"
                className={`absolute -left-[21.5px] top-[6px] h-[7px] w-[7px] rounded-full ${
                  index === 0 ? 'bg-bd-button-primary-bg' : 'bg-bd-overlay-border'
                }`}
              />
              <p className="text-[13px] font-medium leading-5 text-bd-overlay-text">
                {entry.title}
              </p>
              {entry.detail ? (
                <p className="mt-1 text-[12px] leading-5 text-bd-overlay-muted">
                  {entry.detail}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

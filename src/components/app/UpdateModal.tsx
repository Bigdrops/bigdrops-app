import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DownloadProgress } from '@/components/app/update/DownloadProgress'
import { ChangelogTimeline } from '@/components/app/update/ChangelogTimeline'
import { parseReleaseNotes } from '@/domain/appUpdate/changelog'
import {
  describeGraceRemaining,
  formatMegabytes,
  formatVersionLabel,
} from '@/domain/appUpdate/updateStateMachine'
import type { UseAppUpdateResult } from '@/hooks/useAppUpdate'

function formatReleaseDate(effectiveAtMs: number | null | undefined): string | null {
  if (typeof effectiveAtMs !== 'number' || !Number.isFinite(effectiveAtMs)) return null
  return new Date(effectiveAtMs).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * The update "reading room".
 *
 * Four fixed zones: header, action, changelog (the only scroll region) and
 * footer. Dismissing closes the dialog only. It must never cancel the
 * download: the OS transfer and the native completion receiver own that
 * lifecycle, and the Settings card remains the re-entry point.
 */
export default function UpdateModal({
  open,
  onOpenChange,
  update,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  update: UseAppUpdateResult
}) {
  const {
    state,
    release,
    downloadPhase,
    startInAppDownload,
    cancelInAppDownload,
    installDownloadedApk,
  } = update

  const [nowMs, setNowMs] = useState(() => Date.now())

  const deadline = state.graceDeadlineMs
  useEffect(() => {
    if (!open || deadline === null) return
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [open, deadline])

  const policy = state.policy
  const versionLabel = formatVersionLabel(policy?.versionName, policy?.versionCode)
  const apkAsset = release?.assets[0] ?? null
  const assetSize = apkAsset?.sizeBytes ?? null
  const releasedLabel = formatReleaseDate(policy?.effectiveAtMs)
  const changelog = useMemo(() => parseReleaseNotes(policy?.releaseNotes), [policy?.releaseNotes])

  const remaining = deadline === null ? null : describeGraceRemaining(deadline, nowMs)
  const enforcementLine = remaining
    ? remaining.expired
      ? 'Grace period ended'
      : `Enforcement in: ${remaining.days}d ${remaining.hours}h ${remaining.minutes}m`
    : 'Optional update'

  const isDownloading = downloadPhase.kind === 'downloading'
  const isInstalling = downloadPhase.kind === 'installing'
  const isDownloaded = downloadPhase.kind === 'downloaded'
  const isFailed = downloadPhase.kind === 'failed'

  const totalBytes = isDownloading
    ? (downloadPhase.totalBytes ?? assetSize ?? undefined)
    : (assetSize ?? undefined)
  const downloadedBytes = isDownloading
    ? downloadPhase.downloadedBytes
    : isDownloaded || isInstalling
      ? totalBytes
      : undefined
  const percentage =
    totalBytes !== undefined && totalBytes > 0 && downloadedBytes !== undefined
      ? Math.min(100, (downloadedBytes / totalBytes) * 100)
      : null

  const titlePrefix =
    state.status === 'grace' || state.status === 'blocked'
      ? 'Update Required'
      : 'Update Available'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85dvh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden overflow-y-hidden rounded-[var(--bd-overlay-radius)] p-0 sm:max-w-[480px]"
        showCloseButton
      >
        {/* Zone 1: fixed header */}
        <header className="flex-none border-b border-bd-overlay-border px-5 pb-4 pt-5 pr-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-overlay-muted">
            Android update
          </p>
          <DialogTitle className="mt-1.5 text-[19px] font-semibold leading-tight tracking-[-0.02em] text-bd-overlay-text">
            {policy ? `${titlePrefix}: ${versionLabel}` : titlePrefix}
          </DialogTitle>
          <DialogDescription className="mt-1 font-mono text-[11px] tabular-nums text-bd-overlay-muted">
            {formatMegabytes(assetSize) ?? 'Size pending'}
            {releasedLabel ? ` · ${releasedLabel}` : ''}
          </DialogDescription>
          <p
            className={`mt-2 font-mono text-[11px] tabular-nums ${
              remaining?.expired ? 'text-destructive' : 'text-bd-overlay-text'
            }`}
          >
            {enforcementLine}
          </p>
        </header>

        {/* Zone 2: fixed action */}
        <div className="flex-none px-5 py-4">
          {isFailed ? (
            <>
              <DownloadProgress
                percentage={0}
                status="error"
                errorMessage={downloadPhase.message}
              />
              <Button
                size="lg"
                className="mt-3 w-full"
                onClick={() => void startInAppDownload()}
              >
                <Download className="size-4" data-icon="inline-start" />
                Retry download
              </Button>
            </>
          ) : isInstalling ? (
            <DownloadProgress
              percentage={100}
              downloadedBytes={totalBytes}
              totalBytes={totalBytes}
              status="installing"
            />
          ) : isDownloading ? (
            <>
              <DownloadProgress
                percentage={percentage}
                downloadedBytes={downloadedBytes}
                totalBytes={totalBytes}
                status={downloadedBytes ? 'downloading' : 'connecting'}
              />
              <button
                type="button"
                onClick={() => void cancelInAppDownload()}
                className="mt-2 text-[11px] font-medium text-bd-overlay-muted underline underline-offset-4 transition-colors hover:text-bd-overlay-text"
              >
                Cancel download
              </button>
            </>
          ) : isDownloaded ? (
            <>
              <DownloadProgress
                percentage={100}
                downloadedBytes={totalBytes}
                totalBytes={totalBytes}
                status="idle"
              />
              {downloadPhase.message ? (
                <p className="mt-2 text-[11px] font-medium text-destructive" role="alert">
                  {downloadPhase.message}
                </p>
              ) : null}
              <Button
                size="lg"
                className="mt-3 w-full"
                onClick={() => void installDownloadedApk()}
              >
                <Download className="size-4" data-icon="inline-start" />
                Install update
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              className="w-full"
              disabled={!apkAsset}
              onClick={() => void startInAppDownload()}
            >
              <Download className="size-4" data-icon="inline-start" />
              Download &amp; Install
            </Button>
          )}
        </div>

        {/* Zone 3: the only scroll region */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-bd-overlay-border px-5 py-4">
          <ChangelogTimeline
            entries={changelog.entries}
            versionLabel={versionLabel}
            releasedLabel={releasedLabel}
          />
        </div>

        {/* Zone 4: fixed footer */}
        <footer className="flex-none border-t border-bd-overlay-border bg-bd-overlay-footer-bg px-5 py-3">
          <p className="text-[11px] leading-4 text-bd-overlay-muted">
            You can keep working. The download continues in the background.
          </p>
        </footer>
      </DialogContent>
    </Dialog>
  )
}

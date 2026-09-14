import { Download, Globe, ShieldCheck } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { UseAppUpdateResult } from '@/hooks/useAppUpdate'

/**
 * Focused update sheet. Communicates: a new version is available, whether
 * it is required, remaining grace time, both update paths, and live
 * download state. Reused by the banner (grace) and the gate (blocked).
 */
export default function UpdateSheet({
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
    graceRemaining,
    downloadPhase,
    startInAppDownload,
    cancelInAppDownload,
    installDownloadedApk,
    openWebDownload,
  } = update

  const policy = state.policy
  const downloading = downloadPhase.kind === 'downloading'
  const installing = downloadPhase.kind === 'installing'
  const totalBytes = downloadPhase.kind === 'downloading' ? downloadPhase.totalBytes : null
  const downloadedBytes = downloadPhase.kind === 'downloading' ? downloadPhase.downloadedBytes : null
  const apkAsset = release?.assets[0] ?? null
  const webUrl = state.policy?.webReleaseUrl ?? release?.webUrl ?? null

  const progressPercent =
    downloadedBytes !== null && totalBytes ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl p-6">
        <SheetHeader className="p-0 text-left">
          <SheetTitle>
            {state.status === 'blocked' ? 'Update required to continue' : 'Update available'}
          </SheetTitle>
          <SheetDescription>
            {policy
              ? `Approved BIGDROPS release v${policy.versionCode}${
                  policy.versionName ? ` (${policy.versionName})` : ''
                }`
              : 'Approved BIGDROPS release'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {state.status === 'grace' && graceRemaining && !graceRemaining.expired && (
            <p className="rounded-2xl bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {graceRemaining.days}d {graceRemaining.hours}h {graceRemaining.minutes}m left to
              update — after that, BIGDROPS pauses until you install this version.
            </p>
          )}

          {state.status === 'blocked' && (
            <p className="rounded-2xl bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Grace period ended. Install the update to resume normal use.
            </p>
          )}

          {policy?.releaseNotes ? (
            <p className="text-sm leading-6 text-muted-foreground">{policy.releaseNotes}</p>
          ) : null}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {apkAsset ? (
              <span>
                Signed release asset: {apkAsset.name}
                {apkAsset.sizeBytes ? ` · ${(apkAsset.sizeBytes / 1024 / 1024).toFixed(1)} MB` : ''}
              </span>
            ) : (
              <span>Only BIGDROPS-approved release assets are accepted.</span>
            )}
          </div>

          {downloadPhase.kind === 'downloading' && (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {downloadedBytes?.toLocaleString() ?? 0} bytes
                {totalBytes ? ` of ${totalBytes.toLocaleString()}` : ''}
              </p>
            </div>
          )}

          {downloadPhase.kind === 'failed' && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {downloadPhase.message}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {downloadPhase.kind === 'downloaded' ? (
              <Button onClick={() => void installDownloadedApk()} loading={installing} size="lg">
                <Download data-icon="inline-start" />
                Install update
              </Button>
            ) : downloading ? (
              <Button variant="outline" onClick={() => void cancelInAppDownload()} size="lg">
                Cancel download
              </Button>
            ) : (
              <Button
                onClick={() => void startInAppDownload()}
                loading={installing}
                size="lg"
                disabled={!apkAsset}
              >
                <Download data-icon="inline-start" />
                Download &amp; Install
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => void openWebDownload()}
              size="lg"
              disabled={!webUrl}
            >
              <Globe data-icon="inline-start" />
              Download on Web
            </Button>
          </div>

          {downloadPhase.kind === 'failed' && (
            <p className="text-center text-xs text-muted-foreground">
              The download can be safely retried.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

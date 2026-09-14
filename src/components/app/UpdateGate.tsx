import { AlertTriangle, Download, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UseAppUpdateResult } from '@/hooks/useAppUpdate'

/**
 * Mandatory-update gate. Rendered instead of normal app content once the
 * 3-day grace period expires. The update actions remain fully usable —
 * the gate never blocks its own escape paths.
 */
export default function UpdateGate({ update }: { update: UseAppUpdateResult }) {
  const { state, downloadPhase, startInAppDownload, installDownloadedApk, openWebDownload } = update
  const policy = state.policy

  const downloading = downloadPhase.kind === 'downloading'
  const installing = downloadPhase.kind === 'installing'

  const primaryLabel =
    downloadPhase.kind === 'downloaded'
      ? 'Install update'
      : downloading
        ? 'Downloading…'
        : 'Download & Install'

  return (
    <div className="min-h-screen bg-background px-4 py-6 flex flex-col items-center justify-center gap-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" />
          <p className="text-xs font-black uppercase tracking-[0.28em]">Update required</p>
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
          Update BIGDROPS to continue
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The grace period for this version has ended. Normal use is paused
          until the approved update is installed. Your data is safe and
          returns as soon as you update.
        </p>

        {policy ? (
          <div className="mt-5 rounded-2xl bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Required version: v{policy.versionCode}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Update state recorded on this device
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {downloadPhase.kind === 'downloaded' ? (
            <Button onClick={() => void installDownloadedApk()} loading={installing} size="lg">
              <Download data-icon="inline-start" />
              Install update
            </Button>
          ) : (
            <Button
              onClick={() => void startInAppDownload()}
              loading={downloading}
              disabled={installing}
              size="lg"
            >
              <Download data-icon="inline-start" />
              {primaryLabel}
            </Button>
          )}

          <Button variant="outline" onClick={() => void openWebDownload()} size="lg">
            <Globe data-icon="inline-start" />
            Download on Web
          </Button>
        </div>

        {downloadPhase.kind === 'downloading' && (
          <p className="mt-4 text-xs text-muted-foreground">
            Downloading… {downloadPhase.downloadedBytes.toLocaleString()} bytes
            {downloadPhase.totalBytes ? ` of ${downloadPhase.totalBytes.toLocaleString()}` : ''}
          </p>
        )}

        {downloadPhase.kind === 'failed' && (
          <p className="mt-4 text-xs font-medium text-destructive" role="alert">
            {downloadPhase.message}
          </p>
        )}
      </div>
    </div>
  )
}

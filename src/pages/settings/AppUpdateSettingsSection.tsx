import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { useAppUpdateContext } from '@/contexts/AppUpdateContext'
import { getAppVersionInfo, type AppVersionInfo } from '@/lib/appUpdate/appVersion'
import { isAndroidNative } from '@/lib/native/capacitor'
import type { CheckResult } from '@/hooks/useAppUpdate'
import { formatVersionLabel } from '@/domain/appUpdate/updateStateMachine'
import { useWebAndroidApk } from '@/hooks/useWebAndroidApk'
import UpdateModal from '@/components/app/UpdateModal'
import { DownloadProgress } from '@/components/app/update/DownloadProgress'

function WebAndroidDownloadSection() {
  const { apkUrl, versionName, versionCode, loading } = useWebAndroidApk()

  return (
    <div className="space-y-4">
      <SettingsSummaryCard
        title="BOUXRE for Android"
        description="Download the native Android app for faster performance, biometric security, and offline support."
      >
        <SettingsSummaryRow
          label="Platform"
          value={
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Smartphone className="size-3.5 text-primary" /> Android (APK)
            </span>
          }
        />
        <SettingsSummaryRow
          label="Latest Version"
          value={
            loading
              ? 'Checking…'
              : versionName
                ? `v${versionName} (${versionCode ?? '—'})`
                : 'v1.0.24 (Latest)'
          }
        />
        <SettingsSummaryRow
          label="Distribution"
          value={
            <span className="flex items-center gap-1.5 text-bd-status-success-text">
              <CheckCircle2 className="size-3.5" /> Official Supabase CDN
            </span>
          }
        />
        <SettingsSummaryRow
          label="Security"
          value="Signed Release Build"
        />
      </SettingsSummaryCard>

      <Button asChild size="lg" className="w-full shadow-xs">
        <a href={apkUrl} download="bouxre-latest.apk">
          <Download className="size-4" data-icon="inline-start" />
          Download BOUXRE APK
        </a>
      </Button>

      <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 text-xs text-muted-foreground space-y-1.5">
        <p className="font-semibold text-foreground flex items-center gap-1.5">
          <Download className="size-3.5 text-primary" /> Installation instructions
        </p>
        <p>
          1. Tap the button above to download the official Android APK directly to your device.
        </p>
        <p>
          2. Open the downloaded file from your browser&apos;s Downloads or notification bar.
        </p>
        <p>
          3. If prompted by Android, allow installation from unknown sources for your browser.
        </p>
      </div>
    </div>
  )
}

function VersionCell({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="min-w-0 px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-[15px] font-semibold tabular-nums ${
          muted ? 'text-bd-text-muted' : 'text-bd-text'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

/**
 * Android-only manual update surface. Renders the exact result of the
 * awaited forced check — never a timed guess, never policy presence.
 * Only a successfully resolved `up_to_date` shows a settled state.
 */
export function AppUpdateSettingsSection() {
  const update = useAppUpdateContext()
  const [version, setVersion] = useState<AppVersionInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [lastCheck, setLastCheck] = useState<CheckResult | null>(null)

  useEffect(() => {
    let cancelled = false
    void getAppVersionInfo().then((info) => {
      if (!cancelled) setVersion(info)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleCheck = useCallback(async () => {
    setChecking(true)
    try {
      const result = await update.checkForUpdate()
      setLastCheck(result)
    } finally {
      setChecking(false)
    }
  }, [update])

  if (!isAndroidNative()) {
    return <WebAndroidDownloadSection />
  }

  // Single truthful source: the exact manual-check result when present,
  // otherwise the live hook state once its authoritative discovery settled.
  const state = lastCheck?.state ?? update.state
  const settled = Boolean(lastCheck) || update.ready
  const isPending =
    state.status === 'available' || state.status === 'grace' || state.status === 'blocked'
  const targetLabel = state.policy
    ? formatVersionLabel(state.policy.versionName, state.policy.versionCode)
    : null
  const currentValue = version?.versionName
    ? `v${version.versionName}${version.versionCode ? ` (${version.versionCode})` : ''}`
    : '—'

  const phase = update.downloadPhase
  const apkSize = update.release?.assets[0]?.sizeBytes ?? null
  const totalBytes =
    phase.kind === 'downloading' ? (phase.totalBytes ?? apkSize ?? undefined) : undefined
  const downloadedBytes = phase.kind === 'downloading' ? phase.downloadedBytes : undefined
  const percentage =
    totalBytes && downloadedBytes !== undefined
      ? Math.min(100, (downloadedBytes / totalBytes) * 100)
      : null

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)]">
        <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
          <h3 className="text-sm font-bold text-bd-text">App Version</h3>
          <button
            type="button"
            onClick={() => void handleCheck()}
            disabled={checking}
            className="text-[11px] font-medium text-bd-text-muted underline underline-offset-4 transition-colors hover:text-bd-text disabled:opacity-60"
          >
            {checking ? 'Checking…' : 'Check again'}
          </button>
        </div>

        <div className="grid grid-cols-2 divide-x divide-[hsl(var(--bd-border)/0.4)]">
          <VersionCell label="Current" value={currentValue} />
          <VersionCell
            label="Available"
            value={
              !settled
                ? '—'
                : isPending && targetLabel
                  ? targetLabel
                  : state.status === 'up_to_date'
                    ? 'None'
                    : 'Not checked'
            }
            muted={!isPending}
          />
        </div>
      </div>

      {phase.kind === 'downloading' ? (
        <div className="space-y-2">
          <DownloadProgress
            percentage={percentage}
            downloadedBytes={downloadedBytes}
            totalBytes={totalBytes}
            status={downloadedBytes ? 'downloading' : 'connecting'}
            surface="page"
          />
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void update.cancelInAppDownload()}
              className="text-[11px] font-medium text-bd-text-muted underline underline-offset-4 transition-colors hover:text-bd-text"
            >
              Cancel download
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-[11px] font-medium text-bd-text-muted underline underline-offset-4 transition-colors hover:text-bd-text"
            >
              Details
            </button>
          </div>
        </div>
      ) : phase.kind === 'downloaded' ? (
        <Button
          onClick={() => void update.installDownloadedApk()}
          size="lg"
          className="w-full"
        >
          <Download className="size-4" data-icon="inline-start" />
          Install update
        </Button>
      ) : isPending ? (
        <Button
          onClick={() => setModalOpen(true)}
          size="lg"
          className="w-full"
        >
          <Download className="size-4" data-icon="inline-start" />
          Install {targetLabel ?? 'update'}
        </Button>
      ) : null}

      {settled && state.status === 'unavailable' ? (
        <Button
          onClick={() => void handleCheck()}
          disabled={checking}
          variant="outline"
          size="lg"
          className="w-full"
        >
          <RefreshCw className="size-4" data-icon="inline-start" />
          {checking ? 'Checking…' : 'Retry'}
        </Button>
      ) : null}

      <UpdateModal open={modalOpen} onOpenChange={setModalOpen} update={update} />
    </div>
  )
}

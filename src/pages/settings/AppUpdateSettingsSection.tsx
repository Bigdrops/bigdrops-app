import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { useAppUpdateContext } from '@/contexts/AppUpdateContext'
import { getAppVersionInfo, type AppVersionInfo } from '@/lib/appUpdate/appVersion'
import { isAndroidNative } from '@/lib/native/capacitor'
import type { CheckResult } from '@/hooks/useAppUpdate'
import { mapUpdateStatusToSettingsDisplay } from '@/domain/appUpdate/settingsUpdateDisplay'
import { useWebAndroidApk } from '@/hooks/useWebAndroidApk'
import UpdateSheet from '@/components/app/UpdateSheet'

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

/**
 * Android-only manual update surface. Renders the exact result of the
 * awaited forced check — never a timed guess, never policy presence.
 * Only a successfully resolved `up_to_date` shows the green state.
 */
export function AppUpdateSettingsSection() {
  const update = useAppUpdateContext()
  const [version, setVersion] = useState<AppVersionInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
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
      if (
        result &&
        (result.state.status === 'available' ||
          result.state.status === 'grace' ||
          result.state.status === 'blocked') &&
        result.state.policy
      ) {
        setSheetOpen(true)
      }
    } finally {
      setChecking(false)
    }
  }, [update])

  if (!isAndroidNative()) {
    return <WebAndroidDownloadSection />
  }

  // Single truthful source: the exact manual-check result when present,
  // otherwise the live hook state once its authoritative discovery settled.
  const source = lastCheck?.state ?? (update.ready ? update.state : null)
  const display = checking ? 'checking' : source ? mapUpdateStatusToSettingsDisplay(source.status) : 'idle'
  const policy = source?.policy ?? null
  const targetLabel =
    policy && (policy.versionName || policy.versionCode) ? `v${policy.versionCode}` : null
  const graceRemaining = update.graceRemaining

  return (
    <div className="space-y-4">
      <SettingsSummaryCard title="App Version" description="Current installation and update status">
        <SettingsSummaryRow
          label="Version"
          value={version?.versionName ? `${version.versionName} (${version.versionCode ?? '—'})` : 'Checking…'}
        />
        <SettingsSummaryRow
          label="Status"
          value={
            display === 'checking' ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <RefreshCw className="size-3.5 animate-spin" /> Checking…
              </span>
            ) : display === 'up_to_date' ? (
              <span className="flex items-center gap-1.5 text-bd-status-success-text">
                <CheckCircle2 className="size-3.5" /> Up to date
              </span>
            ) : display === 'available' ? (
              <span className="flex items-center gap-1.5 text-bd-status-warning-text">
                <AlertTriangle className="size-3.5" /> Update available{targetLabel ? ` (${targetLabel})` : ''}
              </span>
            ) : display === 'grace' ? (
              <span className="flex items-center gap-1.5 text-bd-status-warning-text">
                <AlertTriangle className="size-3.5" /> Mandatory update available
                {targetLabel ? ` (${targetLabel})` : ''}
                {graceRemaining && !graceRemaining.expired
                  ? ` · ${graceRemaining.days}d ${graceRemaining.hours}h left`
                  : ''}
              </span>
            ) : display === 'blocked' ? (
              <span className="flex items-center gap-1.5 text-bd-status-warning-text">
                <AlertTriangle className="size-3.5" /> Update required
                {targetLabel ? ` (${targetLabel})` : ''}
              </span>
            ) : display === 'unavailable' ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="size-3.5" /> Could not check for updates
              </span>
            ) : (
              '—'
            )
          }
        />
      </SettingsSummaryCard>

      <Button
        onClick={() => void handleCheck()}
        disabled={checking}
        variant="outline"
        size="lg"
        className="w-full"
      >
        <RefreshCw className="size-4" data-icon="inline-start" />
        {checking ? 'Checking…' : display === 'unavailable' ? 'Retry' : 'Check for updates'}
      </Button>

      <UpdateSheet open={sheetOpen} onOpenChange={setSheetOpen} update={update} />
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { useAppUpdateContext } from '@/contexts/AppUpdateContext'
import { getAppVersionInfo, type AppVersionInfo } from '@/lib/appUpdate/appVersion'
import { isAndroidNative } from '@/lib/native/capacitor'
import type { CheckResult } from '@/hooks/useAppUpdate'
import { mapUpdateStatusToSettingsDisplay } from '@/domain/appUpdate/settingsUpdateDisplay'
import UpdateSheet from '@/components/app/UpdateSheet'

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

  if (!isAndroidNative()) return null

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
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" /> Up to date
              </span>
            ) : display === 'available' ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3.5" /> Update available{targetLabel ? ` (${targetLabel})` : ''}
              </span>
            ) : display === 'grace' ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3.5" /> Mandatory update available
                {targetLabel ? ` (${targetLabel})` : ''}
                {graceRemaining && !graceRemaining.expired
                  ? ` · ${graceRemaining.days}d ${graceRemaining.hours}h left`
                  : ''}
              </span>
            ) : display === 'blocked' ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
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

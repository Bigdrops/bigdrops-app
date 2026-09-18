import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { useAppUpdateContext } from '@/contexts/AppUpdateContext'
import { getAppVersionInfo, type AppVersionInfo } from '@/lib/appUpdate/appVersion'
import UpdateSheet from '@/components/app/UpdateSheet'

export function AppUpdateSettingsSection() {
  const update = useAppUpdateContext()
  const [version, setVersion] = useState<AppVersionInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [result, setResult] = useState<'idle' | 'up_to_date' | 'update_found'>('idle')

  useEffect(() => {
    void getAppVersionInfo().then(setVersion)
  }, [])

  const handleCheck = useCallback(() => {
    setChecking(true)
    setResult('idle')
    // Give the hook a tick to process, then read state
    const t = setTimeout(() => {
      setChecking(false)
      if (update.state.policy) {
        setResult('update_found')
        setSheetOpen(true)
      } else {
        setResult('up_to_date')
      }
    }, 2000)
    update.checkForUpdate()
    return () => clearTimeout(t)
  }, [update])

  // If the update state changes externally (e.g. from the banner auto-check),
  // reflect it when we're in idle.
  useEffect(() => {
    if (result !== 'idle' && update.state.policy) {
      setResult('update_found')
    }
  }, [update.state.policy, result])

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
            checking ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <RefreshCw className="size-3.5 animate-spin" /> Checking…
              </span>
            ) : result === 'update_found' ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3.5" /> Update available
              </span>
            ) : result === 'up_to_date' ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" /> Up to date
              </span>
            ) : (
              '—'
            )
          }
        />
      </SettingsSummaryCard>

      <Button
        onClick={handleCheck}
        disabled={checking}
        variant="outline"
        size="lg"
        className="w-full"
      >
        <RefreshCw className="size-4" data-icon="inline-start" />
        {checking ? 'Checking…' : 'Check for updates'}
      </Button>

      <UpdateSheet open={sheetOpen} onOpenChange={setSheetOpen} update={update} />
    </div>
  )
}

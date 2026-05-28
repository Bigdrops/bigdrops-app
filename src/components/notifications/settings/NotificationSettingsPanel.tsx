import { useMemo, useState } from 'react'
import { BellRing, Send, MessageSquare, Smartphone, Mail, Calendar, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationChannelToggles } from './NotificationChannelToggles'
import { ReminderThresholdSelector } from './ReminderThresholdSelector'
import { SettingsLoadingState } from '@/pages/settings/SettingsLoadingState'
import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { SettingsActionFooter } from '@/components/settings/SettingsActionFooter'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'
import { feedback } from '@/lib/feedback'
import {
  DUE_BEFORE_REMINDER_OPTIONS,
  OVERDUE_REMINDER_OPTIONS,
  UNPAID_REMINDER_OPTIONS,
  normalizeThresholdDays,
  parseCustomThresholdDay,
} from '@/domain/notifications/notificationPreferences'
import { sendPushForNotification } from '@/domain/notifications/sendPushForNotification'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'


export function NotificationSettingsPanel({
  userId,
}: {
  userId?: string | null
}) {
  const {
    preferences,
    setPreferences,
    loading,
    saving,
    save,
  } = useNotificationPreferences(userId)

  const [unpaidCustomDay, setUnpaidCustomDay] = useState('')
  const [overdueCustomDay, setOverdueCustomDay] = useState('')
  const [unpaidCustomError, setUnpaidCustomError] = useState<string | null>(null)
  const [overdueCustomError, setOverdueCustomError] = useState<string | null>(null)
  const [testingPush, setTestingPush] = useState(false)
  
  const [activeSheet, setActiveSheet] = useState<'channels' | 'schedules' | null>(null)

  const unpaidOptions = useMemo(
    () =>
      Array.from(
        new Set([...UNPAID_REMINDER_OPTIONS, ...preferences.invoiceUnpaidAfterDays]),
      )
        .sort((left, right) => left - right)
        .map((value) => ({ value, label: `${value} days` })),
    [preferences.invoiceUnpaidAfterDays],
  )

  const dueBeforeOptions = useMemo(
    () => [
      ...DUE_BEFORE_REMINDER_OPTIONS.map((value) => ({
        value,
        label: `${value} day${value === 1 ? '' : 's'} before due`,
      })),
      { value: 0, label: 'On due date' },
    ],
    [],
  )

  const overdueOptions = useMemo(
    () =>
      Array.from(
        new Set([...OVERDUE_REMINDER_OPTIONS, ...preferences.invoiceOverdueAfterDays]),
      )
        .sort((left, right) => left - right)
        .map((value) => ({ value, label: `${value} day${value === 1 ? '' : 's'} after due` })),
    [preferences.invoiceOverdueAfterDays],
  )

  const updateThresholdList = (
    key: 'invoiceUnpaidAfterDays' | 'invoiceDueBeforeDays' | 'invoiceOverdueAfterDays',
    thresholdDay: number,
  ) => {
    setPreferences((current) => {
      const selectedDays = current[key]
      const nextDays = selectedDays.includes(thresholdDay)
        ? selectedDays.filter((value) => value !== thresholdDay)
        : [...selectedDays, thresholdDay]

      return {
        ...current,
        [key]: normalizeThresholdDays(nextDays),
      }
    })
  }

  const addCustomDay = (
    value: string,
    key: 'invoiceUnpaidAfterDays' | 'invoiceOverdueAfterDays',
    onReset: () => void,
    onError: (message: string | null) => void,
  ) => {
    const parsedDay = parseCustomThresholdDay(value)

    if (!parsedDay) {
      onError('Custom day must be a positive whole number.')
      return
    }

    if (preferences[key].includes(parsedDay)) {
      onError('That reminder day is already selected.')
      return
    }

    setPreferences((current) => ({
      ...current,
      [key]: normalizeThresholdDays([...current[key], parsedDay]),
    }))
    onReset()
    onError(null)
  }

  const handleSave = async () => {
    if (!userId) return

    try {
      await save(preferences)
      feedback.success('Preferences saved')
      setActiveSheet(null)
    } catch (saveError) {
      feedback.error(saveError instanceof Error ? saveError.message : 'Failed to save')
    }
  }

  const handleTestPush = async () => {
    if (!userId) return

    setTestingPush(true)
    try {
      await sendPushForNotification({
        userId,
        title: 'Test Notification',
        message: 'This is a test push notification from your Bigdrops settings.',
        notificationId: 'test-' + Date.now(),
      })
      feedback.success('Test push sequence initiated')
    } catch (testError) {
      feedback.error(testError instanceof Error ? testError.message : 'Test failed')
    } finally {
      setTestingPush(false)
    }
  }

  if (!userId) {
    return (
      <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-surface-muted)/0.3)] px-4 py-4 text-sm text-bd-text-muted">
        Sign in to manage notification preferences.
      </div>
    )
  }

  if (loading) return <SettingsLoadingState />

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid gap-6">
        {/* Delivery Channels Summary */}
        <SettingsSummaryCard 
          title="Delivery Channels"
          description="Control how you receive alerts and reports."
          action={
            <Button variant="ghost" size="sm" onClick={() => setActiveSheet('channels')} className="h-8 rounded-full text-xs font-bold text-bd-button-primary-bg">
              Edit Channels
            </Button>
          }
        >
          <SettingsSummaryRow 
            label="In-App Notifications" 
            value={preferences.channels.in_app ? "Enabled" : "Disabled"} 
            icon={<MessageSquare size={16} />}
          />
          <SettingsSummaryRow 
            label="Push Notifications" 
            value={preferences.channels.push ? "Enabled" : "Disabled"} 
            icon={<Smartphone size={16} />}
          />
          <SettingsSummaryRow 
            label="Monthly Reports" 
            value={preferences.monthlyReportEnabled ? "Enabled" : "Disabled"} 
            icon={<Mail size={16} />}
          />
        </SettingsSummaryCard>

        {/* Reminder Thresholds Summary */}
        <SettingsSummaryCard 
          title="Reminder Schedules"
          description="Automated alerts for pending and overdue invoices."
          action={
            <Button variant="ghost" size="sm" onClick={() => setActiveSheet('schedules')} className="h-8 rounded-full text-xs font-bold text-bd-button-primary-bg">
              Edit Schedules
            </Button>
          }
        >
          <SettingsSummaryRow 
            label="Unpaid Reminders" 
            value={`${preferences.invoiceUnpaidAfterDays.length} active triggers`} 
            icon={<Calendar size={16} />}
          />
          <SettingsSummaryRow 
            label="Due Date Alerts" 
            value={`${preferences.invoiceDueBeforeDays.length + (preferences.invoiceDueToday ? 1 : 0)} active triggers`} 
            icon={<AlertCircle size={16} />}
          />
          <SettingsSummaryRow 
            label="Overdue Reminders" 
            value={`${preferences.invoiceOverdueAfterDays.length} active triggers`} 
            icon={<Calendar size={16} />}
          />
        </SettingsSummaryCard>

        {/* Diagnostics Card */}
        <SettingsSummaryCard 
          title="System Diagnostics"
          description="Verify notification delivery on this device."
        >
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-bd-text-muted opacity-70">
                Push Token Validity
              </p>
              <p className="mt-1 text-xs text-bd-text-muted">
                Send a test push to ensure your device is correctly registered.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestPush}
              disabled={testingPush || !preferences.channels.push}
              className="rounded-full border-bd-border text-xs font-bold"
            >
              {testingPush ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              ) : (
                <Send size={14} className="mr-2" />
              )}
              {testingPush ? 'Testing...' : 'Test Push'}
            </Button>
          </div>
        </SettingsSummaryCard>
      </div>

      {/* Delivery Channels Editor */}
      <Sheet open={activeSheet === 'channels'} onOpenChange={(open) => !open && setActiveSheet(null)}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>Delivery Channels</SheetTitle>
            <SheetDescription>
              Toggle preferred communication methods for workspace activity.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="py-6">
              <NotificationChannelToggles
                items={[
                  {
                    key: 'in_app',
                    label: 'In-app notifications',
                    description: 'Alerts shown inside the application bell menu.',
                    checked: preferences.channels.in_app,
                    onCheckedChange: (checked) =>
                      setPreferences((current) => ({
                        ...current,
                        channels: { ...current.channels, in_app: checked },
                      })),
                  },
                  {
                    key: 'push',
                    label: 'Push notifications',
                    description: 'Direct alerts to your mobile or desktop device.',
                    checked: preferences.channels.push,
                    onCheckedChange: (checked) =>
                      setPreferences((current) => ({
                        ...current,
                        channels: { ...current.channels, push: checked },
                      })),
                  },
                  {
                    key: 'monthly_report',
                    label: 'Monthly email reports',
                    description: 'A summary of your performance delivered via email.',
                    checked: preferences.monthlyReportEnabled,
                    onCheckedChange: (checked) =>
                      setPreferences((current) => ({
                        ...current,
                        monthlyReportEnabled: checked,
                      })),
                  },
                ]}
              />
            </div>
          </div>

          <SettingsActionFooter 
            onSave={handleSave}
            onCancel={() => setActiveSheet(null)}
            saving={saving}
          />
        </SheetContent>
      </Sheet>

      {/* Reminder Schedules Editor */}
      <Sheet open={activeSheet === 'schedules'} onOpenChange={(open) => !open && setActiveSheet(null)}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle>Reminder Schedules</SheetTitle>
            <SheetDescription>
              Configure when automated reminders are sent for your documents.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-8 py-6">
              <ReminderThresholdSelector
                title="Unpaid Reminders"
                options={unpaidOptions}
                selectedDays={preferences.invoiceUnpaidAfterDays}
                onToggleDay={(day) => updateThresholdList('invoiceUnpaidAfterDays', day)}
                customValue={unpaidCustomDay}
                onCustomValueChange={(value) => {
                  setUnpaidCustomDay(value)
                  setUnpaidCustomError(null)
                }}
                onAddCustomDay={() =>
                  addCustomDay(
                    unpaidCustomDay,
                    'invoiceUnpaidAfterDays',
                    () => setUnpaidCustomDay(''),
                    setUnpaidCustomError,
                  )
                }
                customError={unpaidCustomError}
              />

              <div className="h-px bg-[hsl(var(--bd-border)/0.3)]" />

              <ReminderThresholdSelector
                title="Due Date Reminders"
                options={dueBeforeOptions}
                selectedDays={[
                  ...preferences.invoiceDueBeforeDays,
                  ...(preferences.invoiceDueToday ? [0] : []),
                ]}
                onToggleDay={(day) => {
                  if (day === 0) {
                    setPreferences((current) => ({
                      ...current,
                      invoiceDueToday: !current.invoiceDueToday,
                    }))
                    return
                  }
                  updateThresholdList('invoiceDueBeforeDays', day)
                }}
              />

              <div className="h-px bg-[hsl(var(--bd-border)/0.3)]" />

              <ReminderThresholdSelector
                title="Overdue Reminders"
                options={overdueOptions}
                selectedDays={preferences.invoiceOverdueAfterDays}
                onToggleDay={(day) => updateThresholdList('invoiceOverdueAfterDays', day)}
                customValue={overdueCustomDay}
                onCustomValueChange={(value) => {
                  setOverdueCustomDay(value)
                  setOverdueCustomError(null)
                }}
                onAddCustomDay={() =>
                  addCustomDay(
                    overdueCustomDay,
                    'invoiceOverdueAfterDays',
                    () => setOverdueCustomDay(''),
                    setOverdueCustomError,
                  )
                }
                customError={overdueCustomError}
              />
            </div>
          </div>

          <SettingsActionFooter 
            onSave={handleSave}
            onCancel={() => setActiveSheet(null)}
            saving={saving}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

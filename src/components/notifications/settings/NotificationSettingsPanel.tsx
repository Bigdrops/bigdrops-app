import { useMemo, useState } from 'react'
import { BellRing, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationChannelToggles } from './NotificationChannelToggles'
import { ReminderThresholdSelector } from './ReminderThresholdSelector'
import { SettingsLoadingState } from '@/pages/settings/SettingsLoadingState'
import { SettingsSaveButton } from '@/pages/settings/SettingsFormPrimitives'
import type { SettingsToastFn } from '@/pages/settings/settings-types'
import { getErrorMessage } from '@/pages/settings/settings-helpers'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'
import {
  DUE_BEFORE_REMINDER_OPTIONS,
  OVERDUE_REMINDER_OPTIONS,
  UNPAID_REMINDER_OPTIONS,
  normalizeThresholdDays,
  parseCustomThresholdDay,
} from '@/domain/notifications/notificationPreferences'
import { sendPushForNotification } from '@/domain/notifications/sendPushForNotification'

export function NotificationSettingsPanel({
  userId,
  onToast,
}: {
  userId?: string | null
  onToast: SettingsToastFn
}) {
  const {
    preferences,
    setPreferences,
    loading,
    saving,
    saved,
    error,
    save,
  } = useNotificationPreferences(userId)

  const [unpaidCustomDay, setUnpaidCustomDay] = useState('')
  const [overdueCustomDay, setOverdueCustomDay] = useState('')
  const [unpaidCustomError, setUnpaidCustomError] = useState<string | null>(null)
  const [overdueCustomError, setOverdueCustomError] = useState<string | null>(null)
  const [testingPush, setTestingPush] = useState(false)

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
      onToast('Notification preferences saved')
    } catch (saveError) {
      onToast(getErrorMessage(saveError))
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
      onToast('Test push sequence initiated')
    } catch (testError) {
      onToast(getErrorMessage(testError))
    } finally {
      setTestingPush(false)
    }
  }

  if (!userId) {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
        Sign in to manage notification preferences.
      </div>
    )
  }

  if (loading) return <SettingsLoadingState />

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-foreground shadow-sm">
            <BellRing size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-foreground">Notification Preferences</div>
            <div className="mt-0.5 text-[12px] leading-5 text-muted-foreground">
              Choose which reminders stay active. Reminder days are multi-select, and push
              stays a delivery channel separate from device platform.
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="px-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
            Channels
          </p>
        </div>
        <NotificationChannelToggles
          items={[
            {
              key: 'in_app',
              label: 'In-app notifications',
              description: 'Keeps reminder rules available inside the app notification feed.',
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
              description:
                'Controls push delivery as a channel. Device platform and token registration are handled separately.',
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
              description: 'Keeps the monthly report rule on the email channel without affecting invoice reminder thresholds.',
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

      <div className="space-y-2">
        <div className="px-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
            Invoice unpaid reminders
          </p>
        </div>
        <ReminderThresholdSelector
          title="Invoice unpaid reminders"
          description="Pick any number of unpaid reminder days. Each selected day becomes its own independent preference rule."
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
          helperText="You can keep 3, 5, 7, 14, 30, and custom days active together."
        />
      </div>

      <div className="space-y-2">
        <div className="px-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
            Due date reminders
          </p>
        </div>
        <ReminderThresholdSelector
          title="Due date reminders"
          description="Use the same multi-select pattern for due-date reminders, including the due-date itself."
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
          helperText="These rules map to invoice_due_before and invoice_due_today separately."
        />
      </div>

      <div className="space-y-2">
        <div className="px-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
            Overdue reminders
          </p>
        </div>
        <ReminderThresholdSelector
          title="Overdue reminders"
          description="Keep multiple overdue follow-ups active at once, including any custom day you need."
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
          helperText="Disabling one overdue day only affects that exact threshold."
        />
      </div>

      <div className="space-y-2">
        <div className="px-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
            Diagnostics
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-foreground">Test Delivery</div>
              <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                Trigger a manual push notification to verify your device registration and token
                validity.
              </div>
            </div>
            <button
              onClick={handleTestPush}
              disabled={testingPush || !preferences.channels.push}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-50',
                preferences.channels.push
                  ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/10'
                  : 'bg-muted text-muted-foreground border border-border cursor-not-allowed',
              )}
            >
              {testingPush ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send size={14} />
              )}
              {testingPush ? 'Sending...' : 'Send Test Push'}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <SettingsSaveButton saving={saving} saved={saved} onClick={handleSave} />
    </div>
  )
}

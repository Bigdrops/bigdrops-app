export const NOTIFICATION_CHANNELS = ['in_app', 'push', 'email'] as const
export const INVOICE_REMINDER_CHANNELS = ['in_app', 'push'] as const
export const NOTIFICATION_EVENT_KEYS = [
  'invoice_unpaid_after',
  'invoice_due_before',
  'invoice_due_today',
  'invoice_overdue_after',
  'monthly_report',
] as const

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]
export type InvoiceReminderChannel = (typeof INVOICE_REMINDER_CHANNELS)[number]
export type NotificationEventKey = (typeof NOTIFICATION_EVENT_KEYS)[number]

export type NotificationPreferenceRule = {
  id?: string
  user_id: string
  event_key: NotificationEventKey
  threshold_days: number
  channel: NotificationChannel
  enabled: boolean
  created_at?: string
  updated_at?: string
}

export type NotificationPreferenceState = {
  channels: Record<InvoiceReminderChannel, boolean>
  monthlyReportEnabled: boolean
  invoiceUnpaidAfterDays: number[]
  invoiceDueBeforeDays: number[]
  invoiceDueToday: boolean
  invoiceOverdueAfterDays: number[]
}

export const DEFAULT_NOTIFICATION_PREFERENCE_STATE: NotificationPreferenceState = {
  channels: {
    in_app: true,
    push: true,
  },
  monthlyReportEnabled: false,
  invoiceUnpaidAfterDays: [3, 7],
  invoiceDueBeforeDays: [1, 3],
  invoiceDueToday: true,
  invoiceOverdueAfterDays: [1, 7],
}

export const UNPAID_REMINDER_OPTIONS = [3, 5, 7, 14, 30] as const
export const DUE_BEFORE_REMINDER_OPTIONS = [7, 3, 1] as const
export const OVERDUE_REMINDER_OPTIONS = [1, 3, 7, 14] as const
export const MONTHLY_REPORT_THRESHOLD_DAYS = 0
export const DUE_TODAY_THRESHOLD_DAYS = 0

export function normalizeThresholdDays(values: number[]): number[] {
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  ).sort((left, right) => left - right)
}

export function getNotificationPreferenceRuleKey(
  rule: Pick<NotificationPreferenceRule, 'event_key' | 'threshold_days' | 'channel'>,
): string {
  return `${rule.event_key}|${rule.threshold_days}|${rule.channel}`
}

export function buildNotificationPreferenceRules(
  userId: string,
  state: NotificationPreferenceState,
): NotificationPreferenceRule[] {
  const now = new Date().toISOString()
  const rules: NotificationPreferenceRule[] = []

  const pushInvoiceRules = (eventKey: NotificationEventKey, thresholdDays: number) => {
    for (const channel of INVOICE_REMINDER_CHANNELS) {
      rules.push({
        user_id: userId,
        event_key: eventKey,
        threshold_days: thresholdDays,
        channel,
        enabled: state.channels[channel],
        updated_at: now,
      })
    }
  }

  for (const threshold of normalizeThresholdDays(state.invoiceUnpaidAfterDays)) {
    pushInvoiceRules('invoice_unpaid_after', threshold)
  }

  for (const threshold of normalizeThresholdDays(state.invoiceDueBeforeDays)) {
    pushInvoiceRules('invoice_due_before', threshold)
  }

  if (state.invoiceDueToday) {
    pushInvoiceRules('invoice_due_today', DUE_TODAY_THRESHOLD_DAYS)
  }

  for (const threshold of normalizeThresholdDays(state.invoiceOverdueAfterDays)) {
    pushInvoiceRules('invoice_overdue_after', threshold)
  }

  rules.push({
    user_id: userId,
    event_key: 'monthly_report',
    threshold_days: MONTHLY_REPORT_THRESHOLD_DAYS,
    channel: 'email',
    enabled: state.monthlyReportEnabled,
    updated_at: now,
  })

  return rules
}

export function deriveNotificationPreferenceState(
  rules: NotificationPreferenceRule[],
): NotificationPreferenceState {
  const nextState: NotificationPreferenceState = {
    ...DEFAULT_NOTIFICATION_PREFERENCE_STATE,
    channels: { ...DEFAULT_NOTIFICATION_PREFERENCE_STATE.channels },
    invoiceUnpaidAfterDays: [],
    invoiceDueBeforeDays: [],
    invoiceDueToday: false,
    invoiceOverdueAfterDays: [],
  }

  const invoiceChannelRows = rules.filter((rule) => rule.channel !== 'email')

  for (const channel of INVOICE_REMINDER_CHANNELS) {
    const channelRows = invoiceChannelRows.filter((rule) => rule.channel === channel)
    if (channelRows.length > 0) {
      nextState.channels[channel] = channelRows.some((rule) => rule.enabled)
    }
  }

  nextState.invoiceUnpaidAfterDays = normalizeThresholdDays(
    rules
      .filter((rule) => rule.event_key === 'invoice_unpaid_after')
      .map((rule) => rule.threshold_days),
  )

  nextState.invoiceDueBeforeDays = normalizeThresholdDays(
    rules
      .filter((rule) => rule.event_key === 'invoice_due_before')
      .map((rule) => rule.threshold_days),
  )

  nextState.invoiceDueToday = rules.some(
    (rule) => rule.event_key === 'invoice_due_today',
  )

  nextState.invoiceOverdueAfterDays = normalizeThresholdDays(
    rules
      .filter((rule) => rule.event_key === 'invoice_overdue_after')
      .map((rule) => rule.threshold_days),
  )

  const monthlyReportRule = rules.find(
    (rule) => rule.event_key === 'monthly_report' && rule.channel === 'email',
  )
  nextState.monthlyReportEnabled = Boolean(monthlyReportRule?.enabled)

  return nextState
}

export function parseCustomThresholdDay(value: string): number | null {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) return null

  const parsed = Number(normalized)
  if (!Number.isInteger(parsed) || parsed <= 0) return null

  return parsed
}

import * as React from 'react'
import { supabase } from '@/supabase'
import {
  buildNotificationPreferenceRules,
  DEFAULT_NOTIFICATION_PREFERENCE_STATE,
  deriveNotificationPreferenceState,
  getNotificationPreferenceRuleKey,
  type NotificationPreferenceRule,
  type NotificationPreferenceState,
} from '@/domain/notifications/notificationPreferences'

const NOTIFICATION_PREFERENCE_COLUMNS =
  'id,user_id,event_key,threshold_days,channel,enabled,created_at,updated_at'

export function useNotificationPreferences(userId?: string | null) {
  const [preferences, setPreferences] = React.useState<NotificationPreferenceState>(
    DEFAULT_NOTIFICATION_PREFERENCE_STATE,
  )
  const [existingRules, setExistingRules] = React.useState<NotificationPreferenceRule[]>([])
  const [loading, setLoading] = React.useState(Boolean(userId))
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!userId) {
      setPreferences(DEFAULT_NOTIFICATION_PREFERENCE_STATE)
      setExistingRules([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('notification_preferences')
      .select(NOTIFICATION_PREFERENCE_COLUMNS)
      .eq('user_id', userId)
      .order('event_key', { ascending: true })
      .order('threshold_days', { ascending: true })
      .order('channel', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows = Array.isArray(data) ? (data as NotificationPreferenceRule[]) : []
    setExistingRules(rows)
    setPreferences(deriveNotificationPreferenceState(rows))
    setLoading(false)
  }, [userId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const save = React.useCallback(
    async (nextPreferences: NotificationPreferenceState) => {
      if (!userId) return

      setSaving(true)
      setSaved(false)
      setError(null)

      try {
        const desiredRules = buildNotificationPreferenceRules(userId, nextPreferences)
        const desiredRuleKeys = new Set(
          desiredRules.map((rule) => getNotificationPreferenceRuleKey(rule)),
        )
        const existingByKey = new Map(
          existingRules.map((rule) => [getNotificationPreferenceRuleKey(rule), rule]),
        )

        const rulesToUpsert = desiredRules.filter((rule) => {
          const existingRule = existingByKey.get(getNotificationPreferenceRuleKey(rule))
          return !existingRule || existingRule.enabled !== rule.enabled
        })

        const rulesToDelete = existingRules.filter(
          (rule) => !desiredRuleKeys.has(getNotificationPreferenceRuleKey(rule)),
        )

        if (rulesToUpsert.length > 0) {
          const { error: upsertError } = await supabase
            .from('notification_preferences')
            .upsert(rulesToUpsert, {
              onConflict: 'user_id,event_key,threshold_days,channel',
            })

          if (upsertError) throw upsertError
        }

        if (rulesToDelete.length > 0) {
          const deletions = await Promise.all(
            rulesToDelete.map((rule) =>
              supabase.from('notification_preferences').delete().eq('id', rule.id),
            ),
          )

          const failedDelete = deletions.find((result) => result.error)
          if (failedDelete?.error) throw failedDelete.error
        }

        setPreferences(nextPreferences)
        await refresh()
        setSaved(true)
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Failed to save preferences')
        throw saveError
      } finally {
        setSaving(false)
      }
    },
    [existingRules, refresh, userId],
  )

  React.useEffect(() => {
    if (!saved) return

    const timeoutId = window.setTimeout(() => setSaved(false), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [saved])

  return {
    preferences,
    setPreferences,
    loading,
    saving,
    saved,
    error,
    refresh,
    save,
  }
}

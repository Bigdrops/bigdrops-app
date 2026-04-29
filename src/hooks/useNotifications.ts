import * as React from 'react'
import { supabase } from '@/supabase'

export type NotificationSeverity = 'info' | 'warning' | 'critical' | 'success' | string

export type AppNotification = {
  id: string
  user_id?: string | null
  title: string
  message?: string | null
  type: string
  severity: NotificationSeverity
  entity_type?: string | null
  entity_id?: string | null
  dedupe_key?: string | null
  is_read: boolean
  read_at?: string | null
  created_at: string
  updated_at?: string | null
}

type UseNotificationsResult = {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const NOTIFICATION_COLUMNS =
  'id,user_id,title,message,type,severity,entity_type,entity_id,dedupe_key,is_read,read_at,created_at,updated_at'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Notification request failed'
}

export function useNotifications(limit = 30): UseNotificationsResult {
  const [notifications, setNotifications] = React.useState<AppNotification[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select(NOTIFICATION_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError

      setNotifications(Array.isArray(data) ? (data as AppNotification[]) : [])
    } catch (requestError) {
      console.error('[notifications] fetch failed', requestError)
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [limit])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const markRead = React.useCallback(async (id: string) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, is_read: true, read_at: item.read_at || new Date().toISOString() }
          : item,
      ),
    )

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      console.error('[notifications] mark read failed', updateError)
      await refresh()
      throw updateError
    }
  }, [refresh])

  const markAllRead = React.useCallback(async () => {
    const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id)
    if (unreadIds.length === 0) return

    const readAt = new Date().toISOString()

    setNotifications((current) =>
      current.map((item) =>
        unreadIds.includes(item.id) ? { ...item, is_read: true, read_at: item.read_at || readAt } : item,
      ),
    )

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: readAt })
      .in('id', unreadIds)

    if (updateError) {
      console.error('[notifications] mark all read failed', updateError)
      await refresh()
      throw updateError
    }
  }, [notifications, refresh])

  const unreadCount = React.useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  )

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  }
}
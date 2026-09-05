import * as React from 'react'
import { supabase } from '@/supabase'
import { useEntity } from '@/lib/tenant/contexts'
import {
  groupNotificationIdsByTable,
  isEntityBound,
  isNotificationVisibleInTenant,
  notificationOwnerTable,
} from '@/domain/notifications/notificationScope'

export type NotificationSeverity = 'info' | 'warning' | 'critical' | 'success' | string

export type AppNotification = {
  id: string
  user_id?: string | null
  domain?: string | null
  source?: string | null
  generator_key?: string | null
  fingerprint?: string | null
  title: string
  message?: string | null
  route?: string | null
  entity_type?: string | null
  entity_id?: string | null
  severity: NotificationSeverity
  state: string
  read_at?: string | null
  dismissed_at?: string | null
  resolved_at?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at?: string | null
  scope_type?: string | null
  scope_id?: string | null
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
  'id,user_id,domain,source,generator_key,fingerprint,title,message,route,entity_type,entity_id,severity,state,read_at,dismissed_at,resolved_at,metadata,created_at,updated_at,scope_type,scope_id'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Notification request failed'
}

export function isNotificationUnread(notification: Pick<AppNotification, 'read_at' | 'dismissed_at' | 'state'>) {
  return !notification.read_at && !notification.dismissed_at && notification.state !== 'resolved'
}

export function useNotifications(limit = 30): UseNotificationsResult {
  const { tenantClient } = useEntity()
  const [notifications, setNotifications] = React.useState<AppNotification[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fail closed: without a usable tenant context no notification is
      // shown, so one entity's rows can never render under another entity.
      if (!tenantClient.isReady) {
        setNotifications([])
        return
      }

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select(NOTIFICATION_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError

      const rows = (Array.isArray(data) ? data : []) as AppNotification[]

      // Tenant ownership check at the query layer: an entity-bound
      // notification is visible only when its referenced record exists in
      // the ACTIVE tenant's schema. Genuinely global rows (no entity
      // reference) pass through. Unknown entity types stay hidden.
      const groups = groupNotificationIdsByTable(rows)
      const existingIds: Record<string, Set<string>> = {}
      for (const [table, ids] of Object.entries(groups)) {
        try {
          const { data: found, error: lookupError } = await tenantClient
            .from(table)
            .select('id')
            .in('id', ids)
          if (lookupError) throw lookupError
          existingIds[table] = new Set((found || []).map((row: { id: string }) => String(row.id)))
        } catch (lookupError) {
          console.warn('[notifications] tenant ownership check failed for table', table, lookupError)
          existingIds[table] = new Set()
        }
      }

      const visible = rows.filter((row) => {
        const ok = isNotificationVisibleInTenant(row, existingIds)
        if (!ok && isEntityBound(row) && !notificationOwnerTable(row.entity_type)) {
          console.warn('[notifications] hiding row with unknown entity type', row.entity_type)
        }
        return ok
      })

      setNotifications(visible)
    } catch (requestError) {
      console.error('[notifications] fetch failed', requestError)
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [limit, tenantClient])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const markRead = React.useCallback(async (id: string) => {
    const now = new Date().toISOString()

    // Optimistic local update
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read_at: item.read_at || now } : item,
      ),
    )

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('id', id)

    if (updateError) {
      console.error('[notifications] mark read failed', updateError)
      await refresh() // rollback on failure
      throw updateError
    }
  }, [refresh])

  const markAllRead = React.useCallback(async () => {
    const unreadIds = notifications
      .filter((item) => isNotificationUnread(item))
      .map((item) => item.id)

    if (unreadIds.length === 0) return

    const now = new Date().toISOString()

    // Optimistic local update
    setNotifications((current) =>
      current.map((item) =>
        unreadIds.includes(item.id) ? { ...item, read_at: item.read_at || now } : item,
      ),
    )

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read_at: now })
      .in('id', unreadIds)

    if (updateError) {
      console.error('[notifications] mark all read failed', updateError)
      await refresh()
      throw updateError
    }
  }, [notifications, refresh])

  const unreadCount = React.useMemo(
    () => notifications.filter((item) => isNotificationUnread(item)).length,
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

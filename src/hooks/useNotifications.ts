import * as React from 'react'
import { supabase } from '@/supabase'
import { useEntity } from '@/lib/tenant/contexts'
import {
  groupNotificationIdsByTable,
  isEntityBound,
  isNotificationVisibleInTenant,
  notificationOwnerTable,
} from '@/domain/notifications/notificationScope'
import { isAndroidNative } from '@/lib/native/capacitor'
import { useOptionalAppUpdateContext } from '@/contexts/AppUpdateContext'
import { useWebAndroidApk } from '@/hooks/useWebAndroidApk'

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

const WEB_APK_DISMISSED_KEY = 'bd:notif:web-apk-dismissed'
const ANDROID_UPDATE_DISMISSED_KEY = 'bd:notif:android-update-dismissed'

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

  const appUpdate = useOptionalAppUpdateContext()
  const webApk = useWebAndroidApk()

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
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

      // Synthetic injects
      const synthetics: AppNotification[] = []
      const now = new Date().toISOString()

      if (isAndroidNative()) {
        const hasUpdate =
          appUpdate &&
          (appUpdate.state.status === 'available' ||
            appUpdate.state.status === 'grace' ||
            appUpdate.state.status === 'blocked')
        const targetVersionName =
          appUpdate?.state.policy?.versionName || appUpdate?.release?.versionName
        const isDismissed =
          typeof window !== 'undefined' &&
          Boolean(targetVersionName) &&
          localStorage.getItem(ANDROID_UPDATE_DISMISSED_KEY) === targetVersionName

        if (hasUpdate && !isDismissed) {
          const isMandatory =
            appUpdate.state.policy?.mandatory === true || appUpdate.state.status === 'blocked'
          synthetics.push({
            id: 'synthetic-android-update',
            domain: 'system',
            source: 'ota',
            generator_key: 'app:android:update',
            title: 'BOUXRE Android Update Available',
            message: targetVersionName
              ? `Version ${targetVersionName} is ready to install. Tap to update.`
              : 'A new Android update is available. Tap to review and install.',
            route: '/settings?section=app-update',
            severity: isMandatory ? 'critical' : 'warning',
            state: 'active',
            created_at: now,
          })
        }
      } else {
        const isDismissed =
          typeof window !== 'undefined' &&
          localStorage.getItem(WEB_APK_DISMISSED_KEY) === '1'

        if (!isDismissed && !webApk.loading && webApk.apkUrl) {
          synthetics.push({
            id: 'synthetic-web-apk-promo',
            domain: 'app',
            source: 'web',
            generator_key: 'app:web:android-promo',
            title: 'Get BOUXRE for Android',
            message: webApk.versionName
              ? `Download BOUXRE Android APK (v${webApk.versionName}) for faster native speeds.`
              : 'Download the official Android APK for faster native performance and offline access.',
            route: webApk.apkUrl,
            severity: 'info',
            state: 'active',
            created_at: now,
          })
        }
      }

      setNotifications([...synthetics, ...visible])
    } catch (requestError) {
      console.error('[notifications] fetch failed', requestError)
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [limit, tenantClient, appUpdate, webApk])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const markRead = React.useCallback(
    async (id: string) => {
      const now = new Date().toISOString()

      // Handle synthetic notifications locally
      if (id === 'synthetic-web-apk-promo') {
        try {
          localStorage.setItem(WEB_APK_DISMISSED_KEY, '1')
        } catch {}
        setNotifications((current) =>
          current.map((item) => (item.id === id ? { ...item, read_at: now } : item)),
        )
        return
      }

      if (id === 'synthetic-android-update') {
        try {
          const targetVersion =
            appUpdate?.state.policy?.versionName || appUpdate?.release?.versionName
          if (targetVersion) {
            localStorage.setItem(ANDROID_UPDATE_DISMISSED_KEY, targetVersion)
          }
        } catch {}
        setNotifications((current) =>
          current.map((item) => (item.id === id ? { ...item, read_at: now } : item)),
        )
        return
      }

      // Optimistic local update for persistent notifications
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
        await refresh()
        throw updateError
      }
    },
    [refresh, appUpdate],
  )

  const markAllRead = React.useCallback(async () => {
    const unreadItems = notifications.filter((item) => isNotificationUnread(item))
    if (unreadItems.length === 0) return

    const now = new Date().toISOString()
    const persistentUnreadIds = unreadItems
      .filter((item) => !item.id.startsWith('synthetic-'))
      .map((item) => item.id)

    try {
      localStorage.setItem(WEB_APK_DISMISSED_KEY, '1')
      const targetVersion =
        appUpdate?.state.policy?.versionName || appUpdate?.release?.versionName
      if (targetVersion) {
        localStorage.setItem(ANDROID_UPDATE_DISMISSED_KEY, targetVersion)
      }
    } catch {}

    setNotifications((current) =>
      current.map((item) =>
        isNotificationUnread(item) ? { ...item, read_at: item.read_at || now } : item,
      ),
    )

    if (persistentUnreadIds.length > 0) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .in('id', persistentUnreadIds)

      if (updateError) {
        console.error('[notifications] mark all read failed', updateError)
        await refresh()
        throw updateError
      }
    }
  }, [notifications, refresh, appUpdate])

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

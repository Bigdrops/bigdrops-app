import * as React from 'react'
import { AlertTriangle, CheckCircle2, Info, ReceiptText, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { getNotificationRoute } from '@/domain/notifications/notificationRoutes'
import { isNotificationUnread, useNotifications, type AppNotification } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

function getIcon(notification: AppNotification) {
  const severity = String(notification.severity || '').toLowerCase()
  const domain = String(notification.domain || '').toLowerCase()

  if (severity === 'critical') return AlertTriangle
  if (severity === 'warning') return AlertTriangle
  if (severity === 'success') return CheckCircle2
  if (domain.includes('invoice') || domain.includes('payment')) return ReceiptText
  if (severity === 'info') return Info

  return Bell
}

function formatRelativeTime(value: string) {
  const created = new Date(value)
  if (Number.isNaN(created.getTime())) return ''

  const diff = created.getTime() - Date.now()
  const seconds = Math.round(diff / 1000)
  const absSeconds = Math.abs(seconds)

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (absSeconds < 60) return formatter.format(Math.round(seconds / 1), 'second')
  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute')
  const hours = Math.round(seconds / 3600)
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour')
  const days = Math.round(seconds / 86400)
  return formatter.format(days, 'day')
}

function AlertsSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="min-w-[200px] w-[200px] rounded-[16px] border border-[hsl(var(--line))] bg-[hsl(var(--surface-raised))] p-[10px]"
        >
          <div className="h-2 w-16 rounded bg-[hsl(var(--surface-muted))]/80" />
          <div className="mt-2 h-3 w-32 rounded bg-[hsl(var(--surface-muted))]/80" />
          <div className="mt-2 h-2 w-full rounded bg-[hsl(var(--surface-muted))]/70" />
          <div className="mt-4 flex justify-between">
            <div className="h-2 w-12 rounded bg-[hsl(var(--surface-muted))]/60" />
            <div className="h-2 w-10 rounded bg-[hsl(var(--surface-muted))]/60" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function RecentAlertsCarousel() {
  const navigate = useNavigate()
  const { notifications, loading, markRead } = useNotifications()

  const alerts = notifications.slice(0, 8)

  const handleSelect = async (notification: AppNotification) => {
    const route = getNotificationRoute(notification)
    if (!route) return

    if (isNotificationUnread(notification)) {
      await markRead(notification.id)
    }

    navigate(route)
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-[11px] py-[11px] shadow-md"
      style={{
        boxShadow: '0 12px 28px color-mix(in srgb, var(--primary) 8%, transparent), 0 2px 6px rgba(15,23,42,.04)',
      }}
    >
      {/* V6 alerts header */}
      <div className="mb-[9px] flex items-start justify-between gap-[10px]">
        <div>
          <div className="text-[9px] font-[800] uppercase tracking-[0.105em] text-[hsl(var(--ink-3))]">
            Recent alerts
          </div>
          <div className="mt-[3px] text-[9px] leading-[1.3] text-[hsl(var(--ink-2))]">
            What needs a response, not just a read.
          </div>
        </div>
      </div>

      {loading ? (
        <AlertsSkeleton />
      ) : alerts.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[hsl(var(--line))] bg-[hsl(var(--surface-raised))] px-4 py-8 text-center text-[12px] text-[hsl(var(--ink-2))]">
          No recent alerts.
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {alerts.map((notification) => {
            const Icon = getIcon(notification)
            const route = getNotificationRoute(notification)
            const unread = isNotificationUnread(notification)
            const body = notification.message || 'Open the notification to review the linked record.'
            const time = formatRelativeTime(notification.created_at)
            const isWarning = String(notification.severity || '').toLowerCase() === 'critical' ||
              String(notification.severity || '').toLowerCase() === 'warning'

            const card = (
              <>
                <div className="flex items-start gap-[7px]">
                  <div
                    className={cn(
                      'grid h-[29px] w-[29px] shrink-0 place-items-center rounded-[10px]',
                      isWarning
                        ? 'bg-[hsl(var(--attention-soft,hsl(var(--attention)/0.1)))] text-[hsl(var(--attention))]'
                        : 'bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))]',
                    )}
                  >
                    <Icon size={14} strokeWidth={1.9} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[6px] font-[800] uppercase tracking-[0.13em] text-[hsl(var(--ink-3))]">
                      Alert
                    </div>
                    <div className="mt-[2px] line-clamp-2 text-[10px] font-[800] leading-[1.25] text-[hsl(var(--ink))]">
                      {notification.title}
                    </div>
                  </div>
                </div>

                <p className="mt-[6px] line-clamp-3 text-[8px] leading-[1.4] text-[hsl(var(--ink-2))]">
                  {body}
                </p>

                <div className="mt-[8px] flex items-center justify-between text-[7px] font-[700] text-[hsl(var(--ink-3))]">
                  <span>{time || 'Just now'}</span>
                  <span>{unread ? 'Unread' : 'Read'}</span>
                </div>
              </>
            )

            if (!route) {
              return (
                <article
                  key={notification.id}
                  className="min-w-[200px] w-[200px] rounded-[16px] border border-[hsl(var(--line))] bg-[hsl(var(--surface-raised))] p-[10px] text-left"
                >
                  {card}
                </article>
              )
            }

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => void handleSelect(notification)}
                className="min-w-[200px] w-[200px] rounded-[16px] border border-[hsl(var(--line))] bg-[hsl(var(--surface-raised))] p-[10px] text-left transition active:scale-[0.99]"
              >
                {card}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

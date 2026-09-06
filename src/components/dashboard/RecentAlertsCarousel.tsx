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
          className="min-w-[200px] shrink-0 rounded-[16px] border border-[hsl(var(--line))] bg-[hsl(var(--surface-raised))] p-[10px] md:min-w-[220px] md:p-3"
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
    <div className="rounded-[18px] bg-[hsl(var(--surface))] px-[11px] py-[11px] shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_8%,transparent),inset_0_1px_rgba(255,255,255,0.18)] md:px-4 md:py-4"
    >
      {loading ? (
        <AlertsSkeleton />
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <div className="grid h-[58px] w-[58px] place-items-center rounded-[20px] bg-[hsl(var(--primary)/0.1)]">
            <Bell className="size-[26px] text-[hsl(var(--primary))]" strokeWidth={1.5} />
          </div>
          <div className="mt-4 text-[16px] font-[800] tracking-[-0.05em] text-[hsl(var(--ink))]">
            No recent alerts
          </div>
          <div className="mt-1 max-w-[200px] text-[10px] leading-[1.45] text-[hsl(var(--ink-2))]">
            Alerts from your documents will appear here
          </div>
        </div>
      ) : (
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch] md:gap-3">
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
                        <div className="text-[6px] font-[800] uppercase tracking-[0.13em] text-[hsl(var(--ink-3))] md:text-[7px]">
                          Alert
                        </div>
                        <div className="mt-[2px] line-clamp-2 text-[10px] font-[800] leading-[1.25] text-[hsl(var(--ink))] md:text-[11px]">
                          {notification.title}
                        </div>
                      </div>
                    </div>

                    <p className="mt-[6px] line-clamp-3 text-[8px] leading-[1.4] text-[hsl(var(--ink-2))] md:text-[9px]">
                      {body}
                    </p>

                    <div className="mt-[8px] flex items-center justify-between text-[7px] font-[700] text-[hsl(var(--ink-3))]">
                      <span>{time || 'Just now'}</span>
                      <span>{unread ? 'Unread' : 'Read'}</span>
                    </div>
                  </>
                )

                const content = (
                  <div key={notification.id} className="min-w-[200px] w-[200px] shrink-0 md:min-w-[220px] md:w-[220px]">
                    {route ? (
                      <button
                        type="button"
                        onClick={() => void handleSelect(notification)}
                        className="h-full w-full rounded-[16px] bg-[hsl(var(--surface-raised))] p-[10px] text-left transition active:scale-[0.99] shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_rgba(255,255,255,0.2)] md:p-3"
                      >
                        {card}
                      </button>
                    ) : (
                      <article className="h-full w-full rounded-[16px] bg-[hsl(var(--surface-raised))] p-[10px] text-left shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_rgba(255,255,255,0.2)] md:p-3">
                        {card}
                      </article>
                    )}
                  </div>
                )

                return content
              })}
        </div>
      )}
    </div>
  )
}

import * as React from 'react'
import { ChevronRight, Clock3, AlertTriangle, CheckCircle2, Info, ReceiptText, Bell } from 'lucide-react'
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
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="min-w-[17rem] max-w-[17rem] rounded-[var(--bd-radius-xl)] border border-border bg-card p-4 shadow-sm">
          <div className="h-3 w-16 rounded-full bg-muted/80" />
          <div className="mt-3 h-4 w-32 rounded bg-muted/80" />
          <div className="mt-2 h-3 w-full rounded bg-muted/70" />
          <div className="mt-2 h-3 w-3/4 rounded bg-muted/60" />
          <div className="mt-4 h-3 w-20 rounded bg-muted/60" />
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
    <section className="rounded-[var(--bd-radius-xl)] border border-border bg-card px-4 py-4 shadow-sm md:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            Recent Alerts
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            Second presentation of the live notifications feed.
          </div>
        </div>
      </div>

      {loading ? (
        <AlertsSkeleton />
      ) : alerts.length === 0 ? (
        <div className="rounded-[var(--bd-radius-xl)] border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-[12px] text-muted-foreground">
          No recent alerts.
        </div>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-3">
            {alerts.map((notification) => {
              const Icon = getIcon(notification)
              const route = getNotificationRoute(notification)
              const unread = isNotificationUnread(notification)
              const body = notification.message || 'Open the notification to review the linked record.'
              const time = formatRelativeTime(notification.created_at)

              const card = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border bg-muted/60',
                        unread ? 'text-[hsl(var(--primary))]' : 'text-muted-foreground',
                      )}>
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                          Alert
                        </div>
                        <div className="mt-1 line-clamp-2 text-[13px] font-bold tracking-tight text-foreground">
                          {notification.title}
                        </div>
                      </div>
                    </div>

                    {route ? (
                      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    ) : null}
                  </div>

                  <p className="mt-3 line-clamp-3 text-[12px] leading-5 text-muted-foreground">
                    {body}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3 text-[11px] font-semibold text-muted-foreground">
                    <span>{time || 'Just now'}</span>
                    <span>{unread ? 'Unread' : 'Read'}</span>
                  </div>
                </>
              )

              if (!route) {
                return (
                  <article
                    key={notification.id}
                    className="min-w-[17rem] max-w-[17rem] rounded-[var(--bd-radius-xl)] border border-border bg-card p-4 shadow-sm"
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
                  className="min-w-[17rem] max-w-[17rem] rounded-[var(--bd-radius-xl)] border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.35)] hover:shadow-md active:scale-[0.99]"
                >
                  {card}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

import { AlertTriangle, Bell, CheckCircle2, Info, ReceiptText } from 'lucide-react'
import { isNotificationUnread, type AppNotification } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

type NotificationItemProps = {
  notification: AppNotification
  onSelect: (notification: AppNotification) => void
}

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

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function NotificationItem({ notification, onSelect }: NotificationItemProps) {
  const Icon = getIcon(notification)
  const unread = isNotificationUnread(notification)

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={cn(
        'group flex w-full gap-3 border text-left transition-colors',
        'bg-[var(--notification-bg,hsl(var(--card)))]',
        'border-[var(--notification-border,hsl(var(--border)))]',
        'text-[var(--notification-text,hsl(var(--foreground)))]',
        'rounded-[var(--notification-radius,var(--radius))]',
        'shadow-[var(--notification-shadow,none)]',
        'hover:bg-[var(--notification-itemHover,hsl(var(--muted)/0.55))]',
        unread ? 'opacity-100' : 'opacity-75',
      )}
    >
      <span className="relative mt-3 ml-3 grid size-9 shrink-0 place-items-center rounded-[var(--notification-radius,var(--radius))] bg-[var(--notification-info,hsl(var(--muted)))]">
        <Icon className="size-4" />
        {unread && (
          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[var(--notification-unreadIndicator,hsl(var(--primary)))]" />
        )}
      </span>

      <span className="min-w-0 flex-1 py-3 pr-3">
        <span className="flex items-start justify-between gap-3">
          <span className="line-clamp-2 text-sm font-semibold tracking-[-0.02em]">
            {notification.title}
          </span>
          <span className="shrink-0 text-[11px] text-[var(--notification-mutedText,hsl(var(--muted-foreground)))]">
            {formatTime(notification.created_at)}
          </span>
        </span>

        {notification.message ? (
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[var(--notification-mutedText,hsl(var(--muted-foreground)))]">
            {notification.message}
          </span>
        ) : null}
      </span>
    </button>
  )
}

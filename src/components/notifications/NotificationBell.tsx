import * as React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NotificationDrawer from '@/components/notifications/NotificationDrawer'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

type NotificationBellProps = {
  className?: string
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = React.useState(false)

  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  } = useNotifications()

  const displayCount = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        onClick={() => {
          setOpen(true)
          void refresh()
        }}
        className={cn(
          'relative bg-[var(--notification-bg,hsl(var(--muted)))] text-[var(--notification-text,hsl(var(--foreground)))]',
          'border border-[var(--notification-border,hsl(var(--border)))]',
          'rounded-[var(--notification-radius,var(--radius))]',
          'shadow-[var(--notification-shadow,none)]',
          className,
        )}
      >
        <Bell className="size-4" />

        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[var(--notification-unreadIndicator,hsl(var(--primary)))] px-1 text-[10px] font-bold leading-4 text-primary-foreground">
            {displayCount}
          </span>
        ) : null}
      </Button>

      <NotificationDrawer
        open={open}
        onOpenChange={setOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        error={error}
        onRefresh={refresh}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />
    </>
  )
}
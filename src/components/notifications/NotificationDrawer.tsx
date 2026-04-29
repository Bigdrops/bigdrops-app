import { useNavigate } from 'react-router-dom'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import NotificationItem from '@/components/notifications/NotificationItem'
import { getNotificationRoute } from '@/domain/notifications/notificationRoutes'
import { isNotificationUnread, type AppNotification } from '@/hooks/useNotifications'

type NotificationDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  error: string | null
  onRefresh: () => Promise<void>
  onMarkRead: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
}

export default function NotificationDrawer({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  loading,
  error,
  onRefresh,
  onMarkRead,
  onMarkAllRead,
}: NotificationDrawerProps) {
  const navigate = useNavigate()

  const handleSelect = async (notification: AppNotification) => {
    if (isNotificationUnread(notification)) {
      await onMarkRead(notification.id)
    }

    const route = getNotificationRoute(notification)
    if (route) {
      onOpenChange(false)
      navigate(route)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-none border-[var(--notification-border,hsl(var(--border)))] bg-[var(--notification-bg,hsl(var(--background)))] p-0 sm:max-w-[420px]"
      >
        <SheetHeader className="border-b border-[var(--notification-border,hsl(var(--border)))] px-4 py-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div>
              <SheetTitle className="text-base font-bold tracking-[-0.03em]">
                Notifications
              </SheetTitle>
              <SheetDescription>
                {unreadCount > 0 ? `${unreadCount} unread updates` : 'No unread updates'}
              </SheetDescription>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={unreadCount === 0}
              onClick={() => void onMarkAllRead()}
            >
              Mark all read
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 rounded-[var(--notification-radius,var(--radius))] border border-[var(--notification-border,hsl(var(--border)))] bg-[var(--notification-bg,hsl(var(--card)))]"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[var(--notification-radius,var(--radius))] border border-[var(--notification-border,hsl(var(--border)))] bg-[var(--notification-bg,hsl(var(--card)))] p-4">
              <p className="text-sm font-semibold">Could not load notifications</p>
              <p className="mt-1 text-xs text-[var(--notification-mutedText,hsl(var(--muted-foreground)))]">
                {error}
              </p>
              <Button className="mt-3" variant="outline" size="sm" onClick={() => void onRefresh()}>
                Retry
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-[var(--notification-radius,var(--radius))] border border-[var(--notification-border,hsl(var(--border)))] bg-[var(--notification-bg,hsl(var(--card)))] p-5 text-center">
              <p className="text-sm font-semibold">No notifications yet</p>
              <p className="mt-1 text-xs text-[var(--notification-mutedText,hsl(var(--muted-foreground)))]">
                Business updates will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onSelect={(item) => void handleSelect(item)}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

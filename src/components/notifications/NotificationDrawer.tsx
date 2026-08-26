import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!top-[calc(3.5rem+env(safe-area-inset-top,0px))] !right-4 !left-auto !translate-x-0 !translate-y-0 w-[min(22rem,calc(100vw-1rem))] max-w-none overflow-hidden p-0"
      >
        <div
          role="dialog"
          aria-label="Notifications"
          className="flex max-h-[min(32rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-[var(--bd-overlay-radius,var(--radius))] border border-border bg-card shadow-2xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight text-foreground">Notifications</div>
              <div className="text-[11px] text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread updates` : 'No unread updates'}
              </div>
            </div>

            <button
              type="button"
              disabled={unreadCount === 0}
              onClick={() => void onMarkAllRead()}
              className="shrink-0 text-[10px] font-black uppercase tracking-wider text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              Clear all
            </button>
          </div>

          <div className="bd-custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 rounded-[var(--notification-radius,var(--radius))] border border-border bg-muted/60"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-[var(--notification-radius,var(--radius))] border border-border bg-muted/40 p-3 text-center">
                <p className="text-xs font-semibold text-foreground">Could not load notifications</p>
                <button
                  type="button"
                  onClick={() => void onRefresh()}
                  className="mt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-[var(--notification-radius,var(--radius))] border border-border bg-muted/40 p-4 text-center">
                <p className="text-xs font-semibold text-foreground">No notifications yet</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Business updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onSelect={(item) => void handleSelect(item)}
                />
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { useMemo, useState } from 'react'
import {
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  Clock,
  RotateCcw,
  Check,
  X,
} from 'lucide-react'
import type { BoluConversationSummary } from '@/lib/ai-assistant/hooks/useBoluConversations'
import { BxLogo } from '@/components/layout/bx-logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function formatHoursRemaining(scheduledDeletionAt: string | null): string {
  if (!scheduledDeletionAt) return '48h grace'
  const diffMs = new Date(scheduledDeletionAt).getTime() - Date.now()
  if (diffMs <= 0) return 'Expiring now'
  const hours = Math.max(1, Math.round(diffMs / (3600 * 1000)))
  if (hours < 24) return `${hours}h left`
  const days = Math.round(hours / 24)
  return `${days}d left`
}

export function AssistantRail({
  collapsed,
  activeThreadId,
  conversations,
  expiringConversations = [],
  onToggle,
  onSelect,
  onNew,
  onRestore,
  onDelete,
  isMobileDrawer = false,
  onCloseDrawer,
  user,
}: {
  collapsed: boolean
  activeThreadId: string | null
  conversations: BoluConversationSummary[]
  expiringConversations?: BoluConversationSummary[]
  onToggle?: () => void
  onSelect: (id: string) => void
  onNew: () => void
  onRestore?: (id: string) => void
  onDelete?: (id: string) => void
  isMobileDrawer?: boolean
  onCloseDrawer?: () => void
  user?: any
}) {
  // Confirmation state for deleting a conversation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Group active conversations by date
  const groupedActive = useMemo(() => {
    const today: BoluConversationSummary[] = []
    const yesterday: BoluConversationSummary[] = []
    const previous7Days: BoluConversationSummary[] = []
    const older: BoluConversationSummary[] = []

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfYesterday = startOfToday - 86400000
    const startOf7Days = startOfToday - 7 * 86400000

    // Filter only active conversations
    const activeList = conversations.filter((c) => c.status === 'active')

    activeList.forEach((conv) => {
      const time = new Date(conv.lastMessageAt || conv.createdAt).getTime()
      if (time >= startOfToday) {
        today.push(conv)
      } else if (time >= startOfYesterday) {
        yesterday.push(conv)
      } else if (time >= startOf7Days) {
        previous7Days.push(conv)
      } else {
        older.push(conv)
      }
    })

    return [
      { label: 'Today', list: today },
      { label: 'Yesterday', list: yesterday },
      { label: 'Previous 7 days', list: previous7Days },
      { label: 'Older', list: older },
    ].filter((g) => g.list.length > 0)
  }, [conversations])

  // Extract user profile identity
  const avatarUrl = (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) as string | undefined
  const fullName = (user?.user_metadata?.full_name || user?.user_metadata?.name || '') as string
  const email = (user?.email || '') as string
  const displayName = fullName || (email ? email.split('@')[0] : 'Signed-in User')
  const initials = (fullName || email || 'U').charAt(0).toUpperCase()

  return (
    <aside
      className={`ac-rail flex flex-col h-full bg-[var(--ac-muted-surface)] transition-all overflow-hidden ${
        isMobileDrawer
          ? 'w-full border-r-0'
          : collapsed
            ? 'w-[58px] border-r border-[var(--ac-line)]'
            : 'w-[260px] border-r border-[var(--ac-line)]'
      }`}
      data-collapsed={collapsed && !isMobileDrawer}
      data-mobile-drawer={isMobileDrawer ? 'true' : undefined}
      aria-label="Conversation threads"
    >
      {/* Rail Top Brand & Collapse Toggle */}
      <div className="ac-rail-top flex items-center justify-between p-3 border-b border-[var(--ac-line)] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <BxLogo className="size-6 rounded-md shrink-0" />
          {collapsed && !isMobileDrawer ? null : (
            <div className="ac-rail-brand min-w-0">
              <p className="text-xs font-bold text-[var(--ac-ink)] truncate leading-none">BOURXE</p>
              <span className="text-[10px] text-[var(--ac-muted)] truncate block mt-0.5">Operations Assistant</span>
            </div>
          )}
        </div>

        {/* Close action in mobile drawer; expand/collapse toggle on desktop */}
        {isMobileDrawer ? (
          <button
            type="button"
            className="p-1.5 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-surface)] transition shrink-0"
            onClick={onCloseDrawer}
            aria-label="Close conversation drawer"
            title="Close conversation drawer"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : onToggle ? (
          <button
            type="button"
            className="p-1.5 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-surface)] transition shrink-0"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand conversation rail' : 'Collapse conversation rail'}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>

      {/* New conversation button */}
      <div className="p-2 shrink-0">
        <button
          type="button"
          className="ac-new w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-[var(--ac-line)] bg-[var(--ac-surface)] hover:bg-[var(--ac-accent-soft)] hover:border-[var(--ac-accent)] text-xs font-semibold text-[var(--ac-ink)] hover:text-[var(--ac-accent)] transition active:scale-[0.98] shadow-xs"
          onClick={onNew}
          aria-label="Start new conversation"
          title="New conversation"
        >
          <Plus className="size-4 shrink-0" aria-hidden="true" />
          {collapsed && !isMobileDrawer ? null : <span>New conversation</span>}
        </button>
      </div>

      {/* Conversation Thread List */}
      <div className="ac-rail-list flex-1 overflow-y-auto px-2 py-1 space-y-3">
        {/* Expiring Conversations Grace Period Section */}
        {expiringConversations.length > 0 && (!collapsed || isMobileDrawer) ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Clock className="size-3" />
                <span>Expiring Soon (48h)</span>
              </span>
              <span className="text-[10px] text-amber-600 font-semibold px-1.5 py-0.2 rounded-full bg-amber-500/10">
                {expiringConversations.length}
              </span>
            </div>

            <div className="space-y-1">
              {expiringConversations.map((thread) => {
                const isConfirming = confirmDeleteId === thread.id
                return (
                  <div
                    key={thread.id}
                    className="p-1.5 rounded-lg bg-[var(--ac-surface)] border border-amber-500/20 text-xs flex flex-col gap-1 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        className="flex-1 text-left truncate font-medium text-[var(--ac-ink)] hover:text-amber-700 transition"
                        title={thread.title}
                        onClick={() => onSelect(thread.id)}
                      >
                        <span className="truncate block">{thread.title || 'Conversation'}</span>
                      </button>
                      <span className="text-[10px] text-amber-600 font-semibold px-1 rounded shrink-0 bg-amber-500/10">
                        {formatHoursRemaining(thread.scheduledDeletionAt)}
                      </span>
                    </div>

                    {isConfirming ? (
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-[var(--ac-line)]">
                        <span className="text-[10px] text-rose-600 font-medium">Permanently delete?</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-semibold hover:bg-rose-700 transition"
                            onClick={() => {
                              setConfirmDeleteId(null)
                              onDelete?.(thread.id)
                            }}
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            className="px-1.5 py-0.5 rounded border border-[var(--ac-line)] text-[10px] hover:bg-[var(--ac-muted-surface)] transition"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-[var(--ac-line)] text-[11px]">
                        {onRestore ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
                            onClick={() => onRestore(thread.id)}
                            title="Restore conversation to active"
                          >
                            <RotateCcw className="size-3" />
                            <span>Restore</span>
                          </button>
                        ) : null}

                        {onDelete ? (
                          <button
                            type="button"
                            className="text-[var(--ac-muted)] hover:text-rose-600 transition p-0.5"
                            title="Permanently delete now"
                            aria-label="Permanently delete conversation"
                            onClick={() => setConfirmDeleteId(thread.id)}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* Active Conversations Section */}
        {groupedActive.length === 0 ? (
          <div className="p-4 text-xs text-[var(--ac-muted)] text-center">
            {collapsed && !isMobileDrawer ? null : (
              <div className="space-y-1">
                <p className="font-medium text-[var(--ac-ink)]">No saved chats</p>
                <p className="text-[11px] text-[var(--ac-muted)]">Your active threads will appear here.</p>
              </div>
            )}
          </div>
        ) : (
          groupedActive.map((group) => (
            <div key={group.label} className="ac-rail-group space-y-1">
              {collapsed && !isMobileDrawer ? null : (
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ac-muted)] px-2 pt-1">
                  {group.label}
                </p>
              )}
              {group.list.map((thread) => {
                const active = thread.id === activeThreadId
                const isConfirming = confirmDeleteId === thread.id

                return (
                  <div
                    key={thread.id}
                    className={`group relative flex items-center rounded-xl transition ${
                      active
                        ? 'bg-[var(--ac-surface)] shadow-xs border border-[var(--ac-accent-line)]'
                        : 'hover:bg-[var(--ac-surface)]/60 border border-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      className="ac-thread flex-1 flex items-center gap-2 p-2 rounded-xl text-left text-xs min-w-0"
                      data-active={active}
                      aria-current={active ? 'true' : undefined}
                      title={thread.title}
                      onClick={() => onSelect(thread.id)}
                    >
                      <MessageSquare
                        className={`size-3.5 shrink-0 ${active ? 'text-[var(--ac-accent)]' : 'text-[var(--ac-muted)]'}`}
                        aria-hidden="true"
                      />
                      {collapsed && !isMobileDrawer ? null : (
                        <span className="min-w-0 flex-1 truncate">
                          <span className={`block truncate ${active ? 'font-semibold text-[var(--ac-ink)]' : 'text-[var(--ac-ink)]'}`}>
                            {thread.title || 'Conversation'}
                          </span>
                        </span>
                      )}
                    </button>

                    {/* Touch-accessible Delete Button */}
                    {!collapsed || isMobileDrawer ? (
                      isConfirming ? (
                        <div className="absolute right-1 flex items-center gap-1 bg-[var(--ac-surface)] border border-[var(--ac-line)] p-1 rounded-lg shadow-md z-10">
                          <button
                            type="button"
                            className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                            title="Confirm delete"
                            aria-label="Confirm delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmDeleteId(null)
                              onDelete?.(thread.id)
                            }}
                          >
                            <Check className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded text-[var(--ac-muted)] hover:bg-[var(--ac-muted-surface)] transition"
                            title="Cancel"
                            aria-label="Cancel"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmDeleteId(null)
                            }}
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        onDelete && (
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-[var(--ac-muted)] hover:text-rose-600 active:text-rose-600 transition opacity-80 sm:opacity-0 sm:group-hover:opacity-100 mr-1 shrink-0"
                            title="Delete conversation"
                            aria-label={`Delete conversation ${thread.title}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmDeleteId(thread.id)
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )
                      )
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* User Identity / Account Footer */}
      <div className="border-t border-[var(--ac-line)] p-2.5 bg-[var(--ac-surface)]/50 pb-[max(10px,env(safe-area-inset-bottom,10px))] shrink-0">
        <div className={`flex items-center gap-2.5 min-w-0 ${collapsed && !isMobileDrawer ? 'justify-center' : ''}`}>
          <Avatar className="size-7 rounded-full shrink-0 border border-[var(--ac-line)]">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName} className="aspect-square h-full w-full object-cover" />
            ) : null}
            <AvatarFallback className="bg-[var(--ac-accent-soft)] text-[var(--ac-accent)] text-[10px] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {collapsed && !isMobileDrawer ? null : (
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[var(--ac-ink)] truncate leading-tight">{displayName}</p>
              <span className="text-[9px] text-[var(--ac-muted)] truncate block">
                {email || 'Signed in'}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

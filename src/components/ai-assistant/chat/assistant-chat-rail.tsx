import { useMemo } from 'react'
import { FileText, MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from 'lucide-react'

import { AssistantMark } from './assistant-chat-parts'
import type { BoluConversationSummary } from '@/lib/ai-assistant/hooks/useBoluConversations'

export function AssistantRail({
  collapsed,
  activeThreadId,
  conversations,
  onToggle,
  onSelect,
  onNew,
  onDelete,
}: {
  collapsed: boolean
  activeThreadId: string | null
  conversations: BoluConversationSummary[]
  onToggle: () => void
  onSelect: (id: string) => void
  onNew: () => void
  onDelete?: (id: string) => void
}) {
  const grouped = useMemo(() => {
    const today: BoluConversationSummary[] = []
    const yesterday: BoluConversationSummary[] = []
    const earlier: BoluConversationSummary[] = []

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfYesterday = startOfToday - 86400000

    conversations.forEach((conv) => {
      const time = new Date(conv.lastMessageAt || conv.createdAt).getTime()
      if (time >= startOfToday) {
        today.push(conv)
      } else if (time >= startOfYesterday) {
        yesterday.push(conv)
      } else {
        earlier.push(conv)
      }
    })

    return [
      { label: 'Today', list: today },
      { label: 'Yesterday', list: yesterday },
      { label: 'Earlier', list: earlier },
    ].filter((g) => g.list.length > 0)
  }, [conversations])

  return (
    <aside className="ac-rail" data-collapsed={collapsed} aria-label="Conversation threads">
      <div className="ac-rail-top">
        <AssistantMark size={30} tone="solid" />
        {collapsed ? null : (
          <div className="ac-rail-brand">
            <p>BOURXE</p>
            <span>Operations Assistant</span>
          </div>
        )}
        <button
          type="button"
          className="ac-icon-btn ac-rail-toggle"
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
      </div>

      <button type="button" className="ac-new" onClick={onNew} aria-label="New conversation">
        <Plus className="size-4" aria-hidden="true" />
        {collapsed ? null : 'New conversation'}
      </button>

      <div className="ac-rail-list">
        {grouped.length === 0 ? (
          <div className="p-3 text-xs text-[var(--ac-muted)] text-center">
            {collapsed ? null : 'No conversations yet'}
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label} className="ac-rail-group">
              {collapsed ? null : <p className="ac-rail-label">{group.label}</p>}
              {group.list.map((thread) => {
                const active = thread.id === activeThreadId
                return (
                  <div
                    key={thread.id}
                    className="group relative flex items-center"
                  >
                    <button
                      type="button"
                      className="ac-thread flex-1"
                      data-active={active}
                      aria-current={active ? 'true' : undefined}
                      title={thread.title}
                      onClick={() => onSelect(thread.id)}
                    >
                      <MessageSquare className="size-3.5 ac-thread-icon shrink-0" aria-hidden="true" />
                      {collapsed ? null : (
                        <span className="ac-thread-text truncate">
                          <span className="truncate">{thread.title || 'Conversation'}</span>
                          <span className="ac-thread-meta truncate text-[11px] text-[var(--ac-muted)]">
                            {thread.module || 'Operations'}
                          </span>
                        </span>
                      )}
                    </button>
                    {!collapsed && onDelete ? (
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--ac-muted)] hover:text-destructive transition-opacity"
                        title="Delete conversation"
                        aria-label="Delete conversation"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(thread.id)
                        }}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </aside>
  )
}

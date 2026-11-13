import { FileText, MessageSquare, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'

import { AssistantMark } from './assistant-chat-parts'

export type ThreadSummary = {
  id: string
  title: string
  meta: string
  group: 'Today' | 'Yesterday'
}

export const SAMPLE_THREADS: ThreadSummary[] = [
  { id: 't-131', title: 'Invoice INV-000131', meta: 'ABC Ltd · cable lug', group: 'Today' },
  { id: 't-130', title: 'Quotation QT-000088', meta: 'Lekki Phase 1', group: 'Today' },
  { id: 't-129', title: 'Payment reminder', meta: 'Due 27 Nov', group: 'Yesterday' },
  { id: 't-128', title: 'Waybill WB-000044', meta: 'Ikeja dispatch', group: 'Yesterday' },
]

export function AssistantRail({
  collapsed,
  activeThread,
  onToggle,
  onSelect,
  onNew,
}: {
  collapsed: boolean
  activeThread: string
  onToggle: () => void
  onSelect: (id: string) => void
  onNew: () => void
}) {
  const groups: ThreadSummary['group'][] = ['Today', 'Yesterday']

  return (
    <aside className="ac-rail" data-collapsed={collapsed} aria-label="Conversations">
      <div className="ac-rail-top">
        <AssistantMark size={30} tone="solid" />
        {collapsed ? null : (
          <div className="ac-rail-brand">
            <p>BOURXE</p>
            <span>Activa Electrical</span>
          </div>
        )}
        <button
          type="button"
          className="ac-icon-btn ac-rail-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand the thread rail' : 'Collapse the thread rail'}
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
        {groups.map((group) => {
          const rows = SAMPLE_THREADS.filter((thread) => thread.group === group)
          if (rows.length === 0) return null
          return (
            <div key={group} className="ac-rail-group">
              {collapsed ? null : <p className="ac-rail-label">{group}</p>}
              {rows.map((thread) => {
                const active = thread.id === activeThread
                return (
                  <button
                    key={thread.id}
                    type="button"
                    className="ac-thread"
                    data-active={active}
                    aria-current={active ? 'true' : undefined}
                    title={thread.title}
                    onClick={() => onSelect(thread.id)}
                  >
                    <MessageSquare className="size-3.5 ac-thread-icon" aria-hidden="true" />
                    {collapsed ? null : (
                      <span className="ac-thread-text">
                        <span>{thread.title}</span>
                        <span className="ac-thread-meta">{thread.meta}</span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}

        <div className="ac-rail-group">
          {collapsed ? null : <p className="ac-rail-label">Open document</p>}
          <div className="ac-thread" data-document="true" title="Invoice INV-000131">
            <FileText className="size-3.5 ac-thread-icon" aria-hidden="true" />
            {collapsed ? null : (
              <span className="ac-thread-text">
                <span>INV-000131</span>
                <span className="ac-thread-meta">Draft · reads live</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="ac-rail-foot">
        <span className="ac-avatar" aria-hidden="true">
          AO
        </span>
        {collapsed ? null : (
          <div className="ac-rail-user">
            <p>Adeola O.</p>
            <span>Owner · Activa</span>
          </div>
        )}
      </div>
    </aside>
  )
}

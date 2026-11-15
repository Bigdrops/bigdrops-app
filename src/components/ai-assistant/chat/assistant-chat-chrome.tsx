import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PanelRight, Settings2, X, Monitor, Tablet, Smartphone, BookOpen, History, MoreVertical, Download } from 'lucide-react'

import { AssistantMark } from './assistant-chat-parts'
import type { ViewportId } from './types'

export function AssistantHeader({
  modelPill,
  subtitle = 'Conversational operations · reads active form',
  onOpenSettings,
  onOpenContext,
  onOpenRail,
  onClose,
  onExportMarkdown,
  onExportJson,
  contextOpen,
  showContext = true,
  showRailToggle = false,
}: {
  modelPill: ReactNode
  subtitle?: string
  onOpenSettings: () => void
  onOpenContext: () => void
  onOpenRail?: () => void
  onClose?: () => void
  onExportMarkdown?: () => void
  onExportJson?: () => void
  contextOpen: boolean
  showContext?: boolean
  showRailToggle?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  return (
    <header className="ac-head flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--ac-line)] bg-[var(--ac-surface)]">
      <div className="flex items-center gap-2.5 min-w-0">
        <AssistantMark size={32} tone="solid" />
        <div className="ac-head-id min-w-0">
          <p className="ac-head-name text-sm font-bold text-[var(--ac-ink)] truncate leading-none">
            Bolu
          </p>
          <p className="ac-head-sub text-[11px] text-[var(--ac-muted)] truncate mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {showRailToggle && onOpenRail ? (
          <button
            type="button"
            className="ac-icon-btn ac-head-btn p-2 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
            aria-label="Conversation history"
            title="Conversation history"
            onClick={onOpenRail}
          >
            <History className="size-4" aria-hidden="true" />
          </button>
        ) : null}

        {modelPill}

        {showContext ? (
          <button
            type="button"
            className="ac-icon-btn ac-head-btn p-2 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
            aria-label="Toggle document artifact panel"
            aria-pressed={contextOpen}
            onClick={onOpenContext}
          >
            <PanelRight className="size-4" aria-hidden="true" />
          </button>
        ) : null}

        {(onExportMarkdown || onExportJson) ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="ac-icon-btn ac-head-btn p-2 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
              aria-label="Chat export actions"
              title="Export conversation"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <MoreVertical className="size-4" aria-hidden="true" />
            </button>
            {menuOpen ? (
              <div
                className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-[var(--ac-line)] bg-[var(--ac-surface)] py-1 shadow-lg z-50 text-xs"
                role="menu"
              >
                {onExportMarkdown ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
                    onClick={() => {
                      setMenuOpen(false)
                      onExportMarkdown()
                    }}
                  >
                    <Download className="size-3.5 text-[var(--ac-muted)]" />
                    <span>Export Markdown (.md)</span>
                  </button>
                ) : null}
                {onExportJson ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
                    onClick={() => {
                      setMenuOpen(false)
                      onExportJson()
                    }}
                  >
                    <Download className="size-3.5 text-[var(--ac-muted)]" />
                    <span>Export JSON (.json)</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          className="ac-icon-btn ac-head-btn p-2 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
          aria-label="Configure provider &amp; model settings"
          onClick={onOpenSettings}
        >
          <Settings2 className="size-4" aria-hidden="true" />
        </button>

        {onClose ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] border border-[var(--ac-line)] transition ml-0.5"
            aria-label="Close Bolu Assistant"
            onClick={onClose}
          >
            <X className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Close</span>
          </button>
        ) : null}
      </div>
    </header>
  )
}

export function ViewportPicker({
  viewport,
  onChange,
}: {
  viewport: ViewportId
  onChange: (v: ViewportId) => void
}) {
  const options: { id: ViewportId; label: string; icon: typeof Smartphone }[] = [
    { id: 'fold-closed', label: 'Phone', icon: Smartphone },
    { id: 'fold-open', label: 'Foldable', icon: BookOpen },
    { id: 'tablet', label: 'Tablet', icon: Tablet },
    { id: 'desktop', label: 'Desktop', icon: Monitor },
  ]

  return (
    <div
      role="group"
      aria-label="Responsive viewport mode"
      className="inline-flex rounded-full border border-[var(--ac-line)] bg-[var(--ac-surface)] p-0.5"
    >
      {options.map((opt) => {
        const Icon = opt.icon
        const active = viewport === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
              active
                ? 'bg-[var(--ac-ink)] text-[var(--ac-surface)] shadow-sm'
                : 'text-[var(--ac-muted)] hover:text-[var(--ac-ink)]'
            }`}
            onClick={() => onChange(opt.id)}
          >
            <Icon className="size-3" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

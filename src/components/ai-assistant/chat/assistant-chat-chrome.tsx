import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PanelRight, Settings2, X, History, MoreVertical, Download, Copy, SlidersHorizontal, Sparkles, Smartphone, BookOpen, Tablet, Monitor } from 'lucide-react'
import type { ViewportId } from './types'

export function AssistantHeader({
  modelPill,
  subtitle = 'Conversational operations · reads active form',
  onOpenSettings,
  onOpenContext,
  onOpenRail,
  onClose,
  onCopyConversation,
  onExportMarkdown,
  onExportJson,
  contextOpen,
  showContext = true,
  showRailToggle = false,
  isMobile = false,
}: {
  modelPill?: ReactNode
  subtitle?: string
  onOpenSettings: () => void
  onOpenContext: () => void
  onOpenRail?: () => void
  onClose?: () => void
  onCopyConversation?: () => void
  onExportMarkdown?: () => void
  onExportJson?: () => void
  contextOpen: boolean
  showContext?: boolean
  showRailToggle?: boolean
  isMobile?: boolean
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
    <header className="ac-head flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[var(--ac-line)] bg-[var(--ac-surface)] shrink-0">
      {/* Left: History toggle & Bolu-only Identity */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        {showRailToggle && onOpenRail ? (
          <button
            type="button"
            className="p-1.5 sm:p-2 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition shrink-0"
            aria-label="Conversation history"
            title="Conversation history"
            onClick={onOpenRail}
          >
            <History className="size-4" aria-hidden="true" />
          </button>
        ) : null}

        <div className="flex items-center min-w-0">
          <span className="text-sm sm:text-base font-bold text-[var(--ac-ink)] leading-none truncate select-none">
            Bolu
          </span>
        </div>
      </div>

      {/* Right Controls: Model Picker + Action Controls in Single Compact Row */}
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink">
        {modelPill ? (
          <div className="min-w-0 shrink">
            {modelPill}
          </div>
        ) : null}

        {/* Desktop / Tablet Actions */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        {showContext ? (
          <button
            type="button"
            className="p-2 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
            aria-label="Toggle document artifact panel"
            title={contextOpen ? 'Hide document panel' : 'Show document panel'}
            aria-pressed={contextOpen}
            onClick={onOpenContext}
          >
            <PanelRight className="size-4" aria-hidden="true" />
          </button>
        ) : null}

        {(onCopyConversation || onExportMarkdown || onExportJson) ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="p-2 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
              aria-label="Conversation actions"
              title="Conversation options"
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
                {onCopyConversation ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
                    onClick={() => {
                      setMenuOpen(false)
                      onCopyConversation()
                    }}
                  >
                    <Copy className="size-3.5 text-[var(--ac-muted)]" />
                    <span>Copy conversation</span>
                  </button>
                ) : null}
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
          className="p-2 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
          aria-label="Configure provider & model settings"
          title="AI Settings"
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

      {/* Right Controls: Mobile Compact Overflow */}
      <div className="flex sm:hidden items-center gap-1 shrink-0">
        {showContext ? (
          <button
            type="button"
            className="p-1.5 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
            aria-label="Toggle document artifact panel"
            aria-pressed={contextOpen}
            onClick={onOpenContext}
          >
            <PanelRight className="size-4" aria-hidden="true" />
          </button>
        ) : null}

        {/* Mobile Overflow Menu */}
        <div className="relative" ref={isMobile ? menuRef : undefined}>
          <button
            type="button"
            className="p-1.5 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
            aria-label="More options"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <MoreVertical className="size-4" aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div
              className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-[var(--ac-line)] bg-[var(--ac-surface)] py-1 shadow-2xl z-50 text-xs divide-y divide-[var(--ac-line)]"
              role="menu"
            >
              {/* Conversation Actions */}
              {(onCopyConversation || onExportMarkdown || onExportJson) ? (
                <div className="py-1">
                  {onCopyConversation ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
                      onClick={() => {
                        setMenuOpen(false)
                        onCopyConversation()
                      }}
                    >
                      <Copy className="size-3.5 text-[var(--ac-muted)]" />
                      <span>Copy conversation</span>
                    </button>
                  ) : null}
                  {onExportMarkdown ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
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
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
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

              {/* Direct AI Infrastructure Navigation */}
              <div className="py-1">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] transition"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenSettings()
                  }}
                >
                  <SlidersHorizontal className="size-3.5 text-[var(--ac-muted)]" />
                  <span>AI Provider Settings</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {onClose ? (
          <button
            type="button"
            className="p-1.5 rounded-lg text-[var(--ac-muted)] hover:text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] border border-[var(--ac-line)] transition ml-0.5"
            aria-label="Close Bolu Assistant"
            onClick={onClose}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
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

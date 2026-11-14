import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Settings2 } from 'lucide-react'

import { providerStatus, type ProviderEntry } from './assistant-chat-providers'

/**
 * Model pill: the instant provider + model selector from the vercel/chatbot
 * top bar. Configured providers expand to their model list. A provider without
 * a key routes to the settings panel instead of failing silently.
 */
export function ModelPill({
  entries,
  activeId,
  onPick,
  onManage,
}: {
  entries: ProviderEntry[]
  activeId: string
  onPick: (providerId: string, model: string) => void
  onManage: (providerId?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(activeId)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const active = entries.find((entry) => entry.id === activeId)
  const ready = entries.filter((entry) => entry.key)
  const missing = entries.length - ready.length
  const visibleEntries = useMemo(() => {
    const term = query.trim().toLowerCase()
    return [...entries]
      .sort((a, b) => Number(Boolean(b.key)) - Number(Boolean(a.key)))
      .filter((entry) =>
        !term || `${entry.label} ${entry.model} ${entry.baseUrl} ${entry.models.map((model) => model.label).join(' ')}`
          .toLowerCase()
          .includes(term),
      )
  }, [entries, query])

  return (
    <div className="ac-model" ref={rootRef}>
      <button
        type="button"
        className="ac-model-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setExpanded(activeId)
          setOpen((value) => !value)
        }}
      >
        <span className="ac-model-dot" data-ready={Boolean(active?.key)} aria-hidden="true" />
        <span className="ac-model-text">
          <span className="ac-model-provider">{active?.label ?? 'Choose a model'}</span>
          <span className="ac-model-name">{active?.model || 'No key yet'}</span>
        </span>
        <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
      </button>

      {open ? (
        <div className="ac-menu" role="dialog" aria-label="Model and provider">
          <div className="ac-menu-head">
            <p className="ac-menu-title">Model</p>
            <p className="ac-menu-sub">
              {ready.length} of {entries.length} providers ready
            </p>
          </div>

          <label className="ac-menu-search-label">
            <span className="sr-only">Search providers and models</span>
            <input
              className="ac-menu-search"
              type="search"
              value={query}
              placeholder="Search providers or models"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="ac-menu-list">
            {visibleEntries.map((entry) => {
              const status = providerStatus(entry, activeId)
              const isOpen = expanded === entry.id
              return (
                <div key={entry.id} className="ac-menu-group">
                  <button
                    type="button"
                    className="ac-menu-row"
                    data-active={status === 'active'}
                    aria-expanded={isOpen}
                    onClick={() => {
                      if (!entry.key) {
                        onManage(entry.id)
                        setOpen(false)
                        return
                      }
                      setExpanded(isOpen ? null : entry.id)
                    }}
                  >
                    <span className="ac-menu-mark" aria-hidden="true">
                      {entry.short}
                    </span>
                    <span className="ac-menu-label">
                      <span>{entry.label}</span>
                      <span className="ac-menu-model">{entry.key ? entry.model : entry.keyHint}</span>
                    </span>
                    <span className={`ac-tag ${status === 'needs-key' ? 'ac-tag--missing' : ''}`}>
                      {status === 'active' ? 'Active' : status === 'configured' ? 'Configured' : 'Needs key'}
                    </span>
                    {status === 'active' ? <Check className="size-3.5 ac-check" aria-hidden="true" /> : null}
                  </button>

                  {isOpen && entry.key ? (
                    <div className="ac-menu-models">
                      {entry.models.map((model) => {
                        const selected = entry.id === activeId && entry.model === model.id
                        return (
                          <button
                            key={model.id}
                            type="button"
                            className="ac-menu-model-row"
                            data-selected={selected}
                            onClick={() => {
                              onPick(entry.id, model.id)
                              setOpen(false)
                            }}
                          >
                            <span className="ac-menu-model-id">{model.label}</span>
                            {model.note ? <span className="ac-menu-model-note">{model.note}</span> : null}
                            {selected ? <Check className="size-3.5" aria-hidden="true" /> : null}
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            className="ac-menu-foot"
            onClick={() => {
              onManage()
              setOpen(false)
            }}
          >
            <Settings2 className="size-3.5" aria-hidden="true" />
            Manage providers &amp; API keys
            {missing > 0 ? <span className="ac-tag ac-tag--missing">{missing} need a key</span> : null}
          </button>
        </div>
      ) : null}
    </div>
  )
}

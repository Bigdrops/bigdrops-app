import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { isFreeModel } from '@/lib/ai-assistant/openrouter-pricing'
import { getCatalogueEntry } from '@/lib/ai-assistant/provider-catalog'
import type { PublicConnection } from '@/pages/settings/bolu-provider/api'

export interface SelectedModelTarget {
  connectionId: string
  connectionName: string
  modelId: string
  modelName: string
}

export interface ActiveModelInfo {
  id: string
  label: string
  model: string
  isConfigured: boolean
}

export interface ModelPillProps {
  connections?: PublicConnection[]
  selectedModel?: SelectedModelTarget | null
  activeProvider?: ActiveModelInfo | null
  onSelectModel?: (target: SelectedModelTarget) => void
  onManage: () => void
  onAddConnection?: () => void
  direction?: 'up' | 'down'
  align?: 'left' | 'right'
}

interface GroupedModelOption {
  id: string
  label: string
  isFree: boolean
  isDefault: boolean
}

interface ConnectionGroup {
  connectionId: string
  connectionName: string
  providerId: string
  models: GroupedModelOption[]
}

/**
 * OpenCode-style Grouped Model Picker
 * Matches Image 6: Gold group headers, search bar, + and tune action buttons, Free badges, and direct selection.
 */
export function ModelPill({
  connections = [],
  selectedModel,
  activeProvider,
  onSelectModel,
  onManage,
  onAddConnection,
  direction = 'down',
  align = 'right',
}: ModelPillProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Close on outside pointer or Escape
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    // Focus search input on open
    setTimeout(() => searchInputRef.current?.focus(), 50)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Aggregate enabled models grouped by connection
  const groups = useMemo<ConnectionGroup[]>(() => {
    const list: ConnectionGroup[] = []

    for (const conn of connections) {
      if (!conn.isEnabled) continue

      const entry = getCatalogueEntry(conn.providerId)
      const labelMap = new Map<string, string>()

      // Cache labels from discovered & curated models
      if (conn.discoveredModels) {
        for (const m of conn.discoveredModels) {
          labelMap.set(m.id, m.label || m.id)
        }
      }
      if (entry?.curatedModels) {
        for (const c of entry.curatedModels) {
          if (!labelMap.has(c.id)) labelMap.set(c.id, c.label || c.id)
        }
      }

      // Determine which models are enabled for this connection
      const enabledList = conn.metadata?.enabledModels ?? conn.allowedModels
      let targetModelIds: string[] = []

      if (Array.isArray(enabledList) && enabledList.length > 0) {
        targetModelIds = enabledList
      } else {
        // Fallback: default model + free models (if openrouter)
        const set = new Set<string>()
        if (conn.model) set.add(conn.model)
        if (conn.providerId === 'openrouter' && conn.discoveredModels) {
          for (const m of conn.discoveredModels) {
            if (isFreeModel(m.id, m.metadata)) set.add(m.id)
          }
        }
        targetModelIds = Array.from(set)
      }

      const models: GroupedModelOption[] = targetModelIds.map((mId) => {
        const discModel = conn.discoveredModels?.find((d) => d.id === mId)
        return {
          id: mId,
          label: labelMap.get(mId) || mId,
          isFree: isFreeModel(mId, discModel?.metadata),
          isDefault: mId === conn.model,
        }
      })

      if (models.length > 0) {
        list.push({
          connectionId: conn.id,
          connectionName: conn.name || entry?.name || conn.providerId,
          providerId: conn.providerId,
          models,
        })
      }
    }

    return list
  }, [connections])

  // Filter groups and models by search term
  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return groups

    return groups
      .map((group) => {
        const matchesGroup = group.connectionName.toLowerCase().includes(term)
        const matchingModels = group.models.filter(
          (m) =>
            matchesGroup ||
            m.id.toLowerCase().includes(term) ||
            m.label.toLowerCase().includes(term),
        )

        return {
          ...group,
          models: matchingModels,
        }
      })
      .filter((group) => group.models.length > 0)
  }, [groups, query])

  // Display labels for the pill trigger
  const isConfigured = Boolean(
    selectedModel?.connectionId || activeProvider?.isConfigured || connections.some((c) => c.isEnabled),
  )

  const displayConnection =
    selectedModel?.connectionName ||
    activeProvider?.label ||
    (connections.find((c) => c.isEnabled)?.name ?? 'Auto Route')

  const displayModel =
    selectedModel?.modelName ||
    activeProvider?.model ||
    (connections.find((c) => c.isEnabled)?.model ?? 'Priority Pool')

  const handleSelect = (conn: ConnectionGroup, model: GroupedModelOption) => {
    onSelectModel?.({
      connectionId: conn.connectionId,
      connectionName: conn.connectionName,
      modelId: model.id,
      modelName: model.label,
    })
    setOpen(false)
  }

  return (
    <div className="ac-model relative" ref={rootRef}>
      {/* Pill Trigger */}
      <button
        type="button"
        className="ac-model-trigger max-w-[130px] xs:max-w-[170px] sm:max-w-[240px] min-w-0 shrink"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ac-model-dot shrink-0" data-ready={isConfigured} aria-hidden="true" />
        <span className="ac-model-text min-w-0 overflow-hidden">
          <span className="ac-model-provider truncate max-w-[70px] xs:max-w-[100px] sm:max-w-[150px] font-semibold">
            {displayConnection}
          </span>
          <span className="ac-model-name truncate max-w-[70px] xs:max-w-[100px] sm:max-w-[150px] text-[10px] opacity-80">
            {displayModel}
          </span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-[var(--ac-muted)]" aria-hidden="true" />
      </button>

      {/* Floating Dropdown Dialog matching Image 6 */}
      {open ? (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} z-50 w-80 max-w-[calc(100vw-24px)] sm:max-w-[360px] max-h-[min(460px,55vh)] flex flex-col rounded-2xl border border-white/10 bg-[#181622] text-white shadow-2xl overflow-hidden font-sans backdrop-blur-md ${
            direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          role="dialog"
          aria-label="Select AI Model"
        >
          {/* Header Bar with Search & Action Icons */}
          <div className="flex items-center gap-2 p-2.5 border-b border-white/10 bg-[#14121c]">
            <Search className="size-3.5 text-white/40 shrink-0 ml-1" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search models"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white placeholder-white/40 focus:outline-none min-w-0"
            />
            {query && (
              <button
                type="button"
                className="text-[10px] text-white/50 hover:text-white px-1"
                onClick={() => setQuery('')}
              >
                Clear
              </button>
            )}

            {/* Quick action buttons on the right matching Image 6 */}
            <div className="flex items-center gap-0.5 shrink-0 border-l border-white/10 pl-1.5">
              <button
                type="button"
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Add new AI provider connection"
                onClick={() => {
                  setOpen(false)
                  if (onAddConnection) onAddConnection()
                  else onManage()
                }}
              >
                <Plus className="size-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Choose which models appear in picker (Settings)"
                onClick={() => {
                  setOpen(false)
                  onManage()
                }}
              >
                <SlidersHorizontal className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Grouped Model List matching Image 6 */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-1.5 space-y-2">
            {filteredGroups.length === 0 ? (
              <div className="py-8 px-4 text-center">
                {groups.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-white/60">No enabled AI connections found.</p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline font-medium"
                      onClick={() => {
                        setOpen(false)
                        onManage()
                      }}
                    >
                      Configure providers in Settings &rarr;
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-white/50">No models match &ldquo;{query}&rdquo;</p>
                )}
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.connectionId} className="pt-1.5 first:pt-0">
                  {/* Amber Section Header matching Image 6 */}
                  <div className="text-amber-500 font-semibold text-xs tracking-wide px-2.5 py-1 select-none">
                    {group.connectionName}
                  </div>

                  {/* Models in Group */}
                  <div className="space-y-0.5 mt-0.5">
                    {group.models.map((model) => {
                      const isSelected =
                        selectedModel?.connectionId === group.connectionId &&
                        (selectedModel?.modelId === model.id || selectedModel?.modelName === model.label)

                      return (
                        <button
                          key={model.id}
                          type="button"
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-white/15 text-white font-medium'
                              : 'text-white/85 hover:bg-white/10 hover:text-white'
                          }`}
                          onClick={() => handleSelect(group, model)}
                        >
                          {/* Model Name */}
                          <span className="truncate flex-1">{model.label}</span>

                          {/* Badges matching Image 6 */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {model.isFree && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-white/70 border border-white/10">
                                Free
                              </span>
                            )}
                            {model.isDefault && (
                              <span className="text-[10px] text-white/40">{'Default >'}</span>
                            )}
                            {isSelected && (
                              <Check className="size-3.5 text-amber-400" aria-hidden="true" />
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-2 border-t border-white/10 bg-[#14121c] flex items-center justify-between text-[11px] text-white/60">
            <span className="truncate text-[10px]">
              {selectedModel ? selectedModel.connectionName : 'Priority Pool'} · {displayModel}
            </span>
            <button
              type="button"
              className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] shrink-0"
              onClick={() => {
                setOpen(false)
                onManage()
              }}
            >
              <span>Manage</span>
              <SlidersHorizontal className="size-2.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

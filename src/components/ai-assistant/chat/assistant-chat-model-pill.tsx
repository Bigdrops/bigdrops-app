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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const rootRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Calculate collision-aware dropdown position preventing horizontal clipping
  const updateDropdownPosition = () => {
    if (!rootRef.current) return
    const triggerRect = rootRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    const safeMargin = 10 // safe padding from viewport edge

    // Target width: clamped between 260px and 340px, bounded by available viewport
    const targetWidth = Math.min(340, Math.max(260, viewportWidth - safeMargin * 2))

    // Default right-alignment with trigger button
    let idealLeft = triggerRect.right - targetWidth

    // Collision check 1: Left viewport edge
    if (idealLeft < safeMargin) {
      idealLeft = safeMargin
    }

    // Collision check 2: Right viewport edge
    if (idealLeft + targetWidth > viewportWidth - safeMargin) {
      idealLeft = viewportWidth - safeMargin - targetWidth
    }

    // Convert screen coordinates to relative offset within rootRef
    const relativeLeft = idealLeft - triggerRect.left

    // Collision check 3: Vertical space
    const spaceBelow = viewportHeight - triggerRect.bottom - safeMargin
    const spaceAbove = triggerRect.top - safeMargin
    const isUp = direction === 'up' || (spaceBelow < 260 && spaceAbove > spaceBelow)

    setDropdownStyle({
      left: `${Math.round(relativeLeft)}px`,
      width: `${Math.round(targetWidth)}px`,
      maxWidth: `calc(100vw - ${safeMargin * 2}px)`,
      ...(isUp
        ? { bottom: 'calc(100% + 6px)', top: 'auto' }
        : { top: 'calc(100% + 6px)', bottom: 'auto' }),
    })
  }

  // Update position on open and subscribe to resize / scroll events
  useEffect(() => {
    if (!open) return
    updateDropdownPosition()

    const onResizeOrScroll = () => {
      updateDropdownPosition()
    }

    window.addEventListener('resize', onResizeOrScroll)
    window.addEventListener('scroll', onResizeOrScroll, true)

    return () => {
      window.removeEventListener('resize', onResizeOrScroll)
      window.removeEventListener('scroll', onResizeOrScroll, true)
    }
  }, [open, direction])

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
        onClick={() => {
          updateDropdownPosition()
          setOpen((v) => !v)
        }}
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

      {/* Floating Dropdown Dialog with Collision-Aware Clamping & Theme Surface */}
      {open ? (
        <div
          style={dropdownStyle}
          className="absolute z-50 flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl max-h-[min(480px,65vh)] overflow-hidden font-sans backdrop-blur-md"
          role="dialog"
          aria-label="Select AI Model"
        >
          {/* Header Bar with Search & Action Icons */}
          <div className="flex items-center gap-2 p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
            <Search className="size-3.5 text-slate-400 dark:text-slate-500 shrink-0 ml-1" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search models"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none min-w-0"
            />
            {query ? (
              <button
                type="button"
                className="text-[10px] text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 px-1 font-medium"
                onClick={() => setQuery('')}
              >
                Clear
              </button>
            ) : null}

            {/* Quick action buttons on the right */}
            <div className="flex items-center gap-0.5 shrink-0 border-l border-slate-200 dark:border-slate-800 pl-1.5">
              <button
                type="button"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
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
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
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

          {/* Grouped Model List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1.5 space-y-2">
            {filteredGroups.length === 0 ? (
              <div className="py-8 px-4 text-center">
                {groups.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">No enabled AI connections found.</p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                      onClick={() => {
                        setOpen(false)
                        onManage()
                      }}
                    >
                      Configure providers in Settings &rarr;
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No models match &ldquo;{query}&rdquo;</p>
                )}
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.connectionId} className="pt-1.5 first:pt-0">
                  {/* Amber Section Header */}
                  <div className="text-amber-500 dark:text-amber-400 font-semibold text-xs tracking-wide px-2.5 py-1 select-none">
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
                              ? 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-950 dark:text-amber-200 font-semibold border border-amber-500/30 dark:border-amber-500/40'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          onClick={() => handleSelect(group, model)}
                        >
                          {/* Model Name */}
                          <span className="truncate flex-1 min-w-0">{model.label}</span>

                          {/* Badges */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {model.isFree && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Free
                              </span>
                            )}
                            {model.isDefault && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{'Default >'}</span>
                            )}
                            {isSelected && (
                              <Check className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
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
          <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="truncate text-[10px] pr-2">
              {selectedModel ? selectedModel.connectionName : 'Priority Pool'} · {displayModel}
            </span>
            <button
              type="button"
              className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 text-[11px] font-medium shrink-0"
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

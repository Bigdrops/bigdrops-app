import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { getCatalogueEntry, type CatalogueModel } from '@/lib/ai-assistant/provider-catalog'
import { isFreeModel } from '@/lib/ai-assistant/openrouter-pricing'
import { cn } from '@/lib/utils'
import type { PublicConnection } from './api'
import { ProviderLogo } from './ProviderLogo'

interface Props {
  connections: PublicConnection[]
  onSaveAllowedModels: (connectionId: string, allowedModels: string[]) => Promise<void>
  onDiscover?: (connectionId: string) => Promise<void>
}

interface ModelItem {
  id: string
  label: string
  isFree: boolean
  isDefault: boolean
}

export function ModelsManagerSection({
  connections,
  onSaveAllowedModels,
  onDiscover,
}: Props) {
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Expand the first connection by default
    return new Set(connections[0] ? [connections[0].id] : [])
  })
  const [savingConnectionId, setSavingConnectionId] = useState<string | null>(null)
  const [discoveringId, setDiscoveringId] = useState<string | null>(null)

  // Local state for enabled models map { connectionId: Set<modelId> }
  const [enabledMap, setEnabledMap] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {}
    for (const conn of connections) {
      const existing = conn.metadata?.enabledModels ?? conn.allowedModels ?? []
      if (existing.length > 0) {
        map[conn.id] = new Set(existing)
      } else {
        const initial = new Set<string>()
        if (conn.model) initial.add(conn.model)
        if (conn.providerId === 'openrouter' && conn.discoveredModels) {
          for (const m of conn.discoveredModels) {
            if (isFreeModel(m.id, m.metadata)) initial.add(m.id)
          }
        }
        map[conn.id] = initial
      }
    }
    return map
  })

  // Aggregate models per connection
  const connectionModelsMap = useMemo(() => {
    const map: Record<string, ModelItem[]> = {}

    for (const conn of connections) {
      const entry = getCatalogueEntry(conn.providerId)
      const curated = entry?.curatedModels ?? []
      const modelMap = new Map<string, ModelItem>()

      // 1. Current default model
      if (conn.model) {
        modelMap.set(conn.model, {
          id: conn.model,
          label: conn.model,
          isFree: isFreeModel(conn.model),
          isDefault: true,
        })
      }

      // 2. Discovered models
      if (conn.discoveredModels) {
        for (const m of conn.discoveredModels) {
          if (!modelMap.has(m.id)) {
            modelMap.set(m.id, {
              id: m.id,
              label: m.label || m.id,
              isFree: isFreeModel(m.id, m.metadata),
              isDefault: m.id === conn.model,
            })
          }
        }
      }

      // 3. Curated catalog models
      for (const c of curated) {
        if (!modelMap.has(c.id)) {
          modelMap.set(c.id, {
            id: c.id,
            label: c.label || c.id,
            isFree: isFreeModel(c.id),
            isDefault: c.id === conn.model,
          })
        }
      }

      map[conn.id] = Array.from(modelMap.values())
    }

    return map
  }, [connections])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleModel = async (connId: string, modelId: string) => {
    const currentSet = enabledMap[connId] ?? new Set()
    const nextSet = new Set(currentSet)
    if (nextSet.has(modelId)) {
      nextSet.delete(modelId)
    } else {
      nextSet.add(modelId)
    }

    setEnabledMap((prev) => ({ ...prev, [connId]: nextSet }))

    // Persist immediately to backend
    setSavingConnectionId(connId)
    try {
      await onSaveAllowedModels(connId, Array.from(nextSet))
    } finally {
      setSavingConnectionId(null)
    }
  }

  const handleAutoEnableFree = async (connId: string) => {
    const models = connectionModelsMap[connId] ?? []
    const currentSet = enabledMap[connId] ?? new Set()
    const nextSet = new Set(currentSet)

    for (const m of models) {
      if (m.isFree) nextSet.add(m.id)
    }

    setEnabledMap((prev) => ({ ...prev, [connId]: nextSet }))
    setSavingConnectionId(connId)
    try {
      await onSaveAllowedModels(connId, Array.from(nextSet))
    } finally {
      setSavingConnectionId(null)
    }
  }

  const handleSelectAll = async (connId: string) => {
    const models = connectionModelsMap[connId] ?? []
    const nextSet = new Set(models.map((m) => m.id))
    setEnabledMap((prev) => ({ ...prev, [connId]: nextSet }))
    setSavingConnectionId(connId)
    try {
      await onSaveAllowedModels(connId, Array.from(nextSet))
    } finally {
      setSavingConnectionId(null)
    }
  }

  const handleDeselectAll = async (connId: string, defaultModel?: string) => {
    const nextSet = new Set(defaultModel ? [defaultModel] : [])
    setEnabledMap((prev) => ({ ...prev, [connId]: nextSet }))
    setSavingConnectionId(connId)
    try {
      await onSaveAllowedModels(connId, Array.from(nextSet))
    } finally {
      setSavingConnectionId(null)
    }
  }

  const handleDiscoverModels = async (connId: string) => {
    if (!onDiscover) return
    setDiscoveringId(connId)
    try {
      await onDiscover(connId)
    } finally {
      setDiscoveringId(null)
    }
  }

  const query = search.trim().toLowerCase()

  // Calculate total enabled across all connections
  const totalEnabled = Object.values(enabledMap).reduce((sum, s) => sum + s.size, 0)

  return (
    <div className="rounded-xl border border-bd-border bg-bd-surface p-4 shadow-sm space-y-4">
      {/* Header matching Image 5 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-bd-border/80 pb-3">
        <div>
          <h3 className="text-sm font-bold text-bd-text">Models</h3>
          <p className="text-xs text-bd-text-muted mt-0.5">
            Choose which models appear in model picker
          </p>
        </div>
        <Badge variant="secondary" className="self-start sm:self-auto text-[11px] font-normal">
          {totalEnabled} active in picker
        </Badge>
      </div>

      {/* Search Input matching Image 5 */}
      <div className="relative">
        <Search
          className="absolute left-3 top-2.5 size-4 text-bd-text-muted"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search models"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-9 text-xs bg-bd-surface-muted/60"
        />
      </div>

      {/* Accordion List of Connections */}
      <div className="divide-y divide-bd-border/50 rounded-lg border border-bd-border overflow-hidden bg-bd-surface">
        {connections.length === 0 ? (
          <div className="p-6 text-center text-xs text-bd-text-muted">
            No connections configured yet. Add a connection above to manage its models.
          </div>
        ) : (
          connections.map((conn) => {
            const allModels = connectionModelsMap[conn.id] ?? []
            const activeSet = enabledMap[conn.id] ?? new Set()
            const isSaving = savingConnectionId === conn.id
            const isDiscovering = discoveringId === conn.id

            // Filter models if query exists
            const filteredModels = query
              ? allModels.filter(
                  (m) =>
                    m.id.toLowerCase().includes(query) ||
                    m.label.toLowerCase().includes(query) ||
                    conn.name.toLowerCase().includes(query),
                )
              : allModels

            const isAutoExpanded = Boolean(query && filteredModels.length > 0)
            const isOpen = isAutoExpanded || expandedIds.has(conn.id)

            if (query && filteredModels.length === 0) {
              return null
            }

            return (
              <div key={conn.id} className="transition-colors">
                {/* Accordion Row Header matching Image 5 */}
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between px-3.5 py-2.5 hover:bg-bd-surface-muted/60 cursor-pointer select-none"
                  onClick={() => toggleExpand(conn.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleExpand(conn.id)
                    }
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isOpen ? (
                      <ChevronDown size={15} className="text-bd-text-muted shrink-0" />
                    ) : (
                      <ChevronRight size={15} className="text-bd-text-muted shrink-0" />
                    )}
                    <ProviderLogo providerId={conn.providerId} size={16} />
                    <span className="text-xs font-semibold text-bd-text truncate">
                      {conn.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSaving && (
                      <span className="flex items-center gap-1 text-[10px] text-bd-primary">
                        <Loader2 size={10} className="animate-spin" /> Saving
                      </span>
                    )}
                    <span className="text-[11px] text-bd-text-muted font-mono">
                      {activeSet.size} active
                    </span>
                  </div>
                </div>

                {/* Expanded Models List matching Image 5 */}
                {isOpen && (
                  <div className="border-t border-bd-border/50 bg-bd-surface-muted/20 px-3.5 py-2.5 space-y-2">
                    {/* Action Bar inside Expanded Row */}
                    <div className="flex items-center justify-between text-[11px] text-bd-text-muted pb-1 border-b border-bd-border/40">
                      <div className="flex items-center gap-2">
                        {conn.providerId === 'openrouter' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => void handleAutoEnableFree(conn.id)}
                          >
                            <Sparkles size={11} /> Auto-enable Free
                          </Button>
                        )}
                        <button
                          type="button"
                          className="hover:text-bd-primary transition-colors underline"
                          onClick={() => void handleSelectAll(conn.id)}
                        >
                          Select all
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          className="hover:text-bd-text transition-colors underline"
                          onClick={() => void handleDeselectAll(conn.id, conn.model)}
                        >
                          Reset to default
                        </button>
                      </div>

                      {onDiscover && (
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-bd-primary transition-colors"
                          onClick={() => void handleDiscoverModels(conn.id)}
                          disabled={isDiscovering}
                          title="Refresh model list from provider endpoint"
                        >
                          <RefreshCw size={10} className={cn(isDiscovering && 'animate-spin')} />
                          <span>Sync</span>
                        </button>
                      )}
                    </div>

                    {/* Model Switch Rows matching Image 5 */}
                    <div className="divide-y divide-bd-border/40 max-h-[320px] overflow-y-auto rounded-md border border-bd-border/50 bg-bd-surface">
                      {filteredModels.length === 0 ? (
                        <div className="p-3 text-center text-xs text-bd-text-muted">
                          No models found. Click &quot;Sync&quot; above to discover models.
                        </div>
                      ) : (
                        filteredModels.map((model) => {
                          const checked = activeSet.has(model.id)
                          return (
                            <div
                              key={model.id}
                              className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-bd-surface-muted/60 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs text-bd-text truncate font-medium">
                                    {model.label}
                                  </span>
                                  {model.isFree && (
                                    <span className="text-[9px] px-1 py-0 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                                      Free
                                    </span>
                                  )}
                                  {model.isDefault && (
                                    <span className="text-[9px] px-1 py-0 rounded bg-bd-primary/10 text-bd-primary font-medium border border-bd-primary/20">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="font-mono text-[10px] text-bd-text-muted truncate mt-0.5">
                                  {model.id}
                                </p>
                              </div>

                              <Switch
                                size="sm"
                                checked={checked}
                                onCheckedChange={() => void handleToggleModel(conn.id, model.id)}
                                aria-label={`Enable ${model.label} in model picker`}
                              />
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

import React, { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  Check,
  Cpu,
  HelpCircle,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DiscoveredModel } from './api'
import type { CatalogueModel } from '@/lib/ai-assistant/provider-catalog'
import {
  classifyModelPricing,
  sortModelsByPrice,
  PriceCategory,
  ModelPricingDetails,
} from '@/lib/ai-assistant/openrouter-pricing'

export interface ModelItem {
  id: string
  label: string
  source: 'current' | 'curated' | 'live' | 'custom'
  contextLength?: number
  pricingDetails: ModelPricingDetails
  description?: string
  org?: string
  isUnlisted?: boolean
}

interface ModelSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentModel: string
  curatedModels: CatalogueModel[]
  discoveredModels: DiscoveredModel[]
  providerId: string
  providerName: string
  supportsDiscovery: boolean
  onSelect: (modelId: string) => void | Promise<void>
  onRefreshDiscovery?: () => Promise<void>
  discovering?: boolean
  discoveryError?: string | null
}

const INITIAL_RENDER_COUNT = 40
const RENDER_BATCH_SIZE = 30
type FilterCategory = 'all' | PriceCategory

const FILTER_PILLS: Array<{ id: FilterCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'free', label: 'Free' },
  { id: 'cheap', label: 'Cheap (≤$1)' },
  { id: 'medium', label: 'Medium (≤$5)' },
  { id: 'premium', label: 'Premium (>$5)' },
  { id: 'unknown', label: 'Unlisted' },
]

export function ModelSelectorModal({
  open,
  onOpenChange,
  currentModel,
  curatedModels,
  discoveredModels,
  providerId,
  providerName,
  supportsDiscovery,
  onSelect,
  onRefreshDiscovery,
  discovering = false,
  discoveryError = null,
}: ModelSelectorModalProps) {
  const [query, setQuery] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [selectedId, setSelectedId] = useState(currentModel)
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all')
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT)
  const [applying, setApplying] = useState(false)

  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    if (open) {
      setSelectedId(currentModel)
      setQuery('')
      setCustomInput('')
      setActiveCategory('all')
      setVisibleCount(INITIAL_RENDER_COUNT)
      setApplying(false)
    }
  }, [open, currentModel])

  // Build unified model list preserving sources and pricing metadata
  const allModels: ModelItem[] = useMemo(() => {
    const seen = new Set<string>()
    const items: ModelItem[] = []

    const extractOrg = (id: string, metadata?: Record<string, unknown>) => {
      if (typeof metadata?.owned_by === 'string' && metadata.owned_by.trim()) return metadata.owned_by.trim()
      return id.includes('/') ? id.split('/')[0] : undefined
    }

    if (currentModel) {
      seen.add(currentModel)
      const matchingDiscovered = discoveredModels.find((m) => m.id === currentModel)
      const matchingCurated = curatedModels.find((m) => m.id === currentModel)
      const meta = matchingDiscovered?.metadata as Record<string, unknown> | undefined

      items.push({
        id: currentModel,
        label: matchingDiscovered?.label || matchingCurated?.label || currentModel,
        source: 'current',
        contextLength: typeof meta?.context_length === 'number' ? meta.context_length : undefined,
        pricingDetails: classifyModelPricing(currentModel, meta?.pricing),
        description: typeof meta?.description === 'string' ? meta.description : undefined,
        org: extractOrg(currentModel, meta),
      })
    }

    for (const curated of curatedModels) {
      if (!seen.has(curated.id)) {
        seen.add(curated.id)
        items.push({
          id: curated.id,
          label: curated.label,
          source: 'curated',
          pricingDetails: classifyModelPricing(curated.id),
          org: extractOrg(curated.id),
        })
      }
    }

    for (const disc of discoveredModels) {
      if (!seen.has(disc.id)) {
        seen.add(disc.id)
        const meta = disc.metadata as Record<string, unknown> | undefined
        items.push({
          id: disc.id,
          label: disc.label || disc.id,
          source: 'live',
          contextLength: typeof meta?.context_length === 'number' ? meta.context_length : undefined,
          pricingDetails: classifyModelPricing(disc.id, meta?.pricing),
          description: typeof meta?.description === 'string' ? meta.description : undefined,
          org: extractOrg(disc.id, meta),
        })
      }
    }

    return sortModelsByPrice(items)
  }, [currentModel, curatedModels, discoveredModels])

  const categoryCounts = useMemo(() => {
    const counts: Record<FilterCategory, number> = { all: allModels.length, free: 0, cheap: 0, medium: 0, premium: 0, unknown: 0 }
    for (const item of allModels) {
      const cat = item.pricingDetails.category
      counts[cat] = (counts[cat] || 0) + 1
    }
    return counts
  }, [allModels])

  const filteredModels = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return allModels.filter((m) => {
      if (activeCategory !== 'all' && m.pricingDetails.category !== activeCategory) return false
      if (!q) return true
      return (
        m.id.toLowerCase().includes(q) ||
        m.label.toLowerCase().includes(q) ||
        (m.org ? m.org.toLowerCase().includes(q) : false) ||
        (m.description ? m.description.toLowerCase().includes(q) : false)
      )
    })
  }, [allModels, activeCategory, deferredQuery])

  useEffect(() => {
    setVisibleCount(INITIAL_RENDER_COUNT)
  }, [deferredQuery, activeCategory])

  const visibleModels = useMemo(() => filteredModels.slice(0, visibleCount), [filteredModels, visibleCount])

  // Direct commit: Selecting a model immediately applies it and closes the modal
  async function handleConfirmSelect(id: string) {
    const trimmed = id.trim()
    if (!trimmed || applying) return
    setSelectedId(trimmed)
    setApplying(true)
    try {
      await onSelect(trimmed)
      onOpenChange(false)
    } finally {
      setApplying(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  const isCurrentModelMissingFromCatalogue =
    currentModel && !curatedModels.some((m) => m.id === currentModel) && !discoveredModels.some((m) => m.id === currentModel)

  const renderBadge = (pricing: ModelPricingDetails) => {
    if (pricing.category === 'free') {
      return <Badge className="text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">FREE</Badge>
    }
    if (pricing.category === 'cheap') {
      return <Badge variant="outline" className="text-[9px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30">CHEAP</Badge>
    }
    if (pricing.category === 'medium') {
      return <Badge variant="outline" className="text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">MEDIUM</Badge>
    }
    if (pricing.category === 'premium') {
      return <Badge variant="outline" className="text-[9px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">PREMIUM</Badge>
    }
    return <Badge variant="outline" className="text-[9px] font-medium text-bd-text-muted border-bd-border">UNKNOWN</Badge>
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-picker-title"
    >
      <button type="button" aria-label="Close dialog" className="absolute inset-0 cursor-default bg-transparent" onClick={() => onOpenChange(false)} />

      <div
        className={cn(
          'relative z-10 flex flex-col w-full bg-bd-surface border border-bd-border shadow-2xl transition-all',
          'rounded-t-[24px] sm:rounded-2xl h-[94vh] sm:h-[84vh] max-h-[94vh] sm:max-h-[84vh] sm:max-w-xl overflow-hidden',
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-bd-border-strong sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-bd-border px-4 py-2.5 sm:px-5 shrink-0">
          <div className="min-w-0 pr-2">
            <h2 id="model-picker-title" className="flex items-center gap-2 text-sm font-bold text-bd-text">
              <Cpu size={16} className="text-bd-primary shrink-0" />
              <span className="truncate">Select Model for {providerName}</span>
            </h2>
            <p className="truncate text-[11px] text-bd-text-muted">{allModels.length} models available · {providerId}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {supportsDiscovery && onRefreshDiscovery && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => void onRefreshDiscovery()}
                disabled={discovering}
                title="Query upstream provider for latest model catalogue"
              >
                {discovering ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                <span className="hidden xs:inline">Refresh</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-bd-text-muted hover:text-bd-text" onClick={() => onOpenChange(false)} aria-label="Close">
              <X size={15} />
            </Button>
          </div>
        </div>

        {isCurrentModelMissingFromCatalogue && (
          <div className="mx-4 mt-2 flex items-start gap-2 rounded-lg border border-bd-status-warning-border bg-bd-status-warning-bg px-3 py-1.5 text-[11px] text-bd-status-warning-text sm:mx-5 shrink-0">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">Authoritative saved model: </span>
              <code className="font-mono">{currentModel}</code> is currently saved, but unlisted upstream.
            </div>
          </div>
        )}

        {discoveryError && (
          <div className="mx-4 mt-2 flex items-start gap-2 rounded-lg border border-bd-status-danger-border bg-bd-status-danger-bg px-3 py-1.5 text-[11px] text-bd-status-danger-text sm:mx-5 shrink-0">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <div className="flex-1 truncate"><span className="font-semibold">Discovery failed: </span>{discoveryError}</div>
            {onRefreshDiscovery && (
              <Button variant="outline" size="sm" className="h-5 text-[10px]" onClick={() => void onRefreshDiscovery()} disabled={discovering}>
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Category Filter Pills Strip (Native scrollbars hidden via .no-scrollbar) */}
        <div className="border-b border-bd-border bg-bd-surface-muted/30 px-4 py-1.5 sm:px-5 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {FILTER_PILLS.map((pill) => {
              const count = categoryCounts[pill.id] ?? 0
              const isActive = activeCategory === pill.id
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActiveCategory(pill.id)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors shrink-0',
                    isActive
                      ? 'bg-bd-primary text-white shadow-xs'
                      : 'bg-bd-surface hover:bg-bd-surface-muted text-bd-text-muted hover:text-bd-text border border-bd-border',
                  )}
                >
                  <span>{pill.label}</span>
                  <span className={cn('text-[9px] px-1.5 rounded-full font-mono', isActive ? 'bg-white/25 text-white' : 'bg-bd-surface-muted text-bd-text-soft')}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Scrollable Model Results Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 sm:px-5 space-y-2 divide-y divide-bd-border/40 overscroll-contain pr-3">
          {filteredModels.length === 0 ? (
            <div className="py-10 text-center">
              <HelpCircle size={24} className="mx-auto text-bd-text-soft" />
              <p className="mt-2 text-xs font-semibold text-bd-text">{query ? `No models match “${query}”` : 'No models in this category'}</p>
              {query && (
                <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => void handleConfirmSelect(query)}>
                  Save “{query}” as model
                </Button>
              )}
            </div>
          ) : (
            visibleModels.map((item) => {
              const isSelected = selectedId === item.id
              const isCurrent = currentModel === item.id

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => void handleConfirmSelect(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      void handleConfirmSelect(item.id)
                    }
                  }}
                  className={cn(
                    'group flex items-start justify-between gap-3 rounded-xl p-2.5 cursor-pointer transition-colors outline-none focus-visible:ring-1 focus-visible:ring-bd-primary',
                    isSelected ? 'bg-bd-primary/10 border border-bd-primary/30 shadow-xs' : 'hover:bg-bd-surface-muted border border-transparent',
                    applying && selectedId === item.id && 'opacity-80 pointer-events-none',
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-bd-text break-all">{item.label}</span>
                      {isCurrent && <Badge variant="secondary" className="text-[9px] bg-bd-primary/20 text-bd-primary border-bd-primary/30">Active</Badge>}
                      {item.source === 'curated' && (
                        <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30">
                          <Sparkles size={9} className="mr-0.5 text-amber-500" /> Curated
                        </Badge>
                      )}
                      {item.source === 'live' && <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30">Live</Badge>}
                      {renderBadge(item.pricingDetails)}
                    </div>

                    <p className="font-mono text-[10px] text-bd-text-muted break-all">{item.id}</p>

                    {item.pricingDetails.rateLimitNote && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{item.pricingDetails.rateLimitNote}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-bd-text-soft">
                      {item.contextLength && (
                        <span className="flex items-center gap-0.5 font-mono">
                          <Tag size={10} />
                          {item.contextLength >= 1000 ? `${Math.round(item.contextLength / 1000)}k ctx` : `${item.contextLength} ctx`}
                        </span>
                      )}
                      {item.pricingDetails.formattedSummary && (
                        <span className="font-mono text-bd-text-muted">{item.pricingDetails.formattedSummary}</span>
                      )}
                      {item.org && <span>org: {item.org}</span>}
                      {item.description && <span className="truncate max-w-[260px]" title={item.description}>{item.description}</span>}
                    </div>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {applying && selectedId === item.id ? (
                      <div className="flex h-5 w-5 items-center justify-center">
                        <Loader2 size={14} className="animate-spin text-bd-primary" />
                      </div>
                    ) : isSelected ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-bd-primary text-white shadow-xs">
                        <Check size={12} />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-bd-border-strong group-hover:border-bd-primary group-hover:bg-bd-primary/10 transition-colors" />
                    )}
                  </div>
                </div>
              )
            })
          )}

          {visibleCount < filteredModels.length && (
            <div className="pt-2 text-center pb-2">
              <Button variant="ghost" size="sm" className="text-xs text-bd-text-muted hover:text-bd-text" onClick={() => setVisibleCount((prev) => prev + RENDER_BATCH_SIZE)}>
                Load more models ({filteredModels.length - visibleCount} remaining)...
              </Button>
            </div>
          )}
        </div>

        {/* Bottom-Anchored Controls (Search, Custom Input, Action Footer) */}
        <div className="border-t border-bd-border bg-bd-surface px-4 py-2 sm:px-5 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shrink-0">
          {/* Bottom Search Bar (OpenCode style, right above soft keyboard) */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bd-text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models by name, ID (e.g. deepseek, claude)..."
              className="h-8.5 pl-8 pr-8 font-mono text-xs rounded-xl bg-bd-surface-muted/60"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bd-text-soft hover:text-bd-text" aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Custom Model Direct Input Row */}
          <div className="flex items-center gap-2">
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customInput.trim()) {
                  e.preventDefault()
                  void handleConfirmSelect(customInput.trim())
                }
              }}
              placeholder="Or enter custom model identifier..."
              className="h-7 font-mono text-[11px]"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs shrink-0"
              disabled={!customInput.trim() || applying}
              onClick={() => void handleConfirmSelect(customInput.trim())}
            >
              Save Custom
            </Button>
          </div>

          {/* Selected Model & Action Buttons */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="min-w-0 pr-2">
              <p className="truncate font-mono text-[10px] text-bd-text-muted">
                Active: <span className="font-semibold text-bd-text">{currentModel || 'None'}</span>
                {selectedId && selectedId !== currentModel && (
                  <span className="text-bd-primary ml-1 font-bold">→ {selectedId}</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={applying}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedId || applying}
                onClick={() => void handleConfirmSelect(selectedId)}
              >
                {applying ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                <span className="ml-1">Save Model</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

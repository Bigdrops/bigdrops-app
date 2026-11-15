import { useMemo, useState } from 'react'
import { Check, CheckCircle2, Loader2, RefreshCw, Search, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { isFreeModel } from '@/lib/ai-assistant/openrouter-pricing'
import type { CatalogueModel } from '@/lib/ai-assistant/provider-catalog'
import type { PublicConnection } from './api'

type Props = {
  connection: PublicConnection
  curatedModels: CatalogueModel[]
  onSaveAllowedModels: (connectionId: string, allowedModels: string[]) => Promise<void>
}

interface ModelRow {
  id: string
  label: string
  isFree: boolean
  isDefault: boolean
}

export function ConnectionModelManager({
  connection,
  curatedModels,
  onSaveAllowedModels,
}: Props) {
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  // Initialize enabled set from allowedModels or metadata.enabledModels
  const [enabledSet, setEnabledSet] = useState<Set<string>>(() => {
    const existing = connection.metadata?.enabledModels ?? connection.allowedModels ?? []
    if (existing.length > 0) {
      return new Set(existing)
    }
    // Default fallback: if openrouter, auto-enable all free models + default model
    const initial = new Set<string>()
    if (connection.model) initial.add(connection.model)

    if (connection.providerId === 'openrouter' && connection.discoveredModels) {
      for (const m of connection.discoveredModels) {
        if (isFreeModel(m.id, m.metadata)) {
          initial.add(m.id)
        }
      }
    }
    return initial
  })

  // Aggregate and deduplicate all available models for this connection
  const allModels = useMemo<ModelRow[]>(() => {
    const map = new Map<string, ModelRow>()

    // 1. Current primary model
    if (connection.model) {
      map.set(connection.model, {
        id: connection.model,
        label: connection.model,
        isFree: isFreeModel(connection.model),
        isDefault: true,
      })
    }

    // 2. Discovered live models from provider
    if (connection.discoveredModels) {
      for (const m of connection.discoveredModels) {
        if (!map.has(m.id)) {
          map.set(m.id, {
            id: m.id,
            label: m.label || m.id,
            isFree: isFreeModel(m.id, m.metadata),
            isDefault: m.id === connection.model,
          })
        }
      }
    }

    // 3. Curated catalog models
    for (const c of curatedModels) {
      if (!map.has(c.id)) {
        map.set(c.id, {
          id: c.id,
          label: c.label || c.id,
          isFree: isFreeModel(c.id),
          isDefault: c.id === connection.model,
        })
      }
    }

    return Array.from(map.values())
  }, [connection.model, connection.discoveredModels, curatedModels])

  // Filter models by query
  const filteredModels = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return allModels
    return allModels.filter(
      (m) => m.id.toLowerCase().includes(term) || m.label.toLowerCase().includes(term),
    )
  }, [allModels, query])

  const enabledCount = enabledSet.size

  const toggleModel = (modelId: string) => {
    setJustSaved(false)
    setEnabledSet((prev) => {
      const next = new Set(prev)
      if (next.has(modelId)) {
        next.delete(modelId)
      } else {
        next.add(modelId)
      }
      return next
    })
  }

  const handleAutoEnableFree = () => {
    setJustSaved(false)
    setEnabledSet((prev) => {
      const next = new Set(prev)
      for (const m of allModels) {
        if (m.isFree) {
          next.add(m.id)
        }
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setJustSaved(false)
    setEnabledSet(new Set(allModels.map((m) => m.id)))
  }

  const handleDeselectAll = () => {
    setJustSaved(false)
    setEnabledSet(new Set(connection.model ? [connection.model] : []))
  }

  const handleSave = async () => {
    setSaving(true)
    setJustSaved(false)
    try {
      await onSaveAllowedModels(connection.id, Array.from(enabledSet))
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 pt-2">
      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-bd-border/80 pb-2.5">
        <div>
          <h4 className="text-xs font-bold text-bd-text flex items-center gap-1.5">
            Models
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              {enabledCount} active in picker
            </Badge>
          </h4>
          <p className="text-[11px] text-bd-text-muted mt-0.5">
            Choose which models appear in the chat model picker
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {connection.providerId === 'openrouter' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2 gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              onClick={handleAutoEnableFree}
            >
              <Sparkles size={11} /> Auto-enable Free
            </Button>
          )}
          <button
            type="button"
            className="text-[11px] text-bd-primary hover:underline px-1"
            onClick={handleSelectAll}
          >
            All
          </button>
          <span className="text-bd-text-soft text-xs">·</span>
          <button
            type="button"
            className="text-[11px] text-bd-text-muted hover:underline px-1"
            onClick={handleDeselectAll}
          >
            None
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2 size-3.5 text-bd-text-muted" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Search models..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 pl-8 text-xs bg-bd-surface-muted/60"
        />
      </div>

      {/* Model Toggle Rows */}
      <div className="max-h-[260px] overflow-y-auto divide-y divide-bd-border/40 rounded-lg border border-bd-border/60 bg-bd-surface-muted/30">
        {filteredModels.length === 0 ? (
          <div className="p-4 text-center text-xs text-bd-text-muted">
            {allModels.length === 0 ? 'No discovered models yet. Click "Models" above to sync.' : 'No models match your search.'}
          </div>
        ) : (
          filteredModels.map((model) => {
            const isChecked = enabledSet.has(model.id)
            return (
              <div
                key={model.id}
                className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-bd-surface-muted/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-bd-text truncate">
                      {model.label}
                    </span>
                    {model.isFree && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] px-1 py-0 h-4"
                      >
                        Free
                      </Badge>
                    )}
                    {model.isDefault && (
                      <Badge
                        variant="secondary"
                        className="bg-bd-primary/10 text-bd-primary border-bd-primary/20 text-[9px] px-1 py-0 h-4"
                      >
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-bd-text-muted truncate mt-0.5">
                    {model.id}
                  </p>
                </div>

                <Switch
                  size="sm"
                  checked={isChecked}
                  onCheckedChange={() => toggleModel(model.id)}
                  aria-label={`Enable ${model.label} for chat`}
                />
              </div>
            )
          })
        )}
      </div>

      {/* Save Action Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-bd-text-muted">
          {enabledCount} model{enabledCount === 1 ? '' : 's'} will appear in Chat picker
        </span>

        <Button
          type="button"
          size="sm"
          className="h-7 text-xs gap-1.5"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : justSaved ? (
            <CheckCircle2 size={12} className="text-emerald-500" />
          ) : (
            <Check size={12} />
          )}
          {justSaved ? 'Saved!' : 'Save Selection'}
        </Button>
      </div>
    </div>
  )
}

import React from 'react'
import { Plus, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PROVIDER_CATALOGUE } from '@/lib/ai-assistant/provider-catalog'
import { ProviderLogo } from './ProviderLogo'

interface CatalogueGridProps {
  onSelectProvider: (providerId?: string) => void
}

export function CatalogueGrid({ onSelectProvider }: CatalogueGridProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-bd-text">Curated Provider Catalogue</h3>
        <p className="text-[10px] text-bd-text-soft">Verified contracts · Multi-account ready</p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {PROVIDER_CATALOGUE.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2.5 rounded-lg border border-bd-border bg-bd-surface p-2.5 shadow-sm hover:border-bd-border-strong transition-colors"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-bd-border bg-bd-surface-muted">
              <ProviderLogo providerId={p.id} size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-bd-text">{p.name}</p>
              <p className="truncate text-[10px] text-bd-text-muted">
                {p.protocol === 'anthropic' ? 'Anthropic' : 'OpenAI-compatible'} · {p.supportsDiscovery ? 'Discovery' : 'Manual'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0 px-2 text-[11px]"
              onClick={() => onSelectProvider(p.id)}
            >
              <Plus size={11} className="mr-1" /> Connect
            </Button>
          </div>
        ))}

        {/* Custom Provider Entry */}
        <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-bd-border bg-bd-surface p-2.5 shadow-sm hover:border-bd-primary transition-colors">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-bd-border bg-bd-surface-muted">
            <Server size={18} className="text-bd-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-bd-text">Custom Endpoint</p>
            <p className="truncate text-[10px] text-bd-text-muted">OpenAI or Anthropic compatible</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 shrink-0 px-2 text-[11px] text-bd-primary"
            onClick={() => onSelectProvider('custom')}
          >
            <Plus size={11} className="mr-1" /> Add
          </Button>
        </div>
      </div>
    </div>
  )
}

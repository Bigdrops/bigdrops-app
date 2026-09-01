import * as React from 'react'
import { Building2, Check, Plus, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEntity, useWorkspace } from '@/lib/tenant/contexts'
import { CreateCompanySheet } from '@/components/layout/CreateCompanySheet'
import { SettingsSummaryCard } from '@/components/settings/SettingsSummaryCard'

export function CompanyManageSection() {
  const { workspace } = useWorkspace()
  const { entity, entities, selectEntity, isLoading } = useEntity()
  const [createOpen, setCreateOpen] = React.useState(false)

  const wsName = String(workspace?.name || '').trim() || '—'

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Workspace context */}
      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
          Workspace
        </p>
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-bd-border bg-bd-card-bg px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))] text-[11px] font-[800]">
            {wsName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-[800] text-bd-text">{wsName}</div>
            <div className="text-[10px] text-bd-text-muted">
              {entities.length} {entities.length === 1 ? 'company' : 'companies'}
            </div>
          </div>
        </div>
      </div>

      {/* Company list */}
      <SettingsSummaryCard
        title="Companies"
        description="Manage companies within this workspace."
      >
        {isLoading ? (
          <div className="py-4 text-center text-[11px] text-bd-text-muted">Loading…</div>
        ) : entities.length === 0 ? (
          <div className="py-4 text-center text-[11px] text-bd-text-muted">
            No companies yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-0.5">
            {entities.map((ent) => {
              const isActive = ent.id === entity?.id
              const initials = (ent.name || '?').charAt(0).toUpperCase()
              return (
                <button
                  key={ent.id}
                  type="button"
                  onClick={() => selectEntity(ent.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition active:scale-[0.985]',
                    isActive
                      ? 'bg-[hsl(var(--primary-soft))]'
                      : 'hover:bg-[hsl(var(--surface-muted))]/50',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[11px] font-[800]',
                      isActive
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))]',
                    )}
                  >
                    {initials}
                  </span>
                  <span
                    className={cn(
                      'flex-1 truncate text-[12px] font-[800]',
                      isActive ? 'text-[hsl(var(--primary))]' : 'text-bd-text',
                    )}
                  >
                    {ent.name || 'Unnamed'}
                  </span>
                  {isActive ? (
                    <Check className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-bd-text-muted" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </SettingsSummaryCard>

      {/* Create Company button */}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-bd-border bg-bd-card-bg px-4 py-3.5 text-left transition hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--primary-soft))]/30 active:scale-[0.985]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))]">
          <Plus className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-[800] text-bd-text">Create Company</div>
          <div className="text-[10px] text-bd-text-muted">
            Add a new company to {wsName}
          </div>
        </div>
      </button>

      <CreateCompanySheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

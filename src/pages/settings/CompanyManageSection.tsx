import * as React from 'react'
import { Building2, Check, Plus, ChevronRight, Archive, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/supabase'
import { useEntity, useWorkspace } from '@/lib/tenant/contexts'
import { archiveEntity, restoreEntity } from '@/domain/tenant/tenantCreation'
import { CreateCompanySheet } from '@/components/layout/CreateCompanySheet'
import { SettingsSummaryCard } from '@/components/settings/SettingsSummaryCard'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'

type ArchivedEntity = { id: string; slug: string | null; name: string; archived_at: string | null }

export function CompanyManageSection() {
  const { workspace } = useWorkspace()
  const { entity, entities, selectEntity, isLoading, refresh } = useEntity()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [showArchived, setShowArchived] = React.useState(false)
  const [archivedEntities, setArchivedEntities] = React.useState<ArchivedEntity[]>([])
  const [loadingArchived, setLoadingArchived] = React.useState(false)
  const [archiveTarget, setArchiveTarget] = React.useState<ArchivedEntity | null>(null)
  const [restoreTarget, setRestoreTarget] = React.useState<ArchivedEntity | null>(null)
  const [actionLoading, setActionLoading] = React.useState(false)

  const wsName = String(workspace?.name || '').trim() || '—'

  const fetchArchived = React.useCallback(async () => {
    if (!workspace) return
    setLoadingArchived(true)
    try {
      const { data, error } = await supabase
        .from('entities')
        .select('id, slug, display_name, archived_at')
        .eq('workspace_id', workspace.id)
        .eq('status', 'archived')
      if (error) throw error
      const rows = (data ?? []) as Array<{ id: string; slug: string | null; display_name: string | null; archived_at: string | null }>
      setArchivedEntities(rows.map((r) => ({ id: r.id, slug: r.slug, name: r.display_name ?? r.slug ?? 'Unnamed', archived_at: r.archived_at })))
    } catch {
      setArchivedEntities([])
    } finally {
      setLoadingArchived(false)
    }
  }, [workspace])

  React.useEffect(() => {
    if (showArchived) void fetchArchived()
  }, [showArchived, fetchArchived])

  const handleArchive = React.useCallback(async () => {
    if (!archiveTarget) return
    setActionLoading(true)
    try {
      await archiveEntity(archiveTarget.id)
      setArchiveTarget(null)
      refresh()
      if (showArchived) void fetchArchived()
    } catch (e) {
      alert((e as Error)?.message ?? 'Archive failed')
    } finally {
      setActionLoading(false)
    }
  }, [archiveTarget, refresh, showArchived, fetchArchived])

  const handleRestore = React.useCallback(async () => {
    if (!restoreTarget) return
    setActionLoading(true)
    try {
      await restoreEntity(restoreTarget.id)
      setRestoreTarget(null)
      refresh()
      if (showArchived) void fetchArchived()
    } catch (e) {
      alert((e as Error)?.message ?? 'Restore failed')
    } finally {
      setActionLoading(false)
    }
  }, [restoreTarget, refresh, showArchived, fetchArchived])

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

      {/* Active companies */}
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
                <div key={ent.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => selectEntity(ent.id)}
                    className={cn(
                      'flex flex-1 items-center gap-3 rounded-xl px-3 py-3 text-left transition active:scale-[0.985]',
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
                  <button
                    type="button"
                    onClick={() => setArchiveTarget({ id: ent.id, slug: ent.slug, name: ent.name, archived_at: null })}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-bd-text-muted transition hover:bg-bd-status-danger-bg hover:text-bd-status-danger-text"
                    title="Archive company"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </SettingsSummaryCard>

      {/* Archived companies toggle */}
      <button
        type="button"
        onClick={() => setShowArchived((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl border border-bd-border bg-bd-card-bg px-4 py-3 text-left transition hover:bg-[hsl(var(--surface-muted))]/50 active:scale-[0.985]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[hsl(var(--surface-muted))] text-bd-text-muted">
          {showArchived ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-[800] text-bd-text">
            {showArchived ? 'Hide Archived' : 'View Archived'}
          </div>
          <div className="text-[10px] text-bd-text-muted">
            {showArchived ? 'Collapse archived companies' : 'Show archived companies'}
          </div>
        </div>
      </button>

      {/* Archived companies list */}
      {showArchived && (
        <SettingsSummaryCard
          title="Archived"
          description="These companies are inactive. Restore to reactivate."
        >
          {loadingArchived ? (
            <div className="py-4 text-center text-[11px] text-bd-text-muted">Loading…</div>
          ) : archivedEntities.length === 0 ? (
            <div className="py-4 text-center text-[11px] text-bd-text-muted">
              No archived companies.
            </div>
          ) : (
            <div className="space-y-0.5">
              {archivedEntities.map((ent) => {
                const initials = (ent.name || '?').charAt(0).toUpperCase()
                return (
                  <div key={ent.id} className="flex items-center gap-3 rounded-xl px-3 py-3 opacity-60">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[hsl(var(--surface-muted))] text-[11px] font-[800] text-bd-text-muted">
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-[800] text-bd-text">{ent.name}</div>
                      {ent.archived_at && (
                        <div className="text-[10px] text-bd-text-muted">
                          Archived {new Date(ent.archived_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRestoreTarget(ent)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-bd-text-muted transition hover:bg-green-50 hover:text-green-600"
                      title="Restore company"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </SettingsSummaryCard>
      )}

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

      {/* Archive confirmation */}
      <ConfirmActionDialog
        open={!!archiveTarget}
        onOpenChange={(v) => { if (!v) setArchiveTarget(null) }}
        title={`Archive ${archiveTarget?.name ?? ''}?`}
        description="This company will become inaccessible. Data is preserved and can be restored within 30 days."
        confirmLabel="Archive"
        variant="destructive"
        loading={actionLoading}
        onConfirm={handleArchive}
      />

      {/* Restore confirmation */}
      <ConfirmActionDialog
        open={!!restoreTarget}
        onOpenChange={(v) => { if (!v) setRestoreTarget(null) }}
        title={`Restore ${restoreTarget?.name ?? ''}?`}
        description="All documents and permissions will be reactivated."
        confirmLabel="Restore"
        variant="default"
        loading={actionLoading}
        onConfirm={handleRestore}
      />
    </div>
  )
}

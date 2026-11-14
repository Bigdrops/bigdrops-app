import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Database,
  KeyRound,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { feedback } from '@/lib/feedback'
import { PROVIDER_CATALOGUE } from '@/lib/ai-assistant/provider-catalog'
import { cn } from '@/lib/utils'
import {
  boluProviderApi,
  type ProviderDiagnostics,
  type ProviderStatusResponse,
  type PublicConnection,
  type RoutingEventRecord,
} from './bolu-provider/api'
import { ConnectionCard } from './bolu-provider/ConnectionCard'
import { ConnectionDialog } from './bolu-provider/ConnectionDialog'
import { ProviderLogo } from './bolu-provider/ProviderLogo'

export function BoluProviderSettingsSection() {
  const [status, setStatus] = useState<ProviderStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PublicConnection | null>(null)
  const [initialProviderId, setInitialProviderId] = useState<string | undefined>(undefined)
  const [diagnostics, setDiagnostics] = useState<Record<string, ProviderDiagnostics>>({})
  const [eventsOpen, setEventsOpen] = useState(false)

  const fetchStatus = useCallback(async (spinner: boolean) => {
    if (spinner) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const data = await boluProviderApi.getStatus()
      setStatus(data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load provider status.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus(true)
  }, [fetchStatus])

  /** Refresh after a mutation; a failed refresh must not undo a successful change. */
  async function refreshQuietly() {
    try {
      setStatus(await boluProviderApi.getStatus())
    } catch {
      // Keep the last known good state; the mutation already succeeded.
    }
  }

  function upsertConnection(connection: PublicConnection) {
    setStatus((prev) => {
      if (!prev) return prev
      const exists = prev.connections.some((c) => c.id === connection.id)
      return {
        ...prev,
        connections: exists
          ? prev.connections.map((c) => (c.id === connection.id ? connection : c))
          : [...prev.connections, connection],
      }
    })
  }

  async function handleTest(id: string) {
    try {
      const result = await boluProviderApi.test({ connectionId: id })
      setDiagnostics((prev) => ({ ...prev, [id]: result.diagnostics }))
      await refreshQuietly()
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Connection test failed.')
    }
  }

  async function handleDiscover(id: string) {
    try {
      const result = await boluProviderApi.discover({ connectionId: id })
      setDiagnostics((prev) => ({ ...prev, [id]: result.diagnostics }))
      if (result.ok) {
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                connections: prev.connections.map((c) =>
                  c.id === id
                    ? { ...c, discoveredModels: result.models, modelsFetchedAt: new Date().toISOString() }
                    : c,
                ),
              }
            : prev,
        )
        feedback.success(`Discovered ${result.models.length} model${result.models.length === 1 ? '' : 's'}.`)
      }
      await refreshQuietly()
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Model discovery failed.')
    }
  }

  async function handleToggleEnabled(id: string, isEnabled: boolean) {
    try {
      const result = await boluProviderApi.update(id, { isEnabled })
      upsertConnection(result.connection)
      feedback.success(isEnabled ? 'Connection enabled.' : 'Connection disabled.')
      await refreshQuietly()
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Failed to update connection.')
    }
  }

  async function handleTogglePool(id: string, inPool: boolean) {
    try {
      const result = await boluProviderApi.setPool(id, inPool)
      upsertConnection(result.connection)
      feedback.success(inPool ? 'Connection added to routing pool.' : 'Connection set to standby.')
      await refreshQuietly()
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Failed to toggle pool state.')
    }
  }

  async function handlePriorityChange(id: string, priority: number) {
    try {
      const result = await boluProviderApi.setPriority(id, priority)
      upsertConnection(result.connection)
      feedback.success(`Priority updated to ${priority}.`)
      await refreshQuietly()
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Failed to update priority.')
    }
  }

  async function handleSyncBalance(id: string) {
    try {
      const result = await boluProviderApi.syncBalance(id)
      if (result.connection) upsertConnection(result.connection)
      if (result.supported && result.balance) {
        const amt = result.balance.balanceAmount ?? result.balance.balanceUsd
        feedback.success(`Balance refreshed: ${amt} ${result.balance.currency || 'USD'}`)
      } else {
        feedback.info(result.message || 'Balance check not supported by this provider.')
      }
      await refreshQuietly()
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Balance sync failed.')
    }
  }

  async function handleActivate(id: string) {
    try {
      const result = await boluProviderApi.activate(id)
      setStatus((prev) => (prev ? { ...prev, routing: result.routing } : prev))
      feedback.success('Connection promoted to priority 1 and set as primary.')
      await refreshQuietly()
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Failed to activate the connection.')
    }
  }

  async function handleDelete(id: string) {
    try {
      const result = await boluProviderApi.remove(id)
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              connections: prev.connections.filter((c) => c.id !== id),
              routing: result.routing ?? prev.routing,
            }
          : prev,
      )
      setDiagnostics((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      feedback.success('Connection deleted.')
      await refreshQuietly()
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Failed to delete the connection.')
    }
  }

  async function handleModelChange(id: string, model: string) {
    try {
      const result = await boluProviderApi.update(id, { model })
      upsertConnection(result.connection)
      feedback.success('Model updated.')
      await refreshQuietly()
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Failed to update the model.')
    }
  }

  async function handleSaved(connection: PublicConnection) {
    upsertConnection(connection)
    await refreshQuietly()
  }

  function openCreate(providerId?: string) {
    setEditing(null)
    setInitialProviderId(providerId)
    setDialogOpen(true)
  }

  function openEdit(connection: PublicConnection) {
    setEditing(connection)
    setInitialProviderId(undefined)
    setDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (loadError || !status) {
    return (
      <div className="rounded-xl border border-bd-status-danger-border bg-bd-status-danger-bg p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-bd-status-danger-text" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-bd-status-danger-text">
              Could not load Bolu provider infrastructure
            </p>
            <p className="text-xs text-bd-status-danger-text opacity-90">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => void fetchStatus(true)}>
              <RefreshCw size={13} /> Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { connections, routing, runtime, schemaReady, poolSummary, routingEvents } = status
  const primary = routing.primaryConnectionId
    ? connections.find((c) => c.id === routing.primaryConnectionId) ?? null
    : null

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-bd-text">Bolu AI Infrastructure</p>
          <p className="truncate text-[10px] text-bd-text-muted">
            Multi-account priority routing · Encrypted server-side credentials
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 sm:w-auto sm:px-2"
            onClick={() => void fetchStatus(false)}
            disabled={refreshing}
            aria-label="Refresh provider status"
          >
            {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            <span className="hidden text-xs sm:inline ml-1">Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => openCreate('custom')}
          >
            <Server size={13} />
            <span className="hidden xs:inline sm:inline ml-1">Custom</span>
          </Button>

          <Button size="sm" className="h-8 px-2.5 text-xs sm:px-3" onClick={() => openCreate()}>
            <Plus size={14} />
            <span className="hidden xs:inline sm:inline ml-1">Add connection</span>
            <span className="sr-only xs:hidden sm:hidden">Add connection</span>
          </Button>
        </div>
      </div>

      {/* Migration pending banner */}
      {!schemaReady && (
        <div className="flex items-start gap-2 rounded-lg border border-bd-status-warning-border bg-bd-status-warning-bg px-3 py-2.5">
          <Database size={15} className="mt-0.5 shrink-0 text-bd-status-warning-text" />
          <p className="text-[11px] leading-snug text-bd-status-warning-text">
            <span className="font-semibold">Vault migration pending.</span> Apply migration{' '}
            <code className="font-mono text-[10px]">20261114170000_bolu_provider_connections.sql</code>
            {' '}to persist connections. You can still test provider credentials and discover live models.
          </p>
        </div>
      )}

      {/* Runtime & Multi-Account Pool Panel */}
      <div className="rounded-xl border border-bd-border bg-bd-surface p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-bd-text">Live Runtime & Pool</h3>
          <RuntimeSourceBadge source={runtime.source} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-bd-border bg-bd-surface-muted px-3.5 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bd-text-soft">Active Provider</p>
            {primary ? (
              <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-bd-text">
                <ProviderLogo providerId={primary.providerId} size={15} />
                <span className="truncate">{primary.name}</span>
                <span className="rounded bg-bd-primary/10 px-1 py-0.5 font-mono text-[10px] text-bd-primary">
                  P{primary.priority}
                </span>
              </p>
            ) : (
              <p className="mt-1 truncate text-xs font-medium text-bd-text">
                {runtime.provider ?? 'Not configured'}
              </p>
            )}
            <p className="mt-0.5 truncate font-mono text-[10px] text-bd-text-muted">
              {runtime.model ?? 'No model selected'}
            </p>
          </div>

          <div className="rounded-lg border border-bd-border bg-bd-surface-muted px-3.5 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-bd-text-soft">Routing Pool Status</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-bd-text">
              <span className="flex items-center gap-1">
                <Layers size={13} className="text-purple-500" />
                {poolSummary?.inPoolCount ?? connections.filter((c) => c.inPool).length} / {connections.length} in pool
              </span>
              <span className="text-bd-text-muted">·</span>
              <span className="text-bd-status-success-text">
                {poolSummary?.healthyCount ?? connections.filter((c) => c.healthStatus === 'healthy').length} healthy
              </span>
              {(poolSummary?.coolingDownCount ?? 0) > 0 && (
                <>
                  <span className="text-bd-text-muted">·</span>
                  <span className="text-bd-status-warning-text font-semibold">
                    {poolSummary?.coolingDownCount} cooling down
                  </span>
                </>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-bd-text-muted">
              <ShieldCheck size={11} className="text-emerald-500" />
              Atomic claim with bounded failover
            </p>
          </div>
        </div>

        {runtime.source === 'legacy' && (
          <p className="mt-3 rounded-lg border border-bd-status-info-border bg-bd-status-info-bg px-3 py-2 text-xs text-bd-status-info-text">
            Bolu is running on the legacy single-provider credential
            {runtime.provider ? ` (${runtime.provider})` : ''}. Add a connection and activate it to
            use multi-provider routing.
          </p>
        )}
        {runtime.source === 'environment' && (
          <p className="mt-3 rounded-lg border border-bd-status-info-border bg-bd-status-info-bg px-3 py-2 text-xs text-bd-status-info-text">
            Bolu is running on server environment configuration
            {runtime.provider ? ` (${runtime.provider})` : ''}. Add and activate a connection to
            manage providers from this console.
          </p>
        )}
        {runtime.source === 'unconfigured' && (
          <p className="mt-3 rounded-lg border border-bd-status-warning-border bg-bd-status-warning-bg px-3 py-2 text-xs text-bd-status-warning-text">
            Bolu has no active provider. Add a connection below and activate it, or configure
            server environment variables.
          </p>
        )}

        {/* Live Policy Explanation */}
        <p className="mt-3 text-[11px] leading-relaxed text-bd-text-muted border-t border-bd-border/60 pt-2.5">
          <span className="font-semibold text-bd-text">How Bolu Routes:</span> Inference requests atomically select the highest-priority enabled connection participating in the pool. If transient rate limits or provider outages occur, Bolu automatically fails over to the next eligible connection before streaming starts.
        </p>
      </div>

      {/* Saved Connections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-bd-text">
            Saved Connections {connections.length > 0 && <span className="text-bd-text-soft">({connections.length})</span>}
          </h3>
        </div>

        {connections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-bd-border bg-bd-surface p-8 text-center">
            <KeyRound size={24} className="mx-auto text-bd-text-soft" />
            <p className="mt-2 text-sm font-semibold text-bd-text">No connections yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-bd-text-muted">
              Add a provider connection from the curated catalogue below or connect a custom endpoint.
              Each account keeps its own encrypted credential and priority ranking.
            </p>
            <Button size="sm" className="mt-4" onClick={() => openCreate()}>
              <Plus size={14} /> Add your first connection
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                isPrimary={connection.id === routing.primaryConnectionId}
                diagnostics={diagnostics[connection.id] ?? null}
                onTest={handleTest}
                onDiscover={handleDiscover}
                onEdit={openEdit}
                onToggleEnabled={handleToggleEnabled}
                onTogglePool={handleTogglePool}
                onPriorityChange={handlePriorityChange}
                onSyncBalance={handleSyncBalance}
                onActivate={handleActivate}
                onDelete={handleDelete}
                onModelChange={handleModelChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Routing Activity (Collapsible) */}
      {routingEvents && routingEvents.length > 0 && (
        <Collapsible open={eventsOpen} onOpenChange={setEventsOpen} className="rounded-xl border border-bd-border bg-bd-surface p-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-bd-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-bd-text">
                Recent Routing Activity ({routingEvents.length})
              </h3>
            </div>
            <ChevronDown size={14} className={eventsOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-3 space-y-2 border-t border-bd-border pt-3">
            <div className="max-h-56 overflow-y-auto space-y-1.5 font-mono text-[11px]">
              {routingEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-bd-border/50 bg-bd-surface-muted px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] text-bd-text-muted">
                      {new Date(evt.created_at).toLocaleTimeString()}
                    </span>
                    <span className="font-semibold text-bd-text">{evt.event_type}</span>
                    {evt.provider_id && (
                      <span className="text-bd-text-muted">({evt.provider_id}/{evt.model_id})</span>
                    )}
                  </div>
                  {evt.reason_summary && (
                    <span className="truncate text-[10px] text-bd-text-muted max-w-[200px]" title={evt.reason_summary}>
                      {evt.reason_summary}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Provider Catalogue */}
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
                onClick={() => openCreate(p.id)}
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
              onClick={() => openCreate('custom')}
            >
              <Plus size={11} className="mr-1" /> Add
            </Button>
          </div>
        </div>
      </div>

      <ConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        connection={editing}
        initialProviderId={initialProviderId}
        schemaReady={schemaReady}
        onSaved={(connection) => void handleSaved(connection)}
      />
    </div>
  )
}

function RuntimeSourceBadge({ source }: { source: ProviderStatusResponse['runtime']['source'] }) {
  const config = {
    connection: {
      label: 'Connection vault',
      className: 'border-bd-status-success-border bg-bd-status-success-bg text-bd-status-success-text',
      icon: Zap,
    },
    legacy: {
      label: 'Legacy vault',
      className: 'border-bd-status-info-border bg-bd-status-info-bg text-bd-status-info-text',
      icon: Database,
    },
    environment: {
      label: 'Environment',
      className: 'border-bd-status-info-border bg-bd-status-info-bg text-bd-status-info-text',
      icon: Server,
    },
    unconfigured: {
      label: 'Unconfigured',
      className: 'border-bd-status-warning-border bg-bd-status-warning-bg text-bd-status-warning-text',
      icon: AlertTriangle,
    },
  }[source]
  const Icon = config.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        config.className,
      )}
    >
      <Icon size={11} /> {config.label}
    </span>
  )
}
import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Database,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { feedback } from '@/lib/feedback'
import { PROVIDER_CATALOGUE } from '@/lib/ai-assistant/provider-catalog'
import { cn } from '@/lib/utils'
import {
  boluProviderApi,
  type ProviderDiagnostics,
  type ProviderStatusResponse,
  type PublicConnection,
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
  const [routingBusy, setRoutingBusy] = useState(false)

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
      feedback.error(err instanceof Error ? err.message : 'Failed to update the connection.')
    }
  }

  async function handleActivate(id: string) {
    try {
      const result = await boluProviderApi.activate(id)
      setStatus((prev) => (prev ? { ...prev, routing: result.routing } : prev))
      feedback.success('Connection activated as primary.')
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

  async function handleRoutingChange(fallbackEnabled: boolean, fallbackConnectionIds: string[]) {
    setRoutingBusy(true)
    try {
      const result = await boluProviderApi.setRouting(fallbackEnabled, fallbackConnectionIds)
      setStatus((prev) => (prev ? { ...prev, routing: result.routing } : prev))
      feedback.success('Routing updated.')
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Failed to update routing.')
    } finally {
      setRoutingBusy(false)
    }
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

  const { connections, routing, runtime, schemaReady } = status
  const primary = routing.primaryConnectionId
    ? connections.find((c) => c.id === routing.primaryConnectionId) ?? null
    : null
  const fallbackCandidates = connections.filter(
    (c) => c.isEnabled && c.id !== routing.primaryConnectionId,
  )

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-base font-bold text-bd-text">
            <Sparkles size={16} className="text-bd-text-muted" />
            Bolu AI Provider Infrastructure
          </h2>
          <p className="max-w-xl text-xs leading-relaxed text-bd-text-muted">
            Platform-administrator control over the AI providers that power Bolu. Store multiple
            connections, verify credentials, discover models, and choose which connection serves
            live traffic. Credentials are encrypted at rest and never reach the browser.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void fetchStatus(false)} disabled={refreshing}>
            {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </Button>
          <Button size="sm" onClick={() => openCreate()} disabled={!schemaReady}>
            <Plus size={14} /> Add connection
          </Button>
        </div>
      </div>

      {/* Migration pending banner */}
      {!schemaReady && (
        <div className="flex items-start gap-3 rounded-xl border border-bd-status-warning-border bg-bd-status-warning-bg p-4">
          <Database size={16} className="mt-0.5 shrink-0 text-bd-status-warning-text" />
          <div className="space-y-1 text-xs text-bd-status-warning-text">
            <p className="font-semibold">Connection storage is not ready</p>
            <p className="opacity-90">
              Apply database migration <code className="font-mono">20261114170000_bolu_provider_connections.sql</code> to
              enable multi-connection management. Existing legacy credentials continue to work until then.
            </p>
          </div>
        </div>
      )}

      {/* Runtime panel */}
      <div className="rounded-xl border border-bd-border bg-bd-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-bd-text">Live runtime</h3>
          <RuntimeSourceBadge source={runtime.source} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-bd-border bg-bd-surface-muted px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-bd-text-soft">Active provider</p>
            {primary ? (
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-bd-text">
                <ProviderLogo providerId={primary.providerId} size={15} />
                {primary.name}
              </p>
            ) : (
              <p className="mt-1 text-sm font-medium text-bd-text">
                {runtime.provider ?? 'Not configured'}
              </p>
            )}
            <p className="mt-0.5 truncate font-mono text-[11px] text-bd-text-muted">
              {runtime.model ?? 'No model selected'}
            </p>
          </div>
          <div className="rounded-lg border border-bd-border bg-bd-surface-muted px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-bd-text-soft">Credential source</p>
            <p className="mt-1 text-sm font-medium text-bd-text">
              {runtime.source === 'connection'
                ? 'Encrypted connection vault'
                : runtime.source === 'legacy'
                  ? 'Legacy single-provider vault'
                  : runtime.source === 'environment'
                    ? 'Server environment variables'
                    : 'None'}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-bd-text-muted">
              <ShieldCheck size={11} /> Server-side decryption only
            </p>
          </div>
        </div>

        {runtime.source === 'legacy' && (
          <p className="mt-3 rounded-lg border border-bd-status-info-border bg-bd-status-info-bg px-3 py-2 text-xs text-bd-status-info-text">
            Bolu is running on the legacy single-provider credential
            {runtime.provider ? ` (${runtime.provider})` : ''}. Add a connection and activate it to
            use multi-provider routing. The legacy credential is preserved as a fallback.
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

        {/* Fallback routing */}
        {schemaReady && connections.length > 0 && (
          <div className="mt-4 border-t border-bd-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-bd-text">Automatic fallback</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-bd-text-muted">
                  Off by default. When enabled, Bolu retries only approved, enabled connections on
                  transient failures (rate limits, provider outages, network errors). Credential and
                  configuration errors are surfaced, never silently rerouted.
                </p>
              </div>
              <Switch
                checked={routing.fallbackEnabled}
                disabled={routingBusy || !routing.primaryConnectionId}
                onCheckedChange={(checked) =>
                  void handleRoutingChange(checked, routing.fallbackConnectionIds)
                }
                aria-label="Toggle automatic fallback"
              />
            </div>
            {routing.fallbackEnabled && (
              <div className="mt-3 space-y-1.5">
                {fallbackCandidates.length === 0 && (
                  <p className="text-[11px] text-bd-text-muted">
                    No other enabled connections available. Add or enable another connection to use fallback.
                  </p>
                )}
                {fallbackCandidates.map((c) => {
                  const checked = routing.fallbackConnectionIds.includes(c.id)
                  return (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-bd-border bg-bd-surface-muted px-3 py-2 text-xs text-bd-text"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={routingBusy}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...routing.fallbackConnectionIds, c.id]
                            : routing.fallbackConnectionIds.filter((id) => id !== c.id)
                          void handleRoutingChange(true, next)
                        }}
                        className="h-3.5 w-3.5 accent-[hsl(var(--bd-button-primary-bg))]"
                      />
                      <ProviderLogo providerId={c.providerId} size={14} />
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="ml-auto truncate font-mono text-[10px] text-bd-text-muted">{c.model}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Saved connections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-bd-text">
            Saved connections {connections.length > 0 && <span className="text-bd-text-soft">({connections.length})</span>}
          </h3>
        </div>

        {connections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-bd-border bg-bd-surface p-8 text-center">
            <KeyRound size={22} className="mx-auto text-bd-text-soft" />
            <p className="mt-2 text-sm font-medium text-bd-text">No connections yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-bd-text-muted">
              Add a provider connection from the catalogue below. Each connection keeps its own
              encrypted credential, so you can switch providers without re-entering keys.
            </p>
            <Button size="sm" className="mt-4" onClick={() => openCreate()} disabled={!schemaReady}>
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
                isFallback={routing.fallbackEnabled && routing.fallbackConnectionIds.includes(connection.id)}
                diagnostics={diagnostics[connection.id] ?? null}
                onTest={handleTest}
                onDiscover={handleDiscover}
                onEdit={openEdit}
                onToggleEnabled={handleToggleEnabled}
                onActivate={handleActivate}
                onDelete={handleDelete}
                onModelChange={handleModelChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Provider catalogue */}
      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-bd-text">Provider catalogue</h3>
          <p className="mt-0.5 text-[11px] text-bd-text-muted">
            Verified API contracts. Curated models are starting points — use live discovery for the
            authoritative list. No capability or pricing claims are made.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDER_CATALOGUE.map((p) => (
            <div
              key={p.id}
              className="flex flex-col rounded-xl border border-bd-border bg-bd-surface p-4"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-bd-border bg-bd-surface-muted">
                  <ProviderLogo providerId={p.id} size={16} />
                </div>
                <p className="truncate text-sm font-semibold text-bd-text">{p.name}</p>
              </div>
              <p className="mt-2 line-clamp-2 flex-1 text-[11px] leading-relaxed text-bd-text-muted">
                {p.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] text-bd-text-muted">
                  {p.protocol === 'anthropic' ? 'Anthropic' : 'OpenAI-compatible'}
                </Badge>
                <Badge variant="secondary" className="text-[10px] text-bd-text-muted">
                  {p.supportsDiscovery ? 'Model discovery' : 'Manual models'}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-7 w-full text-xs"
                disabled={!schemaReady}
                onClick={() => openCreate(p.id)}
              >
                <Plus size={12} /> Connect
              </Button>
            </div>
          ))}
          {/* Custom provider entry */}
          <div className="flex flex-col rounded-xl border border-dashed border-bd-border bg-bd-surface p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-bd-border bg-bd-surface-muted">
                <Server size={16} className="text-bd-text-muted" />
              </div>
              <p className="text-sm font-semibold text-bd-text">Custom endpoint</p>
            </div>
            <p className="mt-2 flex-1 text-[11px] leading-relaxed text-bd-text-muted">
              Any OpenAI-compatible or Anthropic-compatible endpoint. You control the base URL,
              protocol and authentication scheme. Endpoints are validated against internal-network
              access before use.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-7 w-full text-xs"
              disabled={!schemaReady}
              onClick={() => openCreate('custom')}
            >
              <Plus size={12} /> Connect custom
            </Button>
          </div>
        </div>
      </div>

      <ConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        connection={editing}
        initialProviderId={initialProviderId}
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
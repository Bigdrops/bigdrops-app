import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Layers,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Trash2,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getCatalogueEntry } from '@/lib/ai-assistant/provider-catalog'
import { cn } from '@/lib/utils'
import type { ProviderDiagnostics, PublicConnection } from './api'
import { DiagnosticsNote } from './DiagnosticsNote'
import { ProviderLogo } from './ProviderLogo'

type BusyAction =
  | 'test'
  | 'discover'
  | 'activate'
  | 'toggle'
  | 'pool'
  | 'priority'
  | 'balance'
  | 'delete'
  | null

type Props = {
  connection: PublicConnection
  isPrimary: boolean
  isFallback?: boolean
  diagnostics?: ProviderDiagnostics | null
  onTest: (id: string) => Promise<void>
  onDiscover: (id: string) => Promise<void>
  onEdit: (connection: PublicConnection) => void
  onToggleEnabled: (id: string, enabled: boolean) => Promise<void>
  onTogglePool: (id: string, inPool: boolean) => Promise<void>
  onPriorityChange: (id: string, priority: number) => Promise<void>
  onSyncBalance: (id: string) => Promise<void>
  onActivate: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onModelChange?: (id: string, model: string) => Promise<void>
}

export function ConnectionCard({
  connection,
  isPrimary,
  diagnostics,
  onTest,
  onDiscover,
  onEdit,
  onToggleEnabled,
  onTogglePool,
  onPriorityChange,
  onSyncBalance,
  onActivate,
  onDelete,
}: Props) {
  const [busy, setBusy] = useState<BusyAction>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const entry = getCatalogueEntry(connection.providerId)
  const providerName = entry?.name ?? 'Custom provider'

  async function run(action: Exclude<BusyAction, null>, fn: () => Promise<void>) {
    setBusy(action)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  // Health Status Badge
  const healthBadge = (() => {
    switch (connection.healthStatus) {
      case 'healthy':
        return (
          <Badge
            variant="secondary"
            className="gap-1 border-bd-status-success-border bg-bd-status-success-bg text-bd-status-success-text text-[10px]"
          >
            <CheckCircle2 size={11} /> Healthy
          </Badge>
        )
      case 'cooling_down':
        return (
          <Badge
            variant="secondary"
            className="gap-1 border-bd-status-warning-border bg-bd-status-warning-bg text-bd-status-warning-text text-[10px]"
          >
            <Clock size={11} /> Cooling down
          </Badge>
        )
      case 'exhausted':
        return (
          <Badge
            variant="secondary"
            className="gap-1 border-bd-status-warning-border bg-bd-status-warning-bg text-bd-status-warning-text text-[10px]"
          >
            <AlertCircle size={11} /> Quota exhausted
          </Badge>
        )
      case 'quarantined':
        return (
          <Badge
            variant="secondary"
            className="gap-1 border-bd-status-danger-border bg-bd-status-danger-bg text-bd-status-danger-text text-[10px]"
          >
            <ShieldAlert size={11} /> Quarantined
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="gap-1 text-bd-text-muted text-[10px]">
            <ShieldQuestion size={11} /> Unchecked
          </Badge>
        )
    }
  })()

  const supportsBalance = connection.providerId === 'openrouter' || connection.providerId === 'deepseek'

  return (
    <div
      className={cn(
        'rounded-xl border bg-bd-surface p-3.5 sm:p-4 transition-colors shadow-sm w-full min-w-0 overflow-hidden',
        isPrimary ? 'border-bd-border-strong ring-1 ring-bd-primary/20' : 'border-bd-border',
        !connection.isEnabled && 'opacity-65',
      )}
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 min-w-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-bd-border bg-bd-surface-muted">
            <ProviderLogo providerId={connection.providerId} size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-bd-text">{connection.name}</p>
            <p className="truncate text-[11px] text-bd-text-muted">
              {providerName} · {connection.protocol === 'anthropic' ? 'Anthropic' : 'OpenAI-compatible'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          {isPrimary && (
            <Badge
              variant="secondary"
              className="gap-1 border-bd-status-info-border bg-bd-status-info-bg text-bd-status-info-text text-[10px] shrink-0"
            >
              <Zap size={11} /> Primary
            </Badge>
          )}

          {connection.inPool ? (
            <Badge
              variant="secondary"
              className="gap-1 border-purple-500/20 bg-purple-500/10 text-purple-600 text-[10px] shrink-0"
            >
              <Layers size={10} /> Pool P{connection.priority}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-bd-text-muted text-[10px] shrink-0">
              Standby
            </Badge>
          )}

          {healthBadge}
        </div>
      </div>

      {/* Connection Endpoint & Details */}
      <div className="mt-3 space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-bd-text-muted min-w-0">
          <p className="truncate font-mono text-[10px] min-w-0 flex-1" title={connection.baseUrl}>
            {connection.maskedKey} · {connection.baseUrl}
          </p>
          <span className="font-mono text-[10px] shrink-0">{connection.timeoutMs / 1000}s timeout</span>
        </div>
      </div>

      {/* Telemetry & Balance Panel */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-bd-border/70 bg-bd-surface-muted/60 px-3 py-2 text-xs min-w-0">
        {/* Pool Participation & Priority Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-bd-text">
            <Switch
              size="sm"
              checked={connection.inPool}
              disabled={busy !== null}
              onCheckedChange={(checked) => void run('pool', () => onTogglePool(connection.id, checked))}
              aria-label="Toggle connection pool participation"
            />
            <span>Pool</span>
          </label>

          <div className="flex items-center gap-1 text-[11px] text-bd-text-muted">
            <span>Priority:</span>
            <span className="font-mono font-semibold text-bd-text">{connection.priority}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              disabled={busy !== null || connection.priority <= 1}
              onClick={() => void run('priority', () => onPriorityChange(connection.id, Math.max(1, connection.priority - 10)))}
              title="Increase priority rank (lower number)"
            >
              <ArrowUp size={11} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              disabled={busy !== null || connection.priority >= 990}
              onClick={() => void run('priority', () => onPriorityChange(connection.id, connection.priority + 10))}
              title="Decrease priority rank (higher number)"
            >
              <ArrowDown size={11} />
            </Button>
          </div>
        </div>

        {/* Balance or Traffic telemetry */}
        <div className="flex items-center gap-2 text-[11px] text-bd-text-muted">
          {connection.knownBalanceAmount !== null && (
            <span className="flex items-center gap-1 font-mono font-medium text-bd-text">
              <Coins size={12} className="text-amber-500" />
              {connection.knownBalanceAmount} {connection.knownBalanceCurrency}
            </span>
          )}

          {supportsBalance && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] text-bd-text-muted"
              disabled={busy !== null}
              onClick={() => void run('balance', () => onSyncBalance(connection.id))}
              title="Check upstream provider balance"
            >
              {busy === 'balance' ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
              <span className="ml-1">Sync</span>
            </Button>
          )}

          <span className="hidden sm:inline font-mono text-[10px] text-bd-text-soft">
            {connection.totalSuccessfulRequests}/{connection.totalRequestsStarted} reqs
          </span>

          {connection.consecutiveFailures > 0 && (
            <span className="font-semibold text-bd-status-danger-text text-[10px]">
              {connection.consecutiveFailures} fail
            </span>
          )}
        </div>
      </div>

      {/* Diagnostics / Error Note */}
      {diagnostics ? (
        <DiagnosticsNote diagnostics={diagnostics} className="mt-3" />
      ) : connection.verificationStatus === 'failed' && connection.lastTestMessage ? (
        <div className="mt-3 rounded-lg border border-bd-status-danger-border bg-bd-status-danger-bg px-3 py-2 text-xs text-bd-status-danger-text">
          <p className="break-words">{connection.lastTestMessage}</p>
        </div>
      ) : null}

      {/* Action Footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-bd-border pt-3 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={busy !== null}
            onClick={() => void run('test', () => onTest(connection.id))}
          >
            {busy === 'test' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Test
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={busy !== null || (!entry?.supportsDiscovery && connection.providerId !== 'custom')}
            onClick={() => void run('discover', () => onDiscover(connection.id))}
            title={entry?.supportsDiscovery === false ? 'No documented model-listing endpoint' : 'Refresh model list'}
          >
            {busy === 'discover' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Models
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={busy !== null}
            onClick={() => onEdit(connection)}
          >
            <Pencil size={12} /> Edit
          </Button>

          {!isPrimary && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-bd-text"
              disabled={busy !== null || !connection.isEnabled}
              onClick={() => void run('activate', () => onActivate(connection.id))}
              title={connection.isEnabled ? 'Set as primary connection' : 'Enable the connection first'}
            >
              {busy === 'activate' ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
              Set Primary
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
          <label className="flex items-center gap-1.5 text-[11px] text-bd-text-muted cursor-pointer select-none">
            <Switch
              size="sm"
              checked={connection.isEnabled}
              disabled={busy !== null}
              onCheckedChange={(checked) => void run('toggle', () => onToggleEnabled(connection.id, checked))}
              aria-label={connection.isEnabled ? 'Disable connection' : 'Enable connection'}
            />
            <span>{connection.isEnabled ? 'Enabled' : 'Disabled'}</span>
          </label>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-bd-text-muted hover:text-bd-status-danger-text"
            disabled={busy !== null}
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete connection"
          >
            {busy === 'delete' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={13} />}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this connection?</AlertDialogTitle>
            <AlertDialogDescription>
              “{connection.name}” and its stored credential will be permanently removed.
              {isPrimary &&
                ' It is currently marked as primary (priority 1). Bolu will route inference to remaining eligible connections in the pool according to their priority.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDelete(false)
                void run('delete', () => onDelete(connection.id))
              }}
            >
              Delete connection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  Loader2,
  Pencil,
  RefreshCw,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

type BusyAction = 'test' | 'discover' | 'activate' | 'toggle' | 'delete' | 'model' | null

type Props = {
  connection: PublicConnection
  isPrimary: boolean
  isFallback: boolean
  diagnostics?: ProviderDiagnostics | null
  onTest: (id: string) => Promise<void>
  onDiscover: (id: string) => Promise<void>
  onEdit: (connection: PublicConnection) => void
  onToggleEnabled: (id: string, enabled: boolean) => Promise<void>
  onActivate: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onModelChange: (id: string, model: string) => Promise<void>
}

export function ConnectionCard({
  connection,
  isPrimary,
  isFallback,
  diagnostics,
  onTest,
  onDiscover,
  onEdit,
  onToggleEnabled,
  onActivate,
  onDelete,
  onModelChange,
}: Props) {
  const [busy, setBusy] = useState<BusyAction>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const entry = getCatalogueEntry(connection.providerId)
  const providerName = entry?.name ?? 'Custom provider'

  const modelOptions = useMemo(() => {
    const seen = new Set<string>()
    const options: { id: string; label: string; source: string }[] = []
    const push = (id: string, label: string, source: string) => {
      if (!id || seen.has(id)) return
      seen.add(id)
      options.push({ id, label, source })
    }
    push(connection.model, connection.model, 'current')
    for (const m of entry?.curatedModels ?? []) push(m.id, m.label, 'curated')
    for (const m of connection.discoveredModels ?? []) push(m.id, m.label, 'live')
    return options
  }, [connection, entry])

  async function run(action: Exclude<BusyAction, null>, fn: () => Promise<void>) {
    setBusy(action)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  const verificationBadge =
    connection.verificationStatus === 'verified' ? (
      <Badge variant="secondary" className="gap-1 border-bd-status-success-border bg-bd-status-success-bg text-bd-status-success-text">
        <ShieldCheck size={11} /> Verified
      </Badge>
    ) : connection.verificationStatus === 'failed' ? (
      <Badge variant="secondary" className="gap-1 border-bd-status-danger-border bg-bd-status-danger-bg text-bd-status-danger-text">
        <ShieldAlert size={11} /> Test failed
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1 text-bd-text-muted">
        <ShieldQuestion size={11} /> Unverified
      </Badge>
    )

  return (
    <div
      className={cn(
        'rounded-xl border bg-bd-surface p-4 transition-colors',
        isPrimary ? 'border-bd-border-strong' : 'border-bd-border',
        !connection.isEnabled && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-bd-border bg-bd-surface-muted">
            <ProviderLogo providerId={connection.providerId} size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-bd-text">{connection.name}</p>
            <p className="truncate text-xs text-bd-text-muted">
              {providerName} · {connection.protocol === 'anthropic' ? 'Anthropic messages' : 'OpenAI-compatible'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {isPrimary && (
            <Badge variant="secondary" className="gap-1 border-bd-status-info-border bg-bd-status-info-bg text-bd-status-info-text">
              <Zap size={11} /> Primary
            </Badge>
          )}
          {isFallback && (
            <Badge variant="secondary" className="text-bd-text-muted">Fallback</Badge>
          )}
          {verificationBadge}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-1.5">
          <Select
            value={connection.model}
            onValueChange={(model) => {
              if (model !== connection.model) void run('model', () => onModelChange(connection.id, model))
            }}
            disabled={busy !== null}
          >
            <SelectTrigger className="h-8 w-full font-mono text-xs">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs">{m.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-bd-text-soft">{m.source}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="truncate font-mono text-[11px] text-bd-text-muted" title={connection.baseUrl}>
            {connection.maskedKey} · {connection.baseUrl}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-bd-text-muted">
          {busy === 'model' && <Loader2 size={13} className="animate-spin" />}
          <span>{connection.timeoutMs / 1000}s timeout</span>
        </div>
      </div>

      {diagnostics ? (
        <DiagnosticsNote diagnostics={diagnostics} className="mt-3" />
      ) : connection.verificationStatus === 'failed' && connection.lastTestMessage ? (
        <div className="mt-3 rounded-lg border border-bd-status-danger-border bg-bd-status-danger-bg px-3 py-2 text-xs text-bd-status-danger-text">
          <p className="break-words">{connection.lastTestMessage}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-bd-border pt-3">
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
            className="h-7 gap-1 text-xs"
            disabled={busy !== null || !connection.isEnabled}
            onClick={() => void run('activate', () => onActivate(connection.id))}
            title={connection.isEnabled ? 'Route Bolu through this connection' : 'Enable the connection first'}
          >
            {busy === 'activate' ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            Activate
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-bd-text-muted">
            <Switch
              size="sm"
              checked={connection.isEnabled}
              disabled={busy !== null}
              onCheckedChange={(checked) => void run('toggle', () => onToggleEnabled(connection.id, checked))}
              aria-label={connection.isEnabled ? 'Disable connection' : 'Enable connection'}
            />
            {connection.isEnabled ? 'Enabled' : 'Disabled'}
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
              {isPrimary && ' It is the active primary connection — Bolu will fall back to the legacy or environment configuration until another connection is activated.'}
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
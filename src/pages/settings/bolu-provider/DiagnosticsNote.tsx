import { AlertTriangle, CheckCircle2, Clock, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProviderDiagnostics } from './api'

const CATEGORY_LABELS: Record<string, string> = {
  ok: 'Verified',
  provider_auth: 'Credential rejected',
  provider_rate_limit: 'Rate limited',
  provider_not_found: 'Model or endpoint not found',
  provider_bad_request: 'Invalid request',
  provider_server: 'Provider unavailable',
  network: 'Network error',
  timeout: 'Timed out',
  unknown: 'Diagnostic',
}

export function DiagnosticsNote({
  diagnostics,
  className,
}: {
  diagnostics: ProviderDiagnostics
  className?: string
}) {
  const tone = diagnostics.ok
    ? 'border-bd-status-success-border bg-bd-status-success-bg text-bd-status-success-text'
    : diagnostics.category === 'provider_rate_limit' || diagnostics.category === 'timeout'
      ? 'border-bd-status-warning-border bg-bd-status-warning-bg text-bd-status-warning-text'
      : diagnostics.category === 'provider_auth' || diagnostics.category === 'provider_not_found'
        ? 'border-bd-status-danger-border bg-bd-status-danger-bg text-bd-status-danger-text'
        : 'border-bd-status-info-border bg-bd-status-info-bg text-bd-status-info-text'

  const Icon = diagnostics.ok
    ? CheckCircle2
    : diagnostics.category === 'provider_rate_limit' || diagnostics.category === 'timeout'
      ? Clock
      : diagnostics.category === 'network' || diagnostics.category === 'provider_server'
        ? AlertTriangle
        : diagnostics.ok
          ? Info
          : XCircle

  return (
    <div className={cn('rounded-lg border px-3 py-2.5 text-xs', tone, className)}>
      <div className="flex items-start gap-2">
        <Icon size={14} className="mt-0.5 shrink-0" />
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">
            {CATEGORY_LABELS[diagnostics.category] ?? 'Diagnostic'}
            {diagnostics.latencyMs > 0 && (
              <span className="ml-2 font-normal opacity-70">{diagnostics.latencyMs} ms</span>
            )}
            {diagnostics.retryAfterSeconds !== undefined && (
              <span className="ml-2 font-normal opacity-70">retry in ~{diagnostics.retryAfterSeconds}s</span>
            )}
          </p>
          <p className="break-words opacity-90">{diagnostics.message}</p>
          {!diagnostics.ok && diagnostics.suggestedAction && (
            <p className="break-words opacity-75">{diagnostics.suggestedAction}</p>
          )}
        </div>
      </div>
    </div>
  )
}
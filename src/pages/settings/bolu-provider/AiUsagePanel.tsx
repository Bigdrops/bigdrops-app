/**
 * AiUsagePanel — AI consumption totals and the per-user leaderboard.
 *
 * Platform administrators only. The panel is collapsed by default and fetches
 * nothing until it is opened, so it costs no request and no render time in the
 * normal settings view.
 */

import { useCallback, useEffect, useState } from 'react'
import { Activity, ChevronDown, Loader2, Trophy } from 'lucide-react'

import { supabase } from '@/supabase'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'

type LeaderboardRow = {
  user_id: string
  user_label: string
  requests: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number | null
  unknown_cost_rows: number
  tenants: number
  last_seen: string
}

type ProviderRow = {
  provider_id: string
  model_id: string
  requests: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number | null
}

type DayRow = {
  day: string
  requests: number
  total_tokens: number
  cost_usd: number | null
}

type UsageTotals = {
  requests: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
  unknownCostRows: number
  estimatedRows: number
  unavailableRows: number
  failedRequests: number
  distinctUsers: number
}

type UsageSummary = {
  totals: UsageTotals
  leaderboard: LeaderboardRow[]
  byDay: DayRow[]
  byProvider: ProviderRow[]
}

const WINDOW_DAYS = 30

export function AiUsagePanel() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<UsageSummary | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Sign in to view AI usage.')
        return
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/ai-usage?days=${WINDOW_DAYS}&limit=25`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const payload = await res.json().catch(() => null) as
        { ok?: boolean; summary?: UsageSummary; error?: string } | null
      if (!res.ok || !payload?.ok || !payload.summary) {
        setError(payload?.error || 'AI usage is not available yet.')
        return
      }
      setSummary(payload.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI usage could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && !summary && !loading) void load()
  }, [open, summary, loading, load])

  const totals = summary?.totals
  const hasData = (totals?.requests ?? 0) > 0

  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && !summary && !loading) void load()
      }}
      className="rounded-xl border border-bd-border bg-bd-surface p-4"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
        <div className="flex items-center gap-2">
          <Trophy size={15} className="text-bd-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-bd-text">AI Usage &amp; Leaderboard</h3>
          {hasData && (
            <span className="text-[10px] text-bd-text-muted">
              {totals?.requests} req · {formatTokens(totals?.totalTokens ?? 0)} tok · {totals?.distinctUsers} users
            </span>
          )}
        </div>
        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-3 border-t border-bd-border pt-3">
        {loading && (
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        )}

        {!loading && error && (
          <p className="text-[11px] text-bd-text-muted">{error}</p>
        )}

        {!loading && !error && summary && !hasData && (
          <p className="text-[11px] text-bd-text-muted">
            No AI requests recorded in the last {WINDOW_DAYS} days.
          </p>
        )}

        {!loading && !error && summary && hasData && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Requests" value={String(totals?.requests ?? 0)} />
              <Stat label="Tokens" value={formatTokens(totals?.totalTokens ?? 0)} />
              <Stat label="Cost (USD)" value={formatCost(totals?.costUsd ?? 0, totals?.unknownCostRows ?? 0)} />
              <Stat label="Failed" value={String(totals?.failedRequests ?? 0)} />
            </div>

            {summary.byDay.length > 0 && (
              <div className="rounded-lg border border-bd-border/60 bg-bd-surface-muted p-2.5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">
                  Daily consumption
                </p>
                <div className="flex h-16 items-end gap-1">
                  {summary.byDay.slice(-30).map((day) => {
                    const max = Math.max(...summary.byDay.map((d) => d.total_tokens), 1)
                    const height = Math.max(2, Math.round((day.total_tokens / max) * 100))
                    return (
                      <div
                        key={day.day}
                        className="flex-1 rounded-sm bg-bd-primary/60"
                        style={{ height: `${height}%` }}
                        title={`${day.day}: ${day.requests} req, ${formatTokens(day.total_tokens)} tok`}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">
                Leaderboard by user
              </p>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {summary.leaderboard.map((row, index) => (
                  <div
                    key={row.user_id}
                    className="flex items-center justify-between gap-2 rounded-md border border-bd-border/50 bg-bd-surface-muted px-2.5 py-1.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-4 shrink-0 text-[10px] font-bold text-bd-text-muted">{index + 1}</span>
                      <span className="truncate text-[11px] font-semibold text-bd-text" title={row.user_label}>
                        {row.user_label}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-[10px] text-bd-text-muted">
                      <span>{row.requests} req</span>
                      <span className="font-mono">{formatTokens(row.total_tokens)} tok</span>
                      <span className="font-mono">{formatCost(row.cost_usd ?? 0, row.unknown_cost_rows)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {summary.byProvider.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">
                  By provider and model
                </p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {summary.byProvider.map((row) => (
                    <div
                      key={`${row.provider_id}:${row.model_id}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-bd-border/50 bg-bd-surface-muted px-2.5 py-1.5 text-[10px]"
                    >
                      <span className="truncate font-mono text-bd-text">
                        {row.provider_id}/{row.model_id}
                      </span>
                      <span className="flex shrink-0 gap-3 text-bd-text-muted">
                        <span>{row.requests} req</span>
                        <span className="font-mono">{formatTokens(row.total_tokens)} tok</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="flex items-center gap-1 text-[10px] text-bd-text-muted">
              <Activity size={10} aria-hidden="true" />
              {totals?.estimatedRows ?? 0} estimated · {totals?.unavailableRows ?? 0} uncounted · {totals?.unknownCostRows ?? 0}{' '}
              at unknown price
            </p>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-bd-border/60 bg-bd-surface-muted px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wider text-bd-text-muted">{label}</p>
      <p className="font-mono text-sm font-semibold text-bd-text">{value}</p>
    </div>
  )
}

export function formatTokens(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(Math.round(value))
}

export function formatCost(value: number | null, unknownRows: number): string {
  if (value === null || value === undefined) return '—'
  if (unknownRows > 0) return `$${value.toFixed(4)}+`
  return `$${value.toFixed(4)}`
}

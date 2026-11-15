/**
 * AI usage reporting (server-only).
 *
 * Returns the AI consumption ledger: totals, the per-user leaderboard, a daily
 * series and a provider breakdown.
 *
 * Authorization
 *   The ledger holds tenant and user activity. Only platform administrators
 *   may read it. Workspace owners and workspace administrators are rejected.
 *   The underlying table is denied to every browser role by Row-Level
 *   Security, so this route is the only way to read it.
 *
 * Usage:
 *   GET /api/ai-usage?days=30&limit=25
 */

import { verifyPlatformAdmin } from '../src/lib/ai-assistant/bolu-auth.js'

function jsonError(message: string, status: number, code?: string) {
  return Response.json(code ? { error: message, code } : { error: message }, { status })
}

export async function GET(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonError('Method not allowed.', 405, 'invalid_request')
  }

  const auth = await verifyPlatformAdmin(request)
  if ('error' in auth) {
    const message =
      auth.status === 403
        ? 'Platform administrator authorization required to view AI usage.'
        : auth.error
    return jsonError(message, auth.status, auth.code)
  }

  const { adminClient } = auth

  const url = new URL(request.url)
  const days = clampInt(url.searchParams.get('days'), 30, 1, 365)
  const limit = clampInt(url.searchParams.get('limit'), 25, 1, 200)

  try {
    const { data, error } = await adminClient.rpc('app_ai_usage_summary', {
      p_days: days,
      p_limit: limit,
    })
    if (error) {
      console.error('[ai-usage] summary failed:', error.message)
      return jsonError(
        'The AI usage summary is not available. Apply migration 20261115170000_bolu_usage_ledger.sql.',
        503,
        'usage_unavailable',
      )
    }

    return Response.json({ ok: true, days, limit, summary: data })
  } catch (err) {
    console.error('[ai-usage] summary threw:', err instanceof Error ? err.message : err)
    return jsonError('The AI usage summary could not be read.', 503, 'usage_unavailable')
  }
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

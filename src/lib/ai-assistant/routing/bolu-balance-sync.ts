/**
 * Bolu AI Routing Subsystem — Balance Synchronization
 *
 * Safe, non-blocking upstream balance inquiry boundary for verified providers.
 *
 * Supported verified integrations:
 * - OpenRouter: GET https://openrouter.ai/api/v1/credits (Bearer token)
 * - DeepSeek: GET https://api.deepseek.com/user/balance (Bearer token)
 *
 * All other providers or unverified configurations safely default to:
 * balance_source = 'unsupported', known_balance_usd = null.
 *
 * Security: Never blocks chat inference. Runs with short timeouts (5s max).
 * Never leaks API keys or throws unhandled errors.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type BalanceSyncResult = {
  supported: boolean
  balanceAmount?: number | null
  balanceUsd: number | null
  currency?: string
  source: 'api' | 'unsupported'
  updatedAt: string
  error?: string
}

const SYNC_TIMEOUT_MS = 5000

/**
 * Queries the upstream provider balance if supported.
 * Fails safely and returns balance_source = 'unsupported' when not supported or on failure.
 */
export async function checkUpstreamBalance(
  providerId: string,
  apiKey: string,
  baseUrl?: string,
): Promise<BalanceSyncResult> {
  const normProvider = providerId?.trim().toLowerCase()
  const key = apiKey?.trim()
  const now = new Date().toISOString()

  if (!normProvider || !key) {
    return {
      supported: false,
      balanceUsd: null,
      source: 'unsupported',
      updatedAt: now,
      error: 'Missing provider ID or API key.',
    }
  }

  // 1. OpenRouter Credits API
  if (normProvider === 'openrouter') {
    const endpoint = (baseUrl?.replace(/\/+$/, '') || 'https://openrouter.ai/api/v1') + '/credits'
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS)

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': 'https://bourxe.com',
          'X-Title': 'BOURXE Bolu',
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) {
        return {
          supported: true,
          balanceUsd: null,
          source: 'unsupported',
          updatedAt: now,
          error: `OpenRouter returned HTTP ${res.status}`,
        }
      }

      const body = await res.json() as { data?: { total_credits?: number; total_usage?: number } }
      if (body?.data && typeof body.data.total_credits === 'number') {
        const totalCredits = body.data.total_credits
        const totalUsage = typeof body.data.total_usage === 'number' ? body.data.total_usage : 0
        const remaining = Math.max(0, totalCredits - totalUsage)
        return {
          supported: true,
          balanceAmount: Number(remaining.toFixed(4)),
          balanceUsd: Number(remaining.toFixed(4)),
          currency: 'USD',
          source: 'api',
          updatedAt: now,
        }
      }
    } catch (err) {
      clearTimeout(timeout)
      return {
        supported: true,
        balanceUsd: null,
        source: 'unsupported',
        updatedAt: now,
        error: err instanceof Error ? err.message : 'OpenRouter balance inquiry failed.',
      }
    }
  }

  // 2. DeepSeek Balance API
  if (normProvider === 'deepseek') {
    const base = baseUrl?.replace(/\/+$/, '') || 'https://api.deepseek.com'
    const endpoint = (base.endsWith('/v1') ? base.slice(0, -3) : base) + '/user/balance'
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS)

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) {
        return {
          supported: true,
          balanceUsd: null,
          source: 'unsupported',
          updatedAt: now,
          error: `DeepSeek returned HTTP ${res.status}`,
        }
      }

      const body = await res.json() as {
        is_available?: boolean
        balance_infos?: Array<{
          currency?: string
          total_balance?: string
        }>
      }

      if (body?.balance_infos && Array.isArray(body.balance_infos) && body.balance_infos.length > 0) {
        const primary = body.balance_infos[0]
        const currency = (primary.currency || 'USD').toUpperCase()
        const total = parseFloat(primary.total_balance || '0')
        const validTotal = Number.isFinite(total) ? Number(total.toFixed(4)) : null

        if (currency !== 'USD') {
          return {
            supported: true,
            balanceAmount: validTotal,
            balanceUsd: null,
            currency,
            source: 'unsupported',
            updatedAt: now,
            error: `DeepSeek returned a ${currency} balance; USD normalization is not configured.`,
          }
        }

        return {
          supported: true,
          balanceAmount: validTotal,
          balanceUsd: validTotal,
          currency,
          source: 'api',
          updatedAt: now,
        }
      }

      return {
        supported: true,
        balanceUsd: null,
        source: 'unsupported',
        updatedAt: now,
        error: 'DeepSeek response did not contain balance_infos.',
      }
    } catch (err) {
      clearTimeout(timeout)
      return {
        supported: true,
        balanceUsd: null,
        source: 'unsupported',
        updatedAt: now,
        error: err instanceof Error ? err.message : 'DeepSeek balance inquiry failed.',
      }
    }
  }

  // All other providers (AMD Token Factory, OpenAI, Anthropic, Custom):
  // Upstream automated balance check is unsupported or unverified.
  return {
    supported: false,
    balanceUsd: null,
    source: 'unsupported',
    updatedAt: now,
  }
}

/**
 * Updates a connection's balance telemetry in the database.
 * Run asynchronously in maintenance or setup routines; never blocks inference requests.
 */
export async function syncConnectionBalance(
  adminClient: SupabaseClient,
  connectionId: string,
  providerId: string,
  apiKey: string,
  baseUrl?: string,
): Promise<BalanceSyncResult> {
  const result = await checkUpstreamBalance(providerId, apiKey, baseUrl)
  const isUsd = (result.currency || 'USD').toUpperCase() === 'USD'

  const { error } = await adminClient
    .from('app_ai_provider_connections')
    .update({
      known_balance_amount: result.balanceAmount ?? result.balanceUsd,
      known_balance_currency: result.currency || 'USD',
      known_balance_usd: isUsd ? (result.balanceAmount ?? result.balanceUsd) : null,
      balance_source: result.source,
      balance_updated_at: result.updatedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)

  if (error) {
    console.error(`[bolu-balance-sync] Failed to update balance for ${connectionId}:`, error.message)
  }

  return result
}

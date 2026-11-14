/**
 * Server-side security guards for the Bolu provider subsystem.
 *
 * - SSRF protection for custom provider endpoints (scheme, userinfo, private
 *   and internal destinations, DNS resolution, redirect refusal).
 * - Sliding-window rate limiting for connection tests and model discovery.
 * - Strict input validation for protocols, auth schemes and bounded fields.
 *
 * Node-only. Never import this module from browser code.
 */

import net from 'node:net'
import dns from 'node:dns/promises'
import type { ProviderAuthScheme, ProviderProtocol } from './provider-catalog'

export type EndpointValidation =
  | { ok: true; url: string }
  | { ok: false; error: string }

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata',
  'metadata.google.internal',
  'instance-data',
  'metadata.azure.internal',
])

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home', '.corp']

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return true
  const [a, b] = parts
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 192 && b === 0) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a >= 224) return true
  return false
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIPv4(mapped[1])
  return false
}

export function isPrivateAddress(ip: string): boolean {
  const version = net.isIP(ip)
  if (version === 4) return isPrivateIPv4(ip)
  if (version === 6) return isPrivateIPv6(ip)
  return true
}

/**
 * Pure syntactic + literal-address validation. No network access, so it is
 * safe to unit test. DNS resolution is checked separately before any fetch.
 */
export function validateEndpointSyntax(raw: string): EndpointValidation {
  const trimmed = raw?.trim()
  if (!trimmed) return { ok: false, error: 'Endpoint URL is required.' }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, error: 'Endpoint must be a valid absolute URL.' }
  }

  if (url.protocol !== 'https:') {
    return { ok: false, error: 'Endpoint must use https. Insecure schemes are not allowed.' }
  }
  if (url.username || url.password) {
    return { ok: false, error: 'Endpoint must not embed credentials in the URL.' }
  }

  const host = url.hostname.toLowerCase()
  if (!host) return { ok: false, error: 'Endpoint must include a hostname.' }
  if (BLOCKED_HOSTNAMES.has(host) || BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return { ok: false, error: 'Endpoint must not target localhost or internal network names.' }
  }
  if (net.isIP(host) && isPrivateAddress(host)) {
    return { ok: false, error: 'Endpoint must not target private or internal network addresses.' }
  }

  return { ok: true, url: url.toString() }
}

/**
 * Resolves the endpoint hostname and rejects private/internal answers.
 * Run before any outbound provider request to mitigate DNS-based SSRF.
 */
export async function assertEndpointResolvesSafe(rawUrl: string): Promise<EndpointValidation> {
  const syntax = validateEndpointSyntax(rawUrl)
  if (!syntax.ok) return syntax

  const host = new URL(syntax.url).hostname
  if (net.isIP(host)) return syntax

  try {
    const addresses = await dns.lookup(host, { all: true })
    if (addresses.length === 0) {
      return { ok: false, error: 'Endpoint hostname did not resolve to any address.' }
    }
    if (addresses.some((entry) => isPrivateAddress(entry.address))) {
      return { ok: false, error: 'Endpoint resolves to a private or internal network address.' }
    }
  } catch {
    return { ok: false, error: 'Endpoint hostname could not be resolved. Check the URL.' }
  }

  return syntax
}

/**
 * Outbound fetch for provider requests. Refuses redirects so a provider cannot
 * bounce the request to an internal destination (redirect-based SSRF).
 */
export function safeProviderFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, redirect: 'error' })
}

const rateBuckets = new Map<string, number[]>()
const MAX_RATE_BUCKETS = 5000

export type RateLimitResult = { allowed: boolean; retryAfterMs: number }

/** In-memory sliding window. Per serverless instance; resets on cold start. */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const hits = (rateBuckets.get(key) ?? []).filter((t) => now - t < windowMs)

  if (hits.length >= limit) {
    const retryAfterMs = windowMs - (now - hits[0])
    rateBuckets.set(key, hits)
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) }
  }

  hits.push(now)
  rateBuckets.set(key, hits)

  if (rateBuckets.size > MAX_RATE_BUCKETS) {
    const oldestKey = rateBuckets.keys().next().value
    if (oldestKey !== undefined) rateBuckets.delete(oldestKey)
  }

  return { allowed: true, retryAfterMs: 0 }
}

export function resetRateLimits(): void {
  rateBuckets.clear()
}

export function isProtocol(value: unknown): value is ProviderProtocol {
  return value === 'openai' || value === 'anthropic'
}

export function isAuthScheme(value: unknown): value is ProviderAuthScheme {
  return value === 'bearer' || value === 'x-api-key'
}

export function clampTimeout(value: unknown, fallback = 45000): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(120000, Math.max(5000, Math.round(parsed)))
}

export function sanitizeConnectionName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed || trimmed.length > 80) return null
  return trimmed
}

export function sanitizeModelId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 200 || /[\s<>"]/.test(trimmed)) return null
  return trimmed
}
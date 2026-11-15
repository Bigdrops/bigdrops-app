/**
 * Server-side authorization for global Bolu AI infrastructure.
 *
 * Global provider configuration is restricted to platform administrators:
 *   - profiles.role === 'admin' (platform admin), OR
 *   - an active platform_operators entry with role 'owner'.
 *
 * Workspace owners and workspace administrators are NOT authorized to modify
 * global provider infrastructure. Errors are categorized so the API can return
 * actionable diagnostics without exposing secrets.
 *
 * Node-only. Never import from browser code.
 */

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

export type AuthErrorCode =
  | 'server_config_missing'
  | 'authentication_required'
  | 'invalid_session'
  | 'forbidden'
  | 'auth_check_failed'

export type AuthFailure = {
  ok: false
  status: number
  code: AuthErrorCode
  error: string
}

export type AuthSuccess = {
  ok: true
  user: User
  adminClient: SupabaseClient
}

export type AuthResult = AuthSuccess | AuthFailure

/**
 * Generic request interface supporting both Web API Fetch Requests and
 * Node.js / Vercel Serverless Requests (IncomingMessage / VercelRequest).
 */
export interface RequestLike {
  headers?:
    | Headers
    | Record<string, string | string[] | undefined>
    | { get?: (name: string) => string | null | undefined }
    | null
  [key: string]: unknown
}

export type SupportedRequest = Request | RequestLike | unknown

/**
 * Safely extracts a header from either a Web API Request (Fetch standard)
 * or a Node.js / Vercel serverless request (IncomingMessage / VercelRequest).
 *
 * Checks if request.headers?.get is a function first; if false, performs
 * case-insensitive dictionary lookup on request.headers.
 */
export function getRequestHeader(request: SupportedRequest, name: string): string | null {
  if (!request || typeof request !== 'object') return null

  const req = request as RequestLike
  const headers = req.headers
  if (!headers || (typeof headers !== 'object' && typeof headers !== 'function')) return null

  const target = name.toLowerCase()

  // 1. Web API Headers instance or object with .get() method
  if (typeof (headers as { get?: unknown }).get === 'function') {
    try {
      const getFn = (headers as { get: (n: string) => string | null | undefined }).get
      const val = getFn.call(headers, target) ?? getFn.call(headers, name)
      return typeof val === 'string' && val.length > 0 ? val : null
    } catch {
      // Fall through to dictionary lookup if .get throws
    }
  }

  // 2. Node.js IncomingHttpHeaders dictionary lookup
  if (typeof headers === 'object' && headers !== null) {
    const dict = headers as Record<string, unknown>
    const direct = dict[target] ?? dict[name]
    if (typeof direct === 'string' && direct.length > 0) return direct
    if (Array.isArray(direct) && typeof direct[0] === 'string' && direct[0].length > 0) return direct[0]

    // Case-insensitive key scan fallback
    for (const key of Object.keys(dict)) {
      if (key.toLowerCase() === target) {
        const val = dict[key]
        if (typeof val === 'string' && val.length > 0) return val
        if (Array.isArray(val) && typeof val[0] === 'string' && val[0].length > 0) return val[0]
      }
    }
  }

  return null
}

export function getAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !serviceKey) {
    const missing = [!url && 'SUPABASE_URL', !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY']
      .filter(Boolean)
      .join(', ')
    const err = new Error(`Server configuration missing: ${missing}.`)
    err.name = 'ServerConfigMissingError'
    throw err
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function failure(status: number, code: AuthErrorCode, error: string): AuthFailure {
  return { ok: false, status, code, error }
}

async function isPlatformAdmin(adminClient: SupabaseClient, userId: string): Promise<boolean> {
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role === 'admin') return true

  const { data: operator } = await adminClient
    .from('platform_operators')
    .select('role, expires_at')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .maybeSingle()

  if (!operator) return false
  if (operator.expires_at && new Date(operator.expires_at).getTime() <= Date.now()) return false
  return true
}

export async function verifyPlatformAdmin(request: SupportedRequest): Promise<AuthResult> {
  const authHeader = getRequestHeader(request, 'authorization')
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) {
    return failure(401, 'authentication_required', 'Authentication required. Sign in to manage Bolu infrastructure.')
  }

  let adminClient: SupabaseClient
  try {
    adminClient = getAdminClient()
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Server configuration missing.'
    return failure(500, 'server_config_missing', `${detail} Configure the server environment variables and retry.`)
  }

  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    return failure(401, 'invalid_session', 'Invalid or expired session. Sign in again.')
  }

  try {
    const authorized = await isPlatformAdmin(adminClient, user.id)
    if (!authorized) {
      return failure(
        403,
        'forbidden',
        'Platform administrator authorization required. Workspace owners and administrators cannot modify global Bolu infrastructure.',
      )
    }
  } catch {
    return failure(500, 'auth_check_failed', 'Authorization check failed. Retry shortly.')
  }

  return { ok: true, user, adminClient }
}
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const REQUEST_TIMEOUT_MS = 20000
const RETRY_DELAY_MS = 750
const RETRYABLE_METHODS = new Set(['GET', 'HEAD'])

function parseJwtPayload(token: string | null | undefined): Record<string, unknown> | null {
  try {
    const [, payload] = String(token || '').split('.')
    if (!payload) return null

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
    return JSON.parse(atob(normalized + padding)) as Record<string, unknown>
  } catch {
    return null
  }
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

const supabaseRole = parseJwtPayload(supabaseKey)?.role
if (supabaseRole === 'service_role') {
  throw new Error('Refusing to initialize Supabase in the frontend with a service_role key.')
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableFetchError(error: unknown): boolean {
  const name = String((error as { name?: string })?.name || '')
  const message = String((error as { message?: string })?.message || '')

  if (name === 'AbortError' || name === 'TimeoutError') return true

  return /failed to fetch|networkerror|load failed|network request failed/i.test(message)
}

function getRequestMethod(init?: RequestInit): string {
  return String(init?.method || 'GET').toUpperCase()
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function isAuthRefreshRequest(input: RequestInfo | URL): boolean {
  const url = getRequestUrl(input)
  return /\/auth\/v1\/token\b/i.test(url)
}

function shouldRetryRequest(input: RequestInfo | URL, init: RequestInit | undefined, error: unknown): boolean {
  const method = getRequestMethod(init)

  if (!isRetryableFetchError(error)) return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false

  if (RETRYABLE_METHODS.has(method)) return true

  // Very narrow exception:
  // allow retry for Supabase auth token refresh/revalidation requests.
  if (method === 'POST' && isAuthRefreshRequest(input)) return true

  return false
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const runAttempt = async (): Promise<Response> => {
    const controller = new AbortController()
    const upstreamSignal = init.signal
    let timeoutId: number | null = null

    const abortFromUpstream = () => controller.abort(upstreamSignal?.reason)

    if (upstreamSignal) {
      if (upstreamSignal.aborted) {
        controller.abort(upstreamSignal.reason)
      } else {
        upstreamSignal.addEventListener('abort', abortFromUpstream, { once: true })
      }
    }

    timeoutId = window.setTimeout(() => {
      controller.abort(new DOMException('Supabase request timed out', 'TimeoutError'))
    }, REQUEST_TIMEOUT_MS)

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      })
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      if (upstreamSignal) upstreamSignal.removeEventListener('abort', abortFromUpstream)
    }
  }

  try {
    return await runAttempt()
  } catch (error) {
    if (!shouldRetryRequest(input, init, error)) {
      throw error
    }

    await delay(RETRY_DELAY_MS)
    return runAttempt()
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
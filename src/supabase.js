import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const REQUEST_TIMEOUT_MS = 20000
const RETRY_DELAY_MS = 750
const RETRYABLE_METHODS = new Set(['GET', 'HEAD'])

function parseJwtPayload(token) {
  try {
    const [, payload] = String(token || '').split('.')
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(normalized))
  } catch {
    return null
  }
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

const supabaseRole = parseJwtPayload(supabaseKey)?.role
if (supabaseRole === 'service_role') {
  throw new Error('Refusing to initialize Supabase in the frontend with a service_role key.')
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableFetchError(error) {
  const name = String(error?.name || '')
  const message = String(error?.message || '')
  if (name === 'AbortError' || name === 'TimeoutError') return true
  return /failed to fetch|networkerror|load failed|network request failed/i.test(message)
}

function getRequestMethod(init) {
  return String(init?.method || 'GET').toUpperCase()
}

async function fetchWithTimeout(input, init = {}) {
  const runAttempt = async () => {
    const controller = new AbortController()
    const signal = init.signal
    let timeoutId = null

    const abortFromUpstream = () => controller.abort(signal?.reason)
    if (signal) {
      if (signal.aborted) {
        controller.abort(signal.reason)
      } else {
        signal.addEventListener('abort', abortFromUpstream, { once: true })
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
      if (signal) signal.removeEventListener('abort', abortFromUpstream)
    }
  }

  try {
    return await runAttempt()
  } catch (error) {
    const requestMethod = getRequestMethod(init)
    const canRetry =
      RETRYABLE_METHODS.has(requestMethod) &&
      isRetryableFetchError(error) &&
      !(typeof navigator !== 'undefined' && navigator.onLine === false)

    if (!canRetry) {
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
  },
})

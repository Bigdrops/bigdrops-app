/**
 * Sentry Frontend Error Monitoring Configuration
 *
 * Implements privacy-hardened, minimal error monitoring for the BOUXRE React application.
 *
 * Privacy & Security Guardrails:
 * - Session Replay is permanently disabled.
 * - Performance tracing is disabled (tracesSampleRate: 0).
 * - Automatic Console breadcrumbs are disabled (console logs never leave the browser).
 * - Navigation and fetch/XHR URLs have query strings and sensitive resource IDs sanitized.
 * - Fail-closed recursive scrubber with circular reference protection and depth cutoff.
 * - Normalized token-based key detection protects commercial, banking, client, and AI fields.
 * - False-positive controls prevent accidental redaction of technical keys (e.g. keyboardLayout, apiVersion).
 * - Comprehensive scrubbing of event.contexts, event.extra, event.user, and exception values.
 */

import * as Sentry from '@sentry/react'

/** Regex patterns for redacting sensitive tokens, credentials, and identifiers */
const JWT_REGEX = /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g
const SUPABASE_BEARER_REGEX = /Bearer\s+[A-Za-z0-9\-_=.]+/gi
const API_KEY_REGEX = /\b(sk-[a-zA-Z0-9_-]{16,}|AIza[0-9A-Za-z-_]{30,}|gsk_[a-zA-Z0-9_-]{16,}|rc-[a-zA-Z0-9_-]{16,})\b/g
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const NIGERIAN_PHONE_REGEX = /(?:\+?234|0)[789][01]\d{8}/g
const DOC_NUMBER_REGEX = /\b(INV|QTN|PO|CSR|WAY|REC|RFQ)-[A-Za-z0-9_-]+\b/gi
const TENANT_SCHEMA_REGEX = /\btenant_[a-zA-Z0-9_-]+\b/gi
const UUID_REGEX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
const CURRENCY_AMOUNT_REGEX = /(?:NGN|₦|\$|USD)\s*[\d,]+(?:\.\d{1,2})?/gi

/**
 * Sanitizes URLs by stripping query strings and hashes, and redacting specific
 * resource IDs, document numbers, and tenant schemas from path segments.
 */
export function sanitizeUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl
  try {
    const isAbsolute = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    const parsed = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'https://bigdrops-app.vercel.app')

    let pathname = parsed.pathname
      .replace(UUID_REGEX, ':id')
      .replace(DOC_NUMBER_REGEX, ':[doc_number]')
      .replace(TENANT_SCHEMA_REGEX, ':[tenant]')

    return isAbsolute ? `${parsed.origin}${pathname}` : pathname
  } catch {
    return rawUrl
      .split('?')[0]
      .split('#')[0]
      .replace(UUID_REGEX, ':id')
      .replace(DOC_NUMBER_REGEX, ':[doc_number]')
      .replace(TENANT_SCHEMA_REGEX, ':[tenant]')
  }
}

/**
 * Scrubs free-text messages to remove PII, JWTs, credentials, document IDs, and financial values
 * while preserving core technical error types and stack trace usefulness.
 */
export function scrubText(text?: string | null): string | undefined {
  if (!text || typeof text !== 'string') return text ?? undefined
  return text
    .replace(JWT_REGEX, '[REDACTED_JWT]')
    .replace(SUPABASE_BEARER_REGEX, 'Bearer [REDACTED_TOKEN]')
    .replace(API_KEY_REGEX, '[REDACTED_API_KEY]')
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(NIGERIAN_PHONE_REGEX, '[REDACTED_PHONE]')
    .replace(DOC_NUMBER_REGEX, '[REDACTED_DOC_NUMBER]')
    .replace(TENANT_SCHEMA_REGEX, '[REDACTED_TENANT]')
    .replace(UUID_REGEX, '[REDACTED_UUID]')
    .replace(CURRENCY_AMOUNT_REGEX, '[REDACTED_AMOUNT]')
}

/**
 * Dedicated sensitive token families.
 * Token-based matching prevents substring false positives (e.g., 'monkey' or 'keyboardLayout'
 * matching 'key', or 'apiVersion' matching 'api').
 */
const SENSITIVE_TOKEN_SET = new Set([
  'invoice', 'quotation', 'quote', 'waybill', 'receipt', 'csr', 'rfq',
  'client', 'customer', 'supplier', 'vendor', 'recipient',
  'amount', 'subtotal', 'total', 'vat', 'wht', 'price', 'discount',
  'bank', 'nuban', 'iban', 'swift',
  'password', 'passcode', 'secret', 'token', 'jwt', 'bearer',
  'prompt', 'credential',
])

const SENSITIVE_PHRASES = [
  'account_number', 'account_name', 'bank_account',
  'po_number', 'po_date', 'purchase_order',
  'api_key', 'apikey', 'private_key', 'encryption_key', 'secret_key',
  'bolu_response', 'chat_message', 'message_content',
]

/**
 * Normalizes property keys across camelCase, PascalCase, snake_case, and kebab-case.
 */
export function normalizeKey(rawKey: string): string {
  return rawKey
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[-.\s]+/g, '_')
}

/**
 * Detects whether an object property key belongs to a sensitive business or credential family.
 */
export function isSensitiveKey(rawKey: string): boolean {
  if (!rawKey || typeof rawKey !== 'string') return false
  const normalized = normalizeKey(rawKey)

  // 1. Check exact sensitive multi-word phrases
  for (const phrase of SENSITIVE_PHRASES) {
    if (
      normalized === phrase ||
      normalized.startsWith(phrase + '_') ||
      normalized.endsWith('_' + phrase) ||
      normalized.includes('_' + phrase + '_')
    ) {
      return true
    }
  }

  // 2. Tokenize and check against sensitive family word tokens
  const tokens = normalized.split('_')
  for (const token of tokens) {
    if (SENSITIVE_TOKEN_SET.has(token)) {
      return true
    }
  }

  // Standalone 'key' check (e.g. key: "secret", but NOT keyboard, monkey, etc.)
  if (tokens.length === 1 && tokens[0] === 'key') {
    return true
  }

  return false
}

const MAX_SCRUB_DEPTH = 4
export const REDACTED_DEPTH_MARKER = '[REDACTED_NESTED_STRUCTURE]'
export const REDACTED_CIRCULAR_MARKER = '[REDACTED_CIRCULAR_REF]'

/**
 * Recursively scrubs objects and arrays with fail-closed depth enforcement and
 * WeakSet circular reference protection.
 */
export function scrubObject(
  obj: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return scrubText(obj)
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj
  if (typeof obj !== 'object') return String(obj)

  // Circular reference protection
  if (seen.has(obj)) {
    return REDACTED_CIRCULAR_MARKER
  }

  // Fail-closed depth cutoff (never returns raw nested structures beyond limit)
  if (depth >= MAX_SCRUB_DEPTH) {
    return REDACTED_DEPTH_MARKER
  }

  seen.add(obj)

  // Array traversal
  if (Array.isArray(obj)) {
    return obj.map((item) => scrubObject(item, depth + 1, seen))
  }

  // Plain object traversal
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      cleaned[key] = '[REDACTED]'
    } else {
      cleaned[key] = scrubObject(value, depth + 1, seen)
    }
  }
  return cleaned
}

/**
 * Initializes Sentry before React application rendering.
 * Safely no-ops if VITE_SENTRY_DSN is absent or if Sentry is already initialized.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()

  if (!dsn) {
    if (import.meta.env.DEV) {
      console.info('[Sentry] VITE_SENTRY_DSN is not configured; frontend error monitoring is disabled.')
    }
    return
  }

  if (Sentry.isInitialized()) {
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || (import.meta.env.DEV ? 'development' : 'production'),
    tracesSampleRate: 0, // Performance tracing disabled to respect resource constraints

    // Integrations: Filter out Console integration to prevent console logs from leaking into breadcrumbs.
    // Explicitly omit: replayIntegration, browserTracingIntegration, browserProfilingIntegration.
    integrations: (defaults) => defaults.filter((integration) => integration.name !== 'Console'),

    beforeSend(event) {
      // 1. Scrub user identity: Never transmit IP, email, or username
      if (event.user) {
        delete event.user.email
        delete event.user.username
        delete event.user.ip_address
      }

      // 2. Scrub request data
      if (event.request) {
        if (event.request.url) {
          event.request.url = sanitizeUrl(event.request.url)
        }
        delete event.request.query_string
        delete event.request.data
        delete event.request.cookies

        if (event.request.headers) {
          delete event.request.headers['Authorization']
          delete event.request.headers['authorization']
          delete event.request.headers['apikey']
          delete event.request.headers['Cookie']
          delete event.request.headers['cookie']
          delete event.request.headers['X-Bolu-Source']
        }
      }

      // 3. Scrub exception message and values
      if (event.exception?.values) {
        for (const exception of event.exception.values) {
          if (exception.value) {
            exception.value = scrubText(exception.value)
          }
        }
      }

      // 4. Scrub top-level message
      if (event.message) {
        event.message = scrubText(event.message)
      }

      // 5. Scrub extra context
      if (event.extra) {
        event.extra = scrubObject(event.extra) as Record<string, unknown>
      }

      // 6. Scrub event contexts
      if (event.contexts) {
        const cleanedContexts: Record<string, Record<string, unknown>> = {}
        for (const [ctxName, ctxValue] of Object.entries(event.contexts)) {
          if (ctxValue && typeof ctxValue === 'object') {
            cleanedContexts[ctxName] = scrubObject(ctxValue) as Record<string, unknown>
          } else {
            cleanedContexts[ctxName] = ctxValue as any
          }
        }
        event.contexts = cleanedContexts as Sentry.Event['contexts']
      }

      // 7. Scrub custom tags
      if (event.tags) {
        const cleanedTags: Record<string, string | number | boolean> = {}
        for (const [tagKey, tagValue] of Object.entries(event.tags)) {
          if (isSensitiveKey(tagKey)) {
            cleanedTags[tagKey] = '[REDACTED]'
          } else if (typeof tagValue === 'string') {
            cleanedTags[tagKey] = scrubText(tagValue) ?? tagValue
          } else {
            cleanedTags[tagKey] = tagValue as any
          }
        }
        event.tags = cleanedTags
      }

      // 8. Scrub breadcrumbs before transmission and drop any console breadcrumbs
      if (event.breadcrumbs) {
        const cleanedBreadcrumbs = []
        for (const breadcrumb of event.breadcrumbs) {
          if (breadcrumb.category === 'console') {
            continue
          }
          if (breadcrumb.message) {
            breadcrumb.message = scrubText(breadcrumb.message)
          }
          if (breadcrumb.data) {
            breadcrumb.data = scrubObject(breadcrumb.data) as Record<string, unknown>
          }
          cleanedBreadcrumbs.push(breadcrumb)
        }
        event.breadcrumbs = cleanedBreadcrumbs
      }

      return event
    },

    beforeBreadcrumb(breadcrumb) {
      // 1. Immediately drop all console breadcrumbs
      if (breadcrumb.category === 'console') {
        return null
      }

      // 2. Sanitize navigation breadcrumbs (data.from and data.to)
      if (breadcrumb.category === 'navigation' && breadcrumb.data) {
        if (breadcrumb.data.from) {
          breadcrumb.data.from = sanitizeUrl(String(breadcrumb.data.from))
        }
        if (breadcrumb.data.to) {
          breadcrumb.data.to = sanitizeUrl(String(breadcrumb.data.to))
        }
      }

      // 3. Scrub XHR / fetch URLs (remove query params and sensitive IDs) and drop payloads
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        if (breadcrumb.data?.url) {
          breadcrumb.data.url = sanitizeUrl(String(breadcrumb.data.url))
        }
        delete breadcrumb.data?.body
        delete breadcrumb.data?.request
        delete breadcrumb.data?.response
      }

      // 4. Scrub UI click targets or input texts
      if (breadcrumb.category === 'ui.click' && breadcrumb.message) {
        breadcrumb.message = scrubText(breadcrumb.message)
      }

      // 5. Scrub breadcrumb message text
      if (breadcrumb.message) {
        breadcrumb.message = scrubText(breadcrumb.message)
      }

      // 6. Deep scrub breadcrumb data
      if (breadcrumb.data) {
        breadcrumb.data = scrubObject(breadcrumb.data) as Record<string, unknown>
      }

      return breadcrumb
    },
  })
}

/**
 * Captures an exception from a React Error Boundary with sanitized component stack.
 */
export function captureReactError(error: Error, errorInfo?: { componentStack?: string | null }): string | undefined {
  if (!Sentry.isInitialized()) return undefined

  return Sentry.captureReactException(error, {
    componentStack: errorInfo?.componentStack ? scrubText(errorInfo.componentStack) : undefined,
  })
}

/**
 * General helper to capture unhandled or caught application errors with sanitized metadata.
 */
export function captureFrontendError(error: unknown, context?: Record<string, unknown>): string | undefined {
  if (!Sentry.isInitialized()) return undefined

  return Sentry.withScope((scope) => {
    if (context) {
      const sanitized = scrubObject(context) as Record<string, unknown>
      scope.setExtras(sanitized)
    }
    return Sentry.captureException(error)
  })
}

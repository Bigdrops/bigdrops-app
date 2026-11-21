/**
 * Bolu AI Routing Subsystem — Error Classifier
 *
 * Pure, deterministic error classification for AI provider responses and network exceptions.
 * Maps status codes, headers, and error shapes to normalized categories, scopes,
 * cooldown requirements, quarantine decisions, and safe redacted summaries.
 *
 * Pure function: No side effects, no database access, no network calls.
 */

export type FailureCategory =
  | 'invalid_request'
  | 'authentication'
  | 'permission'
  | 'quota_exhausted'
  | 'rate_limit'
  | 'model_unavailable'
  | 'provider_unavailable'
  | 'timeout'
  | 'network'
  | 'malformed_response'
  | 'unknown'

export type FailureScope = 'request' | 'model' | 'account' | 'project' | 'provider'

export type ClassifiedError = {
  category: FailureCategory
  scope: FailureScope
  httpStatus: number | null
  retryable: boolean
  requiresCooldown: boolean
  requiresQuarantine: boolean
  retryAfterSeconds: number | null
  safeSummary: string
  rawCode?: string
}

const MIN_COOLDOWN_SECONDS = 5
const MAX_COOLDOWN_SECONDS = 86400 // 24 hours
const DEFAULT_RATE_LIMIT_COOLDOWN = 60
const DEFAULT_EXHAUSTION_COOLDOWN = 3600 // 1 hour
const DEFAULT_SERVER_ERROR_COOLDOWN = 30
const DEFAULT_TIMEOUT_COOLDOWN = 15

/**
 * Parses a standard HTTP `Retry-After` header value into seconds.
 * Supports both integer seconds ("120") and HTTP-date formats ("Wed, 21 Oct 2026 07:28:00 GMT").
 * Clamps result between MIN_COOLDOWN_SECONDS (5s) and MAX_COOLDOWN_SECONDS (86400s).
 */
export function parseRetryAfter(headerValue: string | null | undefined, nowMs: number = Date.now()): number | null {
  if (!headerValue || typeof headerValue !== 'string') return null
  const trimmed = headerValue.trim()
  if (!trimmed) return null

  // Format 1: Integer seconds
  if (/^\d+$/.test(trimmed)) {
    const seconds = parseInt(trimmed, 10)
    if (!Number.isFinite(seconds) || seconds <= 0) return MIN_COOLDOWN_SECONDS
    return Math.min(MAX_COOLDOWN_SECONDS, Math.max(MIN_COOLDOWN_SECONDS, seconds))
  }

  // Format 2: HTTP-date (e.g. RFC 7231 / RFC 2616)
  const parsedDateMs = Date.parse(trimmed)
  if (!Number.isNaN(parsedDateMs)) {
    const diffSeconds = Math.ceil((parsedDateMs - nowMs) / 1000)
    if (diffSeconds <= 0) return MIN_COOLDOWN_SECONDS
    return Math.min(MAX_COOLDOWN_SECONDS, Math.max(MIN_COOLDOWN_SECONDS, diffSeconds))
  }

  return null
}

/**
 * Classifies an HTTP response or caught runtime error into a structured ClassifiedError.
 */
export function classifyProviderError(
  input: {
    status?: number | null
    statusText?: string
    errorBody?: unknown
    retryAfterHeader?: string | null
    error?: unknown
  },
  options?: {
    providerId?: string
    targetModel?: string
  },
): ClassifiedError {
  const status = typeof input.status === 'number' ? input.status : null
  const retryAfter = parseRetryAfter(input.retryAfterHeader)

  // 1. Check caught exception / error object
  if (input.error) {
    const err = input.error
    if (err instanceof Error) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError' || err.message.toLowerCase().includes('timeout')) {
        return {
          category: 'timeout',
          scope: 'request',
          httpStatus: 408,
          retryable: true,
          requiresCooldown: true,
          requiresQuarantine: false,
          retryAfterSeconds: DEFAULT_TIMEOUT_COOLDOWN,
          safeSummary: 'Inference request timed out.',
        }
      }

      const msg = err.message.toLowerCase()
      if (
        msg.includes('econnrefused') ||
        msg.includes('enotfound') ||
        msg.includes('fetch failed') ||
        msg.includes('network') ||
        msg.includes('econnreset')
      ) {
        return {
          category: 'network',
          scope: 'provider',
          httpStatus: null,
          retryable: true,
          requiresCooldown: true,
          requiresQuarantine: false,
          retryAfterSeconds: DEFAULT_TIMEOUT_COOLDOWN,
          safeSummary: 'Network error communicating with upstream AI provider.',
        }
      }

      if (msg.includes('unexpected end of json') || msg.includes('syntaxerror') || msg.includes('malformed')) {
        return {
          category: 'malformed_response',
          scope: 'request',
          httpStatus: status || 502,
          retryable: true,
          requiresCooldown: false,
          requiresQuarantine: false,
          retryAfterSeconds: null,
          safeSummary: 'Upstream AI provider returned a malformed response body.',
        }
      }
    }
  }

  // Extract raw error code if available from parsed JSON error body
  let rawCode: string | undefined
  let messageDetail = ''
  if (input.errorBody && typeof input.errorBody === 'object') {
    const body = input.errorBody as Record<string, unknown>
    if (body.error && typeof body.error === 'object') {
      const errObj = body.error as Record<string, unknown>
      if (typeof errObj.code === 'string') rawCode = errObj.code
      if (typeof errObj.type === 'string' && !rawCode) rawCode = errObj.type
      if (typeof errObj.message === 'string') messageDetail = errObj.message
    } else if (typeof body.message === 'string') {
      messageDetail = body.message
    }
  }

  // 2. Classify by HTTP status code
  if (status === 400) {
    // 400 Bad Request — User/client input error or schema violation. Stop; do not rotate credentials.
    return {
      category: 'invalid_request',
      scope: 'request',
      httpStatus: 400,
      retryable: false,
      requiresCooldown: false,
      requiresQuarantine: false,
      retryAfterSeconds: null,
      safeSummary: 'Upstream AI provider rejected the request format or schema.',
      rawCode,
    }
  }

  if (status === 401) {
    // 401 Unauthorized — Confirmed invalid or revoked credential. Quarantine this connection.
    return {
      category: 'authentication',
      scope: 'account',
      httpStatus: 401,
      retryable: true,
      requiresCooldown: false,
      requiresQuarantine: true,
      retryAfterSeconds: null,
      safeSummary: 'Authentication failed. API key is invalid or revoked.',
      rawCode,
    }
  }

  if (status === 402) {
    // 402 Payment Required — Account credit or quota exhausted.
    return {
      category: 'quota_exhausted',
      scope: 'account',
      httpStatus: 402,
      retryable: true,
      requiresCooldown: true,
      requiresQuarantine: false,
      retryAfterSeconds: retryAfter ?? DEFAULT_EXHAUSTION_COOLDOWN,
      safeSummary: 'Provider credit or quota exhausted for this account.',
      rawCode,
    }
  }

  if (status === 403) {
    // 403 Forbidden — Distinguish explicit credential revocation from model tier or policy restrictions
    const lowerMsg = messageDetail.toLowerCase()
    const isAuthRevoked =
      lowerMsg.includes('revoked') ||
      lowerMsg.includes('invalid_api_key') ||
      lowerMsg.includes('account_deactivated') ||
      rawCode === 'invalid_api_key' ||
      rawCode === 'account_deactivated'

    if (isAuthRevoked) {
      return {
        category: 'authentication',
        scope: 'account',
        httpStatus: 403,
        retryable: true,
        requiresCooldown: false,
        requiresQuarantine: true,
        retryAfterSeconds: null,
        safeSummary: 'Provider account access revoked or deactivated.',
        rawCode,
      }
    }

    // Model permission or tier restriction. Do NOT disable whole account.
    // Setting scope to 'model' (or 'provider') prevents SQL from setting health_status = 'quarantined'.
    const scope: FailureScope = options?.targetModel ? 'model' : 'provider'
    return {
      category: 'permission',
      scope,
      httpStatus: 403,
      retryable: false,
      requiresCooldown: true,
      requiresQuarantine: false,
      retryAfterSeconds: retryAfter ?? DEFAULT_EXHAUSTION_COOLDOWN,
      safeSummary: options?.targetModel
        ? `Access forbidden for model "${options.targetModel}". Verify account tier or model permissions.`
        : 'Provider access forbidden. Verify account permissions or model access tier.',
      rawCode,
    }
  }

  if (status === 404) {
    // 404 Not Found — Model or endpoint unavailable. Exclude the affected model.
    return {
      category: 'model_unavailable',
      scope: 'model',
      httpStatus: 404,
      retryable: false,
      requiresCooldown: true,
      requiresQuarantine: false,
      retryAfterSeconds: DEFAULT_EXHAUSTION_COOLDOWN,
      safeSummary: `Model "${options?.targetModel || 'requested'}" was not found or is unavailable on this connection.`,
      rawCode,
    }
  }

  if (status === 408) {
    // 408 Request Timeout
    return {
      category: 'timeout',
      scope: 'request',
      httpStatus: 408,
      retryable: true,
      requiresCooldown: true,
      requiresQuarantine: false,
      retryAfterSeconds: retryAfter ?? DEFAULT_TIMEOUT_COOLDOWN,
      safeSummary: 'Upstream provider request timed out.',
      rawCode,
    }
  }

  if (status === 429) {
    // 429 Too Many Requests — Rate limited
    const isModelSpecific =
      messageDetail.toLowerCase().includes('model') ||
      rawCode?.toLowerCase().includes('model_rate_limit')

    return {
      category: 'rate_limit',
      scope: isModelSpecific ? 'model' : 'account',
      httpStatus: 429,
      retryable: true,
      requiresCooldown: true,
      requiresQuarantine: false,
      retryAfterSeconds: retryAfter ?? DEFAULT_RATE_LIMIT_COOLDOWN,
      safeSummary: `Rate limit reached${isModelSpecific ? ' for model' : ' for account'}. Retry cooldown applied.`,
      rawCode,
    }
  }

  if (status !== null && status >= 500 && status <= 599) {
    // 5xx Server Error — Provider transient outage or gateway error
    return {
      category: 'provider_unavailable',
      scope: 'provider',
      httpStatus: status,
      retryable: true,
      requiresCooldown: true,
      requiresQuarantine: false,
      retryAfterSeconds: retryAfter ?? DEFAULT_SERVER_ERROR_COOLDOWN,
      safeSummary: `Upstream AI provider returned server error (${status}).`,
      rawCode,
    }
  }

  // Fallback for unknown / unrecognized error
  return {
    category: 'unknown',
    scope: 'request',
    httpStatus: status,
    retryable: true,
    requiresCooldown: false,
    requiresQuarantine: false,
    retryAfterSeconds: null,
    safeSummary: `Unexpected provider failure${status ? ` (HTTP ${status})` : ''}.`,
    rawCode,
  }
}

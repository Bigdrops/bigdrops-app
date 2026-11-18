const STATUS_CODE_MAP: Record<number, string> = {
  400: 'The request was invalid',
  401: 'You need to sign in again',
  403: "You don't have permission to do that",
  404: 'The requested resource was not found',
  409: 'A conflict occurred — the data may have changed',
  422: 'The submitted data is invalid',
  429: 'Too many requests — please wait a moment',
  500: 'A server error occurred',
  502: 'The server is temporarily unavailable',
  503: 'The service is temporarily unavailable',
}

type ErrorWithCause = Error & { cause?: unknown }

function isResponse(value: unknown): value is { status: number; statusText?: string; url?: string } {
  if (value instanceof Response) return true
  if (value && typeof value === 'object' && 'status' in value && typeof (value as Record<string, unknown>).status === 'number') return true
  return false
}

export function toUserSafeMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (isResponse(error)) {
    return STATUS_CODE_MAP[error.status] || `Request failed (${error.status})`
  }

  if (error instanceof Error) {
    return error.message || fallback
  }

  if (typeof error === 'string') {
    const trimmed = error.trim()
    return trimmed || fallback
  }

  return fallback
}

export function extractDiagnostic(error: unknown): string {
  if (error instanceof Error) {
    const parts = [`${error.name}: ${error.message}`]
    if (error.stack) parts.push(`\n${error.stack}`)
    let cause = (error as ErrorWithCause).cause
    let depth = 0
    while (cause && depth < 4) {
      parts.push('\n\nCaused by:')
      if (cause instanceof Error) {
        parts.push(`\n${cause.name}: ${cause.message}`)
        if (cause.stack) parts.push(`\n${cause.stack}`)
        cause = (cause as ErrorWithCause).cause
      } else {
        parts.push(`\n${extractDiagnostic(cause)}`)
        cause = null
      }
      depth += 1
    }
    return parts.join('')
  }

  if (isResponse(error)) {
    const parts = [`HTTP ${error.status}`]
    if (error.statusText) parts.push(` ${error.statusText}`)
    if (error.url) parts.push(`\nURL: ${error.url}`)
    return parts.join('')
  }

  if (typeof error === 'string' && error.length > 0) {
    return error
  }

  try {
    return JSON.stringify(error, null, 2)
  } catch {
    return String(error)
  }
}

export function sanitizeDiagnostic(text: string): string {
  if (!text) return ''
  let sanitized = text
    // Redact Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    // Redact standard API keys (e.g. OpenAI sk-..., Anthropic, etc.)
    .replace(/\b(?:sk-[a-zA-Z0-9_-]{20,}|ai-[a-zA-Z0-9_-]{20,}|key-[a-zA-Z0-9_-]{20,})\b/gi, '[REDACTED_KEY]')
    // Redact JWT tokens
    .replace(/\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+\b/g, '[REDACTED_JWT]')
    // Redact Postgres / DB connection strings with credentials
    .replace(/postgres(?:ql)?:\/\/[^:]+:[^@]+@/gi, 'postgres://[REDACTED]@')
    // Redact sensitive key/value pairs in logs or JSON strings
    .replace(/(["']?(?:authorization|api[_-]?key|secret|password|token|vault[_-]?key|credential)["']?\s*[:=]\s*["']?)([^"',\s\r\n}]+)(["']?)/gi, '$1[REDACTED]$3')

  // Prevent excessive log bloat in localStorage (max 4000 chars)
  if (sanitized.length > 4000) {
    sanitized = `${sanitized.slice(0, 3950)}... [truncated ${sanitized.length - 3950} chars]`
  }
  return sanitized
}

export function extractDescriptionDiagnostic(description: unknown): string {
  if (description === undefined || description === null) return ''
  if (typeof description === 'string') return sanitizeDiagnostic(description.trim())
  if (description instanceof Error) return sanitizeDiagnostic(extractDiagnostic(description))
  if (typeof description === 'object') {
    // If it's a React element, try extracting children if string
    const descObj = description as Record<string, unknown>
    if (typeof descObj?.props === 'object' && descObj.props && 'children' in (descObj.props as Record<string, unknown>)) {
      const children = (descObj.props as Record<string, unknown>).children
      if (typeof children === 'string') return sanitizeDiagnostic(children.trim())
    }
    try {
      return sanitizeDiagnostic(JSON.stringify(description))
    } catch {
      return sanitizeDiagnostic(String(description))
    }
  }
  return sanitizeDiagnostic(String(description))
}

export function normalizeError(
  error: unknown,
  description?: unknown,
): { userSafe: string; diagnostic: string } {
  const userSafe = toUserSafeMessage(error)
  const baseDiagnostic = sanitizeDiagnostic(extractDiagnostic(error))
  const descDiagnostic = extractDescriptionDiagnostic(description)

  let fullDiagnostic = baseDiagnostic
  if (descDiagnostic && descDiagnostic !== baseDiagnostic && descDiagnostic !== userSafe) {
    fullDiagnostic = baseDiagnostic
      ? `${baseDiagnostic}\n\nDetails: ${descDiagnostic}`
      : descDiagnostic
  }

  return {
    userSafe,
    diagnostic: fullDiagnostic,
  }
}

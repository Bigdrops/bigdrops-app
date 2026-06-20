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

export function normalizeError(error: unknown): { userSafe: string; diagnostic: string } {
  return {
    userSafe: toUserSafeMessage(error),
    diagnostic: extractDiagnostic(error),
  }
}

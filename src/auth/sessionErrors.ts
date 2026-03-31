const INVALID_SESSION_PATTERNS = [
  /invalid refresh token/i,
  /refresh token not found/i,
  /refresh_token_not_found/i,
  /invalid_grant/i,
  /session.*not found/i,
]

type SessionErrorLike = {
  message?: string | null
  error_description?: string | null
  details?: string | null
  cause?: {
    message?: string | null
  } | null
} | null | undefined

function isInvalidSessionError(error: SessionErrorLike) {
  const message = [
    error?.message,
    error?.error_description,
    error?.details,
    error?.cause?.message,
  ]
    .filter(Boolean)
    .join(' | ')

  return INVALID_SESSION_PATTERNS.some((pattern) => pattern.test(message))
}

export { INVALID_SESSION_PATTERNS, isInvalidSessionError }

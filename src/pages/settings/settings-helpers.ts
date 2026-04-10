export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error

  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: unknown
      details?: unknown
      hint?: unknown
      error_description?: unknown
    }

    if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
      return maybeError.message
    }

    if (typeof maybeError.details === 'string' && maybeError.details.trim()) {
      return maybeError.details
    }

    if (typeof maybeError.hint === 'string' && maybeError.hint.trim()) {
      return maybeError.hint
    }

    if (
      typeof maybeError.error_description === 'string' &&
      maybeError.error_description.trim()
    ) {
      return maybeError.error_description
    }
  }

  return 'Unknown error'
}

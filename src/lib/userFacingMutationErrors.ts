type MutationAction =
  | 'save'
  | 'create'
  | 'update'
  | 'delete'
  | 'archive'
  | 'restore'
  | 'upload'
  | 'link'
  | 'record'
  | 'void'

type MutationMessageOptions = {
  action?: MutationAction
  fallback?: string
}

const ACTION_FALLBACKS: Record<MutationAction, string> = {
  save: 'Could not save right now. Try again.',
  create: 'Could not create this right now. Try again.',
  update: 'Could not update this right now. Try again.',
  delete: 'Could not delete this right now. Try again.',
  archive: 'Could not archive this right now. Try again.',
  restore: 'Could not restore this right now. Try again.',
  upload: 'Could not upload this right now. Try again.',
  link: 'Could not update this link right now. Try again.',
  record: 'Could not record this right now. Try again.',
  void: 'Could not update this right now. Try again.',
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return ''
}

export function getUserFacingMutationMessage(
  error: unknown,
  options: MutationMessageOptions = {},
): string {
  const action = options.action || 'save'
  const message = getErrorText(error).trim()

  // Surface the actual error message when available instead of masking behind generic fallback
  if (!message) {
    const fallback = options.fallback || ACTION_FALLBACKS[action]
    return fallback
  }

  // Return the real message (truncated if excessively long)
  return message.length > 200 ? message.slice(0, 197) + '…' : message
}

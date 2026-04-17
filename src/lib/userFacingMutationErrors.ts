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
  const fallback = options.fallback || ACTION_FALLBACKS[action]
  const message = getErrorText(error).trim()

  if (!message) return fallback

  if (
    /(client_id|client name|client)/i.test(message) &&
    /(null value in column|not-null constraint|required field|is required|must not be null)/i.test(message)
  ) {
    return action === 'create' ? 'Pick a client before creating this.' : 'Pick a client before saving'
  }

  if (/(duplicate key|unique constraint|already exists|conflict)/i.test(message)) {
    return 'This already exists'
  }

  if (/(null value in column|not-null constraint|required field|must not be null|is required)/i.test(message)) {
    return 'Please fill the required field'
  }

  if (/(foreign key constraint|is not present in table|violates foreign key)/i.test(message)) {
    return action === 'link'
      ? 'Choose a valid record and try again.'
      : 'A linked record is missing. Refresh and try again.'
  }

  if (/(row-level security|permission denied|not authorized|forbidden|insufficient privileges|rls)/i.test(message)) {
    return "You don't have permission to do that right now."
  }

  if (/(timed out|timeout|failed to fetch|network request failed|networkerror|connection)/i.test(message)) {
    return fallback
  }

  return fallback
}

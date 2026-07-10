/**
 * Letter Validation — Pure Business Invariants
 *
 * All functions are pure: no side effects, no repository access,
 * no Supabase calls, no persistence awareness.
 *
 * These functions define WHAT is valid, not HOW to enforce it.
 * The Save Orchestration layer (Phase 4) will call these and
 * translate results into user-facing feedback.
 */

import type {
  CorrespondenceLifecycleState,
  CorrespondenceValidationResult,
} from '../types'
import { CORRESPONDENCE_TRANSITIONS, VALID, invalid, mergeResults } from '../types'
import type {
  CreateLetterInput,
  LetterBody,
  LetterBodyBlock,
  LetterDocument,
} from './types'

// ---------------------------------------------------------------------------
// Letter Body Validation
// ---------------------------------------------------------------------------

/**
 * Validates a single body block.
 * Returns valid if the block has the required fields for its type.
 */
function validateBlock(
  block: LetterBodyBlock,
  index: number,
): CorrespondenceValidationResult {
  const path = `body.blocks[${index}]`

  switch (block.type) {
    case 'heading': {
      if (!block.text || block.text.trim().length === 0) {
        return invalid(path, 'Heading text is required.', 'HEADING_EMPTY')
      }
      if (block.level < 1 || block.level > 6) {
        return invalid(path, 'Heading level must be between 1 and 6.', 'HEADING_INVALID_LEVEL')
      }
      return VALID
    }

    case 'paragraph': {
      if (!block.text || block.text.trim().length === 0) {
        return invalid(path, 'Paragraph text is required.', 'PARAGRAPH_EMPTY')
      }
      return VALID
    }

    case 'list': {
      if (!block.items || block.items.length === 0) {
        return invalid(path, 'List must have at least one item.', 'LIST_EMPTY')
      }
      const emptyItems = block.items.reduce<number[]>(
        (acc, item, i) => (item.trim().length === 0 ? [...acc, i] : acc),
        [],
      )
      if (emptyItems.length > 0) {
        return invalid(
          path,
          `List items at index ${emptyItems.join(', ')} are empty.`,
          'LIST_EMPTY_ITEMS',
        )
      }
      if (block.variant !== 'bullet' && block.variant !== 'ordered') {
        return invalid(path, 'List variant must be "bullet" or "ordered".', 'LIST_INVALID_VARIANT')
      }
      return VALID
    }

    case 'quote': {
      if (!block.text || block.text.trim().length === 0) {
        return invalid(path, 'Quote text is required.', 'QUOTE_EMPTY')
      }
      return VALID
    }

    case 'divider':
      // Divider has no required fields.
      return VALID

    case 'signature': {
      if (!block.name || block.name.trim().length === 0) {
        return invalid(path, 'Signature name is required.', 'SIGNATURE_EMPTY_NAME')
      }
      return VALID
    }

    case 'image': {
      if (!block.url || block.url.trim().length === 0) {
        return invalid(path, 'Image URL is required.', 'IMAGE_EMPTY_URL')
      }
      if (!block.alt || block.alt.trim().length === 0) {
        return invalid(path, 'Image alt text is required for accessibility.', 'IMAGE_EMPTY_ALT')
      }
      return VALID
    }

    default:
      return invalid(path, `Unknown block type.`, 'UNKNOWN_BLOCK_TYPE')
  }
}

/**
 * Validates the entire letter body.
 * A valid body has at least one block and all blocks pass individual validation.
 */
export function validateLetterBody(
  body: LetterBody,
): CorrespondenceValidationResult {
  if (!body) {
    return invalid('body', 'Body is required.', 'BODY_MISSING')
  }

  if (!body.blocks || body.blocks.length === 0) {
    return invalid('body.blocks', 'Letter body must contain at least one block.', 'BODY_EMPTY')
  }

  const blockResults = body.blocks.map((block, i) => validateBlock(block, i))
  return mergeResults(...blockResults)
}

// ---------------------------------------------------------------------------
// Letter Document Validation
// ---------------------------------------------------------------------------

/**
 * Validates a complete letter document for structural correctness.
 * Does NOT check persistence state or edit-mode constraints.
 */
export function validateLetter(
  letter: LetterDocument,
): CorrespondenceValidationResult {
  const results: CorrespondenceValidationResult[] = []

  // Subject
  if (!letter.subject || letter.subject.trim().length === 0) {
    results.push(invalid('subject', 'Subject is required.', 'SUBJECT_EMPTY'))
  }

  // Date
  if (!letter.date || letter.date.trim().length === 0) {
    results.push(invalid('date', 'Date is required.', 'DATE_MISSING'))
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(letter.date)) {
    results.push(invalid('date', 'Date must be in ISO 8601 format (YYYY-MM-DD).', 'DATE_INVALID_FORMAT'))
  }

  // Recipient
  if (!letter.recipient) {
    results.push(invalid('recipient', 'Recipient is required.', 'RECIPIENT_MISSING'))
  } else {
    if (!letter.recipient.companyName || letter.recipient.companyName.trim().length === 0) {
      results.push(
        invalid('recipient.companyName', 'Recipient company name is required.', 'RECIPIENT_COMPANY_EMPTY'),
      )
    }
  }

  // Sender
  if (!letter.sender) {
    results.push(invalid('sender', 'Sender information is required.', 'SENDER_MISSING'))
  } else {
    if (!letter.sender.companyName || letter.sender.companyName.trim().length === 0) {
      results.push(
        invalid('sender.companyName', 'Sender company name is required.', 'SENDER_COMPANY_EMPTY'),
      )
    }
  }

  // Body
  results.push(validateLetterBody(letter.body))

  // Identity
  if (!letter.identity) {
    results.push(invalid('identity', 'Document identity is required.', 'IDENTITY_MISSING'))
  } else {
    if (!letter.identity.documentNumber || letter.identity.documentNumber.trim().length === 0) {
      results.push(
        invalid('identity.documentNumber', 'Document number is required.', 'IDENTITY_NUMBER_EMPTY'),
      )
    }
  }

  return mergeResults(...results)
}

// ---------------------------------------------------------------------------
// CreateLetterInput Validation
// ---------------------------------------------------------------------------

/**
 * Validates a letter creation input (before identity is assigned).
 * Used by the Save Orchestration layer before persistence.
 */
export function validateCreateLetterInput(
  input: CreateLetterInput,
): CorrespondenceValidationResult {
  const results: CorrespondenceValidationResult[] = []

  // Subject
  if (!input.subject || input.subject.trim().length === 0) {
    results.push(invalid('subject', 'Subject is required.', 'SUBJECT_EMPTY'))
  }

  // Date
  if (!input.date || input.date.trim().length === 0) {
    results.push(invalid('date', 'Date is required.', 'DATE_MISSING'))
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    results.push(invalid('date', 'Date must be in ISO 8601 format (YYYY-MM-DD).', 'DATE_INVALID_FORMAT'))
  }

  // Recipient
  if (!input.recipient) {
    results.push(invalid('recipient', 'Recipient is required.', 'RECIPIENT_MISSING'))
  } else {
    if (!input.recipient.companyName || input.recipient.companyName.trim().length === 0) {
      results.push(
        invalid('recipient.companyName', 'Recipient company name is required.', 'RECIPIENT_COMPANY_EMPTY'),
      )
    }
  }

  // Sender
  if (!input.sender) {
    results.push(invalid('sender', 'Sender information is required.', 'SENDER_MISSING'))
  } else {
    if (!input.sender.companyName || input.sender.companyName.trim().length === 0) {
      results.push(
        invalid('sender.companyName', 'Sender company name is required.', 'SENDER_COMPANY_EMPTY'),
      )
    }
  }

  // Body
  results.push(validateLetterBody(input.body))

  return mergeResults(...results)
}

// ---------------------------------------------------------------------------
// Lifecycle State Validation
// ---------------------------------------------------------------------------

/**
 * Validates whether a state transition is allowed.
 * Returns valid if the transition is permitted, invalid otherwise.
 */
export function validateCorrespondenceStateTransition(
  from: CorrespondenceLifecycleState,
  to: CorrespondenceLifecycleState,
): CorrespondenceValidationResult {
  const allowed = CORRESPONDENCE_TRANSITIONS[from]
  if (!allowed || !(allowed as readonly CorrespondenceLifecycleState[]).includes(to)) {
    return invalid(
      'status',
      `Cannot transition from "${from}" to "${to}". Allowed transitions: ${allowed?.join(', ') ?? 'none'}.`,
      'INVALID_STATE_TRANSITION',
    )
  }
  return VALID
}

/**
 * Validates that a lifecycle state value is a valid state.
 */
export function isValidLifecycleState(
  state: string,
): state is CorrespondenceLifecycleState {
  return (
    state === 'draft' ||
    state === 'approved' ||
    state === 'issued' ||
    state === 'archived' ||
    state === 'cancelled'
  )
}

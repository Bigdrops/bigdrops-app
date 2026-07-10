/**
 * Letter Normalization — Pure Domain Helpers
 *
 * All functions are pure: no side effects, no persistence,
 * no renderer awareness, no framework dependencies.
 *
 * These functions operate ONLY on domain models. They do NOT
 * create normalizeFromDB() or normalizeForDatabase() — those
 * belong to repository/service layers in later phases.
 */

import type { CorrespondenceIdentity } from '../types'
import type {
  CreateLetterInput,
  LetterBody,
  LetterBodyBlock,
  LetterDocument,
} from './types'

// ---------------------------------------------------------------------------
// Identity Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a correspondence identity value object.
 *
 * NOTE: The `id` and `documentNumber` are assigned by the persistence
 * and prefix engine layers respectively. This helper is used by the
 * normalization layer to assemble identity from those externally-assigned
 * values. It does NOT generate IDs or numbers.
 */
export function createCorrespondenceIdentity(
  id: string,
  documentNumber: string,
  type: 'letter',
): CorrespondenceIdentity {
  return { id, documentNumber, type }
}

// ---------------------------------------------------------------------------
// Default Body
// ---------------------------------------------------------------------------

/** An empty letter body with a single empty paragraph block. */
export const EMPTY_LETTER_BODY: LetterBody = {
  blocks: [{ type: 'paragraph', text: '' }],
}

// ---------------------------------------------------------------------------
// Draft Creation
// ---------------------------------------------------------------------------

/**
 * Creates a new letter document in draft state from a creation input.
 *
 * This is the canonical factory for new letters. It assigns:
 * - Lifecycle state: 'draft'
 * - Timestamps: now (ISO 8601)
 * - Empty attachments/metadata defaults
 * - Body defaults if not provided
 *
 * Identity (id, documentNumber) is NOT assigned here — those come
 * from the persistence and prefix engine layers.
 */
export function createLetterDraft(
  input: CreateLetterInput,
): Omit<LetterDocument, 'identity'> {
  const now = new Date().toISOString()

  return {
    recipient: { ...input.recipient },
    sender: { ...input.sender },
    subject: input.subject.trim(),
    referenceNumber: input.referenceNumber?.trim() || undefined,
    date: input.date,
    status: 'draft',
    body: normalizeLetterBody(input.body),
    attachments: input.attachments ? [...input.attachments] : [],
    metadata: input.metadata ? { ...input.metadata } : {},
    createdAt: now,
    updatedAt: now,
  }
}

// ---------------------------------------------------------------------------
// Normalization Helpers
// ---------------------------------------------------------------------------

/**
 * Normalizes a letter body — trims whitespace, strips empty trailing blocks,
 * ensures at least one block exists.
 */
export function normalizeLetterBody(body: LetterBody): LetterBody {
  if (!body || !body.blocks || body.blocks.length === 0) {
    return { blocks: [{ type: 'paragraph', text: '' }] }
  }

  const normalized = body.blocks
    .map(normalizeBlock)
    .filter((block) => !isEffectivelyEmpty(block))

  // Ensure at least one block remains
  if (normalized.length === 0) {
    return { blocks: [{ type: 'paragraph', text: '' }] }
  }

  return { blocks: normalized }
}

/**
 * Normalizes a single body block — trims text fields.
 */
function normalizeBlock(block: LetterBodyBlock): LetterBodyBlock {
  switch (block.type) {
    case 'heading':
      return { ...block, text: block.text.trim() }
    case 'paragraph':
      return { ...block, text: block.text.trim() }
    case 'list':
      return {
        ...block,
        items: block.items.map((item) => item.trim()),
      }
    case 'quote':
      return {
        ...block,
        text: block.text.trim(),
        attribution: block.attribution?.trim() || undefined,
      }
    case 'divider':
      return block
    case 'signature':
      return {
        ...block,
        name: block.name.trim(),
        title: block.title?.trim() || undefined,
      }
    case 'image':
      return {
        ...block,
        url: block.url.trim(),
        alt: block.alt.trim(),
        caption: block.caption?.trim() || undefined,
      }
    default:
      return block
  }
}

/**
 * Determines whether a block is effectively empty after normalization.
 * Empty blocks are stripped during normalization.
 */
function isEffectivelyEmpty(block: LetterBodyBlock): boolean {
  switch (block.type) {
    case 'heading':
      return block.text.length === 0
    case 'paragraph':
      return block.text.length === 0
    case 'list':
      return block.items.length === 0
    case 'quote':
      return block.text.length === 0
    case 'divider':
      return false // Dividers are never empty
    case 'signature':
      return block.name.length === 0
    case 'image':
      return block.url.length === 0
    default:
      return true
  }
}

// ---------------------------------------------------------------------------
// Letter Normalization
// ---------------------------------------------------------------------------

/**
 * Normalizes a full letter document — trims all string fields,
 * normalizes body, ensures consistent timestamps.
 */
export function normalizeLetter(letter: LetterDocument): LetterDocument {
  return {
    ...letter,
    subject: letter.subject.trim(),
    referenceNumber: letter.referenceNumber?.trim() || undefined,
    date: letter.date,
    recipient: normalizeRecipient(letter.recipient),
    sender: normalizeSender(letter.sender),
    body: normalizeLetterBody(letter.body),
    attachments: letter.attachments ? [...letter.attachments] : [],
    metadata: letter.metadata ? { ...letter.metadata } : {},
    updatedAt: new Date().toISOString(),
  }
}

function normalizeRecipient(
  recipient: LetterDocument['recipient'],
): LetterDocument['recipient'] {
  return {
    ...recipient,
    companyName: recipient.companyName.trim(),
    contactName: recipient.contactName?.trim() || undefined,
    address: recipient.address?.trim() || undefined,
    email: recipient.email?.trim() || undefined,
    phone: recipient.phone?.trim() || undefined,
  }
}

function normalizeSender(
  sender: LetterDocument['sender'],
): LetterDocument['sender'] {
  return {
    ...sender,
    companyName: sender.companyName.trim(),
    address: sender.address?.trim() || undefined,
    cityState: sender.cityState?.trim() || undefined,
    phone: sender.phone?.trim() || undefined,
    email: sender.email?.trim() || undefined,
    website: sender.website?.trim() || undefined,
  }
}

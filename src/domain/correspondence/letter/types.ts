/**
 * Letter Document — Domain Types
 *
 * Canonical type definitions for the Official Letter document family.
 * The body is represented as structured JSON blocks — never HTML,
 * never Markdown, never editor-specific node types.
 *
 * This schema IS the canonical storage contract. Future editors
 * (TipTap, ProseMirror, or custom) must serialize INTO this schema.
 */

import type {
  CorrespondenceAttachment,
  CorrespondenceDocument,
  CorrespondenceIdentity,
  CorrespondenceMetadata,
  CorrespondenceRecipient,
  CorrespondenceSender,
} from '../types'

// ---------------------------------------------------------------------------
// Body Block Types
// ---------------------------------------------------------------------------

/** Supported block type discriminators. */
export type LetterBodyBlockType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'quote'
  | 'divider'
  | 'signature'
  | 'image'

// ---------------------------------------------------------------------------
// Individual Block Interfaces
// ---------------------------------------------------------------------------

/** Heading block — section titles. */
export interface LetterHeadingBlock {
  readonly type: 'heading'
  /** Heading text content. */
  text: string
  /** Heading level (1–6). Defaults to 1. */
  level: 1 | 2 | 3 | 4 | 5 | 6
}

/** Paragraph block — standard prose text. */
export interface LetterParagraphBlock {
  readonly type: 'paragraph'
  /** Text content. May contain inline formatting marks. */
  text: string
}

/**
 * Inline text segment with optional formatting.
 * Used inside list items and paragraphs that need mixed formatting.
 */
export interface LetterTextSegment {
  /** The text content. */
  text: string
  /** Bold. */
  bold?: boolean
  /** Italic. */
  italic?: boolean
  /** Underline. */
  underline?: boolean
  /** Strikethrough. */
  strikethrough?: boolean
  /** Inline code. */
  code?: boolean
}

/** List block — ordered or unordered. */
export interface LetterListBlock {
  readonly type: 'list'
  /** List variant. */
  variant: 'bullet' | 'ordered'
  /** List items. Each item is a plain string. */
  items: readonly string[]
}

/** Quote block — block quotation. */
export interface LetterQuoteBlock {
  readonly type: 'quote'
  /** Quote text content. */
  text: string
  /** Optional attribution (e.g. "— John Doe"). */
  attribution?: string
}

/** Divider block — horizontal rule / section break. */
export interface LetterDividerBlock {
  readonly type: 'divider'
}

/** Signature block — signatory area. */
export interface LetterSignatureBlock {
  readonly type: 'signature'
  /** Signatory name. */
  name: string
  /** Signatory title / role. */
  title?: string
  /** Optional signature image URL. */
  imageUrl?: string
}

/** Image block — embedded image. */
export interface LetterImageBlock {
  readonly type: 'image'
  /** Image URL. */
  url: string
  /** Alt text for accessibility. */
  alt: string
  /** Optional caption. */
  caption?: string
  /** Width hint (CSS value, e.g. "100%", "400px"). */
  width?: string
}

// ---------------------------------------------------------------------------
// Discriminated Union
// ---------------------------------------------------------------------------

/** All supported letter body block types as a discriminated union. */
export type LetterBodyBlock =
  | LetterHeadingBlock
  | LetterParagraphBlock
  | LetterListBlock
  | LetterQuoteBlock
  | LetterDividerBlock
  | LetterSignatureBlock
  | LetterImageBlock

/** Extract the block type literal from a block. */
export type LetterBodyBlockTypeOf<T extends LetterBodyBlock> = T['type']

// ---------------------------------------------------------------------------
// Letter Body
// ---------------------------------------------------------------------------

/**
 * The structured body of a letter.
 * An ordered sequence of content blocks.
 */
export interface LetterBody {
  /** Ordered content blocks. */
  blocks: readonly LetterBodyBlock[]
}

// ---------------------------------------------------------------------------
// Letter Document
// ---------------------------------------------------------------------------

/**
 * Complete letter document — extends the correspondence base contract
 * with letter-specific fields.
 */
export interface LetterDocument extends CorrespondenceDocument {
  /** Letter body as structured JSON blocks. */
  body: LetterBody
}

// ---------------------------------------------------------------------------
// Input / Draft Types
// ---------------------------------------------------------------------------

/**
 * Input for creating a new letter draft.
 * All identity and timestamp fields are omitted — they are assigned
 * by the normalization and persistence layers.
 */
export interface CreateLetterInput {
  recipient: CorrespondenceRecipient
  sender: CorrespondenceSender
  subject: string
  referenceNumber?: string
  date: string
  body: LetterBody
  attachments?: readonly CorrespondenceAttachment[]
  metadata?: CorrespondenceMetadata
}

/**
 * Input for updating an existing letter.
 * Only mutable fields are included. Identity fields are excluded
 * because they are immutable after first save.
 */
export interface UpdateLetterInput {
  recipient?: CorrespondenceRecipient
  sender?: CorrespondenceSender
  subject?: string
  referenceNumber?: string
  date?: string
  body?: LetterBody
  attachments?: readonly CorrespondenceAttachment[]
  metadata?: CorrespondenceMetadata
  status?: CorrespondenceDocument['status']
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

/** Type guard: is this block a heading? */
export function isHeadingBlock(
  block: LetterBodyBlock,
): block is LetterHeadingBlock {
  return block.type === 'heading'
}

/** Type guard: is this block a paragraph? */
export function isParagraphBlock(
  block: LetterBodyBlock,
): block is LetterParagraphBlock {
  return block.type === 'paragraph'
}

/** Type guard: is this block a list? */
export function isListBlock(
  block: LetterBodyBlock,
): block is LetterListBlock {
  return block.type === 'list'
}

/** Type guard: is this block a quote? */
export function isQuoteBlock(
  block: LetterBodyBlock,
): block is LetterQuoteBlock {
  return block.type === 'quote'
}

/** Type guard: is this block a divider? */
export function isDividerBlock(
  block: LetterBodyBlock,
): block is LetterDividerBlock {
  return block.type === 'divider'
}

/** Type guard: is this block a signature? */
export function isSignatureBlock(
  block: LetterBodyBlock,
): block is LetterSignatureBlock {
  return block.type === 'signature'
}

/** Type guard: is this block an image? */
export function isImageBlock(
  block: LetterBodyBlock,
): block is LetterImageBlock {
  return block.type === 'image'
}

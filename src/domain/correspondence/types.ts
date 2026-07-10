/**
 * Correspondence Domain — Shared Contracts
 *
 * Canonical type definitions for all correspondence document types.
 * This module is 100% framework-agnostic: no React, no Supabase,
 * no browser APIs, no renderers.
 *
 * Future correspondence modules (Memo, Circular, Notice) extend these
 * base contracts without modifying them.
 */

// ---------------------------------------------------------------------------
// Lifecycle States
// ---------------------------------------------------------------------------

/** All lifecycle states a correspondence document can occupy. */
export type CorrespondenceLifecycleState =
  | 'draft'
  | 'approved'
  | 'issued'
  | 'archived'
  | 'cancelled'

/** States that represent an editable document (before finalisation). */
export type CorrespondenceEditableState = Extract<
  CorrespondenceLifecycleState,
  'draft' | 'approved'
>

/** States that represent a read-only / terminal document. */
export type CorrespondenceTerminalState = Extract<
  CorrespondenceLifecycleState,
  'issued' | 'archived' | 'cancelled'
>

/** Allowed transitions: from → to[]. */
export const CORRESPONDENCE_TRANSITIONS: Record<
  CorrespondenceLifecycleState,
  readonly CorrespondenceLifecycleState[]
> = {
  draft: ['approved', 'cancelled'],
  approved: ['issued', 'cancelled', 'draft'],
  issued: ['archived'],
  archived: [],
  cancelled: [],
} as const

// ---------------------------------------------------------------------------
// Document Family
// ---------------------------------------------------------------------------

/** Discriminated union of all correspondence document families. */
export type CorrespondenceFamily = 'letter'

// ---------------------------------------------------------------------------
// Correspondence Identity
// ---------------------------------------------------------------------------

/**
 * Immutable identity fields for a correspondence document.
 *
 * After first save, these fields MUST NOT change. Changing identity
 * requires duplication per the Document Transformation Standard.
 */
export interface CorrespondenceIdentity {
  /** Database primary key (UUID). Assigned on persistence. */
  readonly id: string
  /** Auto-generated document number via Prefix Engine (e.g. LTR-000001). */
  readonly documentNumber: string
  /** Discriminated document family tag. */
  readonly type: CorrespondenceFamily
}

/**
 * All identity field keys. Used by the Save Orchestration layer
 * (Phase 4) to enforce immutability after first save.
 */
export type CorrespondenceIdentityKey = keyof CorrespondenceIdentity

/** The set of keys that form the immutable identity contract. */
export const CORRESPONDENCE_IMMUTABLE_IDENTITY_KEYS: ReadonlySet<CorrespondenceIdentityKey> =
  new Set<CorrespondenceIdentityKey>(['id', 'documentNumber', 'type'])

/**
 * Type-safe identity field guard.
 * Returns true if the given key is an immutable identity field.
 */
export function isIdentityField(
  key: string,
): key is CorrespondenceIdentityKey {
  return CORRESPONDENCE_IMMUTABLE_IDENTITY_KEYS.has(
    key as CorrespondenceIdentityKey,
  )
}

/**
 * Returns the list of immutable identity field names.
 * Useful for UI lock indicators and Edit Law enforcement messaging.
 */
export function getImmutableIdentityFields(): readonly CorrespondenceIdentityKey[] {
  return Array.from(CORRESPONDENCE_IMMUTABLE_IDENTITY_KEYS)
}

// ---------------------------------------------------------------------------
// Recipient
// ---------------------------------------------------------------------------

/** Recipient of a correspondence document. May be an existing client or manual entry. */
export interface CorrespondenceRecipient {
  /** Client UUID if linked to an existing BIGDROPS client. */
  clientId?: string
  /** Company / organisation name. */
  companyName: string
  /** Contact person name. */
  contactName?: string
  /** Postal address (multi-line). */
  address?: string
  /** Email address. */
  email?: string
  /** Phone number. */
  phone?: string
}

// ---------------------------------------------------------------------------
// Sender / Company Info
// ---------------------------------------------------------------------------

/** Sender identity — the issuing company. */
export interface CorrespondenceSender {
  /** Company name. */
  companyName: string
  /** Company address. */
  address?: string
  /** City / State line. */
  cityState?: string
  /** Phone. */
  phone?: string
  /** Email. */
  email?: string
  /** Website. */
  website?: string
  /** Logo URL (hosted or data URI). */
  logoUrl?: string
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

/** A single attachment reference. */
export interface CorrespondenceAttachment {
  /** Display label (e.g. "Invoice #123"). */
  label: string
  /** File URL or path. */
  url: string
  /** MIME type (e.g. "application/pdf"). */
  mimeType?: string
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

/** Arbitrary key-value metadata attached to a correspondence document. */
export type CorrespondenceMetadata = Record<string, unknown>

// ---------------------------------------------------------------------------
// Base Document
// ---------------------------------------------------------------------------

/**
 * Base interface for all correspondence documents.
 * Letter-specific fields extend this via declaration merging or interface extension.
 */
export interface CorrespondenceDocument {
  /** Immutable identity. */
  readonly identity: CorrespondenceIdentity

  /** Recipient information. */
  recipient: CorrespondenceRecipient

  /** Sender / company information. */
  sender: CorrespondenceSender

  /** Subject / re: line. */
  subject: string

  /** Reference number (optional, for cross-referencing). */
  referenceNumber?: string

  /** Document date (ISO 8601 date string). */
  date: string

  /** Current lifecycle state. */
  status: CorrespondenceLifecycleState

  /** Attachments. */
  attachments: readonly CorrespondenceAttachment[]

  /** Arbitrary metadata. */
  metadata: CorrespondenceMetadata

  /** Timestamps (ISO 8601). Set by persistence layer. */
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Validation Result
// ---------------------------------------------------------------------------

/** Standard validation result returned by all validation functions. */
export interface CorrespondenceValidationResult {
  readonly valid: boolean
  readonly errors: readonly CorrespondenceValidationError[]
}

/** A single validation error. */
export interface CorrespondenceValidationError {
  /** Field path (e.g. "recipient.companyName", "subject"). */
  readonly field: string
  /** Human-readable error message. */
  readonly message: string
  /** Error code for programmatic handling. */
  readonly code: string
}

/** Convenience: a valid result with no errors. */
export const VALID: CorrespondenceValidationResult = {
  valid: true,
  errors: [],
}

/**
 * Helper to create a single-error result.
 */
export function invalid(
  field: string,
  message: string,
  code: string,
): CorrespondenceValidationResult {
  return { valid: false, errors: [{ field, message, code }] }
}

/**
 * Helper to merge multiple validation results.
 */
export function mergeResults(
  ...results: CorrespondenceValidationResult[]
): CorrespondenceValidationResult {
  const errors = results.flatMap((r) => r.errors)
  return errors.length === 0 ? VALID : { valid: false, errors }
}

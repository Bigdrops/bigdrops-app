/**
 * Letter Persistence Normalization
 *
 * Converts between domain models (LetterDocument) and database row shape.
 * These are pure transformation functions — no Supabase calls, no side effects.
 *
 * The database row shape uses snake_case fields matching the letters table.
 * The domain model uses camelCase fields matching LetterDocument.
 */

import type { CorrespondenceIdentity, CorrespondenceRecipient, CorrespondenceSender, CorrespondenceAttachment, CorrespondenceMetadata, CorrespondenceLifecycleState } from '../types'
import type { LetterBody, LetterDocument } from './types'

// ---------------------------------------------------------------------------
// Database Row Shape
// ---------------------------------------------------------------------------

/** Shape of a row as stored in the `letters` table. */
export interface LetterRow {
  id: string
  tenant_id: string
  letter_number: string
  recipient_id: string | null
  recipient_name: string
  recipient_address: string | null
  subject: string
  body: LetterBody
  status: CorrespondenceLifecycleState
  custom_fields: Record<string, unknown>
  attachments: CorrespondenceAttachment[]
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Row → Domain
// ---------------------------------------------------------------------------

/** Maps a database row to a LetterDocument domain model. */
export function letterRowToDocument(row: LetterRow): LetterDocument {
  return {
    identity: {
      id: row.id,
      documentNumber: row.letter_number,
      type: 'letter',
    },
    recipient: {
      companyName: row.recipient_name,
      clientId: row.recipient_id ?? undefined,
      address: row.recipient_address ?? undefined,
    },
    sender: {
      companyName: (row.custom_fields?.senderCompanyName as string) ?? '',
      address: (row.custom_fields?.senderAddress as string) ?? undefined,
      cityState: (row.custom_fields?.senderCityState as string) ?? undefined,
      phone: (row.custom_fields?.senderPhone as string) ?? undefined,
      email: (row.custom_fields?.senderEmail as string) ?? undefined,
      website: (row.custom_fields?.senderWebsite as string) ?? undefined,
      logoUrl: (row.custom_fields?.senderLogoUrl as string) ?? undefined,
    },
    subject: row.subject,
    referenceNumber: (row.custom_fields?.referenceNumber as string) ?? undefined,
    date: (row.custom_fields?.date as string) ?? row.created_at.slice(0, 10),
    status: row.status,
    body: row.body ?? { blocks: [] },
    attachments: row.attachments ?? [],
    metadata: row.custom_fields ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ---------------------------------------------------------------------------
// Domain → Insert Payload
// ---------------------------------------------------------------------------

/** Payload for inserting a new letter row. */
export interface LetterInsertPayload {
  tenant_id: string
  letter_number: string
  recipient_id: string | null
  recipient_name: string
  recipient_address: string | null
  subject: string
  body: LetterBody
  status: CorrespondenceLifecycleState
  custom_fields: Record<string, unknown>
  attachments: CorrespondenceAttachment[]
}

/** Maps a LetterDocument to an insert payload. */
export function documentToInsertPayload(
  doc: LetterDocument,
  tenantId: string,
): LetterInsertPayload {
  return {
    tenant_id: tenantId,
    letter_number: doc.identity.documentNumber,
    recipient_id: doc.recipient.clientId ?? null,
    recipient_name: doc.recipient.companyName,
    recipient_address: doc.recipient.address ?? null,
    subject: doc.subject,
    body: doc.body,
    status: doc.status,
    custom_fields: {
      senderCompanyName: doc.sender.companyName,
      senderAddress: doc.sender.address,
      senderCityState: doc.sender.cityState,
      senderPhone: doc.sender.phone,
      senderEmail: doc.sender.email,
      senderWebsite: doc.sender.website,
      senderLogoUrl: doc.sender.logoUrl,
      referenceNumber: doc.referenceNumber,
      date: doc.date,
      ...doc.metadata,
    },
    attachments: [...doc.attachments],
  }
}

// ---------------------------------------------------------------------------
// Domain → Update Payload
// ---------------------------------------------------------------------------

/** Payload for updating an existing letter row (immutable fields excluded). */
export interface LetterUpdatePayload {
  recipient_id?: string | null
  recipient_name?: string
  recipient_address?: string | null
  subject?: string
  body?: LetterBody
  status?: CorrespondenceLifecycleState
  custom_fields?: Record<string, unknown>
  attachments?: CorrespondenceAttachment[]
}

/** Maps mutable letter fields to an update payload. */
export function documentToUpdatePayload(
  doc: Partial<LetterDocument> & { sender?: CorrespondenceSender; recipient?: CorrespondenceRecipient; referenceNumber?: string; date?: string; metadata?: CorrespondenceMetadata },
): LetterUpdatePayload {
  const payload: LetterUpdatePayload = {}

  if (doc.recipient) {
    payload.recipient_id = doc.recipient.clientId ?? null
    payload.recipient_name = doc.recipient.companyName
    payload.recipient_address = doc.recipient.address ?? null
  }

  if (doc.subject !== undefined) payload.subject = doc.subject
  if (doc.body !== undefined) payload.body = doc.body
  if (doc.status !== undefined) payload.status = doc.status
  if (doc.attachments !== undefined) payload.attachments = [...doc.attachments]

  if (doc.sender || doc.referenceNumber || doc.date || doc.metadata) {
    const customFields: Record<string, unknown> = {}
    if (doc.sender) {
      customFields.senderCompanyName = doc.sender.companyName
      customFields.senderAddress = doc.sender.address
      customFields.senderCityState = doc.sender.cityState
      customFields.senderPhone = doc.sender.phone
      customFields.senderEmail = doc.sender.email
      customFields.senderWebsite = doc.sender.website
      customFields.senderLogoUrl = doc.sender.logoUrl
    }
    if (doc.referenceNumber !== undefined) customFields.referenceNumber = doc.referenceNumber
    if (doc.date !== undefined) customFields.date = doc.date
    if (doc.metadata) Object.assign(customFields, doc.metadata)
    payload.custom_fields = customFields
  }

  return payload
}

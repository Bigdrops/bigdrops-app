import { normalizeRichTextHtml } from '@/components/pdf-new/core/richText'
import { getAdditionalFields } from '../additionalFields'
import type {
  PreviewDetailRow,
  PreviewNoteSection,
  InvoiceLike,
  CustomFieldObjectLike,
} from '../renderTypes'

export type DetailRowsProjectionInput = {
  customFieldObject?: CustomFieldObjectLike
  poNumber?: string
  invoice: InvoiceLike
}

export function buildDetailRowsProjection(
  input: DetailRowsProjectionInput,
): PreviewDetailRow[] {
  const { customFieldObject, poNumber, invoice } = input

  const topHeaderFields = Array.isArray(customFieldObject?.header)
    ? customFieldObject.header.filter((field) => field?.label && field?.value)
    : []

  return [
    { label: 'PO Number', value: poNumber || '' },
    { label: 'Payment Terms', value: invoice.payment_terms || '' },
    { label: 'Work Duration', value: invoice.work_duration || '' },
    ...topHeaderFields.map((field) => ({ label: field.label || '', value: field.value || '' })),
  ].filter((row) => String(row.value || '').trim().length > 0)
}

export function buildAdditionalFieldsProjection(
  customFieldObject?: CustomFieldObjectLike,
): Array<{ label: string; value: string }> {
  return getAdditionalFields(customFieldObject)
    .map((field) => ({
      label: String(field.label || '').trim(),
      value: String(field.value || '').trim(),
    }))
    .filter((field) => field.label || field.value)
}

export function buildAttachmentLinksProjection(
  customFieldObject?: CustomFieldObjectLike,
): Array<{ label: string; url: string }> {
  return Array.isArray(customFieldObject?.attachments)
    ? customFieldObject.attachments
        .filter((entry) => entry?.url)
        .map((entry, index) => ({
          label: entry?.label || entry?.name || `Reference ${index + 1}`,
          url: entry?.url || '',
        }))
        .filter((entry) => entry.url)
    : []
}

export type NotesSectionsProjectionInput = {
  invoice: InvoiceLike
  customFieldObject?: CustomFieldObjectLike
  additionalFields: Array<{ label: string; value: string }>
  attachmentLinks: Array<{ label: string; url: string }>
}

export function buildNotesSectionsProjection(
  input: NotesSectionsProjectionInput,
): PreviewNoteSection[] {
  const { invoice, customFieldObject, additionalFields, attachmentLinks } = input

  return [
    invoice.notes
      ? {
          title: customFieldObject?.notesTitle || 'Notes',
          kind: 'html' as const,
          html: normalizeRichTextHtml(invoice.notes),
        }
      : null,
    invoice.terms
      ? {
          title: customFieldObject?.termsTitle || 'Terms and Conditions',
          kind: 'html' as const,
          html: normalizeRichTextHtml(invoice.terms),
        }
      : null,
    ...(additionalFields.length > 0
      ? [{
          title: 'Additional Fields',
          kind: 'fields' as const,
          fields: additionalFields,
        }]
      : []),
    ...(attachmentLinks.length > 0
      ? [{
          title: 'Reference Links',
          kind: 'links' as const,
          links: attachmentLinks,
        }]
      : []),
  ].filter(Boolean) as PreviewNoteSection[]
}

export function buildTopHeaderFieldsProjection(
  customFieldObject?: CustomFieldObjectLike,
): Array<{ label: string; value: string }> {
  return Array.isArray(customFieldObject?.header)
    ? customFieldObject.header
        .filter((field): field is { label: string; value: string } => Boolean(field?.label && field?.value))
    : []
}

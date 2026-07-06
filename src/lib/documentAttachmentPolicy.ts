/**
 * Upload policy for business document attachments (payments, receipts, etc.)
 *
 * Accepts images AND common business document formats.
 * Used by PaymentAttachmentUploader and similar non-image-only contexts.
 */

export const DOCUMENT_ATTACHMENT_ACCEPT_ATTRIBUTE = [
  // Images
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt',
].join(',')

const ALLOWED_MIME_PREFIXES = [
  'image/',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'text/csv',
  'text/plain',
]

export function isAcceptedAttachmentFile(file: File): boolean {
  const type = file.type
  if (ALLOWED_MIME_PREFIXES.some((prefix) => type.startsWith(prefix))) return true
  if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return true
  if (type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return true
  return false
}

export function getAttachmentRejectedMessage(fileName: string): string {
  return `"${fileName}" is not a supported file type. Please select an image, PDF, Word, Excel, CSV, or text file.`
}

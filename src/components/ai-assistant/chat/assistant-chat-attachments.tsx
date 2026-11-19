import { Download, FileCode, FileImage, FileText } from 'lucide-react'

/**
 * assistant-chat-attachments.tsx — attachment presentation for Bolu messages.
 *
 * Design reference: docs/prd/conversational-document-assistant/Chat-blocks/
 * attachment-default.tsx. The reference chips (media, title, description,
 * trailing action) are adapted to the BOUXRE `ac-` token surface.
 *
 * Only typed attachment payloads are read. This module never derives an
 * attachment from prose or from JSON-looking text, never builds a storage path
 * and never invents a URL. A file without a usable URL still renders as an
 * identity chip without an action.
 */

export interface BoluAttachmentItem {
  id?: string
  name: string
  href?: string
  mimeType?: string
  sizeBytes?: number
}

const ABSOLUTE_SAFE = /^https:\/\//i

/** Only https URLs and same-origin absolute paths are openable. */
function safeAttachmentHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const href = raw.trim()
  if (!href) return null
  if (/[\u0000-\u001f\u007f]/.test(href)) return null
  if (href.startsWith('//')) return null
  if (href.startsWith('/')) return href
  return ABSOLUTE_SAFE.test(href) ? href : null
}

export function formatAttachmentSize(bytes?: number): string | null {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Reads `metadata.attachments` from a persisted Bolu message.
 * Unknown shapes are ignored, so a malformed row cannot break the thread.
 */
export function readMessageAttachments(
  metadata: Record<string, unknown> | null | undefined,
): BoluAttachmentItem[] {
  const raw = metadata?.attachments
  if (!Array.isArray(raw)) return []

  const items: BoluAttachmentItem[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const name = typeof record.name === 'string' ? record.name.trim() : ''
    if (!name) continue

    const href = safeAttachmentHref(record.url)
    const mimeType =
      typeof record.mimeType === 'string' && record.mimeType.trim()
        ? record.mimeType.trim().slice(0, 64)
        : undefined
    const sizeBytes =
      typeof record.sizeBytes === 'number' && Number.isFinite(record.sizeBytes) && record.sizeBytes > 0
        ? record.sizeBytes
        : undefined

    items.push({
      id: typeof record.id === 'string' ? record.id : undefined,
      name: name.slice(0, 160),
      href: href ?? undefined,
      mimeType,
      sizeBytes,
    })
  }

  return items.slice(0, 12)
}

function attachmentIcon(name: string, mimeType?: string) {
  const type = (mimeType ?? '').toLowerCase()
  const extension = name.toLowerCase().split('.').pop() ?? ''
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
    return FileImage
  }
  if (
    type.includes('json') ||
    type.includes('javascript') ||
    type.includes('typescript') ||
    ['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'sql', 'css', 'html'].includes(extension)
  ) {
    return FileCode
  }
  return FileText
}

export function AssistantAttachments({ attachments }: { attachments: BoluAttachmentItem[] }) {
  if (!attachments || attachments.length === 0) return null

  return (
    <div className="ac-attach-group" aria-label="Message attachments">
      <p className="ac-attach-label">Attachments</p>
      {attachments.map((attachment, index) => {
        const Icon = attachmentIcon(attachment.name, attachment.mimeType)
        const meta = [attachment.mimeType, formatAttachmentSize(attachment.sizeBytes)]
          .filter(Boolean)
          .join(' · ')

        return (
          <div
            key={attachment.id ?? `${attachment.name}-${index}`}
            className="ac-attach"
            data-missing={attachment.href ? 'false' : 'true'}
          >
            <span className="ac-attach-media" aria-hidden="true">
              <Icon className="size-3.5" />
            </span>
            <span className="ac-attach-body">
              <span className="ac-attach-name" title={attachment.name}>
                {attachment.name}
              </span>
              <span className="ac-attach-meta">{meta || 'Attachment'}</span>
            </span>
            {attachment.href ? (
              <a
                className="ac-attach-action"
                href={attachment.href}
                target="_blank"
                rel="noopener noreferrer"
                download={attachment.name}
                aria-label={`Open ${attachment.name}`}
                title={`Open ${attachment.name}`}
              >
                <Download className="size-3.5" aria-hidden="true" />
              </a>
            ) : (
              <span className="ac-attach-action" aria-hidden="true" title="Attachment unavailable">
                <Download className="size-3.5" />
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

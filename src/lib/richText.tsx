import DOMPurify from 'dompurify'
import { normalizeRichTextHtml, richTextToPlainText } from '@/components/pdf-new/core/richText'

function canUseDomPurify() {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined'
}

export { richTextToPlainText }

export function sanitizeRichTextHtml(value: unknown) {
  const normalized = normalizeRichTextHtml(value)
  if (!normalized) return ''
  return canUseDomPurify() ? DOMPurify.sanitize(normalized) : normalized
}

export function renderRichTextContent(value: unknown, className = 'prose prose-sm max-w-none break-words text-foreground') {
  const cleanHtml = sanitizeRichTextHtml(value)
  if (!cleanHtml) return null

  return <div className={className} dangerouslySetInnerHTML={{ __html: cleanHtml }} />
}

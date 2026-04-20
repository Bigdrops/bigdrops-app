import DOMPurify from 'dompurify'
import { richTextToPlainText } from './richTextPlain.js'

function canUseDomPurify() {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined'
}

export { richTextToPlainText }

export function sanitizeRichTextHtml(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return ''
  return canUseDomPurify() ? DOMPurify.sanitize(value) : value
}

export function renderRichTextContent(value: unknown, className = 'prose prose-sm max-w-none break-words text-foreground') {
  const cleanHtml = sanitizeRichTextHtml(value)
  if (!cleanHtml) return null

  return <div className={className} dangerouslySetInnerHTML={{ __html: cleanHtml }} />
}

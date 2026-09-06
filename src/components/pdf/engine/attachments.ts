import type { CommercialDocumentData } from '../industryAdapter'

function ensureProtocol(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}

type AttachmentItem = {
  label: string
  url: string | null
  formattedUrl: string | null
}

export function buildAttachmentItems(
  attachments: CommercialDocumentData['attachments']
): AttachmentItem[] {
  return attachments.map((item) => {
    if (typeof item === 'string') {
      return { label: item, url: null, formattedUrl: null }
    }
    const label = item?.label || item?.url || ''
    const url = item?.url || null
    const formattedUrl = url ? ensureProtocol(url) : null
    return { label, url, formattedUrl }
  })
}

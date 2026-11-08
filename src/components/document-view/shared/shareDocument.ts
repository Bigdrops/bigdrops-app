import { toPublicShareUrl } from '@/lib/publicUrl'

type ShareDocumentOptions = {
  title: string
  text?: string
  url?: string
  fallbackText?: string
}

export async function shareDocument(options: ShareDocumentOptions) {
  const shareUrl = toPublicShareUrl(options.url)

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    await navigator.share({
      title: options.title,
      text: options.text || undefined,
      url: shareUrl || undefined,
    })
    return 'shared'
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    const defaultCopyText = [options.title, options.text, shareUrl]
      .filter((part): part is string => typeof part === 'string' && part.trim() !== '')
      .join('\n')

    await navigator.clipboard.writeText(options.fallbackText || defaultCopyText || shareUrl)
    return 'copied'
  }

  throw new Error('Share is not available on this device.')
}

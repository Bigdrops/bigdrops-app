type ShareDocumentOptions = {
  title: string
  text: string
  url?: string
  fallbackText?: string
}

export async function shareDocument(options: ShareDocumentOptions) {
  const shareUrl = options.url || (typeof window !== 'undefined' ? window.location.href : '')

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    await navigator.share({
      title: options.title,
      text: options.text,
      url: shareUrl || undefined,
    })
    return 'shared'
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(options.fallbackText || shareUrl || `${options.title}\n${options.text}`)
    return 'copied'
  }

  throw new Error('Share is not available on this device.')
}

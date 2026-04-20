function decodeHtmlEntities(value) {
  if (!value) return ''
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = value
    return textarea.value
  }

  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

export function richTextToPlainText(value) {
  if (typeof value !== 'string' || !value.trim()) return ''

  const withBreaks = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, '\n')
    .replace(/<li>/gi, '- ')

  const withoutTags = withBreaks.replace(/<[^>]+>/g, ' ')
  const decoded = decodeHtmlEntities(withoutTags)

  return decoded
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

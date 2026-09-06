type RichTextMark = 'bold' | 'italic' | 'underline'

export type RichTextSegment = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

export type RichTextParagraphBlock = {
  type: 'paragraph'
  segments: RichTextSegment[]
}

export type RichTextListBlock = {
  type: 'bullet_list' | 'ordered_list'
  items: RichTextSegment[][]
}

export type RichTextBlock = RichTextParagraphBlock | RichTextListBlock

export type RichTextDocument = {
  blocks: RichTextBlock[]
}

type RichTextSectionLike = {
  title: string
  content: string
  format?: string
} | null | undefined

const ENTITY_MAP: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#39|nbsp|amp|lt|gt|quot);/gi, (match, entity) => ENTITY_MAP[String(entity).toLowerCase()] ?? match)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function collapseTextWhitespace(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\r/g, '')
    .replace(/\s+/g, ' ')
}

function mergeAdjacentSegments(segments: RichTextSegment[]) {
  const merged: RichTextSegment[] = []

  segments.forEach((segment) => {
    if (!segment.text) return
    const previous = merged[merged.length - 1]
    if (
      previous
      && previous.bold === segment.bold
      && previous.italic === segment.italic
      && previous.underline === segment.underline
    ) {
      previous.text += segment.text
      return
    }
    merged.push({ ...segment })
  })

  return merged
}

function trimSegmentEdges(segments: RichTextSegment[]) {
  const trimmed = mergeAdjacentSegments(segments.map((segment) => ({ ...segment })))
  if (trimmed.length === 0) return trimmed

  trimmed[0].text = trimmed[0].text.replace(/^\s+/g, '')
  trimmed[trimmed.length - 1].text = trimmed[trimmed.length - 1].text.replace(/\s+$/g, '')

  return trimmed.filter((segment) => segment.text.length > 0)
}

function createSegment(text: string, marks: Set<RichTextMark>): RichTextSegment {
  return {
    text,
    bold: marks.has('bold') || undefined,
    italic: marks.has('italic') || undefined,
    underline: marks.has('underline') || undefined,
  }
}

function plainTextFromSegments(segments: RichTextSegment[]) {
  return segments.map((segment) => segment.text).join('')
}

function renderSegmentsToHtml(segments: RichTextSegment[]) {
  return segments
    .map((segment) => {
      let html = escapeHtml(segment.text).replace(/\n/g, '<br />')
      if (segment.underline) html = `<u>${html}</u>`
      if (segment.italic) html = `<em>${html}</em>`
      if (segment.bold) html = `<strong>${html}</strong>`
      return html
    })
    .join('')
}

export function parseRichText(value: unknown): RichTextDocument {
  if (typeof value !== 'string' || !value.trim()) return { blocks: [] }

  const tokens: string[] = value.match(/<!--[\s\S]*?-->|<\/?[^>]+>|[^<]+/g) || []
  const blocks: RichTextBlock[] = []
  const marks = new Set<RichTextMark>()
  const skipStack: string[] = []
  let paragraphSegments: RichTextSegment[] = []
  let currentList: RichTextListBlock | null = null
  let currentListItem: RichTextSegment[] | null = null

  const pushParagraph = () => {
    const trimmed = trimSegmentEdges(paragraphSegments)
    if (trimmed.length > 0) {
      blocks.push({ type: 'paragraph', segments: trimmed })
    }
    paragraphSegments = []
  }

  const pushListItem = () => {
    if (!currentList || !currentListItem) return
    const trimmed = trimSegmentEdges(currentListItem)
    if (trimmed.length > 0) currentList.items.push(trimmed)
    currentListItem = null
  }

  const pushList = () => {
    if (!currentList) return
    pushListItem()
    if (currentList.items.length > 0) blocks.push(currentList)
    currentList = null
  }

  const appendText = (rawText: string) => {
    const normalizedText = collapseTextWhitespace(rawText)
    if (!normalizedText) return
    const segment = createSegment(normalizedText, marks)
    if (currentListItem) {
      currentListItem.push(segment)
      return
    }
    paragraphSegments.push(segment)
  }

  const appendLineBreak = () => {
    const target = currentListItem || paragraphSegments
    if (target.length === 0) return
    target.push(createSegment('\n', marks))
  }

  tokens.forEach((token) => {
    if (skipStack.length > 0) {
      if (/^<\//.test(token)) {
        const closeTag = token.replace(/^<\//, '').replace(/>$/g, '').trim().toLowerCase()
        if (closeTag === skipStack[skipStack.length - 1]) skipStack.pop()
      } else if (/^<[^!/]/.test(token)) {
        const openTag = token.replace(/^</, '').replace(/\/?>$/g, '').trim().toLowerCase().split(/\s+/, 1)[0]
        if (openTag === skipStack[skipStack.length - 1]) skipStack.push(openTag)
      }
      return
    }

    if (!token.startsWith('<')) {
      appendText(token)
      return
    }

    if (/^<!--/.test(token)) return

    const isClosing = /^<\//.test(token)
    const tagName = token
      .replace(/^<\//, '')
      .replace(/^</, '')
      .replace(/\/?>$/g, '')
      .trim()
      .toLowerCase()
      .split(/\s+/, 1)[0]

    if (!tagName) return

    if (tagName === 'script' || tagName === 'style') {
      if (!isClosing) skipStack.push(tagName)
      return
    }

    if (tagName === 'br') {
      appendLineBreak()
      return
    }

    if (tagName === 'strong' || tagName === 'b') {
      if (isClosing) marks.delete('bold')
      else marks.add('bold')
      return
    }

    if (tagName === 'em' || tagName === 'i') {
      if (isClosing) marks.delete('italic')
      else marks.add('italic')
      return
    }

    if (tagName === 'u') {
      if (isClosing) marks.delete('underline')
      else marks.add('underline')
      return
    }

    if (tagName === 'p' || tagName === 'div') {
      if (isClosing) pushParagraph()
      else if (paragraphSegments.length > 0) pushParagraph()
      return
    }

    if (tagName === 'ul' || tagName === 'ol') {
      if (isClosing) {
        pushList()
      } else {
        pushParagraph()
        pushList()
        currentList = {
          type: tagName === 'ul' ? 'bullet_list' : 'ordered_list',
          items: [],
        }
      }
      return
    }

    if (tagName === 'li') {
      if (!currentList) {
        pushParagraph()
        currentList = { type: 'bullet_list', items: [] }
      }
      if (isClosing) {
        pushListItem()
      } else {
        pushListItem()
        currentListItem = []
      }
    }
  })

  pushParagraph()
  pushList()

  return { blocks }
}

function fallbackPlainText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|ul|ol)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function normalizeRichTextHtml(value: unknown): string {
  try {
    const document = parseRichText(value)
    if (document.blocks.length === 0) return ''

    return document.blocks.map((block) => {
      if (block.type === 'paragraph') {
        return `<p>${renderSegmentsToHtml(block.segments)}</p>`
      }

      const tag = block.type === 'bullet_list' ? 'ul' : 'ol'
      const items = block.items
        .map((item) => `<li>${renderSegmentsToHtml(item)}</li>`)
        .join('')
      return `<${tag}>${items}</${tag}>`
    }).join('')
  } catch {
    const plainText = fallbackPlainText(String(value || ''))
    return plainText ? `<p>${escapeHtml(plainText).replace(/\n/g, '<br />')}</p>` : ''
  }
}

export function richTextToPlainText(value: unknown): string {
  try {
    const document = parseRichText(value)
    if (document.blocks.length === 0) return ''

    return document.blocks.map((block) => {
      if (block.type === 'paragraph') return plainTextFromSegments(block.segments).trim()

      return block.items.map((item, index) => {
        const marker = block.type === 'bullet_list' ? '•' : `${index + 1}.`
        return `${marker} ${plainTextFromSegments(item).trim()}`
      }).join('\n')
    }).filter(Boolean).join('\n\n')
  } catch {
    return fallbackPlainText(String(value || ''))
  }
}

export function normalizeRichTextSection<T extends RichTextSectionLike>(section: T) {
  if (!section?.content) return null

  const content = normalizeRichTextHtml(section.content)
  const plainText = richTextToPlainText(content || section.content)
  if (!content && !plainText) return null

  return {
    ...section,
    content: content || `<p>${escapeHtml(plainText)}</p>`,
    plainText,
    format: 'rich-text' as const,
  }
}

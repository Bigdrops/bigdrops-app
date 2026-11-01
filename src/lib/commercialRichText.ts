/**
 * Shared commercial rich-text contract for AI JSON imports (Invoice, PO, Quotation, CSR).
 *
 * One typed block representation that the extraction prompts emit, the import
 * pipeline validates, and the shared renderers interpret. A notes/terms field may be:
 *   - null / undefined  -> no content
 *   - string            -> legacy plain text or HTML rich text (unchanged behaviour)
 *   - block array       -> structured rich text (this contract)
 *
 * Structured blocks are canonicalized to the app's existing rich-text HTML string,
 * the format the editor, the on-screen previews and the PDF interpreter already use.
 * That keeps persistence, editing and rendering backward compatible without new
 * fields or migrations.
 *
 * Malformed structured content is rejected with a message; it is never silently
 * flattened into commercial text.
 */

export type CommercialRichTextRun = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

export type CommercialRichTextParagraphBlock = {
  type: 'paragraph'
  children: CommercialRichTextRun[]
}

export type CommercialRichTextHeadingBlock = {
  type: 'heading'
  text: string
  level?: 1 | 2 | 3
}

export type CommercialRichTextListBlock = {
  type: 'ordered_list' | 'unordered_list'
  items: CommercialRichTextRun[][]
}

export type CommercialRichTextBlock =
  | CommercialRichTextParagraphBlock
  | CommercialRichTextHeadingBlock
  | CommercialRichTextListBlock

export type CommercialRichTextParseResult =
  | { ok: true; blocks: CommercialRichTextBlock[] }
  | { ok: false; message: string }

export type ImportedRichTextFieldResult =
  | { ok: true; value?: string }
  | { ok: false; message: string }

const SUPPORTED_BLOCK_TYPES = new Set(['paragraph', 'heading', 'ordered_list', 'unordered_list'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function escapeRichText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function parseRun(raw: unknown, fieldLabel: string, path: string): { ok: true; run: CommercialRichTextRun } | { ok: false; message: string } {
  if (!isRecord(raw)) {
    return { ok: false, message: `${fieldLabel}: ${path} must be an object with a "text" string.` }
  }

  const text = raw.text
  if (typeof text !== 'string') {
    return { ok: false, message: `${fieldLabel}: ${path}.text must be a string.` }
  }

  const run: CommercialRichTextRun = { text }

  const marks: Array<'bold' | 'italic' | 'underline'> = ['bold', 'italic', 'underline']
  for (const mark of marks) {
    const flag = raw[mark]
    if (flag === undefined) continue
    if (typeof flag !== 'boolean') {
      return { ok: false, message: `${fieldLabel}: ${path}.${mark} must be true or false.` }
    }
    if (flag) run[mark] = true
  }

  return { ok: true, run }
}

function parseRunList(
  raw: unknown,
  fieldLabel: string,
  path: string,
): { ok: true; runs: CommercialRichTextRun[] } | { ok: false; message: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, message: `${fieldLabel}: ${path} must be an array of text runs.` }
  }

  const runs: CommercialRichTextRun[] = []
  for (let i = 0; i < raw.length; i++) {
    const parsed = parseRun(raw[i], fieldLabel, `${path}[${i}]`)
    if (parsed.ok === false) return parsed
    runs.push(parsed.run)
  }

  return { ok: true, runs }
}

/**
 * Strictly validates the shared rich-text block contract.
 * Unknown block types, missing properties, wrong types and malformed arrays are rejected.
 */
export function parseCommercialRichTextBlocks(value: unknown, fieldLabel: string): CommercialRichTextParseResult {
  if (!Array.isArray(value)) {
    return { ok: false, message: `${fieldLabel} must be an array of rich-text blocks.` }
  }

  const blocks: CommercialRichTextBlock[] = []

  for (let index = 0; index < value.length; index++) {
    const raw = value[index]
    const path = `blocks[${index}]`

    if (!isRecord(raw)) {
      return { ok: false, message: `${fieldLabel}: ${path} must be an object.` }
    }

    const type = raw.type
    if (typeof type !== 'string' || !SUPPORTED_BLOCK_TYPES.has(type)) {
      return {
        ok: false,
        message: `${fieldLabel}: ${path} has unsupported block type "${String(type)}". Supported types: paragraph, heading, ordered_list, unordered_list.`,
      }
    }

    if (type === 'paragraph') {
      const children = parseRunList(raw.children, fieldLabel, `${path}.children`)
      if (children.ok === false) return children
      blocks.push({ type: 'paragraph', children: children.runs })
      continue
    }

    if (type === 'heading') {
      const text = raw.text
      if (typeof text !== 'string') {
        return { ok: false, message: `${fieldLabel}: ${path}.text must be a string.` }
      }
      const level = raw.level
      if (level === undefined) {
        blocks.push({ type: 'heading', text })
        continue
      }
      if (level !== 1 && level !== 2 && level !== 3) {
        return { ok: false, message: `${fieldLabel}: ${path}.level must be 1, 2 or 3.` }
      }
      blocks.push({ type: 'heading', text, level })
      continue
    }

    const items = raw.items
    if (!Array.isArray(items)) {
      return { ok: false, message: `${fieldLabel}: ${path}.items must be an array of list items.` }
    }
    const parsedItems: CommercialRichTextRun[][] = []
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const parsedItem = parseRunList(items[itemIndex], fieldLabel, `${path}.items[${itemIndex}]`)
      if (parsedItem.ok === false) return parsedItem
      parsedItems.push(parsedItem.runs)
    }
    blocks.push({ type, items: parsedItems } as CommercialRichTextListBlock)
  }

  return { ok: true, blocks }
}

function runsToHtml(runs: CommercialRichTextRun[]): string {
  return runs
    .map((run) => {
      let text = escapeRichText(run.text)
      if (run.bold) text = `<strong>${text}</strong>`
      if (run.italic) text = `<em>${text}</em>`
      if (run.underline) text = `<u>${text}</u>`
      return text
    })
    .join('')
}

/**
 * Canonical rich-text HTML serialization (TipTap-compatible: p, strong, em, u, h1-h3, ul, ol, li).
 */
export function commercialRichTextToHtml(blocks: CommercialRichTextBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === 'paragraph') {
        const inner = runsToHtml(block.children)
        return inner ? `<p>${inner}</p>` : ''
      }

      if (block.type === 'heading') {
        const level = block.level ?? 2
        const text = escapeRichText(block.text).trim()
        return text ? `<h${level}>${text}</h${level}>` : ''
      }

      const tag = block.type === 'ordered_list' ? 'ol' : 'ul'
      const items = block.items
        .map((item) => {
          const inner = runsToHtml(item)
          return inner ? `<li>${inner}</li>` : ''
        })
        .filter(Boolean)
        .join('')
      return items ? `<${tag}>${items}</${tag}>` : ''
    })
    .filter(Boolean)
    .join('')
}

/**
 * Structure-preserving plain text serialization for surfaces whose canonical field
 * format is plain text (CSR narrative fields): paragraphs separated by a blank line,
 * headings on their own line, list markers preserved.
 */
export function commercialRichTextToPlainText(blocks: CommercialRichTextBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === 'paragraph') {
        return block.children.map((run) => run.text).join('').trim()
      }

      if (block.type === 'heading') {
        return block.text.trim()
      }

      return block.items
        .map((item, index) => {
          const marker = block.type === 'ordered_list' ? `${index + 1}.` : '•'
          return `${marker} ${item.map((run) => run.text).join('').trim()}`
        })
        .filter((line) => line.trim().length > 0)
        .join('\n')
    })
    .filter((part) => part.length > 0)
    .join('\n\n')
}

/**
 * Normalizes an imported notes/terms-style field that may be null, a legacy string
 * or a structured rich-text block array. Legacy strings are passed through the
 * caller's existing text normalization unchanged; structured arrays are validated
 * strictly and serialized to the requested output format.
 */
export function normalizeImportedRichTextField(
  value: unknown,
  fieldLabel: string,
  normalizeLegacyText: (value: unknown) => string | undefined,
  format: 'html' | 'plain-text' = 'html',
): ImportedRichTextFieldResult {
  if (value === null || value === undefined) return { ok: true, value: undefined }

  if (typeof value === 'string') {
    return { ok: true, value: normalizeLegacyText(value) }
  }

  if (Array.isArray(value)) {
    const parsed = parseCommercialRichTextBlocks(value, fieldLabel)
    if (parsed.ok === false) return parsed
    if (parsed.blocks.length === 0) return { ok: true, value: undefined }
    const serialized =
      format === 'plain-text' ? commercialRichTextToPlainText(parsed.blocks) : commercialRichTextToHtml(parsed.blocks)
    return { ok: true, value: serialized }
  }

  return {
    ok: false,
    message: `${fieldLabel} must be text, null, or an array of rich-text blocks.`,
  }
}

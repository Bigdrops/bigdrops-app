import { useMemo, type ReactNode } from 'react'

import { AssistantCodeBlock } from './assistant-chat-code-block'

/**
 * assistant-chat-markdown.tsx — Bolu 2.0 unified Markdown renderer.
 *
 * Design reference: docs/prd/conversational-document-assistant/Chat-blocks/
 * chat-default.tsx (the `toBlocks` / `Markdown` / `MarkdownCodeBlock` section).
 * That reference splits prose and fences and sends fences to a code block. This
 * module keeps that shape, adds the remaining approved elements (headings,
 * quotes, ordered and nested lists, tables, rules) and is written to survive a
 * partially streamed response.
 *
 * Content handling:
 * - No HTML is accepted or parsed. Nothing is rendered with
 *   dangerouslySetInnerHTML, so AI output can never inject markup.
 * - Links are only rendered for http(s) and mailto URLs. Any other scheme
 *   (javascript:, data:, vbscript:, file:, protocol-relative) renders as text.
 * - No code is executed or evaluated; fences render as inert text.
 */

export type MarkdownInline =
  | { kind: 'text'; value: string }
  | { kind: 'strong'; value: string }
  | { kind: 'em'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'link'; value: string; href: string }

export interface MarkdownListItem {
  text: string
  children: string[]
}

export type MarkdownBlock =
  | { kind: 'code'; language: string; code: string; open: boolean }
  | { kind: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { kind: 'list'; ordered: boolean; start: number; items: MarkdownListItem[] }
  | { kind: 'quote'; text: string }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'rule' }
  | { kind: 'paragraph'; text: string }

const FENCE = /^\s{0,3}(`{3,}|~{3,})(.*)$/
const HEADING = /^\s{0,3}(#{1,4})\s+(.*)$/
const RULE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/
const QUOTE = /^\s{0,3}>\s?(.*)$/
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/
const SAFE_PROTOCOL = /^(https?:\/\/|mailto:)/i

/** Keeps the declared language identifier, sanitised. Never invents one. */
export function normalizeLanguage(info: string): string {
  const token = String(info ?? '')
    .trim()
    .split(/\s+/)[0]
  if (!token) return ''
  const clean = token.replace(/[^a-zA-Z0-9+#._-]/g, '').slice(0, 24)
  return clean.toLowerCase()
}

/** Returns a safe href, or null for any URL the renderer must not link. */
export function safeHref(raw: string): string | null {
  const href = String(raw ?? '').trim()
  if (!href) return null
  if (CONTROL_CHARS.test(href)) return null
  if (href.startsWith('//')) return null
  return SAFE_PROTOCOL.test(href) ? href : null
}

const INLINE_PATTERN =
  /`([^`\n]+)`|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_|\[([^\]\n]+)\]\(([^()\s]+)\)/g

/** Splits one line into plain, strong, emphasis, inline code and link runs. */
export function parseInlineMarkdown(text: string): MarkdownInline[] {
  const source = String(text ?? '')
  const runs: MarkdownInline[] = []
  let cursor = 0

  INLINE_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = INLINE_PATTERN.exec(source))) {
    if (match.index > cursor) runs.push({ kind: 'text', value: source.slice(cursor, match.index) })

    if (match[1] !== undefined) {
      runs.push({ kind: 'code', value: match[1] })
    } else if (match[2] !== undefined) {
      runs.push({ kind: 'strong', value: match[2] })
    } else if (match[3] !== undefined) {
      runs.push({ kind: 'strong', value: match[3] })
    } else if (match[4] !== undefined) {
      runs.push({ kind: 'em', value: match[4] })
    } else if (match[5] !== undefined) {
      runs.push({ kind: 'em', value: match[5] })
    } else if (match[6] !== undefined && match[7] !== undefined) {
      runs.push({ kind: 'link', value: match[6], href: match[7] })
    }

    cursor = match.index + match[0].length
  }

  if (cursor < source.length) runs.push({ kind: 'text', value: source.slice(cursor) })
  return runs
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function startsBlock(line: string): boolean {
  return FENCE.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line) || LIST_ITEM.test(line)
}

function isTableStart(lines: string[], index: number): boolean {
  const line = lines[index]
  const next = lines[index + 1]
  if (!line || !next) return false
  if (!line.includes('|')) return false
  if (!TABLE_SEPARATOR.test(next)) return false
  return splitTableRow(line).length === splitTableRow(next).length
}

function isClosingFence(line: string, marker: string): boolean {
  const trimmed = line.trim()
  if (trimmed.length < 3) return false
  return trimmed.split('').every((char) => char === marker)
}

/**
 * Parses assistant Markdown into renderable blocks.
 *
 * Streaming safety: an unterminated fence becomes a code block flagged `open`
 * instead of swallowing the rest of the message as prose, and every other block
 * is parsed line by line so partial input never throws.
 */
export function parseAssistantMarkdown(source: string): MarkdownBlock[] {
  const lines = String(source ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = FENCE.exec(line)
    if (fence) {
      const marker = fence[1][0]
      const language = normalizeLanguage(fence[2] ?? '')
      const body: string[] = []
      let cursor = index + 1
      let closed = false
      while (cursor < lines.length) {
        if (isClosingFence(lines[cursor], marker)) {
          closed = true
          break
        }
        body.push(lines[cursor])
        cursor += 1
      }
      blocks.push({ kind: 'code', language, code: body.join('\n'), open: !closed })
      index = closed ? cursor + 1 : cursor
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      const level = Math.min(heading[1].length, 4) as 1 | 2 | 3 | 4
      blocks.push({ kind: 'heading', level, text: heading[2].trim() })
      index += 1
      continue
    }

    if (RULE.test(line)) {
      blocks.push({ kind: 'rule' })
      index += 1
      continue
    }

    if (QUOTE.test(line)) {
      const quoted: string[] = []
      while (index < lines.length) {
        const match = QUOTE.exec(lines[index])
        if (!match) break
        quoted.push(match[1])
        index += 1
      }
      blocks.push({ kind: 'quote', text: quoted.join('\n').trim() })
      continue
    }

    if (isTableStart(lines, index)) {
      const header = splitTableRow(line)
      const rows: string[][] = []
      index += 2
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }
      blocks.push({ kind: 'table', header, rows })
      continue
    }

    const listStart = LIST_ITEM.exec(line)
    if (listStart) {
      const baseIndent = listStart[1].length
      const ordered = /\d/.test(listStart[2])
      const start = ordered ? Number.parseInt(listStart[2], 10) : 1
      const items: MarkdownListItem[] = []

      while (index < lines.length) {
        const current = lines[index]
        if (!current.trim()) break
        const match = LIST_ITEM.exec(current)
        if (!match) {
          if (items.length > 0 && /^\s{2,}\S/.test(current)) {
            items[items.length - 1].children.push(current.trim())
            index += 1
            continue
          }
          break
        }
        const indent = match[1].length
        const isOrdered = /\d/.test(match[2])
        if (indent < baseIndent) break
        if (indent <= baseIndent && isOrdered !== ordered) break
        if (indent > baseIndent && items.length > 0) {
          items[items.length - 1].children.push(match[3])
        } else {
          items.push({ text: match[3], children: [] })
        }
        index += 1
      }

      blocks.push({ kind: 'list', ordered, start: Number.isFinite(start) ? start : 1, items })
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length) {
      const current = lines[index]
      if (!current.trim()) break
      if (paragraph.length > 0 && (startsBlock(current) || isTableStart(lines, index))) break
      paragraph.push(current)
      index += 1
    }
    blocks.push({ kind: 'paragraph', text: paragraph.join('\n') })
  }

  return blocks
}

function renderInline(text: string): ReactNode[] {
  return parseInlineMarkdown(text).map((run, position) => {
    const key = `run-${position}`
    if (run.kind === 'strong') {
      return (
        <strong key={key} className="ac-md-strong">
          {run.value}
        </strong>
      )
    }
    if (run.kind === 'em') {
      return (
        <em key={key} className="ac-md-em">
          {run.value}
        </em>
      )
    }
    if (run.kind === 'code') {
      return (
        <code key={key} className="ac-md-code">
          {run.value}
        </code>
      )
    }
    if (run.kind === 'link') {
      const href = safeHref(run.href)
      if (!href) return <span key={key}>{run.value}</span>
      return (
        <a key={key} className="ac-md-link" href={href} title={href} target="_blank" rel="noopener noreferrer nofollow ugc">
          {run.value}
        </a>
      )
    }
    return <span key={key}>{run.value}</span>
  })
}

const HEADING_TAGS = { 1: 'h3', 2: 'h4', 3: 'h5', 4: 'h6' } as const

/**
 * AssistantMarkdown — the single renderer for assistant prose. Used for
 * streamed and persisted messages alike, so history and live output cannot
 * drift apart.
 */
export function AssistantMarkdown({
  text,
  streaming = false,
  caret = false,
}: {
  text: string
  streaming?: boolean
  caret?: boolean
}) {
  const blocks = useMemo(() => parseAssistantMarkdown(text), [text])
  const lastIndex = blocks.length - 1
  let caretRendered = false

  const caretNode = caret ? <span className="ac-caret" aria-hidden="true" /> : null

  return (
    <div className="ac-md">
      {blocks.map((block, position) => {
        const key = `block-${position}-${block.kind}`

        if (block.kind === 'code') {
          return (
            <AssistantCodeBlock
              key={key}
              code={block.code}
              language={block.language}
              incomplete={streaming && block.open}
            />
          )
        }

        if (block.kind === 'heading') {
          const Tag = HEADING_TAGS[block.level]
          return (
            <Tag key={key} className={`ac-md-heading ac-md-h${block.level}`}>
              {renderInline(block.text)}
            </Tag>
          )
        }

        if (block.kind === 'rule') {
          return <hr key={key} className="ac-md-rule" />
        }

        if (block.kind === 'quote') {
          return (
            <blockquote key={key} className="ac-md-quote">
              {block.text}
            </blockquote>
          )
        }

        if (block.kind === 'table') {
          return (
            <div key={key} className="ac-md-table-wrap">
              <table className="ac-md-table">
                <thead>
                  <tr>
                    {block.header.map((cell, cellIndex) => (
                      <th key={`cell-${cellIndex}`} scope="col">
                        {renderInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`cell-${cellIndex}`}>{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        if (block.kind === 'list') {
          const withCaret = caret && position === lastIndex && block.items.length > 0
          const items = block.items.map((item, itemIndex) => {
            const isLastItem = withCaret && itemIndex === block.items.length - 1
            return (
              <li key={`item-${itemIndex}`} className="ac-md-list-item">
                {renderInline(item.text)}
                {isLastItem ? caretNode : null}
                {item.children.length > 0 ? (
                  <ul className="ac-md-sublist ac-md-list--bullet">
                    {item.children.map((child, childIndex) => (
                      <li key={`child-${childIndex}`} className="ac-md-list-item">
                        {renderInline(child)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })

          if (block.ordered) {
            return (
              <ol
                key={key}
                className="ac-md-list ac-md-list--ordered"
                start={block.start !== 1 ? block.start : undefined}
              >
                {items}
              </ol>
            )
          }

          return (
            <ul key={key} className="ac-md-list ac-md-list--bullet">
              {items}
            </ul>
          )
        }

        const withCaret = caret && position === lastIndex
        if (withCaret) caretRendered = true
        return (
          <p key={key} className="ac-md-p">
            {renderInline(block.text)}
            {withCaret ? caretNode : null}
          </p>
        )
      })}

      {caret && !caretRendered ? caretNode : null}
    </div>
  )
}

import type { LetterBody } from '@/domain/correspondence/letter/types'
import RichTextEditor from '@/components/RichTextEditor'

interface LetterBodyEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function textToBodyBlocks(text: string): LetterBody {
  return {
    blocks: text
      ? text.split('\n').map((line) => ({ type: 'paragraph' as const, text: line }))
      : [{ type: 'paragraph', text: '' }],
  }
}

export function bodyBlocksToText(body: LetterBody): string {
  return body.blocks
    .filter((b) => b.type === 'paragraph' || b.type === 'heading')
    .map((b) => ('text' in b ? b.text : ''))
    .join('\n')
}

// ponytail: wraps RichTextEditor; formatting not persisted to LetterBody blocks.
// Full TipTap→LetterBody serializer when formatting persistence is needed.
function htmlToText(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent || el.innerText || ''
}

function textToHtml(text: string): string {
  return text
    .split('\n')
    .map((l) => (l ? `<p>${l}</p>` : '<p><br></p>'))
    .join('')
}

export default function LetterBodyEditor({ value, onChange, disabled }: LetterBodyEditorProps) {
  if (disabled) {
    return (
      <div className="w-full rounded-xl border border-bd-border bg-bd-surface-muted p-4 text-sm text-bd-text-muted leading-relaxed whitespace-pre-wrap min-h-[150px]">
        {value || 'No content'}
      </div>
    )
  }
  return <RichTextEditor value={textToHtml(value)} onChange={(html) => onChange(htmlToText(html))} placeholder="Enter letter body..." />
}

import type { LetterBody } from '@/domain/correspondence/letter/types'

interface LetterBodyEditorProps {
  value: string
  onChange: (value: string) => void
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

export default function LetterBodyEditor({ value, onChange }: LetterBodyEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter letter body..."
      rows={12}
      className="w-full resize-y rounded-xl border border-bd-border bg-bd-surface p-4 text-sm text-bd-text placeholder:text-bd-text-muted focus:outline-none focus:ring-2 focus:ring-bd-button-primary-bg"
    />
  )
}

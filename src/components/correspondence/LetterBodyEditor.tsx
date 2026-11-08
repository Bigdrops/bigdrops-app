import type { LetterBody } from '@/domain/correspondence/letter/types'
import Editor from '@/components/ui/editor'

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

// ponytail: wraps Editor; formatting not persisted to LetterBody blocks.
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
      <div className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 sm:px-8 py-6 text-[15px] sm:text-[16px] leading-[1.8] text-zinc-700 whitespace-pre-wrap min-h-[360px] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
        {value || <span className="text-zinc-400 italic dark:text-zinc-600">No letter content</span>}
      </div>
    )
  }

  return (
    <Editor
      variant="letter"
      value={textToHtml(value)}
      onChange={(html) => onChange(htmlToText(html))}
      placeholder="Compose your official letter body here..."
    />
  )
}

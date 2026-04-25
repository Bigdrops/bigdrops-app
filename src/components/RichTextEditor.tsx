import React, { ReactNode, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Eraser,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolbarBtnProps {
  onClick: () => void
  active: boolean
  title: string
  children: ReactNode
  wide?: boolean
}

function ToolbarBtn({ onClick, active, title, children, wide = false }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={cn(
        'inline-flex h-[38px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-zinc-200 px-3 text-[13px] font-medium transition-colors',
        wide ? 'min-w-[76px]' : 'min-w-[38px]',
        active ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-700 hover:bg-zinc-50',
      )}
    >
      {children}
    </button>
  )
}

interface RichTextEditorProps {
  value: string | null | undefined
  onChange: (value: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder = '' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ strike: false }),
      Underline,
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'min-h-[150px] px-4 py-3.5 text-[15px] leading-[1.7] text-zinc-900 outline-none',
      },
    },
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (value === undefined || value === null) return
    if (!editor.isFocused && editor.getHTML() !== value) {
      editor.commands.setContent(value || '', false as any)
    }
  }, [value, editor])

  if (!editor) return null

  const isEmpty = !value || value === '<p></p>'

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-zinc-50 p-3">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold size={16} />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic size={16} />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon size={16} />
        </ToolbarBtn>

        <div className="mx-0.5 h-6 w-px shrink-0 bg-zinc-200" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
          wide
        >
          <List size={16} />
          <span>List</span>
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
          wide
        >
          <ListOrdered size={16} />
          <span>List</span>
        </ToolbarBtn>

        <div className="mx-0.5 h-6 w-px shrink-0 bg-zinc-200" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          active={false}
          title="Clear formatting"
          wide
        >
          <Eraser size={16} />
          <span>Clear</span>
        </ToolbarBtn>
      </div>

      <div className="relative min-h-[150px] bg-white">
        {isEmpty && (
          <div className="pointer-events-none absolute left-4 top-3.5 select-none text-[15px] text-zinc-400">
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

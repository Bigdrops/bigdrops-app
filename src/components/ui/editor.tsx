import React, { useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Eraser,
  Undo,
  Redo,
  ChevronDown,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeRichTextHtml } from '@/components/pdf/core/richText'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'

export type EditorVariant = 'compact' | 'letter' | 'default'

export interface EditorProps {
  value?: string | null
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minHeight?: string
  variant?: EditorVariant
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  size?: 'default' | 'sm'
  children: React.ReactNode
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  size = 'default',
  children,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault()
            if (!disabled) onClick()
          }}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-30',
            size === 'sm' ? 'h-8 w-8 text-xs' : 'h-8.5 w-8.5 text-sm',
            active
              ? 'bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
          )}
          aria-label={title}
          aria-pressed={active}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4} className="text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  )
}

function ToolbarSeparator() {
  return <div className="mx-0.5 h-4 w-px shrink-0 bg-zinc-200 dark:bg-zinc-800" />
}

export function Editor({
  value,
  onChange,
  placeholder = 'Start typing...',
  disabled = false,
  className,
  minHeight,
  variant = 'compact',
}: EditorProps) {
  const isLetter = variant === 'letter'
  const effectiveMinHeight = minHeight || (isLetter ? '360px' : '140px')

  const editorClass = useMemo(() => {
    if (isLetter) {
      return cn(
        'w-full px-5 sm:px-8 py-6 text-[15px] sm:text-[16px] leading-[1.8] text-zinc-900 outline-none dark:text-zinc-100 font-normal',
        '[&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-zinc-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] dark:[&_.is-editor-empty:first-child::before]:text-zinc-500',
        '[&_h1]:text-2xl sm:[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:my-4',
        '[&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:my-3',
        '[&_h3]:text-lg sm:[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:my-2.5',
        '[&_p]:my-2.5',
        '[&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-6',
        '[&_ol]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-6',
        '[&_li]:my-1',
        '[&_strong]:font-bold',
        '[&_em]:italic',
        '[&_u]:underline [&_u]:underline-offset-2',
      )
    }

    return cn(
      'w-full px-4 py-3.5 text-[15px] leading-[1.7] text-zinc-900 outline-none dark:text-zinc-100',
      '[&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-zinc-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] dark:[&_.is-editor-empty:first-child::before]:text-zinc-500',
      '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2',
      '[&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-1.5',
      '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-1',
      '[&_p]:my-0',
      '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5',
      '[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5',
      '[&_li]:my-0.5',
      '[&_strong]:font-bold',
      '[&_em]:italic',
      '[&_u]:underline',
    )
  }, [isLetter])

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        link: false,
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Placeholder.configure({
        placeholder,
        emptyNodeClass: 'is-editor-empty',
      }),
    ],
    content: normalizeRichTextHtml(value || ''),
    onUpdate: ({ editor: currentEditor }) => {
      onChange(normalizeRichTextHtml(currentEditor.getHTML()))
    },
    editorProps: {
      attributes: {
        class: editorClass,
        style: `min-height: ${effectiveMinHeight}`,
      },
    },
  })

  // Synchronize external value changes without cursor jumps
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (value === undefined || value === null) return
    const normalizedValue = normalizeRichTextHtml(value || '')
    if (!editor.isFocused && editor.getHTML() !== normalizedValue) {
      editor.commands.setContent(normalizedValue, false as any)
    }
  }, [value, editor])

  // Synchronize editable state
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (editor.isEditable !== !disabled) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  if (!editor) return null

  const getActiveBlockLabel = (): string => {
    if (editor.isActive('heading', { level: 1 })) return 'Heading 1'
    if (editor.isActive('heading', { level: 2 })) return 'Heading 2'
    if (editor.isActive('heading', { level: 3 })) return 'Heading 3'
    return 'Paragraph'
  }

  const wordCount = isLetter
    ? (editor.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0)
    : 0

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'overflow-hidden transition-all',
          isLetter
            ? 'rounded-2xl border border-zinc-200/90 bg-white shadow-xs focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-within:border-zinc-700'
            : 'rounded-xl border border-zinc-200 bg-white focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-within:border-zinc-700',
          disabled && 'opacity-60 cursor-not-allowed',
          className,
        )}
      >
        {/* Editor Toolbar */}
        {!disabled && (
          isLetter ? (
            /* Dedicated Letter Toolbar: Clear semantic grouping, tactile targets, sticky positioning */
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/90 bg-zinc-50/90 backdrop-blur-xs px-3 sm:px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900/80">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Block Style Dropdown Group */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-8.5 items-center gap-2 rounded-lg border border-zinc-200/80 bg-white px-3 text-xs sm:text-sm font-medium text-zinc-800 shadow-2xs hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Text formatting style"
                    >
                      <span>{getActiveBlockLabel()}</span>
                      <ChevronDown className="size-3.5 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-40">
                    <DropdownMenuItem
                      onClick={() => editor.chain().focus().setParagraph().run()}
                      className={cn(
                        editor.isActive('paragraph') &&
                          !editor.isActive('heading') &&
                          'bg-accent font-semibold',
                      )}
                    >
                      Paragraph
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                      className={cn(editor.isActive('heading', { level: 1 }) && 'bg-accent font-semibold')}
                    >
                      Heading 1
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                      className={cn(editor.isActive('heading', { level: 2 }) && 'bg-accent font-semibold')}
                    >
                      Heading 2
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                      className={cn(editor.isActive('heading', { level: 3 }) && 'bg-accent font-semibold')}
                    >
                      Heading 3
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Marks Group */}
                <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200/80 bg-white p-0.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive('bold')}
                    title="Bold (Ctrl+B)"
                    size="sm"
                  >
                    <Bold className="size-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive('italic')}
                    title="Italic (Ctrl+I)"
                    size="sm"
                  >
                    <Italic className="size-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    active={editor.isActive('underline')}
                    title="Underline (Ctrl+U)"
                    size="sm"
                  >
                    <UnderlineIcon className="size-4" />
                  </ToolbarButton>
                </div>

                {/* Lists Group */}
                <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200/80 bg-white p-0.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={editor.isActive('bulletList')}
                    title="Bullet List"
                    size="sm"
                  >
                    <List className="size-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={editor.isActive('orderedList')}
                    title="Numbered List"
                    size="sm"
                  >
                    <ListOrdered className="size-4" />
                  </ToolbarButton>
                </div>
              </div>

              {/* Actions Group: Undo, Redo, Clear */}
              <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200/80 bg-white p-0.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
                <ToolbarButton
                  onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                  title="Clear formatting"
                  size="sm"
                >
                  <Eraser className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                  title="Undo (Ctrl+Z)"
                  size="sm"
                >
                  <Undo className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                  title="Redo (Ctrl+Y)"
                  size="sm"
                >
                  <Redo className="size-4" />
                </ToolbarButton>
              </div>
            </div>
          ) : (
            /* Compact Toolbar: Default for Invoices, Quotations, and Waybills */
            <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50/80 px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/60">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label="Text formatting style"
                  >
                    <span>{getActiveBlockLabel()}</span>
                    <ChevronDown className="size-3.5 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-36">
                  <DropdownMenuItem
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    className={cn(
                      editor.isActive('paragraph') &&
                        !editor.isActive('heading') &&
                        'bg-accent font-semibold',
                    )}
                  >
                    Paragraph
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={cn(editor.isActive('heading', { level: 1 }) && 'bg-accent font-semibold')}
                  >
                    Heading 1
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn(editor.isActive('heading', { level: 2 }) && 'bg-accent font-semibold')}
                  >
                    Heading 2
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={cn(editor.isActive('heading', { level: 3 }) && 'bg-accent font-semibold')}
                  >
                    Heading 3
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ToolbarSeparator />

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive('bold')}
                title="Bold (Ctrl+B)"
                size="sm"
              >
                <Bold className="size-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive('italic')}
                title="Italic (Ctrl+I)"
                size="sm"
              >
                <Italic className="size-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                active={editor.isActive('underline')}
                title="Underline (Ctrl+U)"
                size="sm"
              >
                <UnderlineIcon className="size-4" />
              </ToolbarButton>

              <ToolbarSeparator />

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive('bulletList')}
                title="Bullet List"
                size="sm"
              >
                <List className="size-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive('orderedList')}
                title="Numbered List"
                size="sm"
              >
                <ListOrdered className="size-4" />
              </ToolbarButton>

              <ToolbarSeparator />

              <ToolbarButton
                onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                title="Clear formatting"
                size="sm"
              >
                <Eraser className="size-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Undo (Ctrl+Z)"
                size="sm"
              >
                <Undo className="size-4" />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Redo (Ctrl+Y)"
                size="sm"
              >
                <Redo className="size-4" />
              </ToolbarButton>
            </div>
          )
        )}

        {/* Editor Body */}
        <div className="relative">
          <EditorContent editor={editor} />
        </div>

        {/* Dedicated Letter Footer Status Bar */}
        {isLetter && (
          <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-5 py-2 text-[11px] text-zinc-500 dark:border-zinc-900 dark:bg-zinc-950/60 dark:text-zinc-400 select-none">
            <span className="flex items-center gap-1.5 font-medium">
              <FileText className="size-3.5 opacity-60" />
              Official Letter Document
            </span>
            <span>
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default Editor

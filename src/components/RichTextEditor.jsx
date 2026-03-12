import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Eraser,
} from 'lucide-react'

const toolbarBtnStyle = (active) => ({
  height: '38px',
  minWidth: '38px',
  padding: '0 12px',
  border: '1px solid #e4e4e7',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  backgroundColor: active ? '#18181b' : '#ffffff',
  color: active ? '#ffffff' : '#3f3f46',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  transition: 'all 0.15s ease',
  flexShrink: 0,
})

const dividerStyle = {
  width: '1px',
  height: '24px',
  backgroundColor: '#e4e4e7',
  margin: '0 2px',
  flexShrink: 0,
}

function ToolbarBtn({ onClick, active, title, children, wide = false }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      style={{
        ...toolbarBtnStyle(active),
        minWidth: wide ? '76px' : '38px',
      }}
    >
      {children}
    </button>
  )
}

export default function RichTextEditor({ value, onChange, placeholder = '' }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ strike: false }),
      Underline,
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        style:
          'min-height: 150px; padding: 14px 16px; outline: none; font-size: 15px; color: #18181b; line-height: 1.7;',
      },
    },
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (value === undefined || value === null) return
    if (!editor.isFocused && editor.getHTML() !== value) {
      editor.commands.setContent(value || '', false)
    }
  }, [value, editor])

  if (!editor) return null

  const isEmpty = !value || value === '<p></p>'

  return (
    <div
      style={{
        border: '1px solid #d4d4d8',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          padding: '12px',
          borderBottom: '1px solid #e4e4e7',
          backgroundColor: '#fafafa',
        }}
      >
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

        <div style={dividerStyle} />

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

        <div style={dividerStyle} />

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

      <div
        style={{
          minHeight: '150px',
          position: 'relative',
          backgroundColor: '#ffffff',
        }}
      >
        {isEmpty && (
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '16px',
              color: '#a1a1aa',
              fontSize: '15px',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
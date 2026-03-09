import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'

const ToolbarBtn = ({ onClick, active, title, children }) => (
  <button
    type="button"
    onMouseDown={e => { e.preventDefault(); onClick() }}
    title={title}
    style={{
      padding: '4px 8px', border: 'none', borderRadius: '4px', cursor: 'pointer',
      fontSize: '13px', fontWeight: active ? 'bold' : 'normal',
      backgroundColor: active ? '#1a1a1a' : 'transparent',
      color: active ? 'white' : '#444', minWidth: '28px',
    }}
  >{children}</button>
)

export default function RichTextEditor({ value, onChange, placeholder = '' }) {
  const editor = useEditor({
    // StarterKit includes bold, italic, strike, lists etc.
    // Underline is NOT in StarterKit so we add it separately
    // We disable StarterKit's strike to avoid duplicate if tiptap version bundles it
    extensions: [
      StarterKit.configure({ strike: false }),
      Underline,
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        style: 'min-height: 80px; padding: 10px 12px; outline: none; font-size: 14px; color: #1a1a1a; line-height: 1.6;',
      },
    },
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (value === undefined || value === null) return
    // Only update if editor is not focused and content differs
    if (!editor.isFocused && editor.getHTML() !== value) {
      editor.commands.setContent(value || '', false)
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'white' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', padding: '6px 8px', borderBottom: '1px solid #eee', backgroundColor: '#fafafa' }}>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">B</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><em>I</em></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><u>U</u></ToolbarBtn>
        <div style={{ width: '1px', backgroundColor: '#ddd', margin: '2px 4px' }} />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">• List</ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">1. List</ToolbarBtn>
        <div style={{ width: '1px', backgroundColor: '#ddd', margin: '2px 4px' }} />
        <ToolbarBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} active={false} title="Clear formatting">Clear</ToolbarBtn>
      </div>
      <div style={{ minHeight: '80px', position: 'relative' }}>
        {(!value || value === '<p></p>') && (
          <div style={{ position: 'absolute', top: '10px', left: '12px', color: '#bbb', fontSize: '14px', pointerEvents: 'none', userSelect: 'none' }}>{placeholder}</div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

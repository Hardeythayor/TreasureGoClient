import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function ToolbarButton({ onClick, active, label, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex size-7 items-center justify-center rounded-md text-navy-mid hover:bg-black/5',
        active && 'bg-gold/25 text-navy-deep',
      )}
    >
      {children}
    </button>
  )
}

// A CKEditor-style classic toolbar (bold/italic/underline/lists/link) over
// Tiptap — chosen over the real CKEditor package to avoid its bundle size
// and the "Powered by CKEditor" watermark on the free build. `onChange`
// receives the editor's HTML, which is what gets sent as the `message`
// field so formatting survives to the backend.
function RichTextEditor({ value, onChange, placeholder = 'Type your message…' }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'min-h-24 w-full rounded-b-lg bg-transparent px-2.5 py-2 text-sm outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-navy-mid [&_a]:underline [&_p]:my-1',
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  })

  // Lets the parent reset the editor (e.g. clearing the form after a
  // successful send) by changing `value` to '' from outside — Tiptap
  // otherwise owns its content internally and ignores prop changes.
  useEffect(() => {
    if (!editor) return
    if (value === '' && editor.getHTML() !== '<p></p>' && !editor.isEmpty) {
      editor.commands.clearContent()
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div className="rounded-lg border border-input">
      <div className="flex items-center gap-0.5 border-b border-input px-1.5 py-1">
        <ToolbarButton
          label="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-input" />
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-input" />
        <ToolbarButton
          label="Link"
          active={editor.isActive('link')}
          onClick={() => {
            const previousUrl = editor.getAttributes('link').href
            const url = window.prompt('Link URL', previousUrl || 'https://')
            if (url === null) return
            if (url === '') {
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
              return
            }
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          }}
        >
          <Link2 className="size-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

export default RichTextEditor

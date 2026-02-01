import { useState, useCallback, useEffect } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
} from 'lucide-react'
import type { GeneratedCoverLetter } from '@schemas/ai-output.schema'
import type { PersonalInfo } from '@schemas/resume.schema'
import CoverLetterPDFPreview from './CoverLetterPDFPreview'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'

/**
 * Check if a value is a placeholder pattern like [Something] and treat as empty
 */
function getDisplayValue(value: string | null | undefined): string {
  if (!value) return ''
  // Treat values like "[Company Name]" or "[Position Title]" as empty
  if (/^\[.+\]$/.test(value.trim())) return ''
  return value
}

interface CoverLetterEditorProps {
  coverLetter: GeneratedCoverLetter
  personalInfo?: PersonalInfo | undefined
  onUpdate: (coverLetter: GeneratedCoverLetter) => void
  className?: string | undefined
}

type EditorMode = 'preview' | 'edit'

/**
 * Toolbar button component
 */
function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'rounded p-1.5 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50',
        isActive && 'bg-gray-200 text-blue-600'
      )}
      style={{ color: isActive ? '#2563eb' : '#374151' }}
    >
      {children}
    </button>
  )
}

/**
 * Editor toolbar component
 */
function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5"
      style={{ backgroundColor: '#f3f4f6' }}
    >
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-gray-300" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-gray-300" />

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )
}

/**
 * Convert cover letter to HTML for the editor
 */
function coverLetterToHtml(letter: GeneratedCoverLetter): string {
  const parts: string[] = []

  // Opening paragraph
  if (letter.opening) {
    parts.push(`<p>${letter.opening}</p>`)
  }

  // Body paragraphs
  if (letter.body && letter.body.length > 0) {
    for (const paragraph of letter.body) {
      parts.push(`<p>${paragraph}</p>`)
    }
  }

  // Closing paragraph
  if (letter.closing) {
    parts.push(`<p>${letter.closing}</p>`)
  }

  return parts.join('')
}

/**
 * Parse HTML content back to cover letter structure
 */
function htmlToCoverLetter(html: string, original: GeneratedCoverLetter): GeneratedCoverLetter {
  // Create a temporary element to parse HTML
  const temp = document.createElement('div')
  temp.innerHTML = html

  // Get all paragraphs
  const paragraphs = Array.from(temp.querySelectorAll('p'))
    .map(p => p.textContent?.trim() || '')
    .filter(text => text.length > 0)

  if (paragraphs.length === 0) {
    return original
  }

  // Parse paragraphs into opening, body, closing
  let opening: string
  let body: string[]
  let closing: string

  if (paragraphs.length === 1) {
    // Single paragraph - treat as opening, keep original body and closing
    opening = paragraphs[0] as string
    body = original.body ?? []
    closing = original.closing ?? ''
  } else if (paragraphs.length === 2) {
    // Two paragraphs - first is opening, second is closing, empty body
    opening = paragraphs[0] as string
    body = []
    closing = paragraphs[1] as string
  } else {
    // Three or more - first is opening, last is closing, middle is body
    opening = paragraphs[0] as string
    closing = paragraphs[paragraphs.length - 1] as string
    body = paragraphs.slice(1, -1)
  }

  return {
    ...original,
    opening,
    body,
    closing,
  }
}

// Stable extensions array - StarterKit v3 includes Underline
const editorExtensions = [StarterKit]

export function CoverLetterEditor({
  coverLetter,
  personalInfo,
  onUpdate,
  className,
}: CoverLetterEditorProps) {
  const [mode, setMode] = useState<EditorMode>('preview')

  const editor = useEditor({
    extensions: editorExtensions,
    content: coverLetterToHtml(coverLetter),
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[400px] p-4 text-sm leading-relaxed',
        style: 'color: #1f2937; background-color: white;',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const updated = htmlToCoverLetter(html, coverLetter)
      onUpdate(updated)
    },
  })

  // Update editor content when coverLetter changes externally (e.g., after AI generation)
  useEffect(() => {
    if (editor && mode === 'edit') {
      const currentHtml = editor.getHTML()
      const newHtml = coverLetterToHtml(coverLetter)
      // Only update if content actually changed to avoid cursor jumping
      if (currentHtml !== newHtml) {
        editor.commands.setContent(newHtml)
      }
    }
  }, [coverLetter, editor, mode])

  const handleModeChange = useCallback(
    (newMode: EditorMode) => {
      setMode(newMode)
      // When switching to edit mode, ensure editor has latest content
      if (newMode === 'edit' && editor) {
        editor.commands.setContent(coverLetterToHtml(coverLetter))
      }
    },
    [editor, coverLetter]
  )

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Mode toggle pills */}
      <div className="mb-4 flex justify-center">
        <div className="bg-muted inline-flex rounded-full p-1">
          <button
            onClick={() => handleModeChange('preview')}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              mode === 'preview'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Preview
          </button>
          <button
            onClick={() => handleModeChange('edit')}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              mode === 'edit'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Edit
          </button>
        </div>
      </div>

      {/* Content area */}
      {mode === 'preview' ? (
        <CoverLetterPDFPreview coverLetter={coverLetter} personalInfo={personalInfo} />
      ) : (
        <div
          className="overflow-hidden rounded-lg border shadow-sm"
          style={{ backgroundColor: 'white' }}
        >
          {/* Editable header fields */}
          <div className="space-y-2 border-b px-4 py-3" style={{ backgroundColor: '#f9fafb' }}>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <label style={{ color: '#6b7280' }}>From:</label>
                <span className="font-medium" style={{ color: '#374151' }}>
                  {personalInfo?.name || coverLetter.signature}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label style={{ color: '#6b7280' }}>Date:</label>
                <DatePicker
                  value={coverLetter.date}
                  onChange={value => onUpdate({ ...coverLetter, date: value })}
                  placeholder="Pick a date"
                  className="w-44 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <label style={{ color: '#6b7280' }}>To:</label>
                <input
                  type="text"
                  value={getDisplayValue(coverLetter.recipientName)}
                  onChange={e => onUpdate({ ...coverLetter, recipientName: e.target.value })}
                  placeholder="Hiring Manager"
                  className="w-36 rounded-none border-0 border-b border-gray-300 bg-transparent px-2 py-0.5 text-sm focus:border-blue-500 focus:outline-none"
                  style={{ color: '#374151' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <label style={{ color: '#6b7280' }}>Title:</label>
                <input
                  type="text"
                  value={getDisplayValue(coverLetter.recipientTitle)}
                  onChange={e => onUpdate({ ...coverLetter, recipientTitle: e.target.value })}
                  placeholder="e.g. HR Director"
                  className="w-32 rounded-none border-0 border-b border-gray-300 bg-transparent px-2 py-0.5 text-sm focus:border-blue-500 focus:outline-none"
                  style={{ color: '#374151' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <label style={{ color: '#6b7280' }}>Company:</label>
                <input
                  type="text"
                  value={getDisplayValue(coverLetter.companyName)}
                  onChange={e => onUpdate({ ...coverLetter, companyName: e.target.value })}
                  placeholder="Company Name"
                  className="w-40 rounded-none border-0 border-b border-gray-300 bg-transparent px-2 py-0.5 text-sm focus:border-blue-500 focus:outline-none"
                  style={{ color: '#374151' }}
                />
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <EditorToolbar editor={editor} />

          {/* Tiptap editor */}
          <div style={{ backgroundColor: 'white', color: '#1f2937' }}>
            <EditorContent editor={editor} />
          </div>

          {/* Character count */}
          <div
            className="border-t px-4 py-2 text-sm"
            style={{ backgroundColor: '#f9fafb', color: '#6b7280' }}
          >
            {(() => {
              const charCount =
                (coverLetter.opening?.length || 0) +
                (coverLetter.body?.join('').length || 0) +
                (coverLetter.closing?.length || 0)
              const isOverLimit = charCount > 2000
              return (
                <span style={isOverLimit ? { color: '#dc2626', fontWeight: 500 } : undefined}>
                  {charCount} / 2000 characters
                  {isOverLimit && ' (over limit)'}
                </span>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default CoverLetterEditor

/**
 * Resume Import Dropzone
 *
 * Drag-and-drop zone for importing resume files.
 * Supports PDF, Word (.docx), and plain text files.
 */

import { useCallback, useRef, useState } from 'react'
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ResumeImportDropzoneProps {
  onImportComplete: (success: boolean, errorMessage?: string) => void
  className?: string
}

type ImportState = 'idle' | 'dragover' | 'processing' | 'success' | 'error'

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt']
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

export function ResumeImportDropzone({
  onImportComplete,
  className,
}: Readonly<ResumeImportDropzoneProps>) {
  const [state, setState] = useState<ImportState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState('dragover')
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState('idle')
  }, [])

  const isValidFileType = useCallback((file: File): boolean => {
    // Check by extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (ACCEPTED_EXTENSIONS.includes(ext)) {
      return true
    }
    // Check by MIME type
    if (ACCEPTED_MIME_TYPES.includes(file.type)) {
      return true
    }
    return false
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      setState('processing')
      setErrorMessage('')

      try {
        // Read file content
        const text = await file.text()

        // Send to main process for AI extraction
        const result = await window.electronAPI.importResumeFromText(text, file.name)

        if (result.success) {
          setState('success')
          onImportComplete(true)
          // Reset after showing success
          setTimeout(() => setState('idle'), 2000)
        } else {
          const message = result.error?.message ?? 'Failed to import resume'
          setState('error')
          setErrorMessage(message)
          onImportComplete(false, message)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred'
        setState('error')
        setErrorMessage(message)
        onImportComplete(false, message)
      }
    },
    [onImportComplete]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (state === 'processing') return

      const files = Array.from(e.dataTransfer.files)
      const file = files[0]

      if (!file) {
        setState('idle')
        return
      }

      // Validate file type
      if (!isValidFileType(file)) {
        setState('error')
        setErrorMessage('Unsupported file type. Please use PDF, DOCX, or TXT files.')
        return
      }

      await processFile(file)
    },
    [state, isValidFileType, processFile]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        await processFile(file)
      }
      // Reset input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [processFile]
  )

  const handleClick = useCallback(() => {
    if (state !== 'processing') {
      fileInputRef.current?.click()
    }
  }, [state])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && state !== 'processing') {
        e.preventDefault()
        fileInputRef.current?.click()
      }
    },
    [state]
  )

  const handleTryAgain = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setState('idle')
    setErrorMessage('')
  }, [])

  return (
    <div
      className={cn(
        'focus:ring-ring relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none',
        state === 'idle' && 'border-muted-foreground/25 hover:border-muted-foreground/50',
        state === 'dragover' && 'border-primary bg-primary/5',
        state === 'processing' && 'border-muted-foreground/25 bg-muted/50 cursor-wait',
        state === 'success' && 'border-green-500 bg-green-500/5',
        state === 'error' && 'border-destructive bg-destructive/5',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={state === 'processing' ? -1 : 0}
      aria-label="Drop zone for resume import"
      aria-disabled={state === 'processing'}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_MIME_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {state === 'idle' && (
        <>
          <Upload className="text-muted-foreground mb-4 h-10 w-10" />
          <p className="mb-2 text-sm font-medium">Drop your resume here or click to browse</p>
          <p className="text-muted-foreground text-xs">
            Supports PDF, Word (.docx), and plain text files
          </p>
        </>
      )}

      {state === 'dragover' && (
        <>
          <FileText className="text-primary mb-4 h-10 w-10" />
          <p className="text-primary text-sm font-medium">Drop to import</p>
        </>
      )}

      {state === 'processing' && (
        <>
          <Loader2 className="text-muted-foreground mb-4 h-10 w-10 animate-spin" />
          <p className="text-sm font-medium">Extracting resume data...</p>
          <p className="text-muted-foreground text-xs">This may take a moment</p>
        </>
      )}

      {state === 'success' && (
        <>
          <CheckCircle2 className="mb-4 h-10 w-10 text-green-500" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Resume imported successfully!
          </p>
        </>
      )}

      {state === 'error' && (
        <>
          <XCircle className="text-destructive mb-4 h-10 w-10" />
          <p className="text-destructive mb-2 text-sm font-medium">Import failed</p>
          <p className="text-muted-foreground mb-4 max-w-[280px] text-center text-xs">
            {errorMessage}
          </p>
          <Button variant="outline" size="sm" onClick={handleTryAgain}>
            Try again
          </Button>
        </>
      )}
    </div>
  )
}

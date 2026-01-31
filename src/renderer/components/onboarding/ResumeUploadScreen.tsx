/**
 * ResumeUploadScreen Component
 *
 * Second screen of the onboarding flow.
 * Allows users to upload their resume via drag-and-drop or file picker.
 * Shows animated progress during AI-powered extraction.
 */

import { useCallback, useRef, useState, useEffect } from 'react'
import { Upload, FileText, ChevronRight, ChevronLeft, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ProcessingProgress } from './ProcessingProgress'
import type { ProcessingPhase } from '@/hooks/useOnboarding'

/**
 * Props for the ResumeUploadScreen component.
 */
export interface ResumeUploadScreenProps {
  /**
   * Called when processing is complete and ready to advance.
   */
  onComplete: () => void
  /**
   * Called when user wants to go back to previous step.
   */
  onBack?: () => void
  /**
   * Current processing phase from useOnboarding.
   */
  processingPhase: ProcessingPhase
  /**
   * Function to update the processing phase.
   */
  setProcessingPhase: (phase: ProcessingPhase) => void
}

/**
 * Accepted file extensions for resume import.
 */
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt']

/**
 * Accepted MIME types for resume import.
 */
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

/**
 * Minimum duration (ms) for each processing phase to ensure animation is visible.
 */
const MIN_PHASE_DURATION = 800

/**
 * Delay (ms) after completion before auto-advancing.
 */
const AUTO_ADVANCE_DELAY = 1000

/**
 * ResumeUploadScreen - Resume upload and processing screen.
 *
 * Features:
 * - Large drop zone for drag-and-drop
 * - File picker fallback
 * - Animated step-by-step processing progress
 * - Auto-advance on successful completion
 */
export function ResumeUploadScreen({
  onComplete,
  onBack,
  processingPhase,
  setProcessingPhase,
}: Readonly<ResumeUploadScreenProps>): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-advance after completion
  useEffect(() => {
    if (processingPhase === 'complete') {
      const timer = setTimeout(() => {
        onComplete()
      }, AUTO_ADVANCE_DELAY)
      return () => clearTimeout(timer)
    }
  }, [processingPhase, onComplete])

  /**
   * Validate file type by extension or MIME type.
   */
  const isValidFileType = useCallback((file: File): boolean => {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
    if (ACCEPTED_EXTENSIONS.includes(ext)) {
      return true
    }
    if (ACCEPTED_MIME_TYPES.includes(file.type)) {
      return true
    }
    return false
  }, [])

  /**
   * Simulate processing phases with minimum duration.
   * In a real implementation, this would be driven by actual progress events.
   */
  const simulateProcessingPhases = useCallback(async () => {
    const phases: ProcessingPhase[] = [
      'reading',
      'extracting',
      'organizing',
      'finalizing',
    ]

    for (const phase of phases) {
      setProcessingPhase(phase)
      await new Promise((resolve) => setTimeout(resolve, MIN_PHASE_DURATION))
    }
  }, [setProcessingPhase])

  /**
   * Process the uploaded file.
   */
  const processFile = useCallback(
    async (file: File) => {
      setError(null)

      try {
        // Start processing animation
        const phaseSimulation = simulateProcessingPhases()

        // Read file content
        const text = await file.text()

        // Send to main process for AI extraction
        const result = await window.electronAPI.importResumeFromText(
          text,
          file.name
        )

        // Wait for phase simulation to complete
        await phaseSimulation

        if (result.success) {
          setProcessingPhase('complete')
        } else {
          const message = result.error?.message ?? 'Failed to import resume'
          setProcessingPhase('idle')
          setError(message)
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error occurred'
        setProcessingPhase('idle')
        setError(message)
      }
    },
    [setProcessingPhase, simulateProcessingPhases]
  )

  /**
   * Handle drag over event.
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  /**
   * Handle drag leave event.
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  /**
   * Handle file drop.
   */
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      if (processingPhase !== 'idle') return

      const files = Array.from(e.dataTransfer.files)
      const file = files[0]

      if (!file) return

      if (!isValidFileType(file)) {
        setError('Unsupported file type. Please use PDF, DOCX, or TXT files.')
        return
      }

      await processFile(file)
    },
    [processingPhase, isValidFileType, processFile]
  )

  /**
   * Handle file selection from input.
   */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        if (!isValidFileType(file)) {
          setError(
            'Unsupported file type. Please use PDF, DOCX, or TXT files.'
          )
          return
        }
        await processFile(file)
      }
      // Reset input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [isValidFileType, processFile]
  )

  /**
   * Handle click on drop zone.
   */
  const handleClick = useCallback(() => {
    if (processingPhase === 'idle') {
      fileInputRef.current?.click()
    }
  }, [processingPhase])

  /**
   * Handle keyboard interaction on drop zone.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && processingPhase === 'idle') {
        e.preventDefault()
        fileInputRef.current?.click()
      }
    },
    [processingPhase]
  )

  /**
   * Dismiss error and reset.
   */
  const handleDismissError = useCallback(() => {
    setError(null)
  }, [])

  const isProcessing =
    processingPhase !== 'idle' && processingPhase !== 'complete'
  const showDropZone = processingPhase === 'idle' && !error
  const showProgress = processingPhase !== 'idle'
  const showError = error !== null

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {processingPhase === 'complete'
            ? 'Profile created!'
            : processingPhase !== 'idle'
              ? 'Processing your resume'
              : 'Upload your resume'}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {processingPhase === 'complete'
            ? 'Your information has been extracted successfully'
            : processingPhase !== 'idle'
              ? 'This will only take a moment'
              : "We'll extract your information automatically"}
        </p>
      </div>

      {/* Main content area */}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center">
        {/* Drop zone - shown when idle and no error */}
        {showDropZone && (
          <div
            className={cn(
              'relative flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label="Drop zone for resume upload"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_MIME_TYPES.join(',')}
              onChange={handleFileSelect}
              className="hidden"
              aria-hidden="true"
            />

            {isDragOver ? (
              <>
                <FileText className="mb-4 size-12 text-primary" />
                <p className="text-lg font-medium text-primary">
                  Drop to upload
                </p>
              </>
            ) : (
              <>
                <Upload className="mb-4 size-12 text-muted-foreground" />
                <p className="mb-2 text-lg font-medium">
                  Drop your resume here
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, Word (.docx), or plain text
                </p>
              </>
            )}
          </div>
        )}

        {/* Processing progress - shown during processing */}
        {showProgress && !showError && (
          <div className="flex w-full flex-col items-center py-8">
            <ProcessingProgress phase={processingPhase} />
          </div>
        )}

        {/* Error state */}
        {showError && (
          <div className="flex w-full flex-col items-center py-8">
            <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="size-8 text-destructive" />
            </div>
            <h2 className="mb-2 text-lg font-medium text-destructive">
              Import failed
            </h2>
            <p className="mb-6 max-w-xs text-center text-sm text-muted-foreground">
              {error}
            </p>
            <Button onClick={handleDismissError} variant="outline">
              Try again
            </Button>
          </div>
        )}
      </div>

      {/* Spacer to ensure content doesn't hide behind sticky footer */}
      <div className="h-24" />

      {/* Footer Actions - fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-4">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isProcessing}
            className="gap-1"
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>

          {processingPhase === 'complete' ? (
            <Button size="lg" onClick={onComplete} className="min-w-[140px]">
              Continue
              <ChevronRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button
              variant="link"
              onClick={onComplete}
              disabled={isProcessing}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResumeUploadScreen

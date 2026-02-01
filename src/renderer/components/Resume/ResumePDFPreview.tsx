import React, { useMemo, useState, useCallback } from 'react'
import { BlobProvider } from '@react-pdf/renderer'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import type { Resume } from '@schemas/resume.schema'
import type { ColorPalette } from '@/hooks/useTemplates'
import { createThemeFromPalette } from '../../services/pdf/theme'
import { getTemplateComponent } from '../../services/pdf/templates'
import { cn } from '@/lib/utils'
import { Skeleton } from '../ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '../ui/button'

// Configure PDF.js worker using local bundle
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// =============================================================================
// TYPES
// =============================================================================

export interface ResumePDFPreviewProps {
  /** Resume data to render */
  resume: Resume
  /** Template ID for layout selection (reserved for future use) */
  templateId: string
  /** Color palette to apply to the PDF */
  palette: ColorPalette
  /** Optional className for the container */
  className?: string
  /** Max height for scrollable view (enables multi-page scrolling) */
  maxHeight?: string
}

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function PDFLoadingState({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      {/* A4 aspect ratio skeleton */}
      <div className="relative w-full">
        <div className="aspect-[210/297] w-full">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
        {/* Loading overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-muted-foreground flex flex-col items-center gap-2">
            <div className="border-muted-foreground h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            <span className="text-sm">Generating preview...</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// ERROR STATE COMPONENT
// =============================================================================

interface PDFErrorStateProps {
  error: Error
  onRetry?: () => void
  className?: string
}

function PDFErrorState({ error, onRetry, className }: PDFErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 p-4', className)}>
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Preview Error</AlertTitle>
        <AlertDescription>
          <p className="mb-2">Unable to generate PDF preview.</p>
          <p className="text-xs opacity-75">{error.message}</p>
        </AlertDescription>
      </Alert>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  )
}

// =============================================================================
// PDF PAGES VIEWER COMPONENT (using react-pdf)
// =============================================================================

interface PDFPagesViewerProps {
  url: string
  className?: string
  maxHeight?: string | undefined
}

function PDFPagesViewer({ url, className, maxHeight }: PDFPagesViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }, [])

  // Track container width for responsive page sizing
  React.useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateWidth = () => {
      setContainerWidth(node.clientWidth)
    }

    updateWidth()
    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(node)

    return () => resizeObserver.disconnect()
  }, [])

  // Generate page numbers array
  const pageNumbers = React.useMemo(() => {
    return Array.from({ length: numPages }, (_, i) => i + 1)
  }, [numPages])

  return (
    <div className={cn('relative w-full', className)}>
      <div
        ref={containerRef}
        className="w-full overflow-auto rounded-lg border bg-white shadow-sm"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<PDFLoadingState className="min-h-[400px]" />}
          error={<div className="text-destructive p-4 text-center">Failed to load PDF</div>}
        >
          {pageNumbers.map(pageNumber => (
            <div key={`page_${pageNumber}`} className="mb-4">
              <Page
                pageNumber={pageNumber}
                width={containerWidth > 0 ? containerWidth - 20 : 600}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  )
}

// =============================================================================
// SIMPLE IFRAME PREVIEW (fallback for single page)
// =============================================================================

interface PDFPreviewContentProps {
  url: string
  className?: string
}

function PDFPreviewContent({ url, className }: PDFPreviewContentProps) {
  const pdfUrl = `${url}#toolbar=0&navpanes=0&view=FitH`

  return (
    <div className={cn('relative w-full', className)}>
      <div className="aspect-[210/297] w-full overflow-hidden rounded-lg border bg-white shadow-sm">
        <iframe
          src={pdfUrl}
          title="Resume PDF Preview"
          className="h-full w-full border-0"
          style={{ minHeight: '400px' }}
        />
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ResumePDFPreview - A reusable component for rendering a live PDF preview.
 *
 * This component uses @react-pdf/renderer to generate a PDF document
 * from the provided resume data and displays it using react-pdf viewer.
 *
 * Features:
 * - Live preview that updates when props change
 * - Multi-page support with scrolling (when maxHeight is set)
 * - Loading state while PDF is generating
 * - Error handling with retry option
 * - Applies color palette to theme
 *
 * Usage:
 * ```tsx
 * <ResumePDFPreview
 *   resume={resumeData}
 *   templateId="classic"
 *   palette={selectedPalette}
 *   className="max-w-lg mx-auto"
 *   maxHeight="600px"
 * />
 * ```
 */
function ResumePDFPreview({
  resume,
  templateId,
  palette,
  className,
  maxHeight,
}: ResumePDFPreviewProps): React.JSX.Element {
  // Track key for forcing re-renders on retry
  const [retryKey, setRetryKey] = useState(0)

  // HMR: Force full page reload when template files change
  // React Fast Refresh caches component references, so we need a full reload
  React.useEffect(() => {
    if (!import.meta.hot) return

    const handleBeforeUpdate = (payload: { updates: Array<{ path: string }> }) => {
      const hasTemplateUpdate = payload.updates.some(
        update => update.path.includes('/pdf/templates/') && update.path.endsWith('Template.tsx')
      )
      if (hasTemplateUpdate) {
        setTimeout(() => window.location.reload(), 100)
      }
    }

    import.meta.hot.on('vite:beforeUpdate', handleBeforeUpdate)

    return () => {
      import.meta.hot?.off('vite:beforeUpdate', handleBeforeUpdate)
    }
  }, [])

  // Create theme from palette - memoized to prevent unnecessary re-renders
  const theme = useMemo(() => createThemeFromPalette(palette), [palette])

  // Get the appropriate template component
  const TemplateComponent = getTemplateComponent(templateId)

  // Create the document - not memoized to allow HMR updates
  const document = <TemplateComponent resume={resume} theme={theme} />

  // Retry handler
  const handleRetry = useCallback(() => {
    setRetryKey(prev => prev + 1)
  }, [])

  return (
    <div className={cn('resume-pdf-preview', className)} data-template={templateId}>
      <BlobProvider key={retryKey} document={document}>
        {({ blob, url, loading, error }) => {
          // Show loading state
          if (loading) {
            return <PDFLoadingState className="min-h-[400px]" />
          }

          // Show error state
          if (error) {
            return <PDFErrorState error={error} onRetry={handleRetry} className="min-h-[400px]" />
          }

          // Show PDF preview
          if (url && blob) {
            // Use react-pdf viewer for multi-page support
            if (maxHeight) {
              return <PDFPagesViewer url={url} maxHeight={maxHeight} />
            }
            // Use simple iframe for single page view
            return <PDFPreviewContent url={url} />
          }

          // Fallback loading state (should not normally reach here)
          return <PDFLoadingState className="min-h-[400px]" />
        }}
      </BlobProvider>
    </div>
  )
}

export default ResumePDFPreview

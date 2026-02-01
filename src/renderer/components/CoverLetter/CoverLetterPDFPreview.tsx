import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { BlobProvider } from '@react-pdf/renderer';
import type { GeneratedCoverLetter } from '@schemas/ai-output.schema';
import type { PersonalInfo } from '@schemas/resume.schema';
import type { PDFTheme } from '@app-types/pdf-theme.types';
import CoverLetterPDFDocument from '../../services/pdf/CoverLetterPDFDocument';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

// =============================================================================
// TYPES
// =============================================================================

export interface CoverLetterPDFPreviewProps {
  /** Cover letter data to render */
  coverLetter: GeneratedCoverLetter;
  /** Personal info for header and signature */
  personalInfo?: PersonalInfo | undefined;
  /** Target job title for header */
  targetJobTitle?: string | undefined;
  /** Optional theme override */
  theme?: PDFTheme | undefined;
  /** Optional className for the container */
  className?: string | undefined;
}

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function PDFLoadingState({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div className="relative w-full">
        <div className="aspect-[210/297] w-full">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <span className="text-sm">Generating preview...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ERROR STATE COMPONENT
// =============================================================================

interface PDFErrorStateProps {
  error: Error;
  onRetry?: () => void;
  className?: string;
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
  );
}

// =============================================================================
// PDF PREVIEW COMPONENT
// =============================================================================

interface PDFPreviewContentProps {
  url: string;
  className?: string;
}

function PDFPreviewContent({ url, className }: PDFPreviewContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // PDF viewer parameters: hide toolbar, fit to page width, show first page only
  const pdfUrl = `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH,top&page=1`;

  // A4 dimensions: 210mm x 297mm, we use a base width of 595px (72dpi)
  const PDF_BASE_WIDTH = 595;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const containerWidth = container.clientWidth;
      // Calculate scale to fit the PDF within the container
      const newScale = Math.min(1, containerWidth / PDF_BASE_WIDTH);
      setScale(newScale);
    };

    // Initial calculation
    updateScale();

    // Watch for resize
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        className="w-full rounded-lg bg-white shadow-lg border border-border"
        style={{
          aspectRatio: '210 / 297',
          overflow: 'hidden',
        }}
      >
        <iframe
          src={pdfUrl}
          title="Cover Letter PDF Preview"
          className="border-0 origin-top-left"
          scrolling="no"
          style={{
            width: `${100 / scale}%`,
            height: `${100 / scale}%`,
            transform: `scale(${scale})`,
            overflow: 'hidden',
          }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function CoverLetterPDFPreview({
  coverLetter,
  personalInfo,
  targetJobTitle,
  theme,
  className,
}: CoverLetterPDFPreviewProps): React.JSX.Element {
  const [retryKey, setRetryKey] = useState(0);

  const document = useMemo(
    () => (
      <CoverLetterPDFDocument
        coverLetter={coverLetter}
        personalInfo={personalInfo}
        targetJobTitle={targetJobTitle}
        theme={theme}
      />
    ),
    [coverLetter, personalInfo, targetJobTitle, theme]
  );

  const handleRetry = useCallback(() => {
    setRetryKey((prev) => prev + 1);
  }, []);

  return (
    <div className={cn('cover-letter-pdf-preview', className)}>
      <BlobProvider key={retryKey} document={document}>
        {({ blob, url, loading, error }) => {
          if (loading) {
            return <PDFLoadingState className="min-h-[400px]" />;
          }

          if (error) {
            return <PDFErrorState error={error} onRetry={handleRetry} className="min-h-[400px]" />;
          }

          if (url && blob) {
            return <PDFPreviewContent url={url} />;
          }

          return <PDFLoadingState className="min-h-[400px]" />;
        }}
      </BlobProvider>
    </div>
  );
}

export default CoverLetterPDFPreview;

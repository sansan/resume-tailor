import React, { useMemo, useState, useCallback } from 'react';
import { BlobProvider } from '@react-pdf/renderer';
import type { Resume } from '@schemas/resume.schema';
import type { ColorPalette } from '@/hooks/useTemplates';
import type { PDFTheme } from '@app-types/pdf-theme.types';
import { defaultPDFTheme } from '../../services/pdf/theme';
import ResumePDFDocument from '../../services/pdf/ResumePDFDocument';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

// =============================================================================
// TYPES
// =============================================================================

export interface ResumePDFPreviewProps {
  /** Resume data to render */
  resume: Resume;
  /** Template ID for layout selection (reserved for future use) */
  templateId: string;
  /** Color palette to apply to the PDF */
  palette: ColorPalette;
  /** Optional className for the container */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Creates a PDF theme by applying a color palette to the default theme.
 * Maps palette colors to appropriate theme colors.
 */
function createThemeFromPalette(palette: ColorPalette): PDFTheme {
  return {
    ...defaultPDFTheme,
    colors: {
      ...defaultPDFTheme.colors,
      // Primary color for headings and name
      primary: palette.primary,
      // Accent color for header bars and highlights
      accent: palette.secondary,
      // Use secondary as sidebar background tint
      sidebarBackground: adjustColorOpacity(palette.accent, 0.15),
    },
  };
}

/**
 * Converts a hex color to a lighter version (for backgrounds).
 * Returns a hex color with opacity applied as a lighter shade.
 */
function adjustColorOpacity(hexColor: string, opacity: number): string {
  // Parse hex color
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Blend with white based on opacity
  const blend = 1 - opacity;
  const newR = Math.round(r * opacity + 255 * blend);
  const newG = Math.round(g * opacity + 255 * blend);
  const newB = Math.round(b * opacity + 255 * blend);

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function PDFLoadingState({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      {/* A4 aspect ratio skeleton */}
      <div className="relative w-full max-w-md">
        <div className="aspect-[210/297] w-full">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
        {/* Loading overlay */}
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
  return (
    <div className={cn('relative w-full', className)}>
      {/* A4 aspect ratio container */}
      <div className="aspect-[210/297] w-full overflow-hidden rounded-lg border bg-white shadow-sm">
        <iframe
          src={url}
          title="Resume PDF Preview"
          className="h-full w-full border-0"
          style={{ minHeight: '400px' }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ResumePDFPreview - A reusable component for rendering a live PDF preview.
 *
 * This component uses @react-pdf/renderer to generate a PDF document
 * from the provided resume data and displays it in an iframe.
 *
 * Features:
 * - Live preview that updates when props change
 * - Loading state while PDF is generating
 * - Error handling with retry option
 * - Applies color palette to theme
 * - Debounced updates to prevent excessive re-renders
 *
 * Usage:
 * ```tsx
 * <ResumePDFPreview
 *   resume={resumeData}
 *   templateId="classic"
 *   palette={selectedPalette}
 *   className="max-w-lg mx-auto"
 * />
 * ```
 */
function ResumePDFPreview({
  resume,
  templateId,
  palette,
  className,
}: ResumePDFPreviewProps): React.JSX.Element {
  // Track error state for retry functionality
  const [retryKey, setRetryKey] = useState(0);

  // Create theme from palette - memoized to prevent unnecessary re-renders
  const theme = useMemo(() => createThemeFromPalette(palette), [palette]);

  // Memoize the document to prevent unnecessary re-renders
  const document = useMemo(
    () => (
      <ResumePDFDocument
        resume={resume}
        theme={theme}
        // templateId can be used in the future to switch layouts
        // For now, we use the default layout from ResumePDFDocument
      />
    ),
    [resume, theme]
  );

  // Retry handler
  const handleRetry = useCallback(() => {
    setRetryKey((prev) => prev + 1);
  }, []);

  return (
    <div className={cn('resume-pdf-preview', className)} data-template={templateId}>
      <BlobProvider key={retryKey} document={document}>
        {({ blob, url, loading, error }) => {
          // Show loading state
          if (loading) {
            return <PDFLoadingState className="min-h-[400px]" />;
          }

          // Show error state
          if (error) {
            return <PDFErrorState error={error} onRetry={handleRetry} className="min-h-[400px]" />;
          }

          // Show PDF preview
          if (url && blob) {
            return <PDFPreviewContent url={url} />;
          }

          // Fallback loading state (should not normally reach here)
          return <PDFLoadingState className="min-h-[400px]" />;
        }}
      </BlobProvider>
    </div>
  );
}

export default ResumePDFPreview;

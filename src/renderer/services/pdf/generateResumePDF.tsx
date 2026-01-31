import { pdf } from '@react-pdf/renderer';
import type { Resume, WorkExperience, Project } from '@schemas/resume.schema';
import type { PDFTheme } from './theme';
import ResumePDFDocument from './ResumePDFDocument';

/**
 * Options for rendering a resume to PDF.
 */
export interface RenderResumeOptions {
  /** Optional custom theme for PDF styling */
  theme?: PDFTheme;
  /** Optional target job title for header display */
  targetJobTitle?: string;
  /** Optional relevant items to highlight in the PDF */
  relevantItems?: Array<{
    type: 'job' | 'project';
    data: WorkExperience | Project;
  }>;
}

/**
 * Renders a Resume to a PDF blob.
 *
 * @param resume - The validated resume data
 * @param options - Optional rendering options including custom theme
 * @returns A Promise resolving to a Blob containing the PDF data
 */
export async function renderResumeToPDFBlob(
  resume: Resume,
  options?: RenderResumeOptions
): Promise<Blob> {
  const blob = await pdf(
    <ResumePDFDocument
      resume={resume}
      theme={options?.theme}
      {...(options?.targetJobTitle !== undefined && { targetJobTitle: options.targetJobTitle })}
      {...(options?.relevantItems !== undefined && { relevantItems: options.relevantItems })}
    />
  ).toBlob();
  return blob;
}

/**
 * Renders a Resume to a PDF and saves it via Electron IPC or browser download.
 * Falls back to browser download when Electron API is not available.
 *
 * @param resume - The validated resume data
 * @param options - Optional rendering options including custom theme
 * @returns A Promise resolving to the saved file path, or 'downloaded' for browser fallback, or null if cancelled
 */
export async function saveResumePDF(
  resume: Resume,
  options?: RenderResumeOptions
): Promise<string | null> {
  // Check if Electron API is available
  if (typeof window.electronAPI?.generatePDF === 'function') {
    // Generate the PDF blob
    const blob = await renderResumeToPDFBlob(resume, options);

    // Convert blob to ArrayBuffer then to Uint8Array for IPC transfer
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Save via Electron IPC
    const savedPath = await window.electronAPI.generatePDF(uint8Array);

    return savedPath;
  } else {
    // Fall back to browser download
    await downloadResumePDF(resume, undefined, options);
    return 'downloaded';
  }
}

/**
 * Triggers a browser download of the resume PDF (for web fallback).
 *
 * @param resume - The validated resume data
 * @param fileName - Optional file name for the download
 * @param options - Optional rendering options including custom theme
 */
export async function downloadResumePDF(
  resume: Resume,
  fileName?: string,
  options?: RenderResumeOptions
): Promise<void> {
  const blob = await renderResumeToPDFBlob(resume, options);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName ?? `${resume.personalInfo.name.replace(/\s+/g, '_')}_Resume.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the object URL
  URL.revokeObjectURL(url);
}

export default saveResumePDF;

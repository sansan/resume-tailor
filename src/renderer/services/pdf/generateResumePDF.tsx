import { pdf } from '@react-pdf/renderer';
import type { Resume } from '@schemas/resume.schema';
import type { PDFTheme } from './theme';
import { defaultPDFTheme } from './theme';
import { getTemplateComponent } from './templates';

/**
 * Options for rendering a resume to PDF.
 */
export interface RenderResumeOptions {
  /** Optional custom theme for PDF styling */
  theme?: PDFTheme;
  /** Optional target job title for header display */
  targetJobTitle?: string;
  /** Template ID to use (defaults to 'classic') */
  templateId?: string;
}

/**
 * Renders a Resume to a PDF blob using the template system.
 *
 * @param resume - The validated resume data
 * @param options - Optional rendering options including custom theme and templateId
 * @returns A Promise resolving to a Blob containing the PDF data
 */
export async function renderResumeToPDFBlob(
  resume: Resume,
  options?: RenderResumeOptions
): Promise<Blob> {
  const TemplateComponent = getTemplateComponent(options?.templateId ?? 'classic');
  const theme = options?.theme ?? defaultPDFTheme;

  const blob = await pdf(
    <TemplateComponent
      resume={resume}
      theme={theme}
      {...(options?.targetJobTitle ? { targetJobTitle: options.targetJobTitle } : {})}
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

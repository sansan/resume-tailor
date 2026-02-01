import { pdf } from '@react-pdf/renderer'
import type { GeneratedCoverLetter } from '@schemas/ai-output.schema'
import type { PersonalInfo } from '@schemas/resume.schema'
import type { PDFTheme } from './theme'
import CoverLetterPDFDocument from './CoverLetterPDFDocument'

/**
 * Options for rendering a cover letter to PDF.
 */
export interface RenderCoverLetterOptions {
  /** Optional custom theme for PDF styling */
  theme?: PDFTheme
  /** Optional personal info for sender details in sidebar */
  personalInfo?: PersonalInfo
  /** Optional target job title for header display */
  targetJobTitle?: string
}

/**
 * Renders a cover letter to a PDF blob.
 *
 * @param coverLetter - The validated cover letter data
 * @param options - Optional rendering options including custom theme
 * @returns A Promise resolving to a Blob containing the PDF data
 */
export async function renderCoverLetterToPDFBlob(
  coverLetter: GeneratedCoverLetter,
  options?: RenderCoverLetterOptions
): Promise<Blob> {
  const blob = await pdf(
    <CoverLetterPDFDocument
      coverLetter={coverLetter}
      personalInfo={options?.personalInfo}
      theme={options?.theme}
      {...(options?.targetJobTitle !== undefined && { targetJobTitle: options.targetJobTitle })}
    />
  ).toBlob()
  return blob
}

/**
 * Renders a cover letter to a PDF and saves it via Electron IPC or browser download.
 * Falls back to browser download when Electron API is not available.
 *
 * @param coverLetter - The validated cover letter data
 * @param options - Optional rendering options including custom theme
 * @returns A Promise resolving to the saved file path, or 'downloaded' for browser fallback, or null if cancelled
 */
export async function saveCoverLetterPDF(
  coverLetter: GeneratedCoverLetter,
  options?: RenderCoverLetterOptions
): Promise<string | null> {
  // Check if Electron API is available
  if (typeof window.electronAPI?.generatePDF === 'function') {
    // Generate the PDF blob
    const blob = await renderCoverLetterToPDFBlob(coverLetter, options)

    // Convert blob to ArrayBuffer then to Uint8Array for IPC transfer
    const arrayBuffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Save via Electron IPC
    const savedPath = await window.electronAPI.generatePDF(uint8Array)

    return savedPath
  } else {
    // Fall back to browser download
    await downloadCoverLetterPDF(coverLetter, undefined, options)
    return 'downloaded'
  }
}

/**
 * Triggers a browser download of the cover letter PDF (for web fallback).
 *
 * @param coverLetter - The validated cover letter data
 * @param fileName - Optional file name for the download
 * @param options - Optional rendering options including custom theme
 */
export async function downloadCoverLetterPDF(
  coverLetter: GeneratedCoverLetter,
  fileName?: string,
  options?: RenderCoverLetterOptions
): Promise<void> {
  const blob = await renderCoverLetterToPDFBlob(coverLetter, options)
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName ?? `${coverLetter.companyName.replace(/\s+/g, '_')}_Cover_Letter.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up the object URL
  URL.revokeObjectURL(url)
}

export default saveCoverLetterPDF

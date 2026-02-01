export { default as ResumePDFDocument } from './ResumePDFDocument';
export type { ResumePDFDocumentProps } from './ResumePDFDocument';
export { default as CoverLetterPDFDocument } from './CoverLetterPDFDocument';
export type { CoverLetterPDFDocumentProps } from './CoverLetterPDFDocument';
export { pdfTheme, defaultPDFTheme, createPDFTheme, createThemeFromPalette, type PDFTheme, type PartialPDFTheme, type ColorPalette } from './theme';
export {
  renderResumeToPDFBlob,
  saveResumePDF,
  downloadResumePDF,
  type RenderResumeOptions,
} from './generateResumePDF';
export {
  renderCoverLetterToPDFBlob,
  saveCoverLetterPDF,
  downloadCoverLetterPDF,
  type RenderCoverLetterOptions,
} from './generateCoverLetterPDF';

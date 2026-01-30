export { default as ResumePDFDocument } from './ResumePDFDocument';
export type { ResumePDFDocumentProps } from './ResumePDFDocument';
export { default as CoverLetterPDFDocument } from './CoverLetterPDFDocument';
export type { CoverLetterPDFDocumentProps } from './CoverLetterPDFDocument';
export { pdfTheme, defaultPDFTheme, createPDFTheme, type PDFTheme, type PartialPDFTheme } from './theme';
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

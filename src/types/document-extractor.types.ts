/**
 * Document Extractor Types
 *
 * Types for document text extraction from PDF, Word, and text files.
 */

/**
 * Supported document types for resume import.
 */
export type SupportedDocumentType = 'pdf' | 'docx' | 'txt'

/**
 * Result of successful document text extraction.
 */
export interface DocumentExtractionResult {
  success: true
  text: string
  documentType: SupportedDocumentType
  metadata?: {
    pageCount?: number
    title?: string
  }
}

/**
 * Error result from document extraction.
 */
export interface DocumentExtractionError {
  success: false
  error: {
    code: DocumentExtractionErrorCode
    message: string
    details?: Record<string, unknown>
  }
}

/**
 * Error codes for document extraction.
 */
export enum DocumentExtractionErrorCode {
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  EMPTY_DOCUMENT = 'EMPTY_DOCUMENT',
}

/**
 * Combined response type for document extraction.
 */
export type DocumentExtractionResponse = DocumentExtractionResult | DocumentExtractionError

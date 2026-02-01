/**
 * Document Extractor Service
 *
 * Extracts text content from PDF, Word (.docx), and plain text files.
 */

import * as fs from 'fs'
import * as path from 'path'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import {
  type SupportedDocumentType,
  type DocumentExtractionResponse,
  DocumentExtractionErrorCode,
} from '../../types/document-extractor.types'

/**
 * Mapping of file extensions to document types.
 */
const EXTENSION_MAP: Record<string, SupportedDocumentType> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.txt': 'txt',
}

/**
 * Service for extracting text from various document formats.
 */
export class DocumentExtractorService {
  /**
   * Extracts text from a document file.
   *
   * @param filePath - Path to the document file
   * @returns Extraction result with text content or error
   */
  async extractText(filePath: string): Promise<DocumentExtractionResponse> {
    // Determine document type from extension
    const ext = path.extname(filePath).toLowerCase()
    const documentType = EXTENSION_MAP[ext]

    if (!documentType) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.UNSUPPORTED_FORMAT,
          message: `Unsupported file format: ${ext}. Supported formats: PDF, DOCX, TXT`,
        },
      }
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.FILE_READ_ERROR,
          message: `File not found: ${filePath}`,
        },
      }
    }

    try {
      switch (documentType) {
        case 'pdf':
          return await this.extractFromPDF(filePath)
        case 'docx':
          return await this.extractFromDocx(filePath)
        case 'txt':
          return this.extractFromText(filePath)
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.EXTRACTION_FAILED,
          message: `Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { originalError: String(error) },
        },
      }
    }
  }

  /**
   * Extracts text from raw file content (for drag-and-drop scenarios).
   *
   * @param content - Raw file content as Buffer or string
   * @param fileName - Original file name to determine type
   * @returns Extraction result with text content or error
   */
  async extractFromContent(
    content: Buffer | string,
    fileName: string
  ): Promise<DocumentExtractionResponse> {
    const ext = path.extname(fileName).toLowerCase()
    const documentType = EXTENSION_MAP[ext]

    if (!documentType) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.UNSUPPORTED_FORMAT,
          message: `Unsupported file format: ${ext}. Supported formats: PDF, DOCX, TXT`,
        },
      }
    }

    try {
      switch (documentType) {
        case 'pdf':
          return await this.extractFromPDFBuffer(
            Buffer.isBuffer(content) ? content : Buffer.from(content)
          )
        case 'docx':
          return await this.extractFromDocxBuffer(
            Buffer.isBuffer(content) ? content : Buffer.from(content)
          )
        case 'txt':
          return this.extractFromTextContent(
            typeof content === 'string' ? content : content.toString('utf-8')
          )
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.EXTRACTION_FAILED,
          message: `Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { originalError: String(error) },
        },
      }
    }
  }

  /**
   * Extracts text from a PDF file.
   */
  private async extractFromPDF(filePath: string): Promise<DocumentExtractionResponse> {
    const buffer = fs.readFileSync(filePath)
    return this.extractFromPDFBuffer(buffer)
  }

  /**
   * Extracts text from a PDF buffer.
   */
  private async extractFromPDFBuffer(buffer: Buffer): Promise<DocumentExtractionResponse> {
    const parser = new PDFParse({ data: buffer })
    const textResult = await parser.getText()

    const text = textResult.text.trim()
    if (!text) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.EMPTY_DOCUMENT,
          message:
            'PDF appears to be empty or contains only images. Text extraction requires readable text content.',
        },
      }
    }

    // Get info for metadata
    const infoResult = await parser.getInfo()
    await parser.destroy()

    return {
      success: true,
      text,
      documentType: 'pdf',
      metadata: {
        pageCount: textResult.total,
        ...(infoResult.info?.Title ? { title: String(infoResult.info.Title) } : {}),
      },
    }
  }

  /**
   * Extracts text from a Word document.
   */
  private async extractFromDocx(filePath: string): Promise<DocumentExtractionResponse> {
    const result = await mammoth.extractRawText({ path: filePath })
    return this.processDocxResult(result)
  }

  /**
   * Extracts text from a Word document buffer.
   */
  private async extractFromDocxBuffer(buffer: Buffer): Promise<DocumentExtractionResponse> {
    const result = await mammoth.extractRawText({ buffer })
    return this.processDocxResult(result)
  }

  /**
   * Processes mammoth extraction result.
   */
  private processDocxResult(result: { value: string }): DocumentExtractionResponse {
    const text = result.value.trim()
    if (!text) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.EMPTY_DOCUMENT,
          message: 'Word document appears to be empty.',
        },
      }
    }

    return {
      success: true,
      text,
      documentType: 'docx',
    }
  }

  /**
   * Extracts text from a plain text file.
   */
  private extractFromText(filePath: string): DocumentExtractionResponse {
    const text = fs.readFileSync(filePath, 'utf-8').trim()
    return this.extractFromTextContent(text)
  }

  /**
   * Extracts text from text content.
   */
  private extractFromTextContent(text: string): DocumentExtractionResponse {
    const trimmedText = text.trim()
    if (!trimmedText) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.EMPTY_DOCUMENT,
          message: 'Text file is empty.',
        },
      }
    }

    return {
      success: true,
      text: trimmedText,
      documentType: 'txt',
    }
  }

  /**
   * Checks if a file extension is supported.
   */
  isSupported(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase()
    return ext in EXTENSION_MAP
  }

  /**
   * Gets the list of supported file extensions.
   */
  getSupportedExtensions(): string[] {
    return Object.keys(EXTENSION_MAP)
  }
}

// Export singleton instance
export const documentExtractorService = new DocumentExtractorService()

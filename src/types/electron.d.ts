// Type declarations for the Electron API exposed via contextBridge

import type { Resume } from '../schemas/resume.schema';
import type {
  RefinedResume,
  GeneratedCoverLetter,
} from '../schemas/ai-output.schema';
import type {
  AppSettings,
  PartialAppSettings,
} from '../schemas/settings.schema';
import type {
  ExportHistory,
  HistoryEntry,
} from '../schemas/history.schema';

/**
 * Settings validation result type.
 */
export interface SettingsValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Result types for AI operations
 */
export interface AIOperationResult<T> {
  success: true;
  data: T;
  processingTimeMs?: number;
}

export interface AIOperationError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type AIResult<T> = AIOperationResult<T> | AIOperationError;

/**
 * Parameters for refining a resume
 */
export interface RefineResumeParams {
  resume: Resume;
  jobPosting: string;
  options?: {
    maxRetries?: number;
    includeMetadata?: boolean;
  };
}

/**
 * Parameters for generating a cover letter
 */
export interface GenerateCoverLetterParams {
  resume: Resume;
  jobPosting: string;
  companyInfo?: {
    name?: string;
    address?: string;
    hiringManager?: string;
    hiringManagerTitle?: string;
  };
  options?: {
    maxRetries?: number;
    includeMetadata?: boolean;
    tone?: 'formal' | 'conversational' | 'enthusiastic';
  };
}

/**
 * Progress update for AI operations
 */
export interface AIProgressUpdate {
  operationId: string;
  status: 'started' | 'processing' | 'validating' | 'completed' | 'cancelled' | 'error';
  message?: string;
  progress?: number;
}

/**
 * Parameters for exporting both resume and cover letter PDFs
 */
export interface ExportApplicationPDFsParams {
  baseFolderPath: string;
  subfolderName: string;
  resumeBlob: Blob;
  coverLetterBlob: Blob;
  resumeFileName: string;
  coverLetterFileName: string;
}

/**
 * Parameters for exporting a single PDF
 */
export interface ExportSinglePDFParams {
  baseFolderPath: string;
  subfolderName: string;
  pdfBlob: Blob;
  fileName: string;
}

/**
 * Result of PDF export operation
 */
export interface ExportPDFResult {
  success: boolean;
  folderPath?: string;
  error?: string;
}

/**
 * Parameters for checking if export files exist
 */
export interface CheckExportFilesParams {
  baseFolderPath: string;
  subfolderName: string;
  fileNames: string[];
}

/**
 * Result of checking if export files exist
 */
export interface CheckExportFilesResult {
  exists: boolean;
  existingFiles: string[];
}

export interface ElectronAPI {
  // File operations
  loadResume: () => Promise<{ content: string; filePath: string } | null>;
  saveResume: (data: { content: string; filePath?: string }) => Promise<string | null>;
  generatePDF: (pdfData: Uint8Array) => Promise<string | null>;
  openFolder: (folderPath: string) => Promise<void>;
  selectFolder: () => Promise<string | null>;

  // Export Operations
  checkExportFiles: (params: CheckExportFilesParams) => Promise<CheckExportFilesResult>;
  exportApplicationPDFs: (params: ExportApplicationPDFsParams) => Promise<ExportPDFResult>;
  exportSinglePDF: (params: ExportSinglePDFParams) => Promise<ExportPDFResult>;

  // AI Operations
  refineResume: (params: RefineResumeParams) => Promise<AIResult<RefinedResume>>;
  generateCoverLetter: (params: GenerateCoverLetterParams) => Promise<AIResult<GeneratedCoverLetter>>;
  cancelAIOperation: (operationId: string) => Promise<boolean>;
  checkAIAvailability: () => Promise<boolean>;

  // AI Progress events
  onAIProgress: (callback: (update: AIProgressUpdate) => void) => () => void;

  // Settings Operations
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: PartialAppSettings) => Promise<AppSettings>;
  selectOutputFolder: () => Promise<string | null>;
  resetSettings: () => Promise<AppSettings>;
  validateSettings: (settings: PartialAppSettings) => Promise<SettingsValidationResult>;
  getDefaultOutputFolder: () => Promise<string>;

  // History Operations
  getExportHistory: () => Promise<ExportHistory>;
  getRecentExports: (limit?: number) => Promise<HistoryEntry[]>;
  addToHistory: (entry: HistoryEntry) => Promise<void>;
  deleteHistoryEntry: (entryId: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  openHistoryFile: (filePath: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

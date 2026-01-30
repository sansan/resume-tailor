import { contextBridge, ipcRenderer } from 'electron';

// Import types for AI operations
import type { Resume } from '../src/shared/schemas/resume.schema';
import type {
  RefinedResume,
  GeneratedCoverLetter,
} from '../src/shared/schemas/ai-output.schema';
import type { RefineResumeOptions, GenerateCoverLetterOptions } from '../src/main/services/ai-processor.types';
import type { CompanyInfo } from '../src/shared/prompts/cover-letter.prompt';
import type {
  AppSettings,
  PartialAppSettings,
} from '../src/shared/schemas/settings.schema';
import type { ExportHistory, HistoryEntry } from '../src/shared/schemas/history.schema';
import type { SettingsValidationResult } from '../src/main/services/settings.service';

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
  options?: RefineResumeOptions;
}

/**
 * Parameters for generating a cover letter
 */
export interface GenerateCoverLetterParams {
  resume: Resume;
  jobPosting: string;
  companyInfo?: CompanyInfo;
  options?: GenerateCoverLetterOptions;
}

/**
 * Progress update for AI operations
 */
export interface AIProgressUpdate {
  status: 'started' | 'processing' | 'validating' | 'completed' | 'cancelled' | 'error';
  message?: string;
  progress?: number;
}

/**
 * Parameters for exporting both resume and cover letter PDFs (renderer side - uses Blob)
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
 * Parameters for exporting a single PDF (renderer side - uses Blob)
 */
export interface ExportSinglePDFParams {
  baseFolderPath: string;
  subfolderName: string;
  pdfBlob: Blob;
  fileName: string;
}

/**
 * Internal IPC params (uses Uint8Array since Blob doesn't serialize)
 */
interface ExportApplicationPDFsIPCParams {
  baseFolderPath: string;
  subfolderName: string;
  resumeData: Uint8Array;
  coverLetterData: Uint8Array;
  resumeFileName: string;
  coverLetterFileName: string;
}

interface ExportSinglePDFIPCParams {
  baseFolderPath: string;
  subfolderName: string;
  pdfData: Uint8Array;
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

// Define the API that will be exposed to the renderer process
export interface ElectronAPI {
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
  onAIProgress: (callback: (update: AIProgressUpdate & { operationId: string }) => void) => () => void;

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

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  loadResume: () => ipcRenderer.invoke('load-resume'),
  saveResume: (data) => ipcRenderer.invoke('save-resume', data),
  generatePDF: (pdfData) => ipcRenderer.invoke('generate-pdf', Buffer.from(pdfData)),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Export Operations
  checkExportFiles: (params) => ipcRenderer.invoke('check-export-files', params),
  exportApplicationPDFs: async (params) => {
    // Convert Blobs to Uint8Array since Blobs don't serialize through IPC
    const resumeArrayBuffer = await params.resumeBlob.arrayBuffer();
    const coverLetterArrayBuffer = await params.coverLetterBlob.arrayBuffer();
    const ipcParams: ExportApplicationPDFsIPCParams = {
      baseFolderPath: params.baseFolderPath,
      subfolderName: params.subfolderName,
      resumeData: new Uint8Array(resumeArrayBuffer),
      coverLetterData: new Uint8Array(coverLetterArrayBuffer),
      resumeFileName: params.resumeFileName,
      coverLetterFileName: params.coverLetterFileName,
    };
    return ipcRenderer.invoke('export-application-pdfs', ipcParams);
  },
  exportSinglePDF: async (params) => {
    // Convert Blob to Uint8Array since Blobs don't serialize through IPC
    const arrayBuffer = await params.pdfBlob.arrayBuffer();
    const ipcParams: ExportSinglePDFIPCParams = {
      baseFolderPath: params.baseFolderPath,
      subfolderName: params.subfolderName,
      pdfData: new Uint8Array(arrayBuffer),
      fileName: params.fileName,
    };
    return ipcRenderer.invoke('export-single-pdf', ipcParams);
  },

  // AI Operations
  refineResume: (params) => ipcRenderer.invoke('ai:refine-resume', params),
  generateCoverLetter: (params) => ipcRenderer.invoke('ai:generate-cover-letter', params),
  cancelAIOperation: (operationId) => ipcRenderer.invoke('ai:cancel-operation', operationId),
  checkAIAvailability: () => ipcRenderer.invoke('ai:check-availability'),

  // AI Progress events
  onAIProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, update: AIProgressUpdate & { operationId: string }) => {
      callback(update);
    };
    ipcRenderer.on('ai:progress', handler);
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('ai:progress', handler);
    };
  },

  // Settings Operations
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  selectOutputFolder: () => ipcRenderer.invoke('settings:select-folder'),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  validateSettings: (settings) => ipcRenderer.invoke('settings:validate', settings),
  getDefaultOutputFolder: () => ipcRenderer.invoke('settings:get-default-folder'),

  // History Operations
  getExportHistory: () => ipcRenderer.invoke('history:get'),
  getRecentExports: (limit) => ipcRenderer.invoke('history:get-recent', limit),
  addToHistory: (entry) => ipcRenderer.invoke('history:add', entry),
  deleteHistoryEntry: (entryId) => ipcRenderer.invoke('history:delete', entryId),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  openHistoryFile: (filePath) => ipcRenderer.invoke('history:open-file', filePath),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

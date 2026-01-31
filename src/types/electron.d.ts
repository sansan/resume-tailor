// Type declarations for the Electron API exposed via contextBridge

import type { Resume, UserProfile } from '../schemas/resume.schema';
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

// ============================================
// Settings Types
// ============================================

export interface SettingsValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

// ============================================
// AI Operation Types
// ============================================

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

export interface AIProgressUpdate {
  operationId: string;
  status: 'started' | 'processing' | 'validating' | 'completed' | 'cancelled' | 'error';
  message?: string;
  progress?: number;
}

// ============================================
// AI Request Parameters
// ============================================

export interface RefineResumeParams {
  resume: Resume;
  jobPosting: string;
  options?: {
    maxRetries?: number;
    includeMetadata?: boolean;
  };
}

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

// ============================================
// PDF Export Types (Renderer side - uses Blob)
// ============================================

export interface ExportApplicationPDFsParams {
  baseFolderPath: string;
  subfolderName: string;
  resumeBlob: Blob;
  coverLetterBlob: Blob;
  resumeFileName: string;
  coverLetterFileName: string;
}

export interface ExportSinglePDFParams {
  baseFolderPath: string;
  subfolderName: string;
  pdfBlob: Blob;
  fileName: string;
}

export interface ExportPDFResult {
  success: boolean;
  folderPath?: string;
  error?: string;
}

export interface CheckExportFilesParams {
  baseFolderPath: string;
  subfolderName: string;
  fileNames: string[];
}

export interface CheckExportFilesResult {
  exists: boolean;
  existingFiles: string[];
}

// ============================================
// PDF Export Types (IPC side - uses Uint8Array)
// ============================================

export interface ExportApplicationPDFsIPCParams {
  baseFolderPath: string;
  subfolderName: string;
  resumeData: Uint8Array;
  coverLetterData: Uint8Array;
  resumeFileName: string;
  coverLetterFileName: string;
}

export interface ExportSinglePDFIPCParams {
  baseFolderPath: string;
  subfolderName: string;
  pdfData: Uint8Array;
  fileName: string;
}

// ============================================
// File Operation Types
// ============================================

export interface LoadResumeResult {
  content: string;
  filePath: string;
}

export interface SaveResumeData {
  content: string;
  filePath?: string;
}

// ============================================
// Profile Import Types
// ============================================

export interface ImportResumeResult {
  success: true;
  profile: UserProfile;
}

export interface ImportResumeError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ImportResumeResponse = ImportResumeResult | ImportResumeError;

// ============================================
// Onboarding & API Key Types
// ============================================

/**
 * Supported AI providers for API key storage.
 */
export type AIProvider = 'claude' | 'openai' | 'google';

/**
 * Supported CLI tools for detection.
 */
export type CLITool = 'claude' | 'codex' | 'gemini';

// ============================================
// Electron API Interface
// ============================================

export interface ElectronAPI {
  // File operations
  loadResume: () => Promise<LoadResumeResult | null>;
  saveResume: (data: SaveResumeData) => Promise<string | null>;
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

  // Profile Operations
  hasProfile: () => Promise<boolean>;
  loadProfile: () => Promise<UserProfile | null>;
  importResumeFromFile: (filePath: string) => Promise<ImportResumeResponse>;
  importResumeFromText: (text: string, fileName?: string) => Promise<ImportResumeResponse>;
  saveProfile: (resume: Resume) => Promise<UserProfile>;
  clearProfile: () => Promise<void>;

  // Onboarding Operations
  isOnboardingComplete: () => Promise<boolean>;
  completeOnboarding: () => Promise<void>;
  detectInstalledCLIs: () => Promise<CLITool[]>;
  saveAPIKey: (provider: AIProvider, key: string) => Promise<void>;
  hasAPIKey: (provider: AIProvider) => Promise<boolean>;
  deleteAPIKey: (provider: AIProvider) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

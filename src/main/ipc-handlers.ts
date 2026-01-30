import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { aiProcessorService } from './services/ai-processor.service';
import { AIProcessorError, AIProcessorErrorCode } from './services/ai-processor.types';
import { settingsService, SettingsError, SettingsErrorCode, type SettingsValidationResult } from './services/settings.service';
import { historyService } from './services/history.service';
import type { Resume } from '../shared/schemas/resume.schema';
import type { RefineResumeOptions, GenerateCoverLetterOptions } from './services/ai-processor.types';
import type { CompanyInfo } from '../shared/prompts/cover-letter.prompt';
import type { ResumeRefinementOptions } from '../shared/prompts/resume-refinement.prompt';
import type { CoverLetterGenerationOptions } from '../shared/prompts/cover-letter.prompt';
import type {
  RefinedResume,
  GeneratedCoverLetter,
} from '../shared/schemas/ai-output.schema';
import type { AppSettings, PartialAppSettings, ResumePromptTemplateSettings, CoverLetterPromptTemplateSettings } from '../shared/schemas/settings.schema';
import type { ExportHistory, HistoryEntry } from '../shared/schemas/history.schema';

/**
 * Converts resume prompt settings to ResumeRefinementOptions for the AI processor.
 */
function convertResumeSettingsToOptions(settings: ResumePromptTemplateSettings): ResumeRefinementOptions {
  return {
    maxSummaryLength: settings.maxSummaryLength,
    maxHighlightsPerExperience: settings.maxHighlightsPerExperience,
    tone: settings.tone,
    focusAreas: settings.focusAreas,
    customInstructions: settings.customInstructions,
    preserveAllContent: settings.preserveAllContent,
  };
}

/**
 * Converts cover letter prompt settings to CoverLetterGenerationOptions for the AI processor.
 */
function convertCoverLetterSettingsToOptions(settings: CoverLetterPromptTemplateSettings): CoverLetterGenerationOptions {
  return {
    maxOpeningLength: settings.maxOpeningLength,
    maxBodyParagraphs: settings.maxBodyParagraphs,
    tone: settings.tone,
    focusAreas: settings.focusAreas,
    customInstructions: settings.customInstructions,
    style: settings.style,
    emphasizeCompanyKnowledge: settings.emphasizeCompanyKnowledge,
  };
}

/**
 * IPC Handlers for file system operations, dialogs, and AI operations.
 * These handlers provide the bridge between the renderer process
 * and system-level operations.
 */

export interface LoadResumeResult {
  content: string;
  filePath: string;
}

export interface SaveResumeData {
  content: string;
  filePath?: string;
}

/**
 * Parameters for refining a resume via IPC
 */
export interface RefineResumeParams {
  resume: Resume;
  jobPosting: string;
  options?: RefineResumeOptions;
}

/**
 * Parameters for generating a cover letter via IPC
 */
export interface GenerateCoverLetterParams {
  resume: Resume;
  jobPosting: string;
  companyInfo?: CompanyInfo;
  options?: GenerateCoverLetterOptions;
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
 * Parameters for exporting both resume and cover letter PDFs
 * Uses Uint8Array since Blob doesn't serialize through IPC
 */
export interface ExportApplicationPDFsParams {
  baseFolderPath: string;
  subfolderName: string;
  resumeData: Uint8Array;
  coverLetterData: Uint8Array;
  resumeFileName: string;
  coverLetterFileName: string;
}

/**
 * Parameters for exporting a single PDF
 * Uses Uint8Array since Blob doesn't serialize through IPC
 */
export interface ExportSinglePDFParams {
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

/**
 * Progress update for AI operations
 */
export interface AIProgressUpdate {
  status: 'started' | 'processing' | 'validating' | 'completed' | 'cancelled' | 'error';
  message?: string;
  progress?: number;
}

/**
 * Map to track active AI operations for cancellation support
 */
const activeOperations = new Map<string, AbortController>();

/**
 * Generates a unique operation ID
 */
function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sends progress update to all renderer windows
 */
function sendProgressUpdate(operationId: string, update: AIProgressUpdate): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send('ai:progress', { operationId, ...update });
  }
}

/**
 * Helper to convert AIProcessorError to IPC-friendly format
 */
function convertErrorToResult(error: unknown): AIOperationError {
  if (error instanceof AIProcessorError) {
    const result: AIOperationError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };
    if (error.details !== undefined) {
      result.error.details = error.details;
    }
    return result;
  }

  return {
    success: false,
    error: {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    },
  };
}

/**
 * Registers all IPC handlers for the application.
 * Call this once during app initialization.
 */
export function registerIPCHandlers(): void {
  // Load resume from file using open dialog
  ipcMain.handle('load-resume', async (): Promise<LoadResumeResult | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    if (filePath === undefined) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return { content, filePath };
  });

  // Save resume to file (with optional existing path or save dialog)
  ipcMain.handle('save-resume', async (_event, data: SaveResumeData): Promise<string | null> => {
    let targetPath = data.filePath;

    if (!targetPath) {
      const result = await dialog.showSaveDialog({
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        defaultPath: 'resume.json',
      });

      if (result.canceled || !result.filePath) {
        return null;
      }
      targetPath = result.filePath;
    }

    fs.writeFileSync(targetPath, data.content, 'utf-8');
    return targetPath;
  });

  // Generate PDF - save PDF buffer to file
  ipcMain.handle('generate-pdf', async (_event, pdfData: Buffer): Promise<string | null> => {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      defaultPath: 'resume.pdf',
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    fs.writeFileSync(result.filePath, pdfData);
    return result.filePath;
  });

  // Open folder in system file explorer
  ipcMain.handle('open-folder', async (_event, folderPath: string): Promise<void> => {
    await shell.openPath(folderPath);
  });

  // Select folder using directory picker dialog
  ipcMain.handle('select-folder', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0] ?? null;
  });

  // ============================================
  // PDF Export Handlers
  // ============================================

  // Check if export files already exist (for overwrite confirmation)
  ipcMain.handle(
    'check-export-files',
    async (_event, params: CheckExportFilesParams): Promise<CheckExportFilesResult> => {
      const folderPath = path.join(params.baseFolderPath, params.subfolderName);
      const existingFiles: string[] = [];

      for (const fileName of params.fileNames) {
        const filePath = path.join(folderPath, fileName);
        if (fs.existsSync(filePath)) {
          existingFiles.push(fileName);
        }
      }

      return {
        exists: existingFiles.length > 0,
        existingFiles,
      };
    }
  );

  // Export both resume and cover letter PDFs to a company subfolder
  ipcMain.handle(
    'export-application-pdfs',
    async (_event, params: ExportApplicationPDFsParams): Promise<ExportPDFResult> => {
      try {
        // Create the full folder path
        const folderPath = path.join(params.baseFolderPath, params.subfolderName);

        // Create the directory if it doesn't exist
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        // Convert Uint8Array to Buffer and save
        const resumeBuffer = Buffer.from(params.resumeData);
        const resumePath = path.join(folderPath, params.resumeFileName);
        fs.writeFileSync(resumePath, resumeBuffer);

        const coverLetterBuffer = Buffer.from(params.coverLetterData);
        const coverLetterPath = path.join(folderPath, params.coverLetterFileName);
        fs.writeFileSync(coverLetterPath, coverLetterBuffer);

        return {
          success: true,
          folderPath,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export PDFs',
        };
      }
    }
  );

  // Export a single PDF to a company subfolder
  ipcMain.handle(
    'export-single-pdf',
    async (_event, params: ExportSinglePDFParams): Promise<ExportPDFResult> => {
      try {
        // Create the full folder path
        const folderPath = path.join(params.baseFolderPath, params.subfolderName);

        // Create the directory if it doesn't exist
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        // Convert Uint8Array to Buffer and save
        const buffer = Buffer.from(params.pdfData);
        const filePath = path.join(folderPath, params.fileName);
        fs.writeFileSync(filePath, buffer);

        return {
          success: true,
          folderPath,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export PDF',
        };
      }
    }
  );

  // ============================================
  // Settings Handlers
  // ============================================

  // Get current application settings
  ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
    return settingsService.loadSettings();
  });

  // Save application settings (partial update)
  ipcMain.handle(
    'settings:save',
    async (_event, settings: PartialAppSettings): Promise<AppSettings> => {
      return settingsService.saveSettings(settings);
    }
  );

  // Select output folder using directory picker dialog
  ipcMain.handle('settings:select-folder', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Select Output Folder',
      properties: ['openDirectory', 'createDirectory'],
      message: 'Choose the folder where exported PDFs will be saved',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    if (selectedPath === undefined) {
      return null;
    }

    // Validate that the selected folder is writable
    if (!settingsService.isValidOutputFolder(selectedPath)) {
      throw new SettingsError(
        SettingsErrorCode.FOLDER_VALIDATION_ERROR,
        'Selected folder is not writable',
        { folderPath: selectedPath }
      );
    }

    return selectedPath;
  });

  // Reset settings to defaults
  ipcMain.handle('settings:reset', async (): Promise<AppSettings> => {
    return settingsService.resetSettings();
  });

  // Validate settings without saving
  ipcMain.handle(
    'settings:validate',
    async (_event, settings: PartialAppSettings): Promise<SettingsValidationResult> => {
      return settingsService.validateSettings(settings);
    }
  );

  // Get default output folder path
  ipcMain.handle('settings:get-default-folder', async (): Promise<string> => {
    return settingsService.getDefaultExportFolderPath();
  });

  // ============================================
  // History Handlers
  // ============================================

  // Get export history
  ipcMain.handle('history:get', async (): Promise<ExportHistory> => {
    return historyService.loadHistory();
  });

  // Get recent history entries
  ipcMain.handle('history:get-recent', async (_event, limit?: number): Promise<HistoryEntry[]> => {
    return historyService.getRecentEntries(limit);
  });

  // Add entry to history
  ipcMain.handle('history:add', async (_event, entry: HistoryEntry): Promise<void> => {
    return historyService.addEntry(entry);
  });

  // Delete entry from history
  ipcMain.handle('history:delete', async (_event, entryId: string): Promise<void> => {
    return historyService.deleteEntry(entryId);
  });

  // Clear all history
  ipcMain.handle('history:clear', async (): Promise<void> => {
    return historyService.clearHistory();
  });

  // Open file in system default application
  ipcMain.handle('history:open-file', async (_event, filePath: string): Promise<boolean> => {
    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }
      await shell.openPath(filePath);
      return true;
    } catch {
      return false;
    }
  });

  // ============================================
  // AI Operation Handlers
  // ============================================

  // Check if Claude Code CLI is available
  ipcMain.handle('ai:check-availability', async (): Promise<boolean> => {
    return aiProcessorService.isAvailable();
  });

  // Refine resume with AI
  ipcMain.handle(
    'ai:refine-resume',
    async (_event, params: RefineResumeParams): Promise<AIResult<RefinedResume>> => {
      const operationId = generateOperationId();
      const abortController = new AbortController();
      activeOperations.set(operationId, abortController);

      const startTime = Date.now();

      try {
        // Send progress: started
        sendProgressUpdate(operationId, {
          status: 'started',
          message: 'Starting resume refinement...',
          progress: 0,
        });

        // Check if operation was cancelled before starting
        if (abortController.signal.aborted) {
          sendProgressUpdate(operationId, {
            status: 'cancelled',
            message: 'Operation was cancelled',
          });
          return {
            success: false,
            error: {
              code: AIProcessorErrorCode.CANCELLED,
              message: 'Operation was cancelled by user',
            },
          };
        }

        // Load settings to get prompt configuration
        const settings = await settingsService.loadSettings();
        const promptOptionsFromSettings = convertResumeSettingsToOptions(settings.resumePromptTemplate);

        // Send progress: processing
        sendProgressUpdate(operationId, {
          status: 'processing',
          message: 'Analyzing job posting and refining resume...',
          progress: 25,
        });

        // Merge settings-based options with any options passed from the renderer
        // Options from params take precedence over settings
        const mergedOptions: RefineResumeOptions = {
          ...params.options,
          promptOptions: {
            ...promptOptionsFromSettings,
            ...params.options?.promptOptions,
          },
        };

        // Execute the refinement
        const result = await aiProcessorService.refineResume(
          params.resume,
          params.jobPosting,
          mergedOptions
        );

        // Check if cancelled during processing
        if (abortController.signal.aborted) {
          sendProgressUpdate(operationId, {
            status: 'cancelled',
            message: 'Operation was cancelled',
          });
          return {
            success: false,
            error: {
              code: AIProcessorErrorCode.CANCELLED,
              message: 'Operation was cancelled by user',
            },
          };
        }

        // Send progress: completed
        const processingTimeMs = Date.now() - startTime;
        sendProgressUpdate(operationId, {
          status: 'completed',
          message: 'Resume refinement completed successfully',
          progress: 100,
        });

        return {
          success: true,
          data: result,
          processingTimeMs,
        };
      } catch (error) {
        const errorResult = convertErrorToResult(error);
        sendProgressUpdate(operationId, {
          status: 'error',
          message: errorResult.error.message,
        });
        return errorResult;
      } finally {
        activeOperations.delete(operationId);
      }
    }
  );

  // Generate cover letter with AI
  ipcMain.handle(
    'ai:generate-cover-letter',
    async (_event, params: GenerateCoverLetterParams): Promise<AIResult<GeneratedCoverLetter>> => {
      const operationId = generateOperationId();
      const abortController = new AbortController();
      activeOperations.set(operationId, abortController);

      const startTime = Date.now();

      try {
        // Send progress: started
        sendProgressUpdate(operationId, {
          status: 'started',
          message: 'Starting cover letter generation...',
          progress: 0,
        });

        // Check if operation was cancelled before starting
        if (abortController.signal.aborted) {
          sendProgressUpdate(operationId, {
            status: 'cancelled',
            message: 'Operation was cancelled',
          });
          return {
            success: false,
            error: {
              code: AIProcessorErrorCode.CANCELLED,
              message: 'Operation was cancelled by user',
            },
          };
        }

        // Load settings to get prompt configuration
        const settings = await settingsService.loadSettings();
        const promptOptionsFromSettings = convertCoverLetterSettingsToOptions(settings.coverLetterPromptTemplate);

        // Send progress: processing
        sendProgressUpdate(operationId, {
          status: 'processing',
          message: 'Analyzing resume and job posting, generating cover letter...',
          progress: 25,
        });

        // Build options for cover letter generation
        // Merge settings-based options with any options passed from the renderer
        // Options from params take precedence over settings
        const coverLetterOptions: GenerateCoverLetterOptions = {
          ...params.options,
          promptOptions: {
            ...promptOptionsFromSettings,
            ...params.options?.promptOptions,
          },
        };
        if (params.companyInfo !== undefined) {
          coverLetterOptions.companyInfo = params.companyInfo;
        }

        // Execute the generation
        const result = await aiProcessorService.generateCoverLetter(
          params.resume,
          params.jobPosting,
          coverLetterOptions
        );

        // Check if cancelled during processing
        if (abortController.signal.aborted) {
          sendProgressUpdate(operationId, {
            status: 'cancelled',
            message: 'Operation was cancelled',
          });
          return {
            success: false,
            error: {
              code: AIProcessorErrorCode.CANCELLED,
              message: 'Operation was cancelled by user',
            },
          };
        }

        // Send progress: completed
        const processingTimeMs = Date.now() - startTime;
        sendProgressUpdate(operationId, {
          status: 'completed',
          message: 'Cover letter generation completed successfully',
          progress: 100,
        });

        return {
          success: true,
          data: result,
          processingTimeMs,
        };
      } catch (error) {
        const errorResult = convertErrorToResult(error);
        sendProgressUpdate(operationId, {
          status: 'error',
          message: errorResult.error.message,
        });
        return errorResult;
      } finally {
        activeOperations.delete(operationId);
      }
    }
  );

  // Cancel an active AI operation
  ipcMain.handle('ai:cancel-operation', async (_event, operationId: string): Promise<boolean> => {
    const controller = activeOperations.get(operationId);
    if (controller) {
      controller.abort();
      activeOperations.delete(operationId);
      return true;
    }
    return false;
  });
}

/**
 * Removes all registered IPC handlers.
 * Useful for testing or cleanup.
 */
export function removeIPCHandlers(): void {
  ipcMain.removeHandler('load-resume');
  ipcMain.removeHandler('save-resume');
  ipcMain.removeHandler('generate-pdf');
  ipcMain.removeHandler('open-folder');
  ipcMain.removeHandler('select-folder');
  // Export handlers
  ipcMain.removeHandler('check-export-files');
  ipcMain.removeHandler('export-application-pdfs');
  ipcMain.removeHandler('export-single-pdf');
  // Settings handlers
  ipcMain.removeHandler('settings:get');
  ipcMain.removeHandler('settings:save');
  ipcMain.removeHandler('settings:select-folder');
  ipcMain.removeHandler('settings:reset');
  ipcMain.removeHandler('settings:validate');
  ipcMain.removeHandler('settings:get-default-folder');
  // History handlers
  ipcMain.removeHandler('history:get');
  ipcMain.removeHandler('history:get-recent');
  ipcMain.removeHandler('history:add');
  ipcMain.removeHandler('history:delete');
  ipcMain.removeHandler('history:clear');
  ipcMain.removeHandler('history:open-file');
  // AI handlers
  ipcMain.removeHandler('ai:check-availability');
  ipcMain.removeHandler('ai:refine-resume');
  ipcMain.removeHandler('ai:generate-cover-letter');
  ipcMain.removeHandler('ai:cancel-operation');
  // Clear any active operations
  activeOperations.clear();
}

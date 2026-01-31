import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { aiProcessorService } from './services/ai-processor.service';
import { AIProcessorError, AIProcessorErrorCode } from '../types/ai-processor.types';
import { settingsService, SettingsError, SettingsErrorCode } from './services/settings.service';
import { historyService } from './services/history.service';
import { profileService } from './services/profile.service';
import { documentExtractorService } from './services/document-extractor.service';
import { apiKeyService } from './services/api-key.service';
import type { AIProvider, CLITool } from './services/api-key.service';
import type { RefineResumeOptions, GenerateCoverLetterOptions } from '../types/ai-processor.types';
import type { ResumeRefinementOptions, } from '../prompts/resume-refinement.prompt';
import type { CoverLetterGenerationOptions, CompanyInfo } from '../prompts/cover-letter.prompt';
import type { RefinedResume, GeneratedCoverLetter } from '../schemas/ai-output.schema';
import type { AppSettings, PartialAppSettings, ResumePromptTemplateSettings, CoverLetterPromptTemplateSettings } from '../schemas/settings.schema';
import type { ExportHistory, HistoryEntry } from '../schemas/history.schema';

// Import shared types from the single source of truth
import type {
  LoadResumeResult,
  SaveResumeData,
  AIOperationError,
  AIResult,
  AIProgressUpdate,
  ExportApplicationPDFsIPCParams,
  ExportSinglePDFIPCParams,
  ExportPDFResult,
  CheckExportFilesParams,
  CheckExportFilesResult,
  ImportResumeResponse,
} from '../types/electron';
import type { Resume, UserProfile } from '../schemas/resume.schema';

// IPC-specific param types (may differ slightly from renderer types)
interface RefineResumeIPCParams {
  resume: Resume;
  jobPosting: string;
  options?: RefineResumeOptions;
}

interface GenerateCoverLetterIPCParams {
  resume: Resume;
  jobPosting: string;
  companyInfo?: CompanyInfo;
  options?: GenerateCoverLetterOptions;
}

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
function sendProgressUpdate(operationId: string, update: Omit<AIProgressUpdate, 'operationId'>): void {
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
  // ============================================
  // File Operations
  // ============================================

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

  ipcMain.handle('open-folder', async (_event, folderPath: string): Promise<void> => {
    await shell.openPath(folderPath);
  });

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

  ipcMain.handle(
    'export-application-pdfs',
    async (_event, params: ExportApplicationPDFsIPCParams): Promise<ExportPDFResult> => {
      try {
        const folderPath = path.join(params.baseFolderPath, params.subfolderName);

        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        const resumeBuffer = Buffer.from(params.resumeData);
        fs.writeFileSync(path.join(folderPath, params.resumeFileName), resumeBuffer);

        const coverLetterBuffer = Buffer.from(params.coverLetterData);
        fs.writeFileSync(path.join(folderPath, params.coverLetterFileName), coverLetterBuffer);

        return { success: true, folderPath };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export PDFs',
        };
      }
    }
  );

  ipcMain.handle(
    'export-single-pdf',
    async (_event, params: ExportSinglePDFIPCParams): Promise<ExportPDFResult> => {
      try {
        const folderPath = path.join(params.baseFolderPath, params.subfolderName);

        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        const buffer = Buffer.from(params.pdfData);
        fs.writeFileSync(path.join(folderPath, params.fileName), buffer);

        return { success: true, folderPath };
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

  ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
    return settingsService.loadSettings();
  });

  ipcMain.handle(
    'settings:save',
    async (_event, settings: PartialAppSettings): Promise<AppSettings> => {
      return settingsService.saveSettings(settings);
    }
  );

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

    if (!settingsService.isValidOutputFolder(selectedPath)) {
      throw new SettingsError(
        SettingsErrorCode.FOLDER_VALIDATION_ERROR,
        'Selected folder is not writable',
        { folderPath: selectedPath }
      );
    }

    return selectedPath;
  });

  ipcMain.handle('settings:reset', async (): Promise<AppSettings> => {
    return settingsService.resetSettings();
  });

  ipcMain.handle('settings:validate', async (_event, settings: PartialAppSettings) => {
    return settingsService.validateSettings(settings);
  });

  ipcMain.handle('settings:get-default-folder', async (): Promise<string> => {
    return settingsService.getDefaultExportFolderPath();
  });

  // ============================================
  // History Handlers
  // ============================================

  ipcMain.handle('history:get', async (): Promise<ExportHistory> => {
    return historyService.loadHistory();
  });

  ipcMain.handle('history:get-recent', async (_event, limit?: number): Promise<HistoryEntry[]> => {
    return historyService.getRecentEntries(limit);
  });

  ipcMain.handle('history:add', async (_event, entry: HistoryEntry): Promise<void> => {
    return historyService.addEntry(entry);
  });

  ipcMain.handle('history:delete', async (_event, entryId: string): Promise<void> => {
    return historyService.deleteEntry(entryId);
  });

  ipcMain.handle('history:clear', async (): Promise<void> => {
    return historyService.clearHistory();
  });

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
  // Profile Handlers
  // ============================================

  ipcMain.handle('profile:has', async (): Promise<boolean> => {
    return profileService.hasProfile();
  });

  ipcMain.handle('profile:load', async (): Promise<UserProfile | null> => {
    return profileService.loadProfile();
  });

  ipcMain.handle(
    'profile:import-file',
    async (_event, filePath: string): Promise<ImportResumeResponse> => {
      try {
        // Extract text from document
        const extraction = await documentExtractorService.extractText(filePath);
        if (!extraction.success) {
          return {
            success: false,
            error: {
              code: extraction.error.code,
              message: extraction.error.message,
              ...(extraction.error.details ? { details: extraction.error.details } : {}),
            },
          };
        }

        // Extract structured data using AI
        const resume = await aiProcessorService.extractResume(extraction.text);

        // Save to profile
        const profile = await profileService.saveProfile(resume, filePath);

        return {
          success: true,
          profile,
        };
      } catch (error) {
        if (error instanceof AIProcessorError) {
          return {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              ...(error.details ? { details: error.details } : {}),
            },
          };
        }
        return {
          success: false,
          error: {
            code: 'IMPORT_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }
  );

  ipcMain.handle(
    'profile:import-text',
    async (_event, text: string, fileName?: string): Promise<ImportResumeResponse> => {
      try {
        // Extract structured data using AI
        const resume = await aiProcessorService.extractResume(text);

        // Save to profile
        const profile = await profileService.saveProfile(resume, fileName);

        return {
          success: true,
          profile,
        };
      } catch (error) {
        if (error instanceof AIProcessorError) {
          return {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              ...(error.details ? { details: error.details } : {}),
            },
          };
        }
        return {
          success: false,
          error: {
            code: 'IMPORT_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }
  );

  ipcMain.handle('profile:save', async (_event, resume: Resume): Promise<UserProfile> => {
    return profileService.saveProfile(resume);
  });

  ipcMain.handle('profile:clear', async (): Promise<void> => {
    return profileService.clearProfile();
  });

  // ============================================
  // Onboarding & API Key Handlers
  // ============================================

  ipcMain.handle('onboarding:is-complete', async (): Promise<boolean> => {
    try {
      const settings = await settingsService.loadSettings();
      return settings.onboardingComplete === true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('onboarding:complete', async (): Promise<void> => {
    await settingsService.saveSettings({ onboardingComplete: true });
  });

  ipcMain.handle('onboarding:detect-clis', async (): Promise<CLITool[]> => {
    return apiKeyService.detectInstalledCLIs();
  });

  ipcMain.handle('onboarding:save-api-key', async (_event, provider: AIProvider, key: string): Promise<void> => {
    apiKeyService.saveAPIKey(provider, key);
  });

  ipcMain.handle('onboarding:has-api-key', async (_event, provider: AIProvider): Promise<boolean> => {
    return apiKeyService.hasAPIKey(provider);
  });

  ipcMain.handle('onboarding:delete-api-key', async (_event, provider: AIProvider): Promise<void> => {
    apiKeyService.deleteAPIKey(provider);
  });

  // ============================================
  // AI Operation Handlers
  // ============================================

  ipcMain.handle('ai:check-availability', async (): Promise<boolean> => {
    return aiProcessorService.isAvailable();
  });

  ipcMain.handle(
    'ai:refine-resume',
    async (_event, params: RefineResumeIPCParams): Promise<AIResult<RefinedResume>> => {
      const operationId = generateOperationId();
      const abortController = new AbortController();
      activeOperations.set(operationId, abortController);

      const startTime = Date.now();

      try {
        sendProgressUpdate(operationId, {
          status: 'started',
          message: 'Starting resume refinement...',
          progress: 0,
        });

        if (abortController.signal.aborted) {
          sendProgressUpdate(operationId, { status: 'cancelled', message: 'Operation was cancelled' });
          return {
            success: false,
            error: { code: AIProcessorErrorCode.CANCELLED, message: 'Operation was cancelled by user' },
          };
        }

        const settings = await settingsService.loadSettings();
        const promptOptionsFromSettings = convertResumeSettingsToOptions(settings.resumePromptTemplate);

        sendProgressUpdate(operationId, {
          status: 'processing',
          message: 'Analyzing job posting and refining resume...',
          progress: 25,
        });

        const mergedOptions: RefineResumeOptions = {
          ...params.options,
          promptOptions: {
            ...promptOptionsFromSettings,
            ...params.options?.promptOptions,
          },
        };

        const result = await aiProcessorService.refineResume(
          params.resume,
          params.jobPosting,
          mergedOptions
        );

        if (abortController.signal.aborted) {
          sendProgressUpdate(operationId, { status: 'cancelled', message: 'Operation was cancelled' });
          return {
            success: false,
            error: { code: AIProcessorErrorCode.CANCELLED, message: 'Operation was cancelled by user' },
          };
        }

        const processingTimeMs = Date.now() - startTime;
        sendProgressUpdate(operationId, {
          status: 'completed',
          message: 'Resume refinement completed successfully',
          progress: 100,
        });

        return { success: true, data: result, processingTimeMs };
      } catch (error) {
        const errorResult = convertErrorToResult(error);
        sendProgressUpdate(operationId, { status: 'error', message: errorResult.error.message });
        return errorResult;
      } finally {
        activeOperations.delete(operationId);
      }
    }
  );

  ipcMain.handle(
    'ai:generate-cover-letter',
    async (_event, params: GenerateCoverLetterIPCParams): Promise<AIResult<GeneratedCoverLetter>> => {
      const operationId = generateOperationId();
      const abortController = new AbortController();
      activeOperations.set(operationId, abortController);

      const startTime = Date.now();

      try {
        sendProgressUpdate(operationId, {
          status: 'started',
          message: 'Starting cover letter generation...',
          progress: 0,
        });

        if (abortController.signal.aborted) {
          sendProgressUpdate(operationId, { status: 'cancelled', message: 'Operation was cancelled' });
          return {
            success: false,
            error: { code: AIProcessorErrorCode.CANCELLED, message: 'Operation was cancelled by user' },
          };
        }

        const settings = await settingsService.loadSettings();
        const promptOptionsFromSettings = convertCoverLetterSettingsToOptions(settings.coverLetterPromptTemplate);

        sendProgressUpdate(operationId, {
          status: 'processing',
          message: 'Analyzing resume and job posting, generating cover letter...',
          progress: 25,
        });

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

        const result = await aiProcessorService.generateCoverLetter(
          params.resume,
          params.jobPosting,
          coverLetterOptions
        );

        if (abortController.signal.aborted) {
          sendProgressUpdate(operationId, { status: 'cancelled', message: 'Operation was cancelled' });
          return {
            success: false,
            error: { code: AIProcessorErrorCode.CANCELLED, message: 'Operation was cancelled by user' },
          };
        }

        const processingTimeMs = Date.now() - startTime;
        sendProgressUpdate(operationId, {
          status: 'completed',
          message: 'Cover letter generation completed successfully',
          progress: 100,
        });

        return { success: true, data: result, processingTimeMs };
      } catch (error) {
        const errorResult = convertErrorToResult(error);
        sendProgressUpdate(operationId, { status: 'error', message: errorResult.error.message });
        return errorResult;
      } finally {
        activeOperations.delete(operationId);
      }
    }
  );

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
  const handlers = [
    'load-resume', 'save-resume', 'generate-pdf', 'open-folder', 'select-folder',
    'check-export-files', 'export-application-pdfs', 'export-single-pdf',
    'settings:get', 'settings:save', 'settings:select-folder', 'settings:reset', 'settings:validate', 'settings:get-default-folder',
    'history:get', 'history:get-recent', 'history:add', 'history:delete', 'history:clear', 'history:open-file',
    'profile:has', 'profile:load', 'profile:import-file', 'profile:import-text', 'profile:save', 'profile:clear',
    'onboarding:is-complete', 'onboarding:complete', 'onboarding:detect-clis', 'onboarding:save-api-key', 'onboarding:has-api-key', 'onboarding:delete-api-key',
    'ai:check-availability', 'ai:refine-resume', 'ai:generate-cover-letter', 'ai:cancel-operation',
  ];

  for (const handler of handlers) {
    ipcMain.removeHandler(handler);
  }

  activeOperations.clear();
}

# Resume Import Feature - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to import their existing resume via drag-and-drop or file picker, extract structured data using AI, and persist it as their profile.

**Architecture:**
- UI component with drag-and-drop zone on dashboard/profile page
- Document text extraction service using `pdf-parse` (PDF) and `mammoth` (Word)
- AI extraction via existing provider abstraction with new prompt template
- Profile persistence service following existing `SettingsService` pattern

**Tech Stack:** pdf-parse, mammoth, Zod validation, existing AI providers

---

## Task 1: Add Document Extraction Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install pdf-parse and mammoth packages**

Run:
```bash
npm install pdf-parse mammoth
npm install -D @types/pdf-parse
```

Note: mammoth has built-in TypeScript types.

**Step 2: Verify installation**

Run: `npm ls pdf-parse mammoth`
Expected: Both packages listed with versions

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pdf-parse and mammoth for document extraction"
```

---

## Task 2: Create Document Extractor Service

**Files:**
- Create: `src/main/services/document-extractor.service.ts`
- Create: `src/types/document-extractor.types.ts`

**Step 1: Create types file**

Create `src/types/document-extractor.types.ts`:

```typescript
/**
 * Supported document types for resume import.
 */
export type SupportedDocumentType = 'pdf' | 'docx' | 'txt';

/**
 * Result of document text extraction.
 */
export interface DocumentExtractionResult {
  success: true;
  text: string;
  documentType: SupportedDocumentType;
  metadata?: {
    pageCount?: number;
    title?: string;
  };
}

/**
 * Error result from document extraction.
 */
export interface DocumentExtractionError {
  success: false;
  error: {
    code: DocumentExtractionErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
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

export type DocumentExtractionResponse = DocumentExtractionResult | DocumentExtractionError;
```

**Step 2: Create the document extractor service**

Create `src/main/services/document-extractor.service.ts`:

```typescript
/**
 * Document Extractor Service
 *
 * Extracts text content from PDF, Word (.docx), and plain text files.
 */

import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import {
  type SupportedDocumentType,
  type DocumentExtractionResponse,
  DocumentExtractionErrorCode,
} from '@app-types/document-extractor.types';

/**
 * Mapping of file extensions to document types.
 */
const EXTENSION_MAP: Record<string, SupportedDocumentType> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.txt': 'txt',
};

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
    const ext = path.extname(filePath).toLowerCase();
    const documentType = EXTENSION_MAP[ext];

    if (!documentType) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.UNSUPPORTED_FORMAT,
          message: `Unsupported file format: ${ext}. Supported formats: PDF, DOCX, TXT`,
        },
      };
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.FILE_READ_ERROR,
          message: `File not found: ${filePath}`,
        },
      };
    }

    try {
      switch (documentType) {
        case 'pdf':
          return await this.extractFromPDF(filePath);
        case 'docx':
          return await this.extractFromDocx(filePath);
        case 'txt':
          return await this.extractFromText(filePath);
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.EXTRACTION_FAILED,
          message: `Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { originalError: String(error) },
        },
      };
    }
  }

  /**
   * Extracts text from a PDF file.
   */
  private async extractFromPDF(filePath: string): Promise<DocumentExtractionResponse> {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);

    const text = data.text.trim();
    if (!text) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.EMPTY_DOCUMENT,
          message: 'PDF appears to be empty or contains only images. Text extraction requires readable text content.',
        },
      };
    }

    return {
      success: true,
      text,
      documentType: 'pdf',
      metadata: {
        pageCount: data.numpages,
        title: data.info?.Title,
      },
    };
  }

  /**
   * Extracts text from a Word document.
   */
  private async extractFromDocx(filePath: string): Promise<DocumentExtractionResponse> {
    const result = await mammoth.extractRawText({ path: filePath });

    const text = result.value.trim();
    if (!text) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.EMPTY_DOCUMENT,
          message: 'Word document appears to be empty.',
        },
      };
    }

    return {
      success: true,
      text,
      documentType: 'docx',
    };
  }

  /**
   * Extracts text from a plain text file.
   */
  private async extractFromText(filePath: string): Promise<DocumentExtractionResponse> {
    const text = fs.readFileSync(filePath, 'utf-8').trim();

    if (!text) {
      return {
        success: false,
        error: {
          code: DocumentExtractionErrorCode.EMPTY_DOCUMENT,
          message: 'Text file is empty.',
        },
      };
    }

    return {
      success: true,
      text,
      documentType: 'txt',
    };
  }

  /**
   * Checks if a file extension is supported.
   */
  isSupported(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext in EXTENSION_MAP;
  }

  /**
   * Gets the list of supported file extensions.
   */
  getSupportedExtensions(): string[] {
    return Object.keys(EXTENSION_MAP);
  }
}

// Export singleton instance
export const documentExtractorService = new DocumentExtractorService();
```

**Step 3: Run type check**

Run: `npm run typecheck`
Expected: No TypeScript errors related to document extractor

**Step 4: Commit**

```bash
git add src/types/document-extractor.types.ts src/main/services/document-extractor.service.ts
git commit -m "feat: add document extractor service for PDF/Word/text"
```

---

## Task 3: Create Profile Persistence Service

**Files:**
- Create: `src/main/services/profile.service.ts`
- Modify: `src/schemas/resume.schema.ts` (add Profile schema)

**Step 1: Add Profile schema to resume.schema.ts**

Add to end of `src/schemas/resume.schema.ts`:

```typescript
// User Profile Schema (extends Resume with import metadata)
export const UserProfileSchema = z.object({
  resume: ResumeSchema,
  importedAt: z.string().datetime().optional(),
  sourceFile: z.string().optional(),
  lastModifiedAt: z.string().datetime().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
```

**Step 2: Create profile service**

Create `src/main/services/profile.service.ts`:

```typescript
/**
 * Profile Service
 *
 * Manages user profile persistence using JSON file in app data directory.
 * Follows the same pattern as SettingsService.
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ZodError } from 'zod';
import {
  UserProfileSchema,
  ResumeSchema,
  type UserProfile,
  type Resume,
} from '@schemas/resume.schema';

/**
 * Profile file name.
 */
const PROFILE_FILE_NAME = 'profile.json';

/**
 * Error codes for profile operations.
 */
export enum ProfileErrorCode {
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
}

/**
 * Custom error class for profile operations.
 */
export class ProfileError extends Error {
  constructor(
    public readonly code: ProfileErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProfileError';
  }
}

/**
 * Service for managing user profile persistence.
 */
export class ProfileService {
  private profilePath: string;
  private cachedProfile: UserProfile | null = null;

  constructor() {
    const userDataPath = this.getUserDataPath();
    this.profilePath = path.join(userDataPath, PROFILE_FILE_NAME);
  }

  /**
   * Gets the user data path for storing profile.
   */
  private getUserDataPath(): string {
    try {
      return app.getPath('userData');
    } catch {
      const homeDir = os.homedir();
      switch (process.platform) {
        case 'darwin':
          return path.join(homeDir, 'Library', 'Application Support', 'resume-creator');
        case 'win32':
          return path.join(homeDir, 'AppData', 'Roaming', 'resume-creator');
        default:
          return path.join(homeDir, '.config', 'resume-creator');
      }
    }
  }

  /**
   * Checks if a profile exists.
   */
  hasProfile(): boolean {
    return fs.existsSync(this.profilePath);
  }

  /**
   * Loads the user profile from disk.
   * Returns null if no profile exists.
   */
  async loadProfile(): Promise<UserProfile | null> {
    if (this.cachedProfile) {
      return { ...this.cachedProfile };
    }

    if (!fs.existsSync(this.profilePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.profilePath, 'utf-8');
      const rawProfile = JSON.parse(content);
      const profile = UserProfileSchema.parse(rawProfile);
      this.cachedProfile = profile;
      return { ...profile };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ProfileError(
          ProfileErrorCode.FILE_READ_ERROR,
          'Profile file contains invalid JSON',
          { originalError: error.message }
        );
      }
      if (error instanceof ZodError) {
        throw new ProfileError(
          ProfileErrorCode.VALIDATION_ERROR,
          'Profile file contains invalid data',
          { validationErrors: error.errors }
        );
      }
      throw new ProfileError(
        ProfileErrorCode.FILE_READ_ERROR,
        `Failed to load profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Saves the user profile to disk.
   */
  async saveProfile(resume: Resume, sourceFile?: string): Promise<UserProfile> {
    try {
      // Validate resume data
      const validatedResume = ResumeSchema.parse(resume);

      const now = new Date().toISOString();
      const profile: UserProfile = {
        resume: validatedResume,
        importedAt: this.cachedProfile?.importedAt ?? now,
        sourceFile: sourceFile ?? this.cachedProfile?.sourceFile,
        lastModifiedAt: now,
      };

      // Ensure directory exists
      const profileDir = path.dirname(this.profilePath);
      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }

      // Write profile
      fs.writeFileSync(this.profilePath, JSON.stringify(profile, null, 2), 'utf-8');
      this.cachedProfile = profile;

      return { ...profile };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ProfileError(
          ProfileErrorCode.VALIDATION_ERROR,
          'Invalid resume data',
          { validationErrors: error.errors }
        );
      }
      throw new ProfileError(
        ProfileErrorCode.FILE_WRITE_ERROR,
        `Failed to save profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets just the resume data from the profile.
   */
  async getResume(): Promise<Resume | null> {
    const profile = await this.loadProfile();
    return profile?.resume ?? null;
  }

  /**
   * Clears the profile (deletes the file).
   */
  async clearProfile(): Promise<void> {
    if (fs.existsSync(this.profilePath)) {
      fs.unlinkSync(this.profilePath);
    }
    this.cachedProfile = null;
  }

  /**
   * Clears the cache.
   */
  clearCache(): void {
    this.cachedProfile = null;
  }
}

// Export singleton instance
export const profileService = new ProfileService();
```

**Step 3: Run type check**

Run: `npm run typecheck`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/schemas/resume.schema.ts src/main/services/profile.service.ts
git commit -m "feat: add profile service for resume persistence"
```

---

## Task 4: Create Resume Extraction Prompt

**Files:**
- Create: `src/prompts/resume-extraction.prompt.ts`

**Step 1: Create the extraction prompt template**

Create `src/prompts/resume-extraction.prompt.ts`:

```typescript
/**
 * Resume Extraction Prompt
 *
 * Prompt template for extracting structured resume data from raw text.
 */

import { getSchemaInstructions } from './schema-instructions';

/**
 * Options for resume extraction prompt.
 */
export interface ResumeExtractionOptions {
  /** Whether to include skill levels (requires AI inference) */
  inferSkillLevels?: boolean;
}

/**
 * Builds the prompt for extracting resume data from text.
 *
 * @param documentText - Raw text extracted from the resume document
 * @param options - Optional configuration
 * @returns The complete prompt string
 */
export function buildResumeExtractionPrompt(
  documentText: string,
  options: ResumeExtractionOptions = {}
): string {
  const schemaInstructions = getSchemaInstructions();

  const skillLevelInstruction = options.inferSkillLevels
    ? 'Infer skill levels (beginner/intermediate/advanced/expert) based on context clues like years of experience, job responsibilities, and how skills are described.'
    : 'Set skill level to null unless explicitly stated in the document.';

  return `You are a resume parsing assistant. Extract structured data from the following resume text.

## Task
Parse the resume and extract all information into the specified JSON schema format.

## Instructions
1. Extract all available information accurately
2. For dates, use formats like "2020-01", "2020", or "Present" for current positions
3. For contacts, identify the type (email, phone, linkedin, github, website, etc.)
4. ${skillLevelInstruction}
5. Group skills by category if apparent from the resume structure
6. Extract work experience highlights as bullet points (key achievements/responsibilities)
7. If information is missing or unclear, omit the field rather than guessing
8. Preserve the original formatting of highlight bullet points

${schemaInstructions}

## Resume Text
<resume_text>
${documentText}
</resume_text>

## Output Format
Return ONLY valid JSON matching the Resume schema. Do not include any explanation or markdown formatting.`;
}
```

**Step 2: Run type check**

Run: `npm run typecheck`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/prompts/resume-extraction.prompt.ts
git commit -m "feat: add resume extraction prompt template"
```

---

## Task 5: Add Resume Extraction Method to AI Processor

**Files:**
- Modify: `src/main/services/ai-processor.service.ts`
- Modify: `src/types/ai-processor.types.ts`

**Step 1: Add extraction options type**

Add to `src/types/ai-processor.types.ts`:

```typescript
/**
 * Options for resume extraction from document text.
 */
export interface ExtractResumeOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Retry on validation failure */
  retryOnValidationFailure?: boolean;
  /** Maximum validation retries */
  maxValidationRetries?: number;
  /** Prompt options */
  promptOptions?: {
    inferSkillLevels?: boolean;
  };
}
```

**Step 2: Add extractResume method to AI Processor**

Add to `src/main/services/ai-processor.service.ts`:

```typescript
// Add import at top
import {
  buildResumeExtractionPrompt,
  type ResumeExtractionOptions,
} from '@prompts/resume-extraction.prompt';
import { ResumeSchema, type Resume } from '@schemas/resume.schema';
import type { ExtractResumeOptions } from '@app-types/ai-processor.types';

// Add method to AIProcessorService class:

  /**
   * Extracts structured resume data from document text.
   *
   * @param documentText - Raw text extracted from a resume document
   * @param options - Optional configuration for the extraction
   * @returns The extracted resume data
   * @throws AIProcessorError if processing fails
   */
  async extractResume(
    documentText: string,
    options: ExtractResumeOptions = {}
  ): Promise<Resume> {
    // Check provider availability
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new AIProcessorError(
        AIProcessorErrorCode.CLI_NOT_AVAILABLE,
        `AI provider '${this.provider.type}' is not available.`
      );
    }

    // Build the prompt
    const promptOptions: ResumeExtractionOptions = {
      inferSkillLevels: options.promptOptions?.inferSkillLevels ?? false,
    };

    const prompt = buildResumeExtractionPrompt(documentText, promptOptions);

    // Determine retry settings
    const enableRetry =
      options.retryOnValidationFailure ??
      this.config.enableRetryOnValidationFailure;
    const maxRetries =
      options.maxValidationRetries ?? this.config.maxValidationRetries;

    // Execute with validation retry loop
    let lastError: Error | undefined;
    const attempts = enableRetry ? maxRetries + 1 : 1;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const result = await this.executeAndValidate<Resume>(
          prompt,
          ResumeSchema,
          options.timeout
        );

        // Sanitize output if enabled
        const finalResult = this.config.sanitizeOutput
          ? sanitizeAIResponse(result)
          : result;

        return finalResult;
      } catch (error) {
        lastError = error as Error;

        // Only retry on validation failures
        if (
          !(error instanceof AIProcessorError) ||
          error.code !== AIProcessorErrorCode.VALIDATION_FAILED
        ) {
          throw error;
        }

        // If this was the last attempt, throw
        if (attempt >= attempts - 1) {
          throw error;
        }
      }
    }

    throw (
      lastError ??
      new AIProcessorError(
        AIProcessorErrorCode.UNKNOWN,
        'Unknown error during resume extraction'
      )
    );
  }
```

**Step 3: Run type check**

Run: `npm run typecheck`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/main/services/ai-processor.service.ts src/types/ai-processor.types.ts
git commit -m "feat: add extractResume method to AI processor"
```

---

## Task 6: Add IPC Handlers for Profile Import

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/types/electron.d.ts`

**Step 1: Add types for profile import**

Add to `src/types/electron.d.ts`:

```typescript
// Add to ElectronAPI interface:
  // Profile Operations
  hasProfile: () => Promise<boolean>;
  loadProfile: () => Promise<UserProfile | null>;
  importResumeFromFile: (filePath: string) => Promise<ImportResumeResult>;
  importResumeFromText: (text: string, fileName?: string) => Promise<ImportResumeResult>;
  saveProfile: (resume: Resume) => Promise<UserProfile>;
  clearProfile: () => Promise<void>;

// Add new types:
export interface ImportResumeResult {
  success: boolean;
  profile?: UserProfile;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type { UserProfile } from '@schemas/resume.schema';
```

**Step 2: Add IPC handlers**

Add to `src/main/ipc-handlers.ts`:

```typescript
// Add imports
import { documentExtractorService } from './services/document-extractor.service';
import { profileService } from './services/profile.service';
import { aiProcessorService } from './services/ai-processor.service';

// Add handlers in setupIPC function:

  // Profile: Has profile
  ipcMain.handle('profile:has', async () => {
    return profileService.hasProfile();
  });

  // Profile: Load profile
  ipcMain.handle('profile:load', async () => {
    return profileService.loadProfile();
  });

  // Profile: Import from file
  ipcMain.handle('profile:import-file', async (_event, filePath: string) => {
    try {
      // Extract text from document
      const extraction = await documentExtractorService.extractText(filePath);
      if (!extraction.success) {
        return {
          success: false,
          error: extraction.error,
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
      return {
        success: false,
        error: {
          code: 'IMPORT_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  });

  // Profile: Import from text (for drag-and-drop with file content)
  ipcMain.handle('profile:import-text', async (_event, text: string, fileName?: string) => {
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
      return {
        success: false,
        error: {
          code: 'IMPORT_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  });

  // Profile: Save profile
  ipcMain.handle('profile:save', async (_event, resume: Resume) => {
    return profileService.saveProfile(resume);
  });

  // Profile: Clear profile
  ipcMain.handle('profile:clear', async () => {
    await profileService.clearProfile();
  });
```

**Step 3: Update preload script**

Add to `src/main/preload.ts`:

```typescript
  // Profile Operations
  hasProfile: () => ipcRenderer.invoke('profile:has'),
  loadProfile: () => ipcRenderer.invoke('profile:load'),
  importResumeFromFile: (filePath) => ipcRenderer.invoke('profile:import-file', filePath),
  importResumeFromText: (text, fileName) => ipcRenderer.invoke('profile:import-text', text, fileName),
  saveProfile: (resume) => ipcRenderer.invoke('profile:save', resume),
  clearProfile: () => ipcRenderer.invoke('profile:clear'),
```

**Step 4: Run type check**

Run: `npm run typecheck`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/main/ipc-handlers.ts src/types/electron.d.ts src/main/preload.ts
git commit -m "feat: add IPC handlers for profile import"
```

---

## Task 7: Create Resume Import UI Component

**Files:**
- Create: `src/components/profile/resume-import-dropzone.tsx`

**Step 1: Create the dropzone component**

Create `src/components/profile/resume-import-dropzone.tsx`:

```typescript
/**
 * Resume Import Dropzone
 *
 * Drag-and-drop zone for importing resume files.
 * Supports PDF, Word (.docx), and plain text files.
 */

import * as React from 'react';
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ResumeImportDropzoneProps {
  onImport: (result: ImportResult) => void;
  isProcessing?: boolean;
  className?: string;
}

interface ImportResult {
  success: boolean;
  error?: string;
}

type ImportState = 'idle' | 'dragover' | 'processing' | 'success' | 'error';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

export function ResumeImportDropzone({
  onImport,
  isProcessing = false,
  className,
}: ResumeImportDropzoneProps) {
  const [state, setState] = React.useState<ImportState>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      setState('dragover');
    }
  }, [isProcessing]);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState('idle');
  }, []);

  const processFile = React.useCallback(async (file: File) => {
    setState('processing');
    setErrorMessage('');

    try {
      // Read file path for Electron (only works with File System Access API or file input)
      // For drag-and-drop, we need to read the file content
      const text = await file.text();

      const result = await window.electronAPI.importResumeFromText(text, file.name);

      if (result.success) {
        setState('success');
        onImport({ success: true });
        // Reset after showing success
        setTimeout(() => setState('idle'), 2000);
      } else {
        const message = result.error?.message ?? 'Failed to import resume';
        setState('error');
        setErrorMessage(message);
        onImport({ success: false, error: message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState('error');
      setErrorMessage(message);
      onImport({ success: false, error: message });
    }
  }, [onImport]);

  const handleDrop = React.useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isProcessing) return;

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (!file) {
      setState('idle');
      return;
    }

    // Check file type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setState('error');
      setErrorMessage(`Unsupported file type. Please use PDF, DOCX, or TXT files.`);
      return;
    }

    await processFile(file);
  }, [isProcessing, processFile]);

  const handleFileSelect = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFile]);

  const handleClick = React.useCallback(() => {
    if (!isProcessing && state !== 'processing') {
      fileInputRef.current?.click();
    }
  }, [isProcessing, state]);

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
        state === 'idle' && 'border-muted-foreground/25 hover:border-muted-foreground/50',
        state === 'dragover' && 'border-primary bg-primary/5',
        state === 'processing' && 'border-muted-foreground/25 bg-muted/50',
        state === 'success' && 'border-green-500 bg-green-500/5',
        state === 'error' && 'border-destructive bg-destructive/5',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Drop zone for resume import"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {state === 'idle' && (
        <>
          <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-2 text-sm font-medium">
            Drop your resume here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supports PDF, Word (.docx), and plain text files
          </p>
        </>
      )}

      {state === 'dragover' && (
        <>
          <FileText className="mb-4 h-10 w-10 text-primary" />
          <p className="text-sm font-medium text-primary">
            Drop to import
          </p>
        </>
      )}

      {state === 'processing' && (
        <>
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-sm font-medium">
            Extracting resume data...
          </p>
          <p className="text-xs text-muted-foreground">
            This may take a moment
          </p>
        </>
      )}

      {state === 'success' && (
        <>
          <CheckCircle2 className="mb-4 h-10 w-10 text-green-500" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Resume imported successfully!
          </p>
        </>
      )}

      {state === 'error' && (
        <>
          <XCircle className="mb-4 h-10 w-10 text-destructive" />
          <p className="mb-2 text-sm font-medium text-destructive">
            Import failed
          </p>
          <p className="text-xs text-muted-foreground">
            {errorMessage}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={(e) => {
              e.stopPropagation();
              setState('idle');
              setErrorMessage('');
            }}
          >
            Try again
          </Button>
        </>
      )}
    </div>
  );
}
```

**Step 2: Run type check**

Run: `npm run typecheck`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/components/profile/resume-import-dropzone.tsx
git commit -m "feat: add resume import dropzone component"
```

---

## Task 8: Integrate Import Dropzone into Dashboard

**Files:**
- Modify: `src/components/pages/dashboard.tsx`

**Step 1: Add import dropzone to dashboard**

Modify `src/components/pages/dashboard.tsx` to include the dropzone:

```typescript
// Add import
import { ResumeImportDropzone } from '@/components/profile/resume-import-dropzone';

// Add state for profile
const [hasProfile, setHasProfile] = React.useState<boolean | null>(null);

// Add effect to check profile
React.useEffect(() => {
  window.electronAPI.hasProfile().then(setHasProfile);
}, []);

// Add handler
const handleImportResult = React.useCallback((result: { success: boolean; error?: string }) => {
  if (result.success) {
    setHasProfile(true);
    // Optionally show toast or navigate to profile page
  }
}, []);

// Render dropzone when no profile exists
{hasProfile === false && (
  <div className="mb-8">
    <h2 className="mb-4 text-lg font-semibold">Get Started</h2>
    <ResumeImportDropzone onImport={handleImportResult} />
  </div>
)}
```

**Step 2: Run type check**

Run: `npm run typecheck`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/components/pages/dashboard.tsx
git commit -m "feat: integrate resume import dropzone into dashboard"
```

---

## Task 9: Test End-to-End Flow

**Step 1: Start development server**

Run: `npm run dev`

**Step 2: Test file import**

1. Open the app
2. On the dashboard, verify the dropzone appears
3. Drag a PDF resume file onto the dropzone
4. Verify processing indicator appears
5. Verify success message after AI extraction
6. Navigate to profile page and verify data populated

**Step 3: Test edge cases**

1. Test with unsupported file type (e.g., .jpg) - should show error
2. Test with empty file - should show appropriate error
3. Test with Word document (.docx)
4. Test with plain text file

**Step 4: Create final commit**

```bash
git add -A
git commit -m "feat: complete resume import feature with PDF/Word/text support"
```

---

## Summary

This plan implements resume import with:

1. **Document extraction** - `pdf-parse` for PDFs, `mammoth` for Word docs
2. **AI processing** - Uses existing AI provider abstraction for structured extraction
3. **Profile persistence** - JSON file in app data folder
4. **UI** - Drag-and-drop zone with visual feedback states
5. **IPC integration** - Full Electron IPC layer for main/renderer communication

The feature follows existing patterns in the codebase (SettingsService, AIProcessorService) and integrates seamlessly with the current architecture.

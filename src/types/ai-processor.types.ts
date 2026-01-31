/**
 * TypeScript types for the AI Processor Service.
 * Defines options and configuration for AI-based resume refinement
 * and cover letter generation.
 */

import type { ResumeRefinementOptions } from '@prompts/resume-refinement.prompt';
import type {
  CoverLetterGenerationOptions,
  CompanyInfo,
} from '@prompts/cover-letter.prompt';
import type { ResumeExtractionOptions } from '@prompts/resume-extraction.prompt';

/**
 * Configuration options for the AI processor service.
 */
export interface AIProcessorConfig {
  /** Whether to enable automatic retries on validation failure (default: false) */
  enableRetryOnValidationFailure: boolean;
  /** Maximum number of retries on validation failure (default: 1) */
  maxValidationRetries: number;
  /** Whether to sanitize AI output automatically (default: true) */
  sanitizeOutput: boolean;
  /** Whether to include refinement/generation metadata in output (default: true) */
  includeMetadata: boolean;
}

/**
 * Default configuration for the AI processor service.
 */
export const DEFAULT_AI_PROCESSOR_CONFIG: AIProcessorConfig = {
  enableRetryOnValidationFailure: false,
  maxValidationRetries: 1,
  sanitizeOutput: true,
  includeMetadata: true,
};

/**
 * Options for resume refinement operation.
 */
export interface RefineResumeOptions {
  /** Options for customizing the prompt template */
  promptOptions?: ResumeRefinementOptions;
  /** Override the default timeout (in milliseconds) */
  timeout?: number;
  /** Override retry settings for this operation */
  retryOnValidationFailure?: boolean;
  /** Maximum validation retries for this operation */
  maxValidationRetries?: number;
}

/**
 * Options for cover letter generation operation.
 */
export interface GenerateCoverLetterOptions {
  /** Additional company information for personalization */
  companyInfo?: CompanyInfo;
  /** Options for customizing the prompt template */
  promptOptions?: CoverLetterGenerationOptions;
  /** Override the default timeout (in milliseconds) */
  timeout?: number;
  /** Override retry settings for this operation */
  retryOnValidationFailure?: boolean;
  /** Maximum validation retries for this operation */
  maxValidationRetries?: number;
}

/**
 * Options for resume extraction from document text.
 */
export interface ExtractResumeOptions {
  /** Options for customizing the prompt template */
  promptOptions?: ResumeExtractionOptions;
  /** Override the default timeout (in milliseconds) */
  timeout?: number;
  /** Override retry settings for this operation */
  retryOnValidationFailure?: boolean;
  /** Maximum validation retries for this operation */
  maxValidationRetries?: number;
}

/**
 * Result type for successful resume refinement.
 */
export interface RefineResumeResult {
  success: true;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Result type for successful cover letter generation.
 */
export interface GenerateCoverLetterResult {
  success: true;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Error codes specific to AI processing operations.
 */
export enum AIProcessorErrorCode {
  /** Claude Code CLI is not available */
  CLI_NOT_AVAILABLE = 'CLI_NOT_AVAILABLE',
  /** Claude Code execution failed */
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  /** Response failed schema validation */
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  /** Response could not be parsed as JSON */
  PARSE_FAILED = 'PARSE_FAILED',
  /** Operation was cancelled */
  CANCELLED = 'CANCELLED',
  /** Operation timed out */
  TIMEOUT = 'TIMEOUT',
  /** Unknown error occurred */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error class for AI processor operations.
 */
export class AIProcessorError extends Error {
  readonly code: AIProcessorErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: AIProcessorErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIProcessorError';
    this.code = code;
    this.details = details;
  }
}

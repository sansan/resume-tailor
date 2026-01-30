/**
 * AI Processor Service
 *
 * Orchestrates AI-based resume refinement and cover letter generation.
 * Coordinates between Claude Code CLI, prompt templates, Zod validation,
 * and output sanitization.
 */

import { ZodError } from 'zod';
import { ClaudeCodeService, claudeCodeService } from './claude-code.service';
import {
  type ClaudeCodeConfig,
  ClaudeCodeErrorCode,
} from './claude-code.types';
import {
  type AIProcessorConfig,
  type RefineResumeOptions,
  type GenerateCoverLetterOptions,
  DEFAULT_AI_PROCESSOR_CONFIG,
  AIProcessorError,
  AIProcessorErrorCode,
} from './ai-processor.types';
import type { Resume } from '../../shared/schemas/resume.schema';
import {
  RefinedResumeSchema,
  GeneratedCoverLetterSchema,
  type RefinedResume,
  type GeneratedCoverLetter,
} from '../../shared/schemas/ai-output.schema';
import {
  buildCombinedResumeRefinementPrompt,
  type ResumeRefinementOptions,
} from '../../shared/prompts/resume-refinement.prompt';
import {
  buildCombinedCoverLetterPrompt,
  type CoverLetterGenerationOptions,
} from '../../shared/prompts/cover-letter.prompt';
import { sanitizeAIResponse } from '../../shared/utils/sanitize';

/**
 * Service for processing AI-based resume refinement and cover letter generation.
 */
export class AIProcessorService {
  private config: AIProcessorConfig;
  private claudeService: ClaudeCodeService;

  constructor(
    config: Partial<AIProcessorConfig> = {},
    claudeService?: ClaudeCodeService
  ) {
    this.config = { ...DEFAULT_AI_PROCESSOR_CONFIG, ...config };
    this.claudeService = claudeService ?? claudeCodeService;
  }

  /**
   * Updates the service configuration.
   */
  updateConfig(config: Partial<AIProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets the current configuration.
   */
  getConfig(): AIProcessorConfig {
    return { ...this.config };
  }

  /**
   * Updates the underlying Claude Code service configuration.
   */
  updateClaudeConfig(config: Partial<ClaudeCodeConfig>): void {
    this.claudeService.updateConfig(config);
  }

  /**
   * Checks if the Claude Code CLI is available.
   */
  async isAvailable(): Promise<boolean> {
    return this.claudeService.isAvailable();
  }

  /**
   * Refines a resume to better match a job posting.
   *
   * @param originalResume - The original resume to refine
   * @param jobPosting - The job posting text to tailor the resume for
   * @param options - Optional configuration for the refinement
   * @returns The refined resume with optional metadata
   * @throws AIProcessorError if processing fails
   */
  async refineResume(
    originalResume: Resume,
    jobPosting: string,
    options: RefineResumeOptions = {}
  ): Promise<RefinedResume> {
    // Check CLI availability
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new AIProcessorError(
        AIProcessorErrorCode.CLI_NOT_AVAILABLE,
        'Claude Code CLI is not available. Please ensure it is installed and accessible in PATH.'
      );
    }

    // Build the prompt
    const promptOptions: ResumeRefinementOptions = {
      includeMetadata: this.config.includeMetadata,
      ...options.promptOptions,
    };

    const prompt = buildCombinedResumeRefinementPrompt(
      originalResume,
      jobPosting,
      promptOptions
    );

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
        const result = await this.executeAndValidate<RefinedResume>(
          prompt,
          RefinedResumeSchema,
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

        // Otherwise, continue to next attempt
      }
    }

    // Should not reach here, but throw the last error just in case
    throw (
      lastError ??
      new AIProcessorError(
        AIProcessorErrorCode.UNKNOWN,
        'Unknown error during resume refinement'
      )
    );
  }

  /**
   * Generates a cover letter based on a resume and job posting.
   *
   * @param resume - The resume to base the cover letter on
   * @param jobPosting - The job posting text
   * @param options - Optional configuration for the generation
   * @returns The generated cover letter with optional metadata
   * @throws AIProcessorError if processing fails
   */
  async generateCoverLetter(
    resume: Resume,
    jobPosting: string,
    options: GenerateCoverLetterOptions = {}
  ): Promise<GeneratedCoverLetter> {
    // Check CLI availability
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new AIProcessorError(
        AIProcessorErrorCode.CLI_NOT_AVAILABLE,
        'Claude Code CLI is not available. Please ensure it is installed and accessible in PATH.'
      );
    }

    // Build the prompt
    const promptOptions: CoverLetterGenerationOptions = {
      includeMetadata: this.config.includeMetadata,
      ...options.promptOptions,
    };

    const prompt = buildCombinedCoverLetterPrompt(
      resume,
      jobPosting,
      options.companyInfo,
      promptOptions
    );

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
        const result = await this.executeAndValidate<GeneratedCoverLetter>(
          prompt,
          GeneratedCoverLetterSchema,
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

        // Otherwise, continue to next attempt
      }
    }

    // Should not reach here, but throw the last error just in case
    throw (
      lastError ??
      new AIProcessorError(
        AIProcessorErrorCode.UNKNOWN,
        'Unknown error during cover letter generation'
      )
    );
  }

  /**
   * Executes a prompt via Claude Code and validates the response.
   *
   * @param prompt - The prompt to send
   * @param schema - The Zod schema to validate against
   * @param timeout - Optional timeout override
   * @returns The validated and typed response
   * @throws AIProcessorError on failure
   */
  private async executeAndValidate<T>(
    prompt: string,
    schema: { parse: (data: unknown) => T },
    timeout?: number
  ): Promise<T> {
    // Update timeout if specified
    if (timeout !== undefined) {
      const originalConfig = this.claudeService.getConfig();
      this.claudeService.updateConfig({ timeout });

      try {
        return await this.doExecuteAndValidate(prompt, schema);
      } finally {
        // Restore original timeout
        this.claudeService.updateConfig({ timeout: originalConfig.timeout });
      }
    }

    return this.doExecuteAndValidate(prompt, schema);
  }

  /**
   * Internal method to execute and validate without timeout management.
   */
  private async doExecuteAndValidate<T>(
    prompt: string,
    schema: { parse: (data: unknown) => T }
  ): Promise<T> {
    // Execute the Claude Code CLI
    const response = await this.claudeService.execute({
      prompt,
      outputFormat: 'json',
    });

    // Handle execution errors
    if (!response.success) {
      const error = response.error;

      switch (error.code) {
        case ClaudeCodeErrorCode.CLI_NOT_FOUND:
          throw new AIProcessorError(
            AIProcessorErrorCode.CLI_NOT_AVAILABLE,
            error.message,
            error.details
          );

        case ClaudeCodeErrorCode.TIMEOUT:
          throw new AIProcessorError(
            AIProcessorErrorCode.TIMEOUT,
            error.message,
            error.details
          );

        case ClaudeCodeErrorCode.INVALID_JSON:
          throw new AIProcessorError(
            AIProcessorErrorCode.PARSE_FAILED,
            error.message,
            error.details
          );

        case ClaudeCodeErrorCode.SCHEMA_VALIDATION_FAILED:
          throw new AIProcessorError(
            AIProcessorErrorCode.VALIDATION_FAILED,
            error.message,
            error.details
          );

        default:
          throw new AIProcessorError(
            AIProcessorErrorCode.EXECUTION_FAILED,
            error.message,
            error.details
          );
      }
    }

    // Validate the response data against the schema
    try {
      return schema.parse(response.data);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(
          (e) => `${e.path.join('.')}: ${e.message}`
        );

        throw new AIProcessorError(
          AIProcessorErrorCode.VALIDATION_FAILED,
          `Response failed schema validation: ${validationErrors.join('; ')}`,
          {
            validationErrors,
            zodErrors: error.errors,
            rawData: response.data,
          }
        );
      }

      throw new AIProcessorError(
        AIProcessorErrorCode.VALIDATION_FAILED,
        `Schema validation failed: ${String(error)}`,
        { originalError: String(error) }
      );
    }
  }
}

// Export a singleton instance with default configuration
export const aiProcessorService = new AIProcessorService();

/**
 * AI Processor Service
 *
 * Orchestrates AI-based resume refinement and cover letter generation.
 * Uses the provider abstraction to support multiple AI backends
 * (Claude CLI, Codex CLI, Gemini API, etc.)
 */

import { ZodError } from 'zod';
import {
  type IAIProvider,
  providerRegistry,
  getProvider,
} from './providers';
import {
  type AIProviderType,
  type AIProviderConfig,
  AIProviderErrorCode,
} from '../../types/ai-provider.types';
import {
  type AIProcessorConfig,
  type RefineResumeOptions,
  type GenerateCoverLetterOptions,
  type ExtractResumeOptions,
  type ExtractJobPostingOptions,
  DEFAULT_AI_PROCESSOR_CONFIG,
  AIProcessorError,
  AIProcessorErrorCode,
} from '../../types/ai-processor.types';
import { ResumeSchema, type Resume } from '../../schemas/resume.schema';
import {
  RefinedResumeSchema,
  GeneratedCoverLetterSchema,
  ExtractedJobPostingSchema,
  type RefinedResume,
  type GeneratedCoverLetter,
  type ExtractedJobPosting,
} from '../../schemas/ai-output.schema';
import {
  buildCombinedResumeRefinementPrompt,
  type ResumeRefinementOptions,
} from '../../prompts/resume-refinement.prompt';
import {
  buildCombinedCoverLetterPrompt,
  buildShortenCoverLetterPrompt,
  type CoverLetterGenerationOptions,
} from '../../prompts/cover-letter.prompt';
import {
  buildResumeExtractionPrompt,
  type ResumeExtractionOptions,
} from '../../prompts/resume-extraction.prompt';
import {
  buildJobExtractionPrompt,
  type JobExtractionOptions,
} from '../../prompts/job-extraction.prompt';
import { sanitizeAIResponse } from '../../shared/sanitize';

/**
 * Extended configuration with provider selection.
 */
export interface AIProcessorServiceConfig extends AIProcessorConfig {
  /** Which AI provider to use */
  provider?: AIProviderType;
}

/**
 * Service for processing AI-based resume refinement and cover letter generation.
 */
export class AIProcessorService {
  private config: AIProcessorServiceConfig;
  private provider: IAIProvider;

  constructor(config: Partial<AIProcessorServiceConfig> = {}) {
    this.config = { ...DEFAULT_AI_PROCESSOR_CONFIG, ...config };

    // Get the specified provider or default
    this.provider = config.provider
      ? getProvider(config.provider)
      : providerRegistry.getDefaultProvider();
  }

  /**
   * Updates the service configuration.
   */
  updateConfig(config: Partial<AIProcessorServiceConfig>): void {
    this.config = { ...this.config, ...config };

    // Switch provider if specified
    if (config.provider) {
      this.provider = getProvider(config.provider);
    }
  }

  /**
   * Gets the current configuration.
   */
  getConfig(): AIProcessorServiceConfig {
    return { ...this.config };
  }

  /**
   * Gets the current provider type.
   */
  getProviderType(): AIProviderType {
    return this.provider.type;
  }

  /**
   * Sets the AI provider to use.
   */
  setProvider(type: AIProviderType): void {
    this.provider = getProvider(type);
    this.config.provider = type;
  }

  /**
   * Updates the current provider's configuration.
   * Accepts provider-specific config properties (e.g., cliPath, model).
   */
  updateProviderConfig(config: Partial<AIProviderConfig> & Record<string, unknown>): void {
    this.provider.updateConfig(config);
  }

  /**
   * Checks if the current AI provider is available.
   */
  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }

  /**
   * Gets all available providers.
   */
  async getAvailableProviders(): Promise<AIProviderType[]> {
    const statuses = await providerRegistry.checkAllAvailability();
    return statuses
      .filter((s) => s.available)
      .map((s) => s.provider);
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
    // Check provider availability
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new AIProcessorError(
        AIProcessorErrorCode.CLI_NOT_AVAILABLE,
        `AI provider '${this.provider.type}' is not available.`
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
    // Check provider availability
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new AIProcessorError(
        AIProcessorErrorCode.CLI_NOT_AVAILABLE,
        `AI provider '${this.provider.type}' is not available.`
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
   * Shortens an existing cover letter to fit within a character limit.
   *
   * @param coverLetter - The existing cover letter to shorten
   * @param currentCharCount - Current character count of the letter content
   * @param targetCharCount - Target maximum character count
   * @returns The shortened cover letter
   * @throws AIProcessorError if processing fails
   */
  async shortenCoverLetter(
    coverLetter: GeneratedCoverLetter,
    currentCharCount: number,
    targetCharCount: number
  ): Promise<GeneratedCoverLetter> {
    // Check provider availability
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new AIProcessorError(
        AIProcessorErrorCode.CLI_NOT_AVAILABLE,
        `AI provider '${this.provider.type}' is not available.`
      );
    }

    const prompt = buildShortenCoverLetterPrompt(
      coverLetter,
      currentCharCount,
      targetCharCount
    );

    try {
      const result = await this.executeAndValidate<GeneratedCoverLetter>(
        prompt,
        GeneratedCoverLetterSchema
      );

      // Sanitize output
      return this.config.sanitizeOutput ? sanitizeAIResponse(result) : result;
    } catch (error) {
      if (error instanceof AIProcessorError) {
        throw error;
      }
      throw new AIProcessorError(
        AIProcessorErrorCode.UNKNOWN,
        `Failed to shorten cover letter: ${String(error)}`
      );
    }
  }

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

        // Otherwise, continue to next attempt
      }
    }

    // Should not reach here, but throw the last error just in case
    throw (
      lastError ??
      new AIProcessorError(
        AIProcessorErrorCode.UNKNOWN,
        'Unknown error during resume extraction'
      )
    );
  }

  /**
   * Extracts structured job posting data from raw job posting text.
   *
   * @param jobPostingText - Raw text of the job posting
   * @param options - Optional configuration for the extraction
   * @returns The extracted job posting data
   * @throws AIProcessorError if processing fails
   */
  async extractJobPosting(
    jobPostingText: string,
    options: ExtractJobPostingOptions = {}
  ): Promise<ExtractedJobPosting> {
    // Check provider availability
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new AIProcessorError(
        AIProcessorErrorCode.CLI_NOT_AVAILABLE,
        `AI provider '${this.provider.type}' is not available.`
      );
    }

    // Build the prompt
    const promptOptions: JobExtractionOptions = {
      inferSalary: options.promptOptions?.inferSalary ?? false,
    };

    const prompt = buildJobExtractionPrompt(jobPostingText, promptOptions);

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
        const result = await this.executeAndValidate<ExtractedJobPosting>(
          prompt,
          ExtractedJobPostingSchema,
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
        'Unknown error during job posting extraction'
      )
    );
  }

  /**
   * Executes a prompt and validates the response.
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
      const originalConfig = this.provider.getConfig();
      this.provider.updateConfig({ timeout });

      try {
        return await this.doExecuteAndValidate(prompt, schema);
      } finally {
        // Restore original timeout
        this.provider.updateConfig({ timeout: originalConfig.timeout });
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
    // Execute via the current provider
    const response = await this.provider.execute({
      prompt,
      outputFormat: 'json',
    });

    // Handle execution errors
    if (!response.success) {
      const error = response.error;

      switch (error.code) {
        case AIProviderErrorCode.PROVIDER_NOT_AVAILABLE:
          throw new AIProcessorError(
            AIProcessorErrorCode.CLI_NOT_AVAILABLE,
            error.message,
            error.details
          );

        case AIProviderErrorCode.AUTH_FAILED:
          throw new AIProcessorError(
            AIProcessorErrorCode.CLI_NOT_AVAILABLE,
            `Authentication failed: ${error.message}`,
            error.details
          );

        case AIProviderErrorCode.TIMEOUT:
          throw new AIProcessorError(
            AIProcessorErrorCode.TIMEOUT,
            error.message,
            error.details
          );

        case AIProviderErrorCode.INVALID_JSON:
          throw new AIProcessorError(
            AIProcessorErrorCode.PARSE_FAILED,
            error.message,
            error.details
          );

        case AIProviderErrorCode.RATE_LIMITED:
          throw new AIProcessorError(
            AIProcessorErrorCode.EXECUTION_FAILED,
            `Rate limited: ${error.message}`,
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

/**
 * Generic AI Provider Types
 *
 * Provider-agnostic types for AI integrations.
 * Supports CLI-based (Claude, Codex) and API-based (Gemini, OpenAI) providers.
 */

/**
 * Supported AI provider identifiers.
 */
export type AIProviderType = 'claude' | 'codex' | 'gemini' | 'openai';

/**
 * Common configuration for all AI providers.
 */
export interface AIProviderConfig {
  /** Timeout in milliseconds. Default: 120000 (2 minutes) */
  timeout: number;
  /** Maximum retry attempts on transient failures. Default: 0 */
  maxRetries: number;
}

/**
 * CLI-specific provider configuration.
 */
export interface CLIProviderConfig extends AIProviderConfig {
  /** Path to the CLI executable */
  cliPath: string;
}

/**
 * API-specific provider configuration.
 */
export interface APIProviderConfig extends AIProviderConfig {
  /** API key for authentication */
  apiKey: string;
  /** API base URL (optional, for custom endpoints) */
  baseUrl?: string;
  /** Model identifier */
  model?: string;
}

/**
 * Request payload for AI providers.
 */
export interface AIProviderRequest {
  /** The prompt to send */
  prompt: string;
  /** Optional system prompt for context */
  systemPrompt?: string;
  /** Expected output format */
  outputFormat?: 'json' | 'text';
}

/**
 * Successful response from an AI provider.
 */
export interface AIProviderSuccessResponse {
  success: true;
  /** The raw text response */
  rawResponse: string;
  /** Parsed JSON data if outputFormat was 'json' */
  data?: unknown;
}

/**
 * Error response from an AI provider.
 */
export interface AIProviderErrorResponse {
  success: false;
  /** The error that occurred */
  error: AIProviderError;
}

/**
 * Union type for all AI provider responses.
 */
export type AIProviderResponse = AIProviderSuccessResponse | AIProviderErrorResponse;

/**
 * Error codes for AI provider failures.
 */
export enum AIProviderErrorCode {
  /** Provider not available (CLI not found, API unreachable) */
  PROVIDER_NOT_AVAILABLE = 'PROVIDER_NOT_AVAILABLE',
  /** Authentication failed (invalid API key) */
  AUTH_FAILED = 'AUTH_FAILED',
  /** Execution timed out */
  TIMEOUT = 'TIMEOUT',
  /** Process was killed or request cancelled */
  CANCELLED = 'CANCELLED',
  /** Provider returned an error */
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  /** Response was not valid JSON when JSON was expected */
  INVALID_JSON = 'INVALID_JSON',
  /** Rate limit exceeded */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Unknown error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Base error class for AI provider errors.
 */
export class AIProviderError extends Error {
  readonly code: AIProviderErrorCode;
  readonly provider: AIProviderType;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: AIProviderErrorCode,
    provider: AIProviderType,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
    this.provider = provider;
    this.details = details;
  }
}

/**
 * Provider availability status.
 */
export interface AIProviderStatus {
  provider: AIProviderType;
  available: boolean;
  version?: string;
  error?: string;
}

/**
 * Default provider configurations.
 */
export const DEFAULT_PROVIDER_CONFIGS: Record<AIProviderType, AIProviderConfig> = {
  claude: {
    timeout: 120000,
    maxRetries: 0,
  },
  codex: {
    timeout: 120000,
    maxRetries: 0,
  },
  gemini: {
    timeout: 60000,
    maxRetries: 1,
  },
  openai: {
    timeout: 60000,
    maxRetries: 1,
  },
};

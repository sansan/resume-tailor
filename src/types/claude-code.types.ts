/**
 * TypeScript types for Claude Code CLI integration.
 * Defines request/response structures and error types for the child_process communication.
 */

/**
 * Configuration options for the Claude Code service.
 */
export interface ClaudeCodeConfig {
  /** Timeout in milliseconds for CLI execution. Default: 120000 (2 minutes) */
  timeout: number
  /** Maximum number of retry attempts on transient failures. Default: 0 */
  maxRetries: number
  /** Path to the Claude Code CLI executable. Default: 'claude' */
  cliPath: string
}

/**
 * Default configuration values for the Claude Code service.
 */
export const DEFAULT_CLAUDE_CODE_CONFIG: ClaudeCodeConfig = {
  timeout: 120000,
  maxRetries: 0,
  cliPath: 'claude',
}

/**
 * Request payload for Claude Code CLI invocation.
 */
export interface ClaudeCodeRequest {
  /** The prompt to send to Claude */
  prompt: string
  /** Optional system prompt for context */
  systemPrompt?: string
  /** Optional output format specification */
  outputFormat?: 'json' | 'text'
}

/**
 * Successful response from Claude Code CLI.
 */
export interface ClaudeCodeSuccessResponse {
  success: true
  /** The raw text response from Claude */
  rawResponse: string
  /** Parsed JSON data if outputFormat was 'json' and response was valid JSON */
  data?: unknown
}

/**
 * Error response from Claude Code CLI.
 */
export interface ClaudeCodeErrorResponse {
  success: false
  /** The error that occurred */
  error: ClaudeCodeError
}

/**
 * Union type for all possible Claude Code responses.
 */
export type ClaudeCodeResponse = ClaudeCodeSuccessResponse | ClaudeCodeErrorResponse

/**
 * Error codes for Claude Code CLI failures.
 */
export enum ClaudeCodeErrorCode {
  /** CLI command not found or not installed */
  CLI_NOT_FOUND = 'CLI_NOT_FOUND',
  /** CLI execution timed out */
  TIMEOUT = 'TIMEOUT',
  /** CLI process was killed */
  PROCESS_KILLED = 'PROCESS_KILLED',
  /** CLI exited with non-zero code */
  CLI_ERROR = 'CLI_ERROR',
  /** Response was not valid JSON when JSON was expected */
  INVALID_JSON = 'INVALID_JSON',
  /** Response JSON did not match expected schema */
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED',
  /** Unknown error occurred */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Base error class for Claude Code CLI errors.
 */
export class ClaudeCodeError extends Error {
  readonly code: ClaudeCodeErrorCode
  readonly details: Record<string, unknown> | undefined

  constructor(code: ClaudeCodeErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ClaudeCodeError'
    this.code = code
    this.details = details
  }
}

/**
 * Error thrown when the CLI is not found or cannot be executed.
 */
export class CLINotFoundError extends ClaudeCodeError {
  constructor(cliPath: string) {
    super(
      ClaudeCodeErrorCode.CLI_NOT_FOUND,
      `Claude Code CLI not found at '${cliPath}'. Ensure Claude Code is installed and accessible in PATH.`,
      { cliPath }
    )
    this.name = 'CLINotFoundError'
  }
}

/**
 * Error thrown when the CLI execution times out.
 */
export class TimeoutError extends ClaudeCodeError {
  constructor(timeoutMs: number) {
    super(ClaudeCodeErrorCode.TIMEOUT, `Claude Code CLI execution timed out after ${timeoutMs}ms`, {
      timeoutMs,
    })
    this.name = 'TimeoutError'
  }
}

/**
 * Error thrown when the CLI process is killed.
 */
export class ProcessKilledError extends ClaudeCodeError {
  constructor(signal: string) {
    super(
      ClaudeCodeErrorCode.PROCESS_KILLED,
      `Claude Code CLI process was killed by signal: ${signal}`,
      { signal }
    )
    this.name = 'ProcessKilledError'
  }
}

/**
 * Error thrown when the CLI exits with a non-zero code.
 */
export class CLIError extends ClaudeCodeError {
  constructor(exitCode: number, stderr: string) {
    super(
      ClaudeCodeErrorCode.CLI_ERROR,
      `Claude Code CLI exited with code ${exitCode}: ${stderr}`,
      { exitCode, stderr }
    )
    this.name = 'CLIError'
  }
}

/**
 * Error thrown when the response is not valid JSON.
 */
export class InvalidJSONError extends ClaudeCodeError {
  constructor(rawResponse: string, parseError: string) {
    super(
      ClaudeCodeErrorCode.INVALID_JSON,
      `Failed to parse Claude Code response as JSON: ${parseError}`,
      { rawResponse: rawResponse.substring(0, 500), parseError }
    )
    this.name = 'InvalidJSONError'
  }
}

/**
 * Error thrown when the response fails schema validation.
 */
export class SchemaValidationError extends ClaudeCodeError {
  constructor(validationErrors: string[]) {
    super(
      ClaudeCodeErrorCode.SCHEMA_VALIDATION_FAILED,
      `Claude Code response failed schema validation: ${validationErrors.join(', ')}`,
      { validationErrors }
    )
    this.name = 'SchemaValidationError'
  }
}

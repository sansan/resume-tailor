/**
 * Claude Code CLI Service
 *
 * Provides an interface for spawning and communicating with the Claude Code CLI
 * via child_process. Handles stdin/stdout streaming, JSON parsing, and error handling.
 */

import { spawn, type ChildProcess } from 'child_process';
import {
  type ClaudeCodeConfig,
  type ClaudeCodeRequest,
  type ClaudeCodeResponse,
  DEFAULT_CLAUDE_CODE_CONFIG,
  CLINotFoundError,
  TimeoutError,
  ProcessKilledError,
  CLIError,
  InvalidJSONError,
} from './claude-code.types';

/**
 * Service for interacting with the Claude Code CLI.
 */
export class ClaudeCodeService {
  private config: ClaudeCodeConfig;

  constructor(config: Partial<ClaudeCodeConfig> = {}) {
    this.config = { ...DEFAULT_CLAUDE_CODE_CONFIG, ...config };
  }

  /**
   * Updates the service configuration.
   */
  updateConfig(config: Partial<ClaudeCodeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets the current configuration.
   */
  getConfig(): ClaudeCodeConfig {
    return { ...this.config };
  }

  /**
   * Executes a prompt via the Claude Code CLI and returns the response.
   *
   * @param request - The request payload containing the prompt
   * @returns A promise that resolves to the CLI response
   */
  async execute(request: ClaudeCodeRequest): Promise<ClaudeCodeResponse> {
    const { prompt, outputFormat = 'text' } = request;

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let processExited = false;

      // Build CLI arguments
      // Claude Code CLI accepts prompts via --print flag for non-interactive mode
      // and --output-format for JSON responses
      const args: string[] = ['--print'];

      if (outputFormat === 'json') {
        args.push('--output-format', 'json');
      }

      // Spawn the CLI process
      let childProcess: ChildProcess;
      try {
        childProcess = spawn(this.config.cliPath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env },
        });
      } catch (error) {
        resolve({
          success: false,
          error: new CLINotFoundError(this.config.cliPath),
        });
        return;
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        childProcess.kill('SIGTERM');
        // Give it a moment to terminate gracefully, then force kill
        setTimeout(() => {
          if (!processExited) {
            childProcess.kill('SIGKILL');
          }
        }, 1000);
      }, this.config.timeout);

      // Handle stdout
      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      // Handle stderr
      childProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // Handle process errors (e.g., ENOENT when CLI not found)
      childProcess.on('error', (error: NodeJS.ErrnoException) => {
        clearTimeout(timeoutId);
        processExited = true;

        if (error.code === 'ENOENT') {
          resolve({
            success: false,
            error: new CLINotFoundError(this.config.cliPath),
          });
        } else {
          resolve({
            success: false,
            error: new CLIError(-1, error.message),
          });
        }
      });

      // Handle process exit
      childProcess.on('close', (code, signal) => {
        clearTimeout(timeoutId);
        processExited = true;

        // Check for timeout
        if (timedOut) {
          resolve({
            success: false,
            error: new TimeoutError(this.config.timeout),
          });
          return;
        }

        // Check for signal termination
        if (signal) {
          resolve({
            success: false,
            error: new ProcessKilledError(signal),
          });
          return;
        }

        // Check for non-zero exit code
        if (code !== 0) {
          resolve({
            success: false,
            error: new CLIError(code ?? -1, stderr || 'Unknown error'),
          });
          return;
        }

        // Parse response
        const rawResponse = stdout.trim();

        if (outputFormat === 'json') {
          try {
            const data = this.parseJsonResponse(rawResponse);
            resolve({
              success: true,
              rawResponse,
              data,
            });
          } catch (error) {
            if (error instanceof InvalidJSONError) {
              resolve({
                success: false,
                error,
              });
            } else {
              resolve({
                success: false,
                error: new InvalidJSONError(rawResponse, String(error)),
              });
            }
          }
        } else {
          resolve({
            success: true,
            rawResponse,
          });
        }
      });

      // Write the prompt to stdin and close it
      childProcess.stdin?.write(prompt);
      childProcess.stdin?.end();
    });
  }

  /**
   * Parses a JSON response from the Claude Code CLI.
   * Handles cases where the response may be wrapped in markdown code blocks
   * or in a CLI wrapper object with a "result" field.
   *
   * @param rawResponse - The raw string response from the CLI
   * @returns The parsed JSON data
   * @throws InvalidJSONError if parsing fails
   */
  private parseJsonResponse(rawResponse: string): unknown {
    // The CLI with --output-format json always returns valid JSON
    // Don't try to extract from markdown at the raw response level
    // as escape sequences like \n would cause issues

    try {
      const parsed = JSON.parse(rawResponse);

      // Claude Code CLI with --output-format json returns a wrapper object
      // with type "result" and the actual content in the "result" field
      if (
        parsed &&
        typeof parsed === 'object' &&
        'type' in parsed &&
        parsed.type === 'result' &&
        'result' in parsed
      ) {
        // The "result" field contains the actual AI response as a string
        let resultStr = String(parsed.result);

        // Claude may wrap JSON in markdown code blocks even when asked not to
        // Extract the JSON from code blocks if present
        const resultBlockMatch = resultStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (resultBlockMatch?.[1]) {
          resultStr = resultBlockMatch[1].trim();
        }

        // Try to parse it as JSON if it looks like JSON
        if (resultStr.trim().startsWith('{') || resultStr.trim().startsWith('[')) {
          try {
            return JSON.parse(resultStr);
          } catch {
            // If parsing fails, return the string as-is
            return resultStr;
          }
        }
        return resultStr;
      }

      return parsed;
    } catch (error) {
      throw new InvalidJSONError(rawResponse, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Executes a prompt with automatic retries on transient failures.
   *
   * @param request - The request payload
   * @param retries - Number of retries remaining (defaults to config.maxRetries)
   * @returns A promise that resolves to the CLI response
   */
  async executeWithRetry(
    request: ClaudeCodeRequest,
    retries: number = this.config.maxRetries
  ): Promise<ClaudeCodeResponse> {
    const response = await this.execute(request);

    if (response.success) {
      return response;
    }

    // Determine if error is retryable
    const retryableCodes = ['TIMEOUT', 'PROCESS_KILLED'];
    const isRetryable = retryableCodes.includes(response.error.code);

    if (isRetryable && retries > 0) {
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, this.config.maxRetries - retries), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.executeWithRetry(request, retries - 1);
    }

    return response;
  }

  /**
   * Checks if the Claude Code CLI is available and can be executed.
   *
   * @returns A promise that resolves to true if CLI is available
   */
  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const childProcess = spawn(this.config.cliPath, ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      childProcess.on('error', () => {
        resolve(false);
      });

      childProcess.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }
}

// Export a singleton instance with default configuration
export const claudeCodeService = new ClaudeCodeService();

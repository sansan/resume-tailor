/**
 * Claude CLI Provider
 *
 * Implements the AI provider interface for Claude Code CLI.
 * Spawns the CLI as a child process and communicates via stdin/stdout.
 */

import { spawn, type ChildProcess } from 'child_process';
import { BaseAIProvider } from './ai-provider.interface';
import {
  type CLIProviderConfig,
  type AIProviderRequest,
  type AIProviderResponse,
  type AIProviderStatus,
  AIProviderError,
  AIProviderErrorCode,
  DEFAULT_PROVIDER_CONFIGS,
} from '../../../types/ai-provider.types';

/**
 * Claude-specific configuration.
 */
export interface ClaudeProviderConfig extends CLIProviderConfig {
  // Claude-specific options can be added here
}

/**
 * Default Claude configuration.
 */
export const DEFAULT_CLAUDE_CONFIG: ClaudeProviderConfig = {
  ...DEFAULT_PROVIDER_CONFIGS.claude,
  cliPath: 'claude',
};

/**
 * Claude Code CLI provider implementation.
 */
export class ClaudeProvider extends BaseAIProvider {
  readonly type = 'claude' as const;
  protected override config: ClaudeProviderConfig;

  constructor(config: Partial<ClaudeProviderConfig> = {}) {
    const fullConfig = { ...DEFAULT_CLAUDE_CONFIG, ...config };
    super(fullConfig);
    this.config = fullConfig;
  }

  override getConfig(): ClaudeProviderConfig {
    return { ...this.config };
  }

  override updateConfig(config: Partial<ClaudeProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    const { prompt, outputFormat = 'text' } = request;

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let processExited = false;

      // Build CLI arguments
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
      } catch {
        resolve({
          success: false,
          error: new AIProviderError(
            AIProviderErrorCode.PROVIDER_NOT_AVAILABLE,
            'claude',
            `Claude CLI not found at '${this.config.cliPath}'`,
            { cliPath: this.config.cliPath }
          ),
        });
        return;
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        childProcess.kill('SIGTERM');
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

      // Handle process errors
      childProcess.on('error', (error: NodeJS.ErrnoException) => {
        clearTimeout(timeoutId);
        processExited = true;

        if (error.code === 'ENOENT') {
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.PROVIDER_NOT_AVAILABLE,
              'claude',
              `Claude CLI not found at '${this.config.cliPath}'`,
              { cliPath: this.config.cliPath }
            ),
          });
        } else {
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.PROVIDER_ERROR,
              'claude',
              error.message,
              { originalError: error.message }
            ),
          });
        }
      });

      // Handle process exit
      childProcess.on('close', (code, signal) => {
        clearTimeout(timeoutId);
        processExited = true;

        if (timedOut) {
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.TIMEOUT,
              'claude',
              `Claude CLI timed out after ${this.config.timeout}ms`,
              { timeoutMs: this.config.timeout }
            ),
          });
          return;
        }

        if (signal) {
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.CANCELLED,
              'claude',
              `Process killed by signal: ${signal}`,
              { signal }
            ),
          });
          return;
        }

        if (code !== 0) {
          // Combine stderr and stdout for better error diagnostics
          // Some CLIs write errors to stdout
          const errorOutput = stderr || stdout || 'Unknown error';
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.PROVIDER_ERROR,
              'claude',
              `CLI exited with code ${code}: ${errorOutput.trim().substring(0, 500)}`,
              { exitCode: code, stderr, stdout: stdout.substring(0, 500) }
            ),
          });
          return;
        }

        // Parse response
        const rawResponse = stdout.trim();

        if (outputFormat === 'json') {
          try {
            const data = this.parseClaudeJsonResponse(rawResponse);
            resolve({ success: true, rawResponse, data });
          } catch (error) {
            resolve({
              success: false,
              error: new AIProviderError(
                AIProviderErrorCode.INVALID_JSON,
                'claude',
                `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
                { rawResponse: rawResponse.substring(0, 500) }
              ),
            });
          }
        } else {
          resolve({ success: true, rawResponse });
        }
      });

      // Write prompt to stdin
      childProcess.stdin?.write(prompt);
      childProcess.stdin?.end();
    });
  }

  /**
   * Parse Claude CLI's JSON response format.
   * Claude wraps responses in { type: "result", result: "..." }
   */
  private parseClaudeJsonResponse(rawResponse: string): unknown {
    const parsed = JSON.parse(rawResponse);

    // Handle Claude's wrapper format
    if (
      parsed &&
      typeof parsed === 'object' &&
      'type' in parsed &&
      parsed.type === 'result' &&
      'result' in parsed
    ) {
      let resultStr = String(parsed.result);

      // Extract from markdown if wrapped
      const blockMatch = resultStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (blockMatch?.[1]) {
        resultStr = blockMatch[1].trim();
      }

      // Parse inner JSON if applicable
      if (resultStr.trim().startsWith('{') || resultStr.trim().startsWith('[')) {
        try {
          return JSON.parse(resultStr);
        } catch {
          return resultStr;
        }
      }
      return resultStr;
    }

    return parsed;
  }

  async isAvailable(): Promise<boolean> {
    const status = await this.getStatus();
    return status.available;
  }

  async getStatus(): Promise<AIProviderStatus> {
    return new Promise((resolve) => {
      const childProcess = spawn(this.config.cliPath, ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';

      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      childProcess.on('error', (error: NodeJS.ErrnoException) => {
        resolve({
          provider: 'claude',
          available: false,
          error: error.code === 'ENOENT'
            ? `CLI not found at '${this.config.cliPath}'`
            : error.message,
        });
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            provider: 'claude',
            available: true,
            version: stdout.trim(),
          });
        } else {
          resolve({
            provider: 'claude',
            available: false,
            error: `CLI exited with code ${code}`,
          });
        }
      });
    });
  }
}

// Export singleton instance
export const claudeProvider = new ClaudeProvider();

/**
 * Codex CLI Provider
 *
 * Implements the AI provider interface for OpenAI Codex CLI.
 * Similar to Claude, spawns CLI as child process.
 */

import { spawn, type ChildProcess } from 'child_process'
import { BaseAIProvider } from './ai-provider.interface'
import {
  type CLIProviderConfig,
  type AIProviderRequest,
  type AIProviderResponse,
  type AIProviderStatus,
  AIProviderError,
  AIProviderErrorCode,
  DEFAULT_PROVIDER_CONFIGS,
} from '../../../types/ai-provider.types'

/**
 * Codex-specific configuration.
 */
export interface CodexProviderConfig extends CLIProviderConfig {
  /** Model to use (e.g., 'o3-mini', 'gpt-4') */
  model?: string
}

/**
 * Default Codex configuration.
 */
export const DEFAULT_CODEX_CONFIG: CodexProviderConfig = {
  ...DEFAULT_PROVIDER_CONFIGS.codex,
  cliPath: 'codex',
  model: 'o3-mini',
}

/**
 * Codex CLI provider implementation.
 *
 * Note: This is a stub implementation. The actual CLI flags
 * and response format should be adjusted based on the real
 * Codex CLI documentation.
 */
export class CodexProvider extends BaseAIProvider {
  readonly type = 'codex' as const
  protected override config: CodexProviderConfig

  constructor(config: Partial<CodexProviderConfig> = {}) {
    const fullConfig = { ...DEFAULT_CODEX_CONFIG, ...config }
    super(fullConfig)
    this.config = fullConfig
  }

  override getConfig(): CodexProviderConfig {
    return { ...this.config }
  }

  override updateConfig(config: Partial<CodexProviderConfig>): void {
    this.config = { ...this.config, ...config }
  }

  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    const { prompt, outputFormat = 'text' } = request

    return new Promise(resolve => {
      let stdout = ''
      let stderr = ''
      let timedOut = false
      let processExited = false

      // Build CLI arguments
      // TODO: Adjust flags based on actual Codex CLI documentation
      const args: string[] = []

      if (this.config.model) {
        args.push('--model', this.config.model)
      }

      if (outputFormat === 'json') {
        args.push('--json')
      }

      // Add the prompt as the last argument
      args.push(prompt)

      // Spawn the CLI process
      let childProcess: ChildProcess
      try {
        childProcess = spawn(this.config.cliPath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env },
        })
      } catch {
        resolve({
          success: false,
          error: new AIProviderError(
            AIProviderErrorCode.PROVIDER_NOT_AVAILABLE,
            'codex',
            `Codex CLI not found at '${this.config.cliPath}'`,
            { cliPath: this.config.cliPath }
          ),
        })
        return
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        timedOut = true
        childProcess.kill('SIGTERM')
        setTimeout(() => {
          if (!processExited) {
            childProcess.kill('SIGKILL')
          }
        }, 1000)
      }, this.config.timeout)

      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      childProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      childProcess.on('error', (error: NodeJS.ErrnoException) => {
        clearTimeout(timeoutId)
        processExited = true

        if (error.code === 'ENOENT') {
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.PROVIDER_NOT_AVAILABLE,
              'codex',
              `Codex CLI not found at '${this.config.cliPath}'`,
              { cliPath: this.config.cliPath }
            ),
          })
        } else {
          resolve({
            success: false,
            error: new AIProviderError(AIProviderErrorCode.PROVIDER_ERROR, 'codex', error.message, {
              originalError: error.message,
            }),
          })
        }
      })

      childProcess.on('close', (code, signal) => {
        clearTimeout(timeoutId)
        processExited = true

        if (timedOut) {
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.TIMEOUT,
              'codex',
              `Codex CLI timed out after ${this.config.timeout}ms`,
              { timeoutMs: this.config.timeout }
            ),
          })
          return
        }

        if (signal) {
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.CANCELLED,
              'codex',
              `Process killed by signal: ${signal}`,
              { signal }
            ),
          })
          return
        }

        if (code !== 0) {
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.PROVIDER_ERROR,
              'codex',
              `CLI exited with code ${code}: ${stderr || 'Unknown error'}`,
              { exitCode: code, stderr }
            ),
          })
          return
        }

        const rawResponse = stdout.trim()

        if (outputFormat === 'json') {
          try {
            const data = this.parseJsonSafely(rawResponse)
            resolve({ success: true, rawResponse, data })
          } catch (error) {
            resolve({
              success: false,
              error: new AIProviderError(
                AIProviderErrorCode.INVALID_JSON,
                'codex',
                `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
                { rawResponse: rawResponse.substring(0, 500) }
              ),
            })
          }
        } else {
          resolve({ success: true, rawResponse })
        }
      })
    })
  }

  async isAvailable(): Promise<boolean> {
    const status = await this.getStatus()
    return status.available
  }

  async getStatus(): Promise<AIProviderStatus> {
    return new Promise(resolve => {
      const childProcess = spawn(this.config.cliPath, ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let stdout = ''

      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      childProcess.on('error', (error: NodeJS.ErrnoException) => {
        resolve({
          provider: 'codex',
          available: false,
          error:
            error.code === 'ENOENT' ? `CLI not found at '${this.config.cliPath}'` : error.message,
        })
      })

      childProcess.on('close', code => {
        if (code === 0) {
          resolve({
            provider: 'codex',
            available: true,
            version: stdout.trim(),
          })
        } else {
          resolve({
            provider: 'codex',
            available: false,
            error: `CLI exited with code ${code}`,
          })
        }
      })
    })
  }
}

// Export singleton instance
export const codexProvider = new CodexProvider()

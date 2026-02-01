/**
 * Gemini CLI Provider
 *
 * Implements the AI provider interface for Google Gemini CLI.
 * Spawns the CLI as a child process similar to Claude.
 *
 * @see https://github.com/google-gemini/gemini-cli
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
 * Gemini-specific configuration.
 */
export interface GeminiProviderConfig extends CLIProviderConfig {
  /** Model to use (e.g., 'gemini-2.5-pro', 'gemini-2.5-flash') */
  model?: string
}

/**
 * Default Gemini configuration.
 */
export const DEFAULT_GEMINI_CONFIG: GeminiProviderConfig = {
  ...DEFAULT_PROVIDER_CONFIGS.gemini,
  cliPath: 'gemini',
  model: 'gemini-2.5-flash',
}

/**
 * Gemini CLI provider implementation.
 */
export class GeminiProvider extends BaseAIProvider {
  readonly type = 'gemini' as const
  protected override config: GeminiProviderConfig

  constructor(config: Partial<GeminiProviderConfig> = {}) {
    const fullConfig = { ...DEFAULT_GEMINI_CONFIG, ...config }
    super(fullConfig)
    this.config = fullConfig
  }

  override getConfig(): GeminiProviderConfig {
    return { ...this.config }
  }

  override updateConfig(config: Partial<GeminiProviderConfig>): void {
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
      // gemini -p "prompt" -m model --output-format json
      const args: string[] = ['-p', prompt]

      if (this.config.model) {
        args.push('-m', this.config.model)
      }

      if (outputFormat === 'json') {
        args.push('--output-format', 'json')
      }

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
            'gemini',
            `Gemini CLI not found at '${this.config.cliPath}'`,
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
              'gemini',
              `Gemini CLI not found at '${this.config.cliPath}'`,
              { cliPath: this.config.cliPath }
            ),
          })
        } else {
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.PROVIDER_ERROR,
              'gemini',
              error.message,
              { originalError: error.message }
            ),
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
              'gemini',
              `Gemini CLI timed out after ${this.config.timeout}ms`,
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
              'gemini',
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
              'gemini',
              `CLI exited with code ${code}: ${stderr || 'Unknown error'}`,
              { exitCode: code, stderr }
            ),
          })
          return
        }

        const rawResponse = stdout.trim()

        if (outputFormat === 'json') {
          try {
            const data = this.parseGeminiJsonResponse(rawResponse)
            resolve({ success: true, rawResponse, data })
          } catch (error) {
            resolve({
              success: false,
              error: new AIProviderError(
                AIProviderErrorCode.INVALID_JSON,
                'gemini',
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

  /**
   * Parse Gemini CLI's JSON response format.
   * Handles potential wrapper formats and markdown code blocks.
   */
  private parseGeminiJsonResponse(rawResponse: string): unknown {
    // Try direct parse first
    try {
      const parsed = JSON.parse(rawResponse)

      // Handle potential wrapper formats (adjust based on actual CLI output)
      if (
        parsed &&
        typeof parsed === 'object' &&
        'result' in parsed &&
        typeof parsed.result === 'string'
      ) {
        let resultStr = parsed.result

        // Extract from markdown if wrapped
        const blockMatch = resultStr.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (blockMatch?.[1]) {
          resultStr = blockMatch[1].trim()
        }

        if (resultStr.trim().startsWith('{') || resultStr.trim().startsWith('[')) {
          try {
            return JSON.parse(resultStr)
          } catch {
            return resultStr
          }
        }
        return resultStr
      }

      return parsed
    } catch {
      // If direct parse fails, try extracting from markdown
      const blockMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (blockMatch?.[1]) {
        return JSON.parse(blockMatch[1].trim())
      }

      // Last resort: maybe it's plain JSON without wrapper
      if (rawResponse.trim().startsWith('{') || rawResponse.trim().startsWith('[')) {
        return JSON.parse(rawResponse)
      }

      throw new Error('Unable to parse response as JSON')
    }
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
          provider: 'gemini',
          available: false,
          error:
            error.code === 'ENOENT' ? `CLI not found at '${this.config.cliPath}'` : error.message,
        })
      })

      childProcess.on('close', code => {
        if (code === 0) {
          resolve({
            provider: 'gemini',
            available: true,
            version: stdout.trim() || `Model: ${this.config.model}`,
          })
        } else {
          resolve({
            provider: 'gemini',
            available: false,
            error: `CLI exited with code ${code}`,
          })
        }
      })
    })
  }
}

// Export singleton instance
export const geminiProvider = new GeminiProvider()

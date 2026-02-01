/**
 * Claude CLI Provider
 *
 * Implements the AI provider interface for Claude Code CLI.
 * Spawns the CLI as a child process and communicates via stdin/stdout.
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
}

/**
 * Claude Code CLI provider implementation.
 */
export class ClaudeProvider extends BaseAIProvider {
  readonly type = 'claude' as const
  protected override config: ClaudeProviderConfig

  constructor(config: Partial<ClaudeProviderConfig> = {}) {
    const fullConfig = { ...DEFAULT_CLAUDE_CONFIG, ...config }
    super(fullConfig)
    this.config = fullConfig
  }

  override getConfig(): ClaudeProviderConfig {
    return { ...this.config }
  }

  override updateConfig(config: Partial<ClaudeProviderConfig>): void {
    this.config = { ...this.config, ...config }
  }

  async execute(request: AIProviderRequest): Promise<AIProviderResponse> {
    const { prompt, outputFormat = 'text' } = request

    // Log prompt size for debugging
    console.log(`[ClaudeProvider] Executing with prompt length: ${prompt.length} chars`)

    return new Promise(resolve => {
      let stdout = ''
      let stderr = ''
      let timedOut = false
      let processExited = false

      // Build CLI arguments for clean, minimal execution
      // --tools "" disables all tools, reducing system prompt from 22k to 9k tokens
      // --no-session-persistence prevents session caching
      // --model sonnet for faster responses
      const args: string[] = [
        '--print',
        '--no-session-persistence',
        '--tools',
        '',
        '--model',
        'sonnet',
      ]
      if (outputFormat === 'json') {
        args.push('--output-format', 'json')
      }

      // Spawn the CLI process from /tmp to avoid loading any project context
      let childProcess: ChildProcess
      try {
        childProcess = spawn(this.config.cliPath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env },
          cwd: '/tmp', // Use /tmp to ensure no project context is loaded
        })
      } catch {
        resolve({
          success: false,
          error: new AIProviderError(
            AIProviderErrorCode.PROVIDER_NOT_AVAILABLE,
            'claude',
            `Claude CLI not found at '${this.config.cliPath}'`,
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

      // Handle stdout
      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      // Handle stderr
      childProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      // Handle process errors
      childProcess.on('error', (error: NodeJS.ErrnoException) => {
        clearTimeout(timeoutId)
        processExited = true

        if (error.code === 'ENOENT') {
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.PROVIDER_NOT_AVAILABLE,
              'claude',
              `Claude CLI not found at '${this.config.cliPath}'`,
              { cliPath: this.config.cliPath }
            ),
          })
        } else {
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.PROVIDER_ERROR,
              'claude',
              error.message,
              { originalError: error.message }
            ),
          })
        }
      })

      // Handle process exit
      childProcess.on('close', (code, signal) => {
        clearTimeout(timeoutId)
        processExited = true

        if (timedOut) {
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.TIMEOUT,
              'claude',
              `Claude CLI timed out after ${this.config.timeout}ms`,
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
              'claude',
              `Process killed by signal: ${signal}`,
              { signal }
            ),
          })
          return
        }

        if (code !== 0) {
          // Combine stderr and stdout for better error diagnostics
          // Some CLIs write errors to stdout
          const errorOutput = stderr || stdout || 'Unknown error'
          console.error(`[ClaudeProvider] CLI exited with code ${code}`)
          console.error(`[ClaudeProvider] stderr: ${stderr}`)
          console.error(`[ClaudeProvider] stdout: ${stdout.substring(0, 1000)}`)
          resolve({
            success: false,
            error: new AIProviderError(
              AIProviderErrorCode.PROVIDER_ERROR,
              'claude',
              `CLI exited with code ${code}: ${errorOutput.trim().substring(0, 500)}`,
              { exitCode: code, stderr, stdout: stdout.substring(0, 500) }
            ),
          })
          return
        }

        // Parse response
        const rawResponse = stdout.trim()

        if (outputFormat === 'json') {
          try {
            const data = this.parseClaudeJsonResponse(rawResponse)
            resolve({ success: true, rawResponse, data })
          } catch (error) {
            resolve({
              success: false,
              error: new AIProviderError(
                AIProviderErrorCode.INVALID_JSON,
                'claude',
                `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
                { rawResponse: rawResponse.substring(0, 500) }
              ),
            })
          }
        } else {
          resolve({ success: true, rawResponse })
        }
      })

      // Write prompt to stdin and close
      childProcess.stdin?.write(prompt)
      childProcess.stdin?.end()
    })
  }

  /**
   * Parse Claude CLI's JSON response format.
   * Claude wraps responses in { type: "result", result: "..." }
   */
  private parseClaudeJsonResponse(rawResponse: string): unknown {
    console.log('[ClaudeProvider] Raw response length:', rawResponse.length)
    console.log('[ClaudeProvider] Raw response preview:', rawResponse.substring(0, 500))

    const parsed = JSON.parse(rawResponse)

    // Handle Claude's wrapper format
    if (
      parsed &&
      typeof parsed === 'object' &&
      'type' in parsed &&
      parsed.type === 'result' &&
      'result' in parsed
    ) {
      let resultStr = String(parsed.result)
      console.log('[ClaudeProvider] Result string length:', resultStr.length)
      console.log('[ClaudeProvider] Result string preview:', resultStr.substring(0, 500))

      // Extract from markdown code blocks if wrapped
      const blockMatch = resultStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (blockMatch?.[1]) {
        console.log('[ClaudeProvider] Found markdown code block, extracting...')
        resultStr = blockMatch[1].trim()
      }

      // Try to find and extract JSON object from the string
      // This handles cases where there's text before or after the JSON
      const jsonMatch = resultStr.match(/(\{[\s\S]*\})/)
      if (jsonMatch?.[1]) {
        try {
          const result = JSON.parse(jsonMatch[1])
          console.log('[ClaudeProvider] Successfully parsed JSON object')
          return result
        } catch (e) {
          // Log parsing error for debugging
          console.error('[ClaudeProvider] Failed to parse extracted JSON:', e)
          console.error('[ClaudeProvider] Extracted string:', jsonMatch[1].substring(0, 500))
        }
      }

      // Fallback: try parsing the whole string
      if (resultStr.trim().startsWith('{') || resultStr.trim().startsWith('[')) {
        try {
          const result = JSON.parse(resultStr)
          console.log('[ClaudeProvider] Successfully parsed result string as JSON')
          return result
        } catch (e) {
          console.error('[ClaudeProvider] Failed to parse result string as JSON:', e)
          console.error('[ClaudeProvider] Result string:', resultStr.substring(0, 500))
        }
      }

      // If we still have a string, throw an error so the caller knows parsing failed
      console.error(
        '[ClaudeProvider] Could not find valid JSON. Result string:',
        resultStr.substring(0, 1000)
      )
      throw new Error(
        `Could not extract valid JSON from response. Raw result starts with: ${resultStr.substring(0, 100)}`
      )
    }

    // Response is not in wrapper format
    // If it's already an object, return it
    if (typeof parsed === 'object' && parsed !== null) {
      console.log(
        '[ClaudeProvider] Response is not in wrapper format but is an object, returning as-is'
      )
      return parsed
    }

    // If it's a string, try to extract JSON from it
    if (typeof parsed === 'string') {
      console.log('[ClaudeProvider] Response is a string, trying to extract JSON...')
      const jsonMatch = parsed.match(/(\{[\s\S]*\})/)
      if (jsonMatch?.[1]) {
        try {
          const result = JSON.parse(jsonMatch[1])
          console.log('[ClaudeProvider] Successfully extracted JSON from string response')
          return result
        } catch (e) {
          console.error('[ClaudeProvider] Failed to extract JSON from string response:', e)
        }
      }
      throw new Error(`Response is a string but couldn't extract JSON: ${parsed.substring(0, 200)}`)
    }

    console.log('[ClaudeProvider] Returning parsed response as-is')
    return parsed
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
          provider: 'claude',
          available: false,
          error:
            error.code === 'ENOENT' ? `CLI not found at '${this.config.cliPath}'` : error.message,
        })
      })

      childProcess.on('close', code => {
        if (code === 0) {
          resolve({
            provider: 'claude',
            available: true,
            version: stdout.trim(),
          })
        } else {
          resolve({
            provider: 'claude',
            available: false,
            error: `CLI exited with code ${code}`,
          })
        }
      })
    })
  }
}

// Export singleton instance
export const claudeProvider = new ClaudeProvider()

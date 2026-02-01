/**
 * AI Provider Interface
 *
 * Abstract interface that all AI providers must implement.
 * Enables swappable backends (Claude CLI, Codex CLI, Gemini API, etc.)
 */

import type {
  AIProviderType,
  AIProviderConfig,
  AIProviderRequest,
  AIProviderResponse,
  AIProviderStatus,
} from '../../../types/ai-provider.types'

/**
 * Interface that all AI providers must implement.
 */
export interface IAIProvider {
  /** The provider type identifier */
  readonly type: AIProviderType

  /**
   * Execute a prompt and return the response.
   */
  execute(request: AIProviderRequest): Promise<AIProviderResponse>

  /**
   * Execute with automatic retries on transient failures.
   */
  executeWithRetry(request: AIProviderRequest, retries?: number): Promise<AIProviderResponse>

  /**
   * Check if the provider is available and ready to use.
   */
  isAvailable(): Promise<boolean>

  /**
   * Get detailed status including version info.
   */
  getStatus(): Promise<AIProviderStatus>

  /**
   * Get the current configuration.
   */
  getConfig(): AIProviderConfig

  /**
   * Update the configuration.
   * Accepts provider-specific config properties.
   */
  updateConfig(config: Partial<AIProviderConfig> & Record<string, unknown>): void
}

/**
 * Base class with common functionality for AI providers.
 */
export abstract class BaseAIProvider implements IAIProvider {
  abstract readonly type: AIProviderType
  protected config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = { ...config }
  }

  abstract execute(request: AIProviderRequest): Promise<AIProviderResponse>
  abstract isAvailable(): Promise<boolean>
  abstract getStatus(): Promise<AIProviderStatus>

  getConfig(): AIProviderConfig {
    return { ...this.config }
  }

  updateConfig(config: Partial<AIProviderConfig> & Record<string, unknown>): void {
    this.config = { ...this.config, ...config }
  }

  async executeWithRetry(
    request: AIProviderRequest,
    retries: number = this.config.maxRetries
  ): Promise<AIProviderResponse> {
    const response = await this.execute(request)

    if (response.success) {
      return response
    }

    // Retry on transient failures
    const retryableCodes = ['TIMEOUT', 'CANCELLED', 'RATE_LIMITED']
    const isRetryable = retryableCodes.includes(response.error.code)

    if (isRetryable && retries > 0) {
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, this.config.maxRetries - retries), 10000)
      await new Promise(resolve => setTimeout(resolve, delay))
      return this.executeWithRetry(request, retries - 1)
    }

    return response
  }

  /**
   * Helper to extract JSON from markdown code blocks.
   */
  protected extractJsonFromMarkdown(text: string): string {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match?.[1]) {
      return match[1].trim()
    }
    return text
  }

  /**
   * Helper to parse JSON response safely.
   */
  protected parseJsonSafely(text: string): unknown {
    let content = text.trim()

    // Try to extract from markdown if wrapped
    if (content.includes('```')) {
      content = this.extractJsonFromMarkdown(content)
    }

    // Parse if it looks like JSON
    if (content.startsWith('{') || content.startsWith('[')) {
      return JSON.parse(content)
    }

    return content
  }
}

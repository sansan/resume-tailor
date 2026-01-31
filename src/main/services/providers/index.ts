/**
 * AI Provider Registry
 *
 * Central management for AI providers. Handles provider selection,
 * availability checking, and configuration.
 */

import type { IAIProvider } from './ai-provider.interface';
import { claudeProvider } from './claude.provider';
import { codexProvider } from './codex.provider';
import { geminiProvider } from './gemini.provider';
import type {
  AIProviderType,
  AIProviderConfig,
  AIProviderStatus,
} from '../../../types/ai-provider.types';

// Re-export provider instances and types
export { claudeProvider, type ClaudeProvider } from './claude.provider';
export { codexProvider, type CodexProvider } from './codex.provider';
export { geminiProvider, type GeminiProvider } from './gemini.provider';
export type { IAIProvider } from './ai-provider.interface';
export { BaseAIProvider } from './ai-provider.interface';

/**
 * Registry configuration.
 */
export interface ProviderRegistryConfig {
  /** Default provider to use */
  defaultProvider: AIProviderType;
  /** Provider-specific configurations */
  providerConfigs?: Partial<Record<AIProviderType, Partial<AIProviderConfig>>>;
}

/**
 * Default registry configuration.
 */
const DEFAULT_REGISTRY_CONFIG: ProviderRegistryConfig = {
  defaultProvider: 'claude',
};

/**
 * Provider Registry
 *
 * Manages multiple AI providers and handles selection/fallback logic.
 */
export class ProviderRegistry {
  private providers: Map<AIProviderType, IAIProvider> = new Map();
  private config: ProviderRegistryConfig;

  constructor(config: Partial<ProviderRegistryConfig> = {}) {
    this.config = { ...DEFAULT_REGISTRY_CONFIG, ...config };
    this.initializeProviders();
  }

  /**
   * Initialize all available providers.
   */
  private initializeProviders(): void {
    // Register built-in providers
    this.providers.set('claude', claudeProvider);
    this.providers.set('codex', codexProvider);
    this.providers.set('gemini', geminiProvider);

    // Apply any custom configurations
    if (this.config.providerConfigs) {
      for (const [type, providerConfig] of Object.entries(this.config.providerConfigs)) {
        const provider = this.providers.get(type as AIProviderType);
        if (provider && providerConfig) {
          provider.updateConfig(providerConfig);
        }
      }
    }
  }

  /**
   * Get a specific provider by type.
   */
  getProvider(type: AIProviderType): IAIProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Get the default provider.
   */
  getDefaultProvider(): IAIProvider {
    const provider = this.providers.get(this.config.defaultProvider);
    if (!provider) {
      throw new Error(`Default provider '${this.config.defaultProvider}' not found`);
    }
    return provider;
  }

  /**
   * Set the default provider.
   */
  setDefaultProvider(type: AIProviderType): void {
    if (!this.providers.has(type)) {
      throw new Error(`Provider '${type}' not registered`);
    }
    this.config.defaultProvider = type;
  }

  /**
   * Get all registered provider types.
   */
  getRegisteredProviders(): AIProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check availability of all providers.
   */
  async checkAllAvailability(): Promise<AIProviderStatus[]> {
    const statuses: AIProviderStatus[] = [];

    for (const provider of this.providers.values()) {
      const status = await provider.getStatus();
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Get the first available provider.
   * Checks default provider first, then falls back to others.
   */
  async getFirstAvailable(): Promise<IAIProvider | null> {
    // Check default provider first
    const defaultProvider = this.getDefaultProvider();
    if (await defaultProvider.isAvailable()) {
      return defaultProvider;
    }

    // Check other providers
    for (const [type, provider] of this.providers) {
      if (type !== this.config.defaultProvider) {
        if (await provider.isAvailable()) {
          return provider;
        }
      }
    }

    return null;
  }

  /**
   * Register a custom provider.
   */
  registerProvider(type: AIProviderType, provider: IAIProvider): void {
    this.providers.set(type, provider);
  }

  /**
   * Update configuration for a specific provider.
   */
  updateProviderConfig(type: AIProviderType, config: Partial<AIProviderConfig>): void {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Provider '${type}' not found`);
    }
    provider.updateConfig(config);
  }
}

// Export singleton registry instance
export const providerRegistry = new ProviderRegistry();

/**
 * Convenience function to get a provider.
 */
export function getProvider(type?: AIProviderType): IAIProvider {
  if (type) {
    const provider = providerRegistry.getProvider(type);
    if (!provider) {
      throw new Error(`Provider '${type}' not found`);
    }
    return provider;
  }
  return providerRegistry.getDefaultProvider();
}

/**
 * Convenience function to check all provider statuses.
 */
export async function checkProviders(): Promise<AIProviderStatus[]> {
  return providerRegistry.checkAllAvailability();
}

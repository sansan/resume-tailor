import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  Key,
  Eye,
  EyeOff,
  Loader2,
  Terminal,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import type { AIProvider, CLITool } from '@app-types/electron.d'

/**
 * Props for the ProviderSetupScreen component.
 */
export interface ProviderSetupScreenProps {
  /**
   * Called when the user clicks Continue.
   */
  onComplete: () => void
  /**
   * Detected CLIs from the parent (via useOnboarding).
   */
  detectedCLIs: CLITool[]
  /**
   * Whether CLI detection is in progress.
   */
  isDetectingCLIs: boolean
  /**
   * Function to trigger CLI detection.
   */
  detectCLIs: () => Promise<void>
}

/**
 * API provider configuration.
 */
interface APIProviderConfig {
  id: AIProvider
  name: string
  description: string
}

/**
 * CLI tool display configuration.
 */
interface CLIToolConfig {
  id: CLITool
  name: string
  description: string
}

/**
 * Available API providers.
 */
const API_PROVIDERS: APIProviderConfig[] = [
  {
    id: 'claude',
    name: 'Claude API',
    description: "Add API key for Anthropic's Claude",
  },
  {
    id: 'openai',
    name: 'OpenAI API',
    description: 'Add API key for GPT models',
  },
  {
    id: 'google',
    name: 'Google AI API',
    description: 'Add API key for Gemini models',
  },
]

/**
 * CLI tool display info.
 */
const CLI_TOOLS: CLIToolConfig[] = [
  {
    id: 'claude',
    name: 'Claude CLI',
    description: 'Ready to use',
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    description: 'Ready to use',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    description: 'Ready to use',
  },
]

/**
 * State for a single API provider card.
 */
interface ProviderCardState {
  isOpen: boolean
  apiKey: string
  showKey: boolean
  isSaving: boolean
  hasSavedKey: boolean
  error: string | null
}

/**
 * ProviderSetupScreen - First screen of the onboarding flow.
 *
 * Helps users configure their AI provider by:
 * 1. Detecting installed CLI tools
 * 2. Allowing API key configuration for each provider
 */
export function ProviderSetupScreen({
  onComplete,
  detectedCLIs,
  isDetectingCLIs,
  detectCLIs,
}: ProviderSetupScreenProps): React.JSX.Element {
  // Track state for each API provider card
  const [providerStates, setProviderStates] = useState<
    Record<AIProvider, ProviderCardState>
  >({
    claude: {
      isOpen: false,
      apiKey: '',
      showKey: false,
      isSaving: false,
      hasSavedKey: false,
      error: null,
    },
    openai: {
      isOpen: false,
      apiKey: '',
      showKey: false,
      isSaving: false,
      hasSavedKey: false,
      error: null,
    },
    google: {
      isOpen: false,
      apiKey: '',
      showKey: false,
      isSaving: false,
      hasSavedKey: false,
      error: null,
    },
  })

  // Check for existing API keys on mount
  useEffect(() => {
    const checkExistingKeys = async () => {
      try {
        const [hasClaude, hasOpenAI, hasGoogle] = await Promise.all([
          window.electronAPI.hasAPIKey('claude'),
          window.electronAPI.hasAPIKey('openai'),
          window.electronAPI.hasAPIKey('google'),
        ])

        setProviderStates((prev) => ({
          ...prev,
          claude: { ...prev.claude, hasSavedKey: hasClaude },
          openai: { ...prev.openai, hasSavedKey: hasOpenAI },
          google: { ...prev.google, hasSavedKey: hasGoogle },
        }))
      } catch (error) {
        console.error('Failed to check existing API keys:', error)
      }
    }

    checkExistingKeys()
  }, [])

  /**
   * Update a specific provider's state.
   */
  const updateProviderState = useCallback(
    (provider: AIProvider, updates: Partial<ProviderCardState>) => {
      setProviderStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], ...updates },
      }))
    },
    []
  )

  /**
   * Handle saving an API key.
   */
  const handleSaveKey = useCallback(
    async (provider: AIProvider) => {
      const state = providerStates[provider]
      if (!state.apiKey.trim()) {
        updateProviderState(provider, { error: 'Please enter an API key' })
        return
      }

      updateProviderState(provider, { isSaving: true, error: null })

      try {
        await window.electronAPI.saveAPIKey(provider, state.apiKey.trim())
        updateProviderState(provider, {
          isSaving: false,
          hasSavedKey: true,
          apiKey: '',
          isOpen: false,
        })
      } catch (error) {
        console.error(`Failed to save ${provider} API key:`, error)
        updateProviderState(provider, {
          isSaving: false,
          error: 'Failed to save API key. Please try again.',
        })
      }
    },
    [providerStates, updateProviderState]
  )

  /**
   * Check if user can continue.
   * Requires at least one CLI detected OR one API key saved.
   */
  const canContinue =
    detectedCLIs.length > 0 ||
    providerStates.claude.hasSavedKey ||
    providerStates.openai.hasSavedKey ||
    providerStates.google.hasSavedKey

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Let's set up your AI assistant
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          We'll use AI to help tailor your resume and generate cover letters
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-8">
        {/* Detected CLIs Section */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Terminal className="size-4" />
              Detected CLIs
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={detectCLIs}
              disabled={isDetectingCLIs}
              className="h-7 gap-1.5 px-2 text-xs"
            >
              <RefreshCw
                className={cn('size-3', isDetectingCLIs && 'animate-spin')}
              />
              Refresh
            </Button>
          </div>

          {isDetectingCLIs ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Detecting installed CLI tools...</span>
            </div>
          ) : detectedCLIs.length > 0 ? (
            <div className="space-y-2">
              {detectedCLIs.map((cliId) => {
                const cli = CLI_TOOLS.find((c) => c.id === cliId)
                if (!cli) return null
                return (
                  <div
                    key={cli.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3"
                  >
                    <CheckCircle2 className="size-5 shrink-0 text-green-500" />
                    <div className="flex-1">
                      <span className="font-medium">{cli.name}</span>
                      <span className="text-muted-foreground"> — </span>
                      <span className="text-muted-foreground">
                        {cli.description}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-green-500/10 text-green-600 dark:text-green-400"
                    >
                      Detected
                    </Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
              No CLI tools detected. You can still use API keys below.
            </div>
          )}
        </div>

        {/* API Key Options Section */}
        {/* API Key Options Section */}
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Key className="size-4" />
            API Key Options
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Keys are stored locally in your system's secure storage
          </p>

          <div className="rounded-lg border bg-card">
            <Accordion type="single" collapsible>
              {API_PROVIDERS.map((provider) => {
                const state = providerStates[provider.id]
                return (
                  <AccordionItem key={provider.id} value={provider.id}>
                    <AccordionTrigger className="px-3 py-2.5 hover:no-underline">
                      <div className="flex flex-1 items-center gap-3">
                        <Key className="size-4 text-muted-foreground" />
                        <span className="font-medium">{provider.name}</span>
                        <span className="text-muted-foreground">—</span>
                        <span className="text-muted-foreground">
                          {provider.description}
                        </span>
                        {state.hasSavedKey && (
                          <Badge
                            variant="secondary"
                            className="ml-auto mr-2 bg-green-500/10 text-green-600 dark:text-green-400"
                          >
                            Saved
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={state.showKey ? 'text' : 'password'}
                            placeholder={
                              state.hasSavedKey
                                ? 'Enter new key to replace...'
                                : 'Enter API key...'
                            }
                            value={state.apiKey}
                            onChange={(e) =>
                              updateProviderState(provider.id, {
                                apiKey: e.target.value,
                                error: null,
                              })
                            }
                            disabled={state.isSaving}
                            className="h-9 pr-9 text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                            onClick={() =>
                              updateProviderState(provider.id, {
                                showKey: !state.showKey,
                              })
                            }
                            disabled={state.isSaving}
                          >
                            {state.showKey ? (
                              <EyeOff className="size-3.5" />
                            ) : (
                              <Eye className="size-3.5" />
                            )}
                            <span className="sr-only">
                              {state.showKey ? 'Hide' : 'Show'} API key
                            </span>
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSaveKey(provider.id)}
                          disabled={state.isSaving || !state.apiKey.trim()}
                        >
                          {state.isSaving ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </div>
                      {state.error && (
                        <p className="mt-2 text-xs text-destructive">
                          {state.error}
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        </div>
      </div>

      {/* Spacer to ensure content doesn't hide behind sticky footer */}
      <div className="h-24" />

      {/* Footer Actions - fixed at bottom with full-width border */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Button
            variant="link"
            onClick={onComplete}
            className="text-muted-foreground"
          >
            Skip for now
          </Button>
          <div className="flex items-center gap-4">
            {!canContinue && (
              <p className="text-sm text-muted-foreground">
                Configure at least one AI provider
              </p>
            )}
            <Button
              size="lg"
              onClick={onComplete}
              disabled={!canContinue}
              className="min-w-[140px]"
            >
              Continue
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProviderSetupScreen

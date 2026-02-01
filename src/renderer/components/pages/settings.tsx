import { useState, useEffect, useCallback } from 'react'
import {
  Folder,
  Terminal,
  Key,
  Palette,
  Layout,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Circle,
  Check,
  Save,
  FileText,
  MessageSquare,
  Settings2,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useSettings } from '@/hooks/useSettings'
import { useTemplates } from '@/hooks/useTemplates'
import { useTheme } from '@/components/theme-provider'
import { TemplateMiniPreview } from '@/components/templates/TemplateMiniPreview'
import type { AIProvider, CLITool } from '@app-types/electron.d'
import type {
  ResumePromptTemplateSettings,
  CoverLetterPromptTemplateSettings,
} from '@schemas/settings.schema'
import { cn } from '@/lib/utils'

/**
 * API provider configuration.
 */
interface APIProviderConfig {
  id: AIProvider
  providerId: string
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
    providerId: 'claude',
    name: 'Claude API',
    description: "Anthropic's Claude",
  },
  {
    id: 'openai',
    providerId: 'openai',
    name: 'OpenAI API',
    description: 'GPT models',
  },
  {
    id: 'google',
    providerId: 'gemini',
    name: 'Google AI API',
    description: 'Gemini models',
  },
]

/**
 * CLI tool display info.
 */
const CLI_TOOLS: CLIToolConfig[] = [
  { id: 'claude', name: 'Claude CLI', description: 'Local CLI' },
  { id: 'codex', name: 'Codex CLI', description: 'Local CLI' },
  { id: 'gemini', name: 'Gemini CLI', description: 'Local CLI' },
]

/**
 * State for API provider cards.
 */
interface ProviderCardState {
  apiKey: string
  showKey: boolean
  isSaving: boolean
  isDeleting: boolean
  hasSavedKey: boolean
  error: string | null
}

/**
 * Default resume prompt settings.
 */
const DEFAULT_RESUME_PROMPT: ResumePromptTemplateSettings = {
  maxSummaryLength: 500,
  maxHighlightsPerExperience: 6,
  tone: 'professional',
  focusAreas: ['skills', 'experience', 'achievements'],
  customInstructions: '',
  preserveAllContent: false,
}

/**
 * Default cover letter prompt settings.
 */
const DEFAULT_COVER_LETTER_PROMPT: CoverLetterPromptTemplateSettings = {
  maxOpeningLength: 300,
  maxBodyParagraphs: 3,
  tone: 'formal',
  focusAreas: ['achievements', 'technical-skills'],
  customInstructions: '',
  style: 'detailed',
  emphasizeCompanyKnowledge: true,
}

/**
 * Theme selection card component.
 */
function ThemeCard() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { id: 'light', label: 'Light', icon: Sun, description: 'Light mode' },
    { id: 'dark', label: 'Dark', icon: Moon, description: 'Dark mode' },
    { id: 'system', label: 'System', icon: Monitor, description: 'Follow system preference' },
  ] as const

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sun className="size-5" />
          <CardTitle>Appearance</CardTitle>
        </div>
        <CardDescription>
          Choose how Resume Tailor looks on your device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => {
            const isSelected = theme === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={cn(
                  'relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                  'hover:border-primary/50 hover:bg-accent/50',
                  isSelected ? 'border-primary bg-primary/5' : 'border-border'
                )}
              >
                <t.icon className={cn('size-6', isSelected && 'text-primary')} />
                <span className={cn('text-sm font-medium', isSelected && 'text-primary')}>
                  {t.label}
                </span>
                {isSelected && (
                  <div className="absolute -right-1 -top-1 rounded-full bg-primary p-0.5">
                    <Check className="size-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function SettingsPage() {
  const { settings, isLoading, updateSettings, saveSettings, isSaving, isDirty, selectOutputFolder } = useSettings()
  const {
    templates,
    selectedTemplate,
    setSelectedTemplate,
    palettes,
    selectedPalette,
    setSelectedPalette,
    savePreferences,
  } = useTemplates()

  // CLI detection state
  const [detectedCLIs, setDetectedCLIs] = useState<CLITool[]>([])
  const [isDetectingCLIs, setIsDetectingCLIs] = useState(false)

  // Selected provider state
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [isSavingProvider, setIsSavingProvider] = useState(false)

  // API provider states
  const [providerStates, setProviderStates] = useState<Record<AIProvider, ProviderCardState>>({
    claude: { apiKey: '', showKey: false, isSaving: false, isDeleting: false, hasSavedKey: false, error: null },
    openai: { apiKey: '', showKey: false, isSaving: false, isDeleting: false, hasSavedKey: false, error: null },
    google: { apiKey: '', showKey: false, isSaving: false, isDeleting: false, hasSavedKey: false, error: null },
  })

  // Prompt settings state
  const [resumePrompt, setResumePrompt] = useState<ResumePromptTemplateSettings>(DEFAULT_RESUME_PROMPT)
  const [coverLetterPrompt, setCoverLetterPrompt] = useState<CoverLetterPromptTemplateSettings>(DEFAULT_COVER_LETTER_PROMPT)

  // Detect CLIs on mount
  const detectCLIs = useCallback(async () => {
    setIsDetectingCLIs(true)
    try {
      const clis = await window.electronAPI.detectInstalledCLIs()
      setDetectedCLIs(clis)
    } catch (error) {
      console.error('Failed to detect CLIs:', error)
      setDetectedCLIs([])
    } finally {
      setIsDetectingCLIs(false)
    }
  }, [])

  // Load existing state on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const [hasClaude, hasOpenAI, hasGoogle, currentProvider] = await Promise.all([
          window.electronAPI.hasAPIKey('claude'),
          window.electronAPI.hasAPIKey('openai'),
          window.electronAPI.hasAPIKey('google'),
          window.electronAPI.getSelectedProvider(),
        ])

        setProviderStates(prev => ({
          ...prev,
          claude: { ...prev.claude, hasSavedKey: hasClaude },
          openai: { ...prev.openai, hasSavedKey: hasOpenAI },
          google: { ...prev.google, hasSavedKey: hasGoogle },
        }))

        if (currentProvider) {
          const cliTool = CLI_TOOLS.find(cli => cli.id === currentProvider)
          if (cliTool) {
            setSelectedProvider(`cli:${cliTool.id}`)
          } else {
            const apiProvider = API_PROVIDERS.find(api => api.providerId === currentProvider)
            if (apiProvider) {
              setSelectedProvider(`api:${apiProvider.id}`)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load state:', error)
      }
    }

    loadState()
    detectCLIs()
  }, [detectCLIs])

  // Load prompt settings from settings
  useEffect(() => {
    if (settings) {
      if (settings.resumePromptTemplate) {
        setResumePrompt(settings.resumePromptTemplate)
      }
      if (settings.coverLetterPromptTemplate) {
        setCoverLetterPrompt(settings.coverLetterPromptTemplate)
      }
    }
  }, [settings])

  /**
   * Update a specific provider's state.
   */
  const updateProviderState = useCallback(
    (provider: AIProvider, updates: Partial<ProviderCardState>) => {
      setProviderStates(prev => ({
        ...prev,
        [provider]: { ...prev[provider], ...updates },
      }))
    },
    []
  )

  /**
   * Save an API key.
   */
  const handleSaveKey = useCallback(async (provider: AIProvider) => {
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
      })
    } catch (error) {
      console.error(`Failed to save ${provider} API key:`, error)
      updateProviderState(provider, {
        isSaving: false,
        error: 'Failed to save API key',
      })
    }
  }, [providerStates, updateProviderState])

  /**
   * Delete an API key.
   */
  const handleDeleteKey = useCallback(async (provider: AIProvider) => {
    updateProviderState(provider, { isDeleting: true, error: null })

    try {
      await window.electronAPI.deleteAPIKey(provider)
      updateProviderState(provider, {
        isDeleting: false,
        hasSavedKey: false,
        apiKey: '',
      })

      const apiConfig = API_PROVIDERS.find(p => p.id === provider)
      if (apiConfig && selectedProvider === `api:${apiConfig.id}`) {
        setSelectedProvider(null)
      }
    } catch (error) {
      console.error(`Failed to delete ${provider} API key:`, error)
      updateProviderState(provider, {
        isDeleting: false,
        error: 'Failed to delete API key',
      })
    }
  }, [updateProviderState, selectedProvider])

  /**
   * Handle provider selection change.
   */
  const handleSelectProvider = useCallback(async (providerId: string) => {
    setSelectedProvider(providerId)
    setIsSavingProvider(true)

    try {
      let actualProviderId: string
      if (providerId.startsWith('cli:')) {
        actualProviderId = providerId.replace('cli:', '')
      } else {
        const apiProvider = API_PROVIDERS.find(p => `api:${p.id}` === providerId)
        actualProviderId = apiProvider?.providerId ?? ''
      }

      if (actualProviderId) {
        await window.electronAPI.setSelectedProvider(actualProviderId)
      }
    } catch (error) {
      console.error('Failed to save provider selection:', error)
    } finally {
      setIsSavingProvider(false)
    }
  }, [])

  /**
   * Handle template/palette save.
   */
  const handleSaveTemplatePreferences = useCallback(async () => {
    try {
      await savePreferences()
    } catch (error) {
      console.error('Failed to save template preferences:', error)
    }
  }, [savePreferences])

  /**
   * Save prompt settings.
   */
  const handleSavePromptSettings = useCallback(async () => {
    try {
      await updateSettings({
        resumePromptTemplate: resumePrompt,
        coverLetterPromptTemplate: coverLetterPrompt,
      })
      await saveSettings()
    } catch (error) {
      console.error('Failed to save prompt settings:', error)
    }
  }, [resumePrompt, coverLetterPrompt, updateSettings, saveSettings])

  /**
   * Reset resume prompt to defaults.
   */
  const handleResetResumePrompt = useCallback(() => {
    setResumePrompt(DEFAULT_RESUME_PROMPT)
  }, [])

  /**
   * Reset cover letter prompt to defaults.
   */
  const handleResetCoverLetterPrompt = useCallback(() => {
    setCoverLetterPrompt(DEFAULT_COVER_LETTER_PROMPT)
  }, [])

  /**
   * Check if a CLI is available.
   */
  const isCLIAvailable = (cliId: CLITool) => detectedCLIs.includes(cliId)

  /**
   * Check if an API provider is available.
   */
  const isAPIAvailable = (apiId: AIProvider) => providerStates[apiId].hasSavedKey

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure how Resume Tailor works.</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading settings...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure how Resume Tailor works.</p>
        </div>
        {isDirty && (
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? (
              <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</>
            ) : (
              <><Save className="mr-2 size-4" />Save Changes</>
            )}
          </Button>
        )}
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Settings2 className="size-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="design" className="gap-2">
            <Palette className="size-4" />
            Design
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-2">
            <MessageSquare className="size-4" />
            Prompts
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6 space-y-6">
          {/* Theme Card */}
          <ThemeCard />

          {/* Output Folder Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Folder className="size-5" />
                <CardTitle>Output Folder</CardTitle>
              </div>
              <CardDescription>
                Where generated resumes and cover letters will be saved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={settings?.outputFolderPath || ''}
                  placeholder="Default: ~/Documents/cv-rebu-exports"
                  readOnly
                  className="flex-1"
                />
                <Button variant="outline" onClick={selectOutputFolder}>
                  <Folder className="mr-2 size-4" />
                  Browse
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Provider Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Terminal className="size-5" />
                <CardTitle>AI Provider</CardTitle>
              </div>
              <CardDescription>
                Select which AI service to use for resume tailoring.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CLI Tools Section */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">CLI Tools</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={detectCLIs}
                    disabled={isDetectingCLIs}
                    className="h-7 gap-1.5 px-2 text-xs"
                  >
                    <RefreshCw className={cn('size-3', isDetectingCLIs && 'animate-spin')} />
                    Refresh
                  </Button>
                </div>

                <div className="space-y-2">
                  {CLI_TOOLS.map(cli => {
                    const isAvailable = isCLIAvailable(cli.id)
                    const isSelected = selectedProvider === `cli:${cli.id}`
                    return (
                      <button
                        key={cli.id}
                        type="button"
                        onClick={() => isAvailable && handleSelectProvider(`cli:${cli.id}`)}
                        disabled={!isAvailable || isSavingProvider}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                          isAvailable ? 'cursor-pointer hover:bg-accent/50' : 'cursor-not-allowed opacity-50',
                          isSelected && 'border-primary bg-primary/5'
                        )}
                      >
                        {isSelected ? (
                          <CheckCircle2 className="size-5 shrink-0 text-primary" />
                        ) : (
                          <Circle className="size-5 shrink-0 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <span className="font-medium">{cli.name}</span>
                          <span className="text-muted-foreground"> — {cli.description}</span>
                        </div>
                        {isAvailable ? (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">
                            Not installed
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* API Keys Section */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Key className="size-4" />
                  <h3 className="text-sm font-medium">API Keys</h3>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Keys are stored locally in your system's secure storage.
                </p>

                <div className="rounded-lg border bg-card">
                  <Accordion type="single" collapsible>
                    {API_PROVIDERS.map(provider => {
                      const state = providerStates[provider.id]
                      const isAvailable = isAPIAvailable(provider.id)
                      const isSelected = selectedProvider === `api:${provider.id}`
                      return (
                        <AccordionItem key={provider.id} value={provider.id}>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => isAvailable && handleSelectProvider(`api:${provider.id}`)}
                              disabled={!isAvailable || isSavingProvider}
                              className={cn(
                                'flex items-center pl-3',
                                !isAvailable && 'cursor-not-allowed opacity-50'
                              )}
                            >
                              {isSelected ? (
                                <CheckCircle2 className="size-5 shrink-0 text-primary" />
                              ) : (
                                <Circle className="size-5 shrink-0 text-muted-foreground" />
                              )}
                            </button>
                            <AccordionTrigger className="flex-1 px-3 py-2.5 hover:no-underline [&>svg]:ml-auto">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{provider.name}</span>
                                <span className="text-muted-foreground">— {provider.description}</span>
                              </div>
                              {state.hasSavedKey && (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                                  Configured
                                </Badge>
                              )}
                            </AccordionTrigger>
                          </div>
                          <AccordionContent className="px-3 pb-3 pl-11">
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Input
                                  type={state.showKey ? 'text' : 'password'}
                                  placeholder={state.hasSavedKey ? 'Enter new key to replace...' : 'Enter API key...'}
                                  value={state.apiKey}
                                  onChange={e => updateProviderState(provider.id, { apiKey: e.target.value, error: null })}
                                  disabled={state.isSaving || state.isDeleting}
                                  className="h-9 pr-9 text-sm"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                                  onClick={() => updateProviderState(provider.id, { showKey: !state.showKey })}
                                  disabled={state.isSaving || state.isDeleting}
                                >
                                  {state.showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleSaveKey(provider.id)}
                                disabled={state.isSaving || !state.apiKey.trim()}
                              >
                                {state.isSaving ? <Loader2 className="size-3.5 animate-spin" /> : 'Save'}
                              </Button>
                              {state.hasSavedKey && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={state.isDeleting}
                                    >
                                      {state.isDeleting ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="size-3.5" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete your {provider.name} key from secure storage.
                                        You'll need to enter it again to use this provider.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteKey(provider.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                            {state.error && (
                              <p className="mt-2 text-xs text-destructive">{state.error}</p>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Design Tab */}
        <TabsContent value="design" className="mt-6 space-y-6">
          {/* Template Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layout className="size-5" />
                <CardTitle>Resume Template</CardTitle>
              </div>
              <CardDescription>
                Choose the layout style for your generated resumes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {templates.map(template => {
                  const isSelected = template.id === selectedTemplate
                  const previewPalette = palettes.find(p => p.id === selectedPalette)
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(template.id)
                        handleSaveTemplatePreferences()
                      }}
                      className={cn(
                        'relative flex flex-col items-center rounded-lg border-2 p-3 transition-all',
                        'hover:border-primary/50 hover:bg-accent/50',
                        isSelected ? 'border-primary bg-primary/5' : 'border-border'
                      )}
                    >
                      <div className="mb-2 aspect-[8.5/11] w-full overflow-hidden rounded border bg-muted/30">
                        <TemplateMiniPreview
                          templateId={template.id}
                          palette={previewPalette}
                        />
                      </div>
                      <span className={cn('text-sm font-medium', isSelected && 'text-primary')}>
                        {template.name}
                      </span>
                      {isSelected && (
                        <div className="absolute -right-1 -top-1 rounded-full bg-primary p-0.5">
                          <Check className="size-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Color Palette Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="size-5" />
                <CardTitle>Color Palette</CardTitle>
              </div>
              <CardDescription>
                Choose the color scheme for your resumes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {palettes.map(palette => {
                  const isSelected = palette.id === selectedPalette
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => {
                        setSelectedPalette(palette.id)
                        handleSaveTemplatePreferences()
                      }}
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 transition-all',
                        'hover:border-primary/50 hover:bg-accent/50',
                        isSelected ? 'border-primary bg-primary/5' : 'border-border'
                      )}
                    >
                      <div className="flex gap-0.5">
                        <div
                          className="size-5 rounded-sm ring-1 ring-black/10"
                          style={{ backgroundColor: palette.primary }}
                        />
                        <div
                          className="size-5 rounded-sm ring-1 ring-black/10"
                          style={{ backgroundColor: palette.secondary }}
                        />
                        <div
                          className="size-5 rounded-sm ring-1 ring-black/10"
                          style={{ backgroundColor: palette.accent }}
                        />
                      </div>
                      <span className={cn('flex-1 text-left text-sm', isSelected && 'font-medium text-primary')}>
                        {palette.name}
                      </span>
                      {isSelected && <Check className="size-4 text-primary" />}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="mt-6 space-y-6">
          {/* Resume Refinement Prompt Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="size-5" />
                  <CardTitle>Resume Refinement</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={handleResetResumePrompt}>
                  <RotateCcw className="mr-2 size-4" />
                  Reset to Default
                </Button>
              </div>
              <CardDescription>
                Customize how the AI tailors your resume to job postings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="resume-tone">Tone</Label>
                  <Select
                    value={resumePrompt.tone}
                    onValueChange={(value: 'professional' | 'conversational' | 'technical') =>
                      setResumePrompt(prev => ({ ...prev, tone: value }))
                    }
                  >
                    <SelectTrigger id="resume-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resume-max-highlights">Max Highlights per Experience</Label>
                  <Select
                    value={String(resumePrompt.maxHighlightsPerExperience)}
                    onValueChange={(value) =>
                      setResumePrompt(prev => ({ ...prev, maxHighlightsPerExperience: Number(value) }))
                    }
                  >
                    <SelectTrigger id="resume-max-highlights">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6, 7, 8].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume-max-summary">Max Summary Length (characters)</Label>
                <Input
                  id="resume-max-summary"
                  type="number"
                  min={100}
                  max={1000}
                  value={resumePrompt.maxSummaryLength}
                  onChange={e => setResumePrompt(prev => ({ ...prev, maxSummaryLength: Number(e.target.value) }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="resume-preserve">Preserve All Content</Label>
                  <p className="text-xs text-muted-foreground">
                    Keep all original content instead of allowing trimming
                  </p>
                </div>
                <Switch
                  id="resume-preserve"
                  checked={resumePrompt.preserveAllContent}
                  onCheckedChange={checked => setResumePrompt(prev => ({ ...prev, preserveAllContent: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume-instructions">Custom Instructions</Label>
                <Textarea
                  id="resume-instructions"
                  placeholder="Add any specific instructions for how the AI should refine your resume..."
                  value={resumePrompt.customInstructions}
                  onChange={e => setResumePrompt(prev => ({ ...prev, customInstructions: e.target.value }))}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  These instructions will be appended to the AI prompt when refining resumes.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Cover Letter Prompt Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-5" />
                  <CardTitle>Cover Letter Generation</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={handleResetCoverLetterPrompt}>
                  <RotateCcw className="mr-2 size-4" />
                  Reset to Default
                </Button>
              </div>
              <CardDescription>
                Customize how the AI generates cover letters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cover-tone">Tone</Label>
                  <Select
                    value={coverLetterPrompt.tone}
                    onValueChange={(value: 'formal' | 'conversational' | 'enthusiastic') =>
                      setCoverLetterPrompt(prev => ({ ...prev, tone: value }))
                    }
                  >
                    <SelectTrigger id="cover-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cover-style">Writing Style</Label>
                  <Select
                    value={coverLetterPrompt.style}
                    onValueChange={(value: 'concise' | 'detailed' | 'storytelling') =>
                      setCoverLetterPrompt(prev => ({ ...prev, style: value }))
                    }
                  >
                    <SelectTrigger id="cover-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                      <SelectItem value="storytelling">Storytelling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cover-paragraphs">Body Paragraphs</Label>
                  <Select
                    value={String(coverLetterPrompt.maxBodyParagraphs)}
                    onValueChange={(value) =>
                      setCoverLetterPrompt(prev => ({ ...prev, maxBodyParagraphs: Number(value) }))
                    }
                  >
                    <SelectTrigger id="cover-paragraphs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cover-opening">Max Opening Length</Label>
                  <Input
                    id="cover-opening"
                    type="number"
                    min={100}
                    max={500}
                    value={coverLetterPrompt.maxOpeningLength}
                    onChange={e => setCoverLetterPrompt(prev => ({ ...prev, maxOpeningLength: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cover-company">Emphasize Company Knowledge</Label>
                  <p className="text-xs text-muted-foreground">
                    Include company-specific details when available
                  </p>
                </div>
                <Switch
                  id="cover-company"
                  checked={coverLetterPrompt.emphasizeCompanyKnowledge}
                  onCheckedChange={checked => setCoverLetterPrompt(prev => ({ ...prev, emphasizeCompanyKnowledge: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover-instructions">Custom Instructions</Label>
                <Textarea
                  id="cover-instructions"
                  placeholder="Add any specific instructions for how the AI should generate cover letters..."
                  value={coverLetterPrompt.customInstructions}
                  onChange={e => setCoverLetterPrompt(prev => ({ ...prev, customInstructions: e.target.value }))}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  These instructions will be appended to the AI prompt when generating cover letters.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button for Prompts */}
          <div className="flex justify-end">
            <Button onClick={handleSavePromptSettings} disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-2 size-4" />Save Prompt Settings</>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

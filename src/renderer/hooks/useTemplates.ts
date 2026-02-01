import { useState, useCallback, useEffect, useMemo } from 'react'
import type { TemplateId, PaletteId } from '@schemas/settings.schema'

/**
 * Color palette definition.
 */
export interface ColorPalette {
  id: string
  name: string
  primary: string
  secondary: string
  accent: string
}

/**
 * Template definition.
 */
export interface Template {
  id: string
  name: string
  description: string
}

/**
 * Return type for the useTemplates hook.
 */
export interface UseTemplatesReturn {
  // Templates
  templates: Template[]
  selectedTemplate: string
  setSelectedTemplate: (id: string) => void

  // Palettes
  palettes: ColorPalette[]
  selectedPalette: string
  setSelectedPalette: (id: string) => void

  // Get selected items
  getSelectedTemplate: () => Template | undefined
  getSelectedPalette: () => ColorPalette | undefined

  // Persistence
  savePreferences: () => Promise<void>
  loadPreferences: () => Promise<void>
  isSaving: boolean
  isLoading: boolean
}

/**
 * Predefined color palettes from design doc.
 */
export const PREDEFINED_PALETTES: ColorPalette[] = [
  {
    id: 'classic-gray',
    name: 'Classic Gray',
    primary: '#374151',
    secondary: '#6b7280',
    accent: '#9ca3af',
  },
  {
    id: 'professional-blue',
    name: 'Professional Blue',
    primary: '#1e40af',
    secondary: '#3b82f6',
    accent: '#60a5fa',
  },
  {
    id: 'modern-teal',
    name: 'Modern Teal',
    primary: '#0d9488',
    secondary: '#14b8a6',
    accent: '#2dd4bf',
  },
  {
    id: 'bold-red',
    name: 'Bold Red',
    primary: '#b91c1c',
    secondary: '#ef4444',
    accent: '#f87171',
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    primary: '#166534',
    secondary: '#22c55e',
    accent: '#4ade80',
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    primary: '#7c3aed',
    secondary: '#a78bfa',
    accent: '#c4b5fd',
  },
]

/**
 * Available resume templates.
 */
export const AVAILABLE_TEMPLATES: Template[] = [
  {
    id: 'classic',
    name: 'Classic Professional',
    description: 'Traditional layout with clean lines and professional formatting.',
  },
  {
    id: 'modern',
    name: 'Modern Minimal',
    description: 'Clean, minimalist design with ample white space.',
  },
  {
    id: 'creative',
    name: 'Creative Bold',
    description: 'Eye-catching design with unique layout elements.',
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Sophisticated design for senior professionals.',
  },
]

/**
 * Default values matching the settings schema.
 */
const DEFAULT_TEMPLATE = 'classic'
const DEFAULT_PALETTE = 'classic-gray'

/**
 * Hook for managing template and palette selection.
 *
 * Provides template and palette lists, selection state,
 * and persistence functionality via app settings.
 */
export function useTemplates(): UseTemplatesReturn {
  // Template state
  const [selectedTemplate, setSelectedTemplateInternal] = useState<string>(DEFAULT_TEMPLATE)

  // Palette state
  const [selectedPalette, setSelectedPaletteInternal] = useState<string>(DEFAULT_PALETTE)

  // Loading/saving state
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Memoized template and palette lists
  const templates = useMemo(() => AVAILABLE_TEMPLATES, [])
  const palettes = useMemo(() => PREDEFINED_PALETTES, [])

  /**
   * Set selected template with validation.
   */
  const setSelectedTemplate = useCallback((id: string) => {
    const exists = AVAILABLE_TEMPLATES.some(t => t.id === id)
    if (exists) {
      setSelectedTemplateInternal(id)
    } else {
      console.warn(`Template with id "${id}" not found`)
    }
  }, [])

  /**
   * Set selected palette with validation.
   */
  const setSelectedPalette = useCallback((id: string) => {
    const exists = PREDEFINED_PALETTES.some(p => p.id === id)
    if (exists) {
      setSelectedPaletteInternal(id)
    } else {
      console.warn(`Palette with id "${id}" not found`)
    }
  }, [])

  /**
   * Get the currently selected template object.
   */
  const getSelectedTemplate = useCallback(() => {
    return AVAILABLE_TEMPLATES.find(t => t.id === selectedTemplate)
  }, [selectedTemplate])

  /**
   * Get the currently selected palette object.
   */
  const getSelectedPalette = useCallback(() => {
    return PREDEFINED_PALETTES.find(p => p.id === selectedPalette)
  }, [selectedPalette])

  /**
   * Save preferences to backend (settings).
   */
  const savePreferences = useCallback(async () => {
    setIsSaving(true)
    try {
      // Get current settings
      const currentSettings = await window.electronAPI.getSettings()

      // Get selected palette for theme colors
      const palette = PREDEFINED_PALETTES.find(p => p.id === selectedPalette)

      // Build updated settings
      const updatedSettings = {
        ...currentSettings,
        selectedTemplate: selectedTemplate as TemplateId,
        selectedPalette: selectedPalette as PaletteId,
        ...(palette && {
          pdfTheme: {
            ...currentSettings.pdfTheme,
            colors: {
              ...currentSettings.pdfTheme.colors,
              primary: palette.primary,
              accent: palette.secondary,
            },
          },
        }),
      }

      await window.electronAPI.saveSettings(updatedSettings)
    } catch (error) {
      console.error('Failed to save template preferences:', error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [selectedTemplate, selectedPalette])

  /**
   * Load preferences from backend (settings).
   */
  const loadPreferences = useCallback(async () => {
    setIsLoading(true)
    try {
      const settings = await window.electronAPI.getSettings()

      // Load template if valid
      if (settings.selectedTemplate) {
        const templateExists = AVAILABLE_TEMPLATES.some(t => t.id === settings.selectedTemplate)
        if (templateExists) {
          setSelectedTemplateInternal(settings.selectedTemplate)
        }
      }

      // Load palette if valid
      if (settings.selectedPalette) {
        const paletteExists = PREDEFINED_PALETTES.some(p => p.id === settings.selectedPalette)
        if (paletteExists) {
          setSelectedPaletteInternal(settings.selectedPalette)
        }
      }
    } catch (error) {
      console.error('Failed to load template preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load preferences on mount
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  return {
    // Templates
    templates,
    selectedTemplate,
    setSelectedTemplate,

    // Palettes
    palettes,
    selectedPalette,
    setSelectedPalette,

    // Get selected items
    getSelectedTemplate,
    getSelectedPalette,

    // Persistence
    savePreferences,
    loadPreferences,
    isSaving,
    isLoading,
  }
}

import { useState, useCallback, useEffect, useMemo } from 'react';

/**
 * Color palette definition.
 */
export interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

/**
 * Template definition.
 */
export interface Template {
  id: string;
  name: string;
  description: string;
}

/**
 * Return type for the useTemplates hook.
 */
export interface UseTemplatesReturn {
  // Templates
  templates: Template[];
  selectedTemplate: string;
  setSelectedTemplate: (id: string) => void;

  // Palettes
  palettes: ColorPalette[];
  selectedPalette: string;
  setSelectedPalette: (id: string) => void;

  // Get selected items
  getSelectedTemplate: () => Template | undefined;
  getSelectedPalette: () => ColorPalette | undefined;

  // Persistence
  savePreferences: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  isSaving: boolean;
  isLoading: boolean;
}

/**
 * Local storage key for template preferences.
 */
const STORAGE_KEY = 'resume-creator-template-preferences';

/**
 * Predefined color palettes from design doc.
 */
export const PREDEFINED_PALETTES: ColorPalette[] = [
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
    id: 'classic-gray',
    name: 'Classic Gray',
    primary: '#374151',
    secondary: '#6b7280',
    accent: '#9ca3af',
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
];

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
];

/**
 * Interface for persisted preferences.
 */
interface TemplatePreferences {
  templateId: string;
  paletteId: string;
}

/**
 * Load preferences from local storage.
 */
function loadFromLocalStorage(): TemplatePreferences | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as TemplatePreferences;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Save preferences to local storage.
 */
function saveToLocalStorage(preferences: TemplatePreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook for managing template and palette selection.
 *
 * Provides template and palette lists, selection state,
 * and persistence functionality.
 */
export function useTemplates(): UseTemplatesReturn {
  // Load initial state from local storage
  const storedPrefs = loadFromLocalStorage();

  // Template state
  const [selectedTemplate, setSelectedTemplateInternal] = useState<string>(
    storedPrefs?.templateId ?? 'classic'
  );

  // Palette state
  const [selectedPalette, setSelectedPaletteInternal] = useState<string>(
    storedPrefs?.paletteId ?? 'professional-blue'
  );

  // Loading/saving state
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Memoized template and palette lists
  const templates = useMemo(() => AVAILABLE_TEMPLATES, []);
  const palettes = useMemo(() => PREDEFINED_PALETTES, []);

  /**
   * Set selected template with validation.
   */
  const setSelectedTemplate = useCallback((id: string) => {
    const exists = AVAILABLE_TEMPLATES.some((t) => t.id === id);
    if (exists) {
      setSelectedTemplateInternal(id);
      // Auto-save to local storage
      const currentPalette = selectedPalette;
      saveToLocalStorage({ templateId: id, paletteId: currentPalette });
    } else {
      console.warn(`Template with id "${id}" not found`);
    }
  }, [selectedPalette]);

  /**
   * Set selected palette with validation.
   */
  const setSelectedPalette = useCallback((id: string) => {
    const exists = PREDEFINED_PALETTES.some((p) => p.id === id);
    if (exists) {
      setSelectedPaletteInternal(id);
      // Auto-save to local storage
      const currentTemplate = selectedTemplate;
      saveToLocalStorage({ templateId: currentTemplate, paletteId: id });
    } else {
      console.warn(`Palette with id "${id}" not found`);
    }
  }, [selectedTemplate]);

  /**
   * Get the currently selected template object.
   */
  const getSelectedTemplate = useCallback(() => {
    return AVAILABLE_TEMPLATES.find((t) => t.id === selectedTemplate);
  }, [selectedTemplate]);

  /**
   * Get the currently selected palette object.
   */
  const getSelectedPalette = useCallback(() => {
    return PREDEFINED_PALETTES.find((p) => p.id === selectedPalette);
  }, [selectedPalette]);

  /**
   * Save preferences to backend (settings).
   */
  const savePreferences = useCallback(async () => {
    setIsSaving(true);
    try {
      // Get current settings and update with template/palette
      const currentSettings = await window.electronAPI.getSettings();

      // Get selected palette for theme colors
      const palette = PREDEFINED_PALETTES.find((p) => p.id === selectedPalette);

      if (palette) {
        // Update theme colors based on selected palette
        const updatedSettings = {
          ...currentSettings,
          pdfTheme: {
            ...currentSettings.pdfTheme,
            colors: {
              ...currentSettings.pdfTheme.colors,
              primary: palette.primary,
              accent: palette.secondary,
              // Keep other colors from current settings
            },
          },
        };

        await window.electronAPI.saveSettings(updatedSettings);
      }

      // Also save to local storage
      saveToLocalStorage({
        templateId: selectedTemplate,
        paletteId: selectedPalette,
      });
    } catch (error) {
      console.error('Failed to save template preferences:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [selectedTemplate, selectedPalette]);

  /**
   * Load preferences from backend (settings).
   */
  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      // First try local storage
      const stored = loadFromLocalStorage();
      if (stored) {
        // Validate stored values exist
        const templateExists = AVAILABLE_TEMPLATES.some((t) => t.id === stored.templateId);
        const paletteExists = PREDEFINED_PALETTES.some((p) => p.id === stored.paletteId);

        if (templateExists) {
          setSelectedTemplateInternal(stored.templateId);
        }
        if (paletteExists) {
          setSelectedPaletteInternal(stored.paletteId);
        }
      }
    } catch (error) {
      console.error('Failed to load template preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

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
  };
}

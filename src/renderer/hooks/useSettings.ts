import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type {
  AppSettings,
  PartialAppSettings,
} from '../../shared/schemas/settings.schema';
import {
  validateSettings as validateSettingsData,
  errorsToFieldMap,
  type ValidationError,
  type ValidationWarning,
} from '../../shared/utils/settings-validation';

/**
 * State interface for the useSettings hook.
 */
export interface UseSettingsState {
  settings: AppSettings | null;
  isDirty: boolean;
  errors: Record<string, string>;
  warnings: string[];
  isLoading: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  /** Whether the current settings are valid (real-time validation) */
  isValid: boolean;
  /** Detailed validation errors for each field */
  validationErrors: ValidationError[];
  /** Validation warnings (non-blocking) */
  validationWarnings: ValidationWarning[];
}

/**
 * Actions interface for the useSettings hook.
 */
export interface UseSettingsActions {
  updateSettings: (updates: PartialAppSettings) => void;
  saveSettings: () => Promise<boolean>;
  resetToDefaults: () => Promise<void>;
  selectOutputFolder: () => Promise<string | null>;
  getDefaultOutputFolder: () => Promise<string>;
  discardChanges: () => void;
  /** Validate current settings without saving */
  validateCurrentSettings: () => { isValid: boolean; errors: ValidationError[]; warnings: ValidationWarning[] };
  /** Check if a specific field has an error */
  hasFieldError: (fieldPath: string) => boolean;
  /** Get error message for a specific field */
  getFieldError: (fieldPath: string) => string | undefined;
}

/**
 * Combined return type for the useSettings hook.
 */
export type UseSettingsReturn = UseSettingsState & UseSettingsActions;

/**
 * Deep equality check for settings comparison.
 */
function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
  if (obj1 === null || obj2 === null) return false;

  const keys1 = Object.keys(obj1 as Record<string, unknown>);
  const keys2 = Object.keys(obj2 as Record<string, unknown>);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    const val1 = (obj1 as Record<string, unknown>)[key];
    const val2 = (obj2 as Record<string, unknown>)[key];
    if (!deepEqual(val1, val2)) return false;
  }

  return true;
}

/**
 * Deep merge two objects, with source values overriding target values.
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge objects
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      // Direct assignment for non-object values
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Hook for managing application settings.
 *
 * Provides loading, editing, saving, and resetting of settings with
 * dirty state tracking and real-time validation.
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);

  // Keep track of the original saved settings to detect dirty state
  const savedSettingsRef = useRef<AppSettings | null>(null);

  // Compute isValid based on validation errors
  const isValid = useMemo(() => validationErrors.length === 0, [validationErrors]);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const loaded = await window.electronAPI.getSettings();
        setSettings(loaded);
        savedSettingsRef.current = loaded;
        setIsDirty(false);
        setErrors({});
        setWarnings([]);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setErrors({ _global: 'Failed to load settings' });
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Clear save success after a delay
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  /**
   * Update settings with partial values and perform real-time validation.
   */
  const updateSettings = useCallback((updates: PartialAppSettings) => {
    setSettings((prev) => {
      if (!prev) return prev;

      const merged = deepMerge(prev, updates as Record<string, unknown>) as AppSettings;

      // Check if settings changed from saved version
      const isDifferent = !deepEqual(merged, savedSettingsRef.current);
      setIsDirty(isDifferent);

      // Perform real-time validation on the merged settings
      const validationResult = validateSettingsData(merged);
      setValidationErrors(validationResult.errors);
      setValidationWarnings(validationResult.warnings);

      // Update field-specific errors for UI display
      if (validationResult.errors.length > 0) {
        const fieldErrorMap = errorsToFieldMap(validationResult.errors);
        setErrors((prevErrors) => ({
          ...prevErrors,
          ...fieldErrorMap,
        }));
      }

      return merged;
    });

    // Clear errors for updated fields that are now valid
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(updates)) {
        // Only clear if not in validation errors
        const hasValidationError = validationErrors.some(
          (e) => e.field === key || e.field.startsWith(`${key}.`)
        );
        if (!hasValidationError) {
          delete next[key];
        }
      }
      return next;
    });

    // Clear save success when editing
    setSaveSuccess(false);
  }, [validationErrors]);

  /**
   * Save current settings to disk.
   */
  const saveSettings = useCallback(async (): Promise<boolean> => {
    if (!settings) return false;

    setIsSaving(true);
    setErrors({});
    setWarnings([]);

    try {
      // Validate first
      const validationResult = await window.electronAPI.validateSettings(settings);

      if (!validationResult.isValid && validationResult.errors) {
        const errorMap: Record<string, string> = {};
        for (const error of validationResult.errors) {
          // Try to extract field name from error message
          const colonIndex = error.indexOf(':');
          if (colonIndex > 0) {
            const field = error.substring(0, colonIndex).trim();
            const message = error.substring(colonIndex + 1).trim();
            errorMap[field] = message;
          } else {
            errorMap['_global'] = errorMap['_global']
              ? `${errorMap['_global']}; ${error}`
              : error;
          }
        }
        setErrors(errorMap);
        return false;
      }

      // Set warnings if any
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        setWarnings(validationResult.warnings);
      }

      // Save settings
      const saved = await window.electronAPI.saveSettings(settings);
      setSettings(saved);
      savedSettingsRef.current = saved;
      setIsDirty(false);
      setSaveSuccess(true);
      return true;
    } catch (err) {
      console.error('Failed to save settings:', err);
      setErrors({
        _global: err instanceof Error ? err.message : 'Failed to save settings'
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  /**
   * Reset settings to defaults.
   */
  const resetToDefaults = useCallback(async () => {
    setIsSaving(true);
    setErrors({});
    setWarnings([]);

    try {
      const defaults = await window.electronAPI.resetSettings();
      setSettings(defaults);
      savedSettingsRef.current = defaults;
      setIsDirty(false);
      setSaveSuccess(true);
    } catch (err) {
      console.error('Failed to reset settings:', err);
      setErrors({
        _global: err instanceof Error ? err.message : 'Failed to reset settings'
      });
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Open folder selection dialog.
   */
  const selectOutputFolder = useCallback(async (): Promise<string | null> => {
    try {
      const folderPath = await window.electronAPI.selectOutputFolder();
      if (folderPath) {
        updateSettings({ outputFolderPath: folderPath });
      }
      return folderPath;
    } catch (err) {
      console.error('Failed to select folder:', err);
      return null;
    }
  }, [updateSettings]);

  /**
   * Get the default output folder path.
   */
  const getDefaultOutputFolder = useCallback(async (): Promise<string> => {
    try {
      return await window.electronAPI.getDefaultOutputFolder();
    } catch (err) {
      console.error('Failed to get default folder:', err);
      return '';
    }
  }, []);

  /**
   * Discard unsaved changes and revert to saved settings.
   */
  const discardChanges = useCallback(() => {
    if (savedSettingsRef.current) {
      setSettings({ ...savedSettingsRef.current });
      setIsDirty(false);
      setErrors({});
      setWarnings([]);
      setSaveSuccess(false);
      setValidationErrors([]);
      setValidationWarnings([]);
    }
  }, []);

  /**
   * Validate current settings without saving.
   */
  const validateCurrentSettings = useCallback(() => {
    if (!settings) {
      return { isValid: false, errors: [], warnings: [] };
    }
    const result = validateSettingsData(settings);
    setValidationErrors(result.errors);
    setValidationWarnings(result.warnings);
    if (result.errors.length > 0) {
      setErrors(errorsToFieldMap(result.errors));
    }
    return result;
  }, [settings]);

  /**
   * Check if a specific field has a validation error.
   */
  const hasFieldError = useCallback((fieldPath: string): boolean => {
    return validationErrors.some(
      (e) => e.field === fieldPath || e.field.startsWith(`${fieldPath}.`)
    ) || fieldPath in errors;
  }, [validationErrors, errors]);

  /**
   * Get error message for a specific field.
   */
  const getFieldError = useCallback((fieldPath: string): string | undefined => {
    // Check validation errors first
    const validationError = validationErrors.find(
      (e) => e.field === fieldPath || e.field.startsWith(`${fieldPath}.`)
    );
    if (validationError) {
      return validationError.message;
    }
    // Fall back to errors map
    return errors[fieldPath];
  }, [validationErrors, errors]);

  return {
    settings,
    isDirty,
    errors,
    warnings,
    isLoading,
    isSaving,
    saveSuccess,
    isValid,
    validationErrors,
    validationWarnings,
    updateSettings,
    saveSettings,
    resetToDefaults,
    selectOutputFolder,
    getDefaultOutputFolder,
    discardChanges,
    validateCurrentSettings,
    hasFieldError,
    getFieldError,
  };
}

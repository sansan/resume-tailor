import React, { useState, useCallback, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import {
  DEFAULT_APP_SETTINGS,
  type ResumePromptTemplateSettings,
  type CoverLetterPromptTemplateSettings,
  type PDFThemeSettings as PDFThemeSettingsType,
} from '@schemas/settings.schema';
import OutputFolderSettings from './OutputFolderSettings';
import PromptSettings from './PromptSettings';
import PDFThemeSettingsComponent from './PDFThemeSettings';

/**
 * Main Settings View component.
 *
 * Provides UI for configuring:
 * - Output folder and file naming
 * - AI prompt templates for resume refinement and cover letter generation
 * - PDF theme customization
 */
function SettingsView(): React.JSX.Element {
  const {
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
    // hasFieldError and getFieldError are available for per-field validation but
    // we use the errors summary view instead
  } = useSettings();

  const [defaultFolderPath, setDefaultFolderPath] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    output: true,
    resumePrompt: false,
    coverLetterPrompt: false,
    pdfTheme: false,
  });

  // Load default folder path on mount
  useEffect(() => {
    getDefaultOutputFolder().then(setDefaultFolderPath);
  }, [getDefaultOutputFolder]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const handleSelectFolder = useCallback(async () => {
    await selectOutputFolder();
  }, [selectOutputFolder]);

  const handleSave = useCallback(async () => {
    await saveSettings();
  }, [saveSettings]);

  const handleReset = useCallback(async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      await resetToDefaults();
    }
  }, [resetToDefaults]);

  const handleDiscard = useCallback(() => {
    if (window.confirm('Are you sure you want to discard your changes?')) {
      discardChanges();
    }
  }, [discardChanges]);

  // Helper to update nested settings
  const updateResumePrompt = useCallback(
    (updates: Partial<ResumePromptTemplateSettings>) => {
      if (!settings) return;
      updateSettings({
        resumePromptTemplate: {
          ...settings.resumePromptTemplate,
          ...updates,
        },
      });
    },
    [settings, updateSettings]
  );

  const updateCoverLetterPrompt = useCallback(
    (updates: Partial<CoverLetterPromptTemplateSettings>) => {
      if (!settings) return;
      updateSettings({
        coverLetterPromptTemplate: {
          ...settings.coverLetterPromptTemplate,
          ...updates,
        },
      });
    },
    [settings, updateSettings]
  );

  const resetResumePrompt = useCallback(() => {
    if (window.confirm('Reset resume refinement settings to defaults? Your custom instructions will be cleared.')) {
      updateSettings({
        resumePromptTemplate: DEFAULT_APP_SETTINGS.resumePromptTemplate,
      });
    }
  }, [updateSettings]);

  const resetCoverLetterPrompt = useCallback(() => {
    if (window.confirm('Reset cover letter settings to defaults? Your custom instructions will be cleared.')) {
      updateSettings({
        coverLetterPromptTemplate: DEFAULT_APP_SETTINGS.coverLetterPromptTemplate,
      });
    }
  }, [updateSettings]);

  const resetPDFTheme = useCallback(() => {
    if (window.confirm('Reset PDF theme to defaults? All color, font, and spacing customizations will be cleared.')) {
      updateSettings({
        pdfTheme: DEFAULT_APP_SETTINGS.pdfTheme,
      });
    }
  }, [updateSettings]);

  const updatePDFThemeColors = useCallback(
    (colorUpdates: Partial<PDFThemeSettingsType['colors']>) => {
      if (!settings) return;
      updateSettings({
        pdfTheme: {
          ...settings.pdfTheme,
          colors: {
            ...settings.pdfTheme.colors,
            ...colorUpdates,
          },
        },
      });
    },
    [settings, updateSettings]
  );

  const updatePDFThemeFonts = useCallback(
    (fontUpdates: Partial<PDFThemeSettingsType['fonts']>) => {
      if (!settings) return;
      updateSettings({
        pdfTheme: {
          ...settings.pdfTheme,
          fonts: {
            ...settings.pdfTheme.fonts,
            ...fontUpdates,
          },
        },
      });
    },
    [settings, updateSettings]
  );

  const updatePDFThemeFontSizes = useCallback(
    (fontSizeUpdates: Partial<PDFThemeSettingsType['fontSizes']>) => {
      if (!settings) return;
      updateSettings({
        pdfTheme: {
          ...settings.pdfTheme,
          fontSizes: {
            ...settings.pdfTheme.fontSizes,
            ...fontSizeUpdates,
          },
        },
      });
    },
    [settings, updateSettings]
  );

  const updatePDFThemeSpacing = useCallback(
    (spacingUpdates: Partial<PDFThemeSettingsType['spacing']>) => {
      if (!settings) return;
      updateSettings({
        pdfTheme: {
          ...settings.pdfTheme,
          spacing: {
            ...settings.pdfTheme.spacing,
            ...spacingUpdates,
          },
        },
      });
    },
    [settings, updateSettings]
  );

  if (isLoading) {
    return (
      <div className="settings-view settings-view--loading">
        <div className="settings-view__loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="settings-view settings-view--error">
        <p>Failed to load settings. Please try refreshing the application.</p>
      </div>
    );
  }

  return (
    <div className="settings-view">
      <div className="settings-view__header">
        <div className="settings-view__header-content">
          <h2 className="settings-view__title">Settings</h2>
          <p className="settings-view__description">
            Configure output folders, customize AI prompts, and adjust PDF styling.
          </p>
        </div>
        {isDirty && (
          <div className="settings-view__unsaved-badge">
            Unsaved changes
          </div>
        )}
      </div>

      {/* Global error display */}
      {errors._global && (
        <div className="settings-view__error" role="alert">
          <strong>Error:</strong> {errors._global}
        </div>
      )}

      {/* Validation errors display */}
      {validationErrors.length > 0 && (
        <div className="settings-view__validation-errors" role="alert">
          <div className="settings-view__validation-errors-header">
            <strong>Please fix the following errors before saving:</strong>
          </div>
          <ul className="settings-view__validation-errors-list">
            {validationErrors.map((error, index) => (
              <li key={index} className="settings-view__validation-error-item">
                <span className="settings-view__validation-error-field">{error.field}:</span>{' '}
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings display (validation warnings + other warnings) */}
      {(warnings.length > 0 || validationWarnings.length > 0) && (
        <div className="settings-view__warnings" role="status">
          {validationWarnings.map((warning, index) => (
            <div key={`vw-${index}`} className="settings-view__warning">
              <span className="settings-view__warning-icon" aria-hidden="true">⚠️</span>
              <span className="settings-view__warning-field">{warning.field}:</span>{' '}
              {warning.message}
            </div>
          ))}
          {warnings.map((warning, index) => (
            <div key={`w-${index}`} className="settings-view__warning">
              <span className="settings-view__warning-icon" aria-hidden="true">⚠️</span>
              {warning}
            </div>
          ))}
        </div>
      )}

      {/* Success message */}
      {saveSuccess && (
        <div className="settings-view__success" role="status">
          <span className="settings-view__success-icon" aria-hidden="true">✓</span>
          Settings saved successfully!
        </div>
      )}

      <div className="settings-view__sections">
        {/* Output Folder Section */}
        <OutputFolderSettings
          settings={settings}
          defaultFolderPath={defaultFolderPath}
          errors={errors}
          isExpanded={expandedSections.output ?? true}
          onToggle={() => toggleSection('output')}
          onUpdateSettings={updateSettings}
          onSelectFolder={handleSelectFolder}
        />

        {/* Prompt Settings (Resume and Cover Letter) */}
        <PromptSettings
          settings={settings}
          errors={errors}
          isResumeExpanded={expandedSections.resumePrompt ?? false}
          isCoverLetterExpanded={expandedSections.coverLetterPrompt ?? false}
          onToggleResume={() => toggleSection('resumePrompt')}
          onToggleCoverLetter={() => toggleSection('coverLetterPrompt')}
          onUpdateResumePrompt={updateResumePrompt}
          onUpdateCoverLetterPrompt={updateCoverLetterPrompt}
          onResetResumePrompt={resetResumePrompt}
          onResetCoverLetterPrompt={resetCoverLetterPrompt}
        />

        {/* PDF Theme Section */}
        <PDFThemeSettingsComponent
          settings={settings}
          errors={errors}
          isExpanded={expandedSections.pdfTheme ?? false}
          onToggle={() => toggleSection('pdfTheme')}
          onUpdateColors={updatePDFThemeColors}
          onUpdateFonts={updatePDFThemeFonts}
          onUpdateFontSizes={updatePDFThemeFontSizes}
          onUpdateSpacing={updatePDFThemeSpacing}
          onResetTheme={resetPDFTheme}
        />
      </div>

      {/* Action Buttons */}
      <div className="settings-view__actions">
        <button
          type="button"
          className="settings-view__btn settings-view__btn--secondary settings-view__btn--danger"
          onClick={handleReset}
          disabled={isSaving}
        >
          Reset to Defaults
        </button>
        <div className="settings-view__actions-right">
          {isDirty && (
            <button
              type="button"
              className="settings-view__btn settings-view__btn--secondary"
              onClick={handleDiscard}
              disabled={isSaving}
            >
              Discard Changes
            </button>
          )}
          <button
            type="button"
            className="settings-view__btn settings-view__btn--primary"
            onClick={handleSave}
            disabled={!isDirty || isSaving || !isValid}
            title={!isValid ? 'Please fix validation errors before saving' : undefined}
          >
            {isSaving ? 'Saving...' : !isValid ? 'Fix Errors to Save' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Validation status indicator */}
      {isDirty && !isValid && (
        <div className="settings-view__validation-status" role="status">
          <span className="settings-view__validation-status-icon" aria-hidden="true">⚠</span>
          {validationErrors.length} validation error{validationErrors.length !== 1 ? 's' : ''} must be fixed before saving
        </div>
      )}
    </div>
  );
}

export default SettingsView;

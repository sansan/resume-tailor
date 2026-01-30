import React from 'react';
import {
  FILE_NAMING_VARIABLES,
  type AppSettings,
} from '../../../shared/schemas/settings.schema';

/**
 * Props for the OutputFolderSettings component.
 */
export interface OutputFolderSettingsProps {
  /** Current application settings */
  settings: AppSettings;
  /** Default folder path (shown when outputFolderPath is empty) */
  defaultFolderPath: string;
  /** Field validation errors */
  errors: Record<string, string>;
  /** Whether the section is expanded */
  isExpanded: boolean;
  /** Toggle section expansion */
  onToggle: () => void;
  /** Update settings callback */
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  /** Open folder selection dialog */
  onSelectFolder: () => Promise<void>;
}

/**
 * Output Folder Settings Component
 *
 * Provides UI for configuring:
 * - Output folder path (with native folder picker)
 * - Company subfolder creation toggle
 * - File naming pattern with variable substitution
 *
 * This component manages where exported PDFs are saved and how they are named.
 */
function OutputFolderSettings({
  settings,
  defaultFolderPath,
  errors,
  isExpanded,
  onToggle,
  onUpdateSettings,
  onSelectFolder,
}: OutputFolderSettingsProps): React.JSX.Element {
  const displayOutputPath = settings.outputFolderPath || defaultFolderPath;

  return (
    <section className="settings-view__section">
      <button
        className={`settings-view__section-header ${isExpanded ? 'settings-view__section-header--expanded' : ''}`}
        onClick={onToggle}
        type="button"
        aria-expanded={isExpanded}
        aria-controls="output-folder-settings-content"
      >
        <span className="settings-view__section-title">Output Folder & File Naming</span>
        <span className="settings-view__section-toggle" aria-hidden="true">
          {isExpanded ? '−' : '+'}
        </span>
      </button>

      {isExpanded && (
        <div
          id="output-folder-settings-content"
          className="settings-view__section-content"
        >
          {/* Output Folder Path */}
          <div className="settings-view__field">
            <label htmlFor="output-folder" className="settings-view__label">
              Output Folder
            </label>
            <p className="settings-view__help">
              Where exported PDFs will be saved. Select a folder using the Browse button.
            </p>
            <div className="settings-view__folder-input">
              <input
                id="output-folder"
                type="text"
                className="settings-view__text-input settings-view__text-input--path"
                value={displayOutputPath}
                readOnly
                placeholder="Using default folder"
                aria-describedby="output-folder-hint"
              />
              <button
                type="button"
                className="settings-view__btn settings-view__btn--secondary"
                onClick={onSelectFolder}
                aria-label="Browse for output folder"
              >
                Browse...
              </button>
            </div>
            {!settings.outputFolderPath && (
              <p id="output-folder-hint" className="settings-view__hint">
                Using default folder (Documents/cv-rebu-exports)
              </p>
            )}
            {errors.outputFolderPath && (
              <p className="settings-view__field-error" role="alert">
                {errors.outputFolderPath}
              </p>
            )}
          </div>

          {/* Company Subfolders Toggle */}
          <div className="settings-view__field">
            <label className="settings-view__label settings-view__label--checkbox">
              <input
                type="checkbox"
                checked={settings.createCompanySubfolders}
                onChange={(e) => onUpdateSettings({ createCompanySubfolders: e.target.checked })}
                aria-describedby="company-subfolders-help"
              />
              <span>Create company subfolders</span>
            </label>
            <p id="company-subfolders-help" className="settings-view__help">
              When enabled, exports will be organized into folders named after the company.
              For example: <code>cv-rebu-exports/Acme-Corp/resume.pdf</code>
            </p>
          </div>

          {/* File Naming Pattern */}
          <div className="settings-view__field">
            <label htmlFor="file-naming" className="settings-view__label">
              File Naming Pattern
            </label>
            <p className="settings-view__help">
              Pattern for naming exported files. Use the variables below to create dynamic names.
            </p>

            {/* Available Variables */}
            <div className="settings-view__variables" aria-label="Available file naming variables">
              {FILE_NAMING_VARIABLES.map((v) => (
                <span key={v.variable} className="settings-view__variable">
                  <code>{v.variable}</code> - {v.description}
                </span>
              ))}
            </div>

            <input
              id="file-naming"
              type="text"
              className="settings-view__text-input"
              value={settings.fileNamingPattern}
              onChange={(e) => onUpdateSettings({ fileNamingPattern: e.target.value })}
              placeholder="{company}-resume-{date}"
              aria-describedby="file-naming-preview"
            />

            {errors.fileNamingPattern && (
              <p className="settings-view__field-error" role="alert">
                {errors.fileNamingPattern}
              </p>
            )}

            <p id="file-naming-preview" className="settings-view__hint">
              Preview: <code>{previewFileName(settings.fileNamingPattern)}</code>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Helper function to preview file name with sample values.
 *
 * Replaces all available variables with example values to show
 * the user what their file names will look like.
 */
function previewFileName(pattern: string): string {
  const today = new Date().toISOString().split('T')[0] ?? '';
  return pattern
    .replace(/{company}/g, 'Acme-Corp')
    .replace(/{date}/g, today)
    .replace(/{title}/g, 'Software-Engineer')
    .replace(/{name}/g, 'John-Doe');
}

export default OutputFolderSettings;

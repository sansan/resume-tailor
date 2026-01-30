import React, { useMemo } from 'react';
import {
  SUPPORTED_PDF_FONTS,
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type PDFThemeSettings as PDFThemeSettingsType,
} from '../../../shared/schemas/settings.schema';

/**
 * Props for the PDFThemeSettings component.
 */
export interface PDFThemeSettingsProps {
  /** Current application settings */
  settings: AppSettings;
  /** Field validation errors */
  errors: Record<string, string>;
  /** Whether the section is expanded */
  isExpanded: boolean;
  /** Toggle section expansion */
  onToggle: () => void;
  /** Update PDF theme colors */
  onUpdateColors: (updates: Partial<PDFThemeSettingsType['colors']>) => void;
  /** Update PDF theme fonts */
  onUpdateFonts: (updates: Partial<PDFThemeSettingsType['fonts']>) => void;
  /** Update PDF theme font sizes */
  onUpdateFontSizes: (updates: Partial<PDFThemeSettingsType['fontSizes']>) => void;
  /** Update PDF theme spacing */
  onUpdateSpacing: (updates: Partial<PDFThemeSettingsType['spacing']>) => void;
  /** Reset PDF theme to defaults */
  onResetTheme: () => void;
}

/**
 * Color input configuration for the color grid.
 */
interface ColorConfig {
  key: keyof PDFThemeSettingsType['colors'];
  label: string;
  description: string;
}

const COLOR_CONFIGS: ColorConfig[] = [
  { key: 'primary', label: 'Primary', description: 'Section headers and name' },
  { key: 'accent', label: 'Accent', description: 'Links and highlights' },
  { key: 'body', label: 'Body', description: 'Main body text' },
  { key: 'titleText', label: 'Title Text', description: 'Job titles and headings' },
  { key: 'muted', label: 'Muted', description: 'Dates and metadata' },
  { key: 'light', label: 'Light', description: 'Section dividers and borders' },
  { key: 'pageBackground', label: 'Page Background', description: 'Main page background' },
  { key: 'sidebarBackground', label: 'Sidebar Background', description: 'Sidebar area background' },
  { key: 'white', label: 'White', description: 'White accent elements' },
];

/**
 * Font size configuration for the size controls.
 */
interface FontSizeConfig {
  key: keyof PDFThemeSettingsType['fontSizes'];
  label: string;
  min: number;
  max: number;
  description: string;
}

const FONT_SIZE_CONFIGS: FontSizeConfig[] = [
  { key: 'name', label: 'Name', min: 12, max: 36, description: 'Your name at the top' },
  { key: 'sectionTitle', label: 'Section Title', min: 10, max: 24, description: 'Section headers' },
  { key: 'itemTitle', label: 'Item Title', min: 8, max: 18, description: 'Job titles, degrees' },
  { key: 'body', label: 'Body', min: 8, max: 14, description: 'Regular text content' },
  { key: 'small', label: 'Small', min: 6, max: 12, description: 'Dates, metadata' },
];

/**
 * Spacing configuration for the spacing controls.
 */
interface SpacingConfig {
  key: keyof PDFThemeSettingsType['spacing'];
  label: string;
  min: number;
  max: number;
  step: number;
  description: string;
  unit: string;
}

const SPACING_CONFIGS: SpacingConfig[] = [
  { key: 'page', label: 'Page Margin', min: 20, max: 80, step: 5, description: 'Distance from page edges', unit: 'pt' },
  { key: 'sectionGap', label: 'Section Gap', min: 8, max: 40, step: 2, description: 'Space between sections', unit: 'pt' },
  { key: 'itemGap', label: 'Item Gap', min: 4, max: 24, step: 2, description: 'Space between entries', unit: 'pt' },
  { key: 'lineHeight', label: 'Line Height', min: 1, max: 2, step: 0.1, description: 'Text line spacing', unit: 'x' },
];

/**
 * Get display-friendly font name options, grouped by font family.
 */
function getFontOptions(): { value: string; label: string }[] {
  return SUPPORTED_PDF_FONTS.map((font) => ({
    value: font,
    label: font,
  }));
}

/**
 * PDF Theme Settings Component
 *
 * Provides comprehensive UI for customizing PDF appearance:
 * - Color pickers for all theme colors
 * - Font family selectors for primary and heading fonts
 * - Font size sliders for all text elements
 * - Spacing controls for margins and gaps
 * - Live preview thumbnail showing current theme
 *
 * All changes are reflected in the preview immediately.
 */
function PDFThemeSettings({
  settings,
  errors,
  isExpanded,
  onToggle,
  onUpdateColors,
  onUpdateFonts,
  onUpdateFontSizes,
  onUpdateSpacing,
  onResetTheme,
}: PDFThemeSettingsProps): React.JSX.Element {
  const { pdfTheme } = settings;
  const fontOptions = useMemo(() => getFontOptions(), []);

  return (
    <section className="settings-view__section">
      <button
        className={`settings-view__section-header ${isExpanded ? 'settings-view__section-header--expanded' : ''}`}
        onClick={onToggle}
        type="button"
        aria-expanded={isExpanded}
        aria-controls="pdf-theme-settings-content"
      >
        <span className="settings-view__section-title">PDF Theme Customization</span>
        <span className="settings-view__section-toggle" aria-hidden="true">
          {isExpanded ? '−' : '+'}
        </span>
      </button>

      {isExpanded && (
        <div
          id="pdf-theme-settings-content"
          className="settings-view__section-content"
        >
          {/* Introduction */}
          <div className="settings-view__field">
            <p className="settings-view__help">
              Customize how your resume and cover letter PDFs look. Changes will be applied
              to all future PDF exports.
            </p>
          </div>

          {/* Live Preview Thumbnail */}
          <div className="settings-view__field">
            <label className="settings-view__label">Preview</label>
            <PDFPreviewThumbnail theme={pdfTheme} />
          </div>

          {/* Colors Section */}
          <div className="settings-view__subsection">
            <h4 className="settings-view__subsection-title">Colors</h4>
            <p className="settings-view__help">
              Choose colors for different elements of your PDF. Click the color swatch to open the picker,
              or type a hex code directly.
            </p>
            <div className="settings-view__color-grid">
              {COLOR_CONFIGS.map(({ key, label, description }) => (
                <ColorInput
                  key={key}
                  label={label}
                  description={description}
                  value={pdfTheme.colors[key]}
                  onChange={(value) => onUpdateColors({ [key]: value })}
                  error={errors[`pdfTheme.colors.${key}`]}
                />
              ))}
            </div>
          </div>

          {/* Fonts Section */}
          <div className="settings-view__subsection">
            <h4 className="settings-view__subsection-title">Fonts</h4>
            <p className="settings-view__help">
              Select font families for your PDF. Available fonts are those built into PDF viewers
              for maximum compatibility.
            </p>
            <div className="settings-view__field-row">
              <div className="settings-view__field">
                <label htmlFor="pdf-font-primary" className="settings-view__label">
                  Primary Font
                </label>
                <p className="settings-view__help">
                  Used for body text and most content.
                </p>
                <select
                  id="pdf-font-primary"
                  className="settings-view__select"
                  value={pdfTheme.fonts.primary}
                  onChange={(e) => onUpdateFonts({ primary: e.target.value })}
                >
                  {fontOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="settings-view__field">
                <label htmlFor="pdf-font-heading" className="settings-view__label">
                  Heading Font
                </label>
                <p className="settings-view__help">
                  Used for your name, section titles, and job titles.
                </p>
                <select
                  id="pdf-font-heading"
                  className="settings-view__select"
                  value={pdfTheme.fonts.heading}
                  onChange={(e) => onUpdateFonts({ heading: e.target.value })}
                >
                  {fontOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Font Sizes Section */}
          <div className="settings-view__subsection">
            <h4 className="settings-view__subsection-title">Font Sizes</h4>
            <p className="settings-view__help">
              Adjust the size of different text elements. Sizes are in points (pt).
            </p>
            <div className="settings-view__size-grid">
              {FONT_SIZE_CONFIGS.map(({ key, label, min, max, description }) => (
                <div key={key} className="settings-view__field">
                  <label htmlFor={`pdf-fontsize-${key}`} className="settings-view__label">
                    {label}
                  </label>
                  <p className="settings-view__help">{description}</p>
                  <div className="settings-view__range-input">
                    <input
                      id={`pdf-fontsize-${key}`}
                      type="range"
                      min={min}
                      max={max}
                      step={1}
                      value={pdfTheme.fontSizes[key]}
                      onChange={(e) => onUpdateFontSizes({ [key]: parseInt(e.target.value) })}
                      aria-describedby={`pdf-fontsize-${key}-value`}
                    />
                    <span id={`pdf-fontsize-${key}-value`} className="settings-view__range-value">
                      {pdfTheme.fontSizes[key]}pt
                    </span>
                  </div>
                  {errors[`pdfTheme.fontSizes.${key}`] && (
                    <p className="settings-view__field-error" role="alert">
                      {errors[`pdfTheme.fontSizes.${key}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Spacing Section */}
          <div className="settings-view__subsection">
            <h4 className="settings-view__subsection-title">Spacing</h4>
            <p className="settings-view__help">
              Control the whitespace and layout of your PDF for better readability.
            </p>
            <div className="settings-view__size-grid">
              {SPACING_CONFIGS.map(({ key, label, min, max, step, description, unit }) => (
                <div key={key} className="settings-view__field">
                  <label htmlFor={`pdf-spacing-${key}`} className="settings-view__label">
                    {label}
                  </label>
                  <p className="settings-view__help">{description}</p>
                  <div className="settings-view__range-input">
                    <input
                      id={`pdf-spacing-${key}`}
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={pdfTheme.spacing[key]}
                      onChange={(e) => {
                        const value = key === 'lineHeight'
                          ? parseFloat(e.target.value)
                          : parseInt(e.target.value);
                        onUpdateSpacing({ [key]: value });
                      }}
                      aria-describedby={`pdf-spacing-${key}-value`}
                    />
                    <span id={`pdf-spacing-${key}-value`} className="settings-view__range-value">
                      {key === 'lineHeight'
                        ? pdfTheme.spacing[key].toFixed(1)
                        : pdfTheme.spacing[key]
                      }{unit}
                    </span>
                  </div>
                  {errors[`pdfTheme.spacing.${key}`] && (
                    <p className="settings-view__field-error" role="alert">
                      {errors[`pdfTheme.spacing.${key}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          <div className="settings-view__section-actions">
            <button
              type="button"
              className="settings-view__btn settings-view__btn--secondary settings-view__btn--small"
              onClick={onResetTheme}
            >
              Reset Theme to Default
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Color input component with preview and hex code input.
 */
interface ColorInputProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
}

function ColorInput({ label, description, value, onChange, error }: ColorInputProps): React.JSX.Element {
  const inputId = `color-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="settings-view__color-input">
      <label htmlFor={inputId} className="settings-view__label">
        {label}
      </label>
      <p className="settings-view__help">{description}</p>
      <div className="settings-view__color-input-row">
        <input
          id={inputId}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="settings-view__color-picker"
          aria-label={`${label} color picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            // Allow partial input while typing
            if (val === '' || val === '#' || /^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              // Only trigger onChange for valid complete hex colors
              if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                onChange(val);
              }
            }
          }}
          onBlur={(e) => {
            // On blur, validate and potentially reset to valid value
            const val = e.target.value;
            if (!/^#[0-9A-Fa-f]{6}$/.test(val)) {
              // Reset to current valid value if invalid
              e.target.value = value;
            }
          }}
          className="settings-view__text-input settings-view__text-input--short"
          placeholder="#000000"
          aria-label={`${label} hex color code`}
          maxLength={7}
        />
      </div>
      {error && (
        <p className="settings-view__field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Live preview thumbnail showing how the PDF will look with current theme settings.
 */
interface PDFPreviewThumbnailProps {
  theme: PDFThemeSettingsType;
}

function PDFPreviewThumbnail({ theme }: PDFPreviewThumbnailProps): React.JSX.Element {
  // Calculate relative sizes for the preview (scaled down from actual pt sizes)
  const scale = 0.4;
  const previewStyles = {
    container: {
      width: '100%',
      maxWidth: '300px',
      aspectRatio: '8.5 / 11', // Standard letter paper
      backgroundColor: theme.colors.pageBackground,
      border: `1px solid ${theme.colors.light}`,
      borderRadius: '4px',
      padding: `${theme.spacing.page * scale}px`,
      fontFamily: 'system-ui, sans-serif',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
    } as React.CSSProperties,
    header: {
      borderBottom: `2px solid ${theme.colors.primary}`,
      paddingBottom: `${8 * scale}px`,
      marginBottom: `${theme.spacing.sectionGap * scale}px`,
    } as React.CSSProperties,
    name: {
      fontSize: `${theme.fontSizes.name * scale}px`,
      fontWeight: 700,
      color: theme.colors.primary,
      marginBottom: `${4 * scale}px`,
      lineHeight: theme.spacing.lineHeight,
    } as React.CSSProperties,
    contact: {
      fontSize: `${theme.fontSizes.small * scale}px`,
      color: theme.colors.muted,
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: `${theme.fontSizes.sectionTitle * scale}px`,
      fontWeight: 700,
      color: theme.colors.primary,
      borderBottom: `1px solid ${theme.colors.light}`,
      paddingBottom: `${2 * scale}px`,
      marginBottom: `${4 * scale}px`,
    } as React.CSSProperties,
    section: {
      marginBottom: `${theme.spacing.sectionGap * scale}px`,
    } as React.CSSProperties,
    itemTitle: {
      fontSize: `${theme.fontSizes.itemTitle * scale}px`,
      fontWeight: 700,
      color: theme.colors.body,
    } as React.CSSProperties,
    body: {
      fontSize: `${theme.fontSizes.body * scale}px`,
      color: theme.colors.body,
      lineHeight: theme.spacing.lineHeight,
    } as React.CSSProperties,
    meta: {
      fontSize: `${theme.fontSizes.small * scale}px`,
      color: theme.colors.muted,
    } as React.CSSProperties,
    link: {
      color: theme.colors.accent,
      fontSize: `${theme.fontSizes.small * scale}px`,
    } as React.CSSProperties,
    bullet: {
      display: 'flex',
      gap: '4px',
      marginTop: `${2 * scale}px`,
    } as React.CSSProperties,
    item: {
      marginBottom: `${theme.spacing.itemGap * scale}px`,
    } as React.CSSProperties,
  };

  return (
    <div className="settings-view__pdf-preview">
      <div style={previewStyles.container}>
        {/* Header */}
        <div style={previewStyles.header}>
          <div style={previewStyles.name}>John Doe</div>
          <div style={previewStyles.contact}>
            <span style={previewStyles.link}>john@email.com</span>
            {' · '}San Francisco, CA
          </div>
        </div>

        {/* Summary Section */}
        <div style={previewStyles.section}>
          <div style={previewStyles.sectionTitle}>Summary</div>
          <div style={previewStyles.body}>
            Experienced software engineer with a passion for building great products...
          </div>
        </div>

        {/* Experience Section */}
        <div style={previewStyles.section}>
          <div style={previewStyles.sectionTitle}>Experience</div>
          <div style={previewStyles.item}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={previewStyles.itemTitle}>Senior Engineer</div>
              <div style={previewStyles.meta}>2020 - Present</div>
            </div>
            <div style={previewStyles.meta}>Tech Company Inc.</div>
            <div style={previewStyles.bullet}>
              <span>•</span>
              <span style={previewStyles.body}>Led team of 5 engineers...</span>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div style={previewStyles.section}>
          <div style={previewStyles.sectionTitle}>Skills</div>
          <div style={previewStyles.body}>
            JavaScript, TypeScript, React, Node.js
          </div>
        </div>
      </div>
      <p className="settings-view__hint" style={{ marginTop: '0.5rem' }}>
        Preview shows approximate appearance. Actual PDF may vary slightly.
      </p>
    </div>
  );
}

/**
 * Get the default PDF theme settings.
 */
export function getDefaultPDFThemeSettings(): PDFThemeSettingsType {
  return DEFAULT_APP_SETTINGS.pdfTheme;
}

export default PDFThemeSettings;

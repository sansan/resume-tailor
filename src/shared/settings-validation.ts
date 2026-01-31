/**
 * Settings Validation Utilities
 *
 * Provides comprehensive validation for application settings including:
 * - Output folder path validation (existence, writability)
 * - File naming pattern validation (required variables)
 * - PDF theme value validation (range checking)
 * - Prompt template validation
 *
 * These utilities are used by both the main process (settings service)
 * and renderer process (settings UI) for consistent validation.
 */

import {
  SUPPORTED_PDF_FONTS,
  FILE_NAMING_VARIABLES,
  type AppSettings,
  type PartialAppSettings,
  type PDFThemeSettings,
  type ResumePromptTemplateSettings,
  type CoverLetterPromptTemplateSettings,
} from '../schemas/settings.schema';

/**
 * Validation error with field path and user-friendly message.
 */
export interface ValidationError {
  /** Dot-notation path to the field (e.g., 'pdfTheme.colors.primary') */
  field: string;
  /** User-friendly error message */
  message: string;
  /** Error code for programmatic handling */
  code: SettingsValidationErrorCode;
}

/**
 * Validation warning with field path and user-friendly message.
 */
export interface ValidationWarning {
  /** Dot-notation path to the field */
  field: string;
  /** User-friendly warning message */
  message: string;
}

/**
 * Result of settings validation.
 */
export interface SettingsValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Error codes for settings validation.
 */
export enum SettingsValidationErrorCode {
  // Output folder errors
  FOLDER_NOT_EXISTS = 'FOLDER_NOT_EXISTS',
  FOLDER_NOT_WRITABLE = 'FOLDER_NOT_WRITABLE',
  FOLDER_IS_FILE = 'FOLDER_IS_FILE',
  FOLDER_INVALID_PATH = 'FOLDER_INVALID_PATH',

  // File naming pattern errors
  PATTERN_EMPTY = 'PATTERN_EMPTY',
  PATTERN_TOO_LONG = 'PATTERN_TOO_LONG',
  PATTERN_INVALID_CHARS = 'PATTERN_INVALID_CHARS',
  PATTERN_NO_VARIABLES = 'PATTERN_NO_VARIABLES',
  PATTERN_UNKNOWN_VARIABLE = 'PATTERN_UNKNOWN_VARIABLE',

  // PDF theme errors
  COLOR_INVALID_FORMAT = 'COLOR_INVALID_FORMAT',
  FONT_NOT_SUPPORTED = 'FONT_NOT_SUPPORTED',
  FONT_SIZE_OUT_OF_RANGE = 'FONT_SIZE_OUT_OF_RANGE',
  SPACING_OUT_OF_RANGE = 'SPACING_OUT_OF_RANGE',

  // Prompt template errors
  PROMPT_VALUE_OUT_OF_RANGE = 'PROMPT_VALUE_OUT_OF_RANGE',
  PROMPT_INSTRUCTIONS_TOO_LONG = 'PROMPT_INSTRUCTIONS_TOO_LONG',
  PROMPT_NO_FOCUS_AREAS = 'PROMPT_NO_FOCUS_AREAS',

  // General errors
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_TYPE = 'INVALID_TYPE',
}

/**
 * Hex color validation regex.
 */
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Invalid filename characters (cross-platform).
 */
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

/**
 * Available file naming variables (as strings for comparison).
 */
const VALID_VARIABLES: string[] = FILE_NAMING_VARIABLES.map((v) => v.variable);

// ============================================
// Color Validation
// ============================================

/**
 * Validates a hex color string.
 */
export function validateHexColor(color: unknown, fieldPath: string): ValidationError | null {
  if (typeof color !== 'string') {
    return {
      field: fieldPath,
      message: 'Color must be a string',
      code: SettingsValidationErrorCode.INVALID_TYPE,
    };
  }

  if (!HEX_COLOR_REGEX.test(color)) {
    return {
      field: fieldPath,
      message: `Invalid color format: "${color}". Use hex format like #RRGGBB (e.g., #1a1a2e)`,
      code: SettingsValidationErrorCode.COLOR_INVALID_FORMAT,
    };
  }

  return null;
}

/**
 * Validates all PDF theme colors.
 */
export function validatePDFThemeColors(
  colors: PDFThemeSettings['colors'],
  basePath: string = 'pdfTheme.colors'
): ValidationError[] {
  const errors: ValidationError[] = [];
  const colorFields: Array<keyof PDFThemeSettings['colors']> = [
    'pageBackground',
    'sidebarBackground',
    'primary',
    'body',
    'titleText',
    'muted',
    'light',
    'accent',
    'white',
  ];

  for (const field of colorFields) {
    const error = validateHexColor(colors[field], `${basePath}.${field}`);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

// ============================================
// Font Validation
// ============================================

/**
 * Validates a font family name against supported fonts.
 */
export function validateFont(font: unknown, fieldPath: string): ValidationError | null {
  if (typeof font !== 'string') {
    return {
      field: fieldPath,
      message: 'Font must be a string',
      code: SettingsValidationErrorCode.INVALID_TYPE,
    };
  }

  if (!SUPPORTED_PDF_FONTS.includes(font as typeof SUPPORTED_PDF_FONTS[number])) {
    return {
      field: fieldPath,
      message: `Font "${font}" is not supported. Supported fonts: ${SUPPORTED_PDF_FONTS.join(', ')}`,
      code: SettingsValidationErrorCode.FONT_NOT_SUPPORTED,
    };
  }

  return null;
}

/**
 * Validates PDF theme fonts.
 */
export function validatePDFThemeFonts(
  fonts: PDFThemeSettings['fonts'],
  basePath: string = 'pdfTheme.fonts'
): ValidationError[] {
  const errors: ValidationError[] = [];

  const primaryError = validateFont(fonts.primary, `${basePath}.primary`);
  if (primaryError) errors.push(primaryError);

  const headingError = validateFont(fonts.heading, `${basePath}.heading`);
  if (headingError) errors.push(headingError);

  return errors;
}

// ============================================
// Font Size Validation
// ============================================

/**
 * Font size constraints.
 */
export const FONT_SIZE_CONSTRAINTS = {
  name: { min: 12, max: 36 },
  sectionTitle: { min: 10, max: 24 },
  itemTitle: { min: 8, max: 18 },
  body: { min: 8, max: 14 },
  small: { min: 6, max: 12 },
  tiny: { min: 5, max: 10 },
} as const;

/**
 * Validates a font size value within constraints.
 */
export function validateFontSize(
  value: unknown,
  fieldPath: string,
  min: number,
  max: number
): ValidationError | null {
  if (typeof value !== 'number') {
    return {
      field: fieldPath,
      message: 'Font size must be a number',
      code: SettingsValidationErrorCode.INVALID_TYPE,
    };
  }

  if (value < min || value > max) {
    return {
      field: fieldPath,
      message: `Font size must be between ${min}pt and ${max}pt (current: ${value}pt)`,
      code: SettingsValidationErrorCode.FONT_SIZE_OUT_OF_RANGE,
    };
  }

  return null;
}

/**
 * Validates all PDF theme font sizes.
 */
export function validatePDFThemeFontSizes(
  fontSizes: PDFThemeSettings['fontSizes'],
  basePath: string = 'pdfTheme.fontSizes'
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [field, constraints] of Object.entries(FONT_SIZE_CONSTRAINTS)) {
    const value = fontSizes[field as keyof typeof fontSizes];
    const error = validateFontSize(value, `${basePath}.${field}`, constraints.min, constraints.max);
    if (error) errors.push(error);
  }

  return errors;
}

// ============================================
// Spacing Validation
// ============================================

/**
 * Spacing constraints.
 */
export const SPACING_CONSTRAINTS = {
  page: { min: 20, max: 80 },
  sectionGap: { min: 8, max: 40 },
  itemGap: { min: 4, max: 24 },
  lineHeight: { min: 1, max: 2 },
} as const;

/**
 * Validates a spacing value within constraints.
 */
export function validateSpacing(
  value: unknown,
  fieldPath: string,
  min: number,
  max: number,
  unit: string = 'pt'
): ValidationError | null {
  if (typeof value !== 'number') {
    return {
      field: fieldPath,
      message: 'Spacing value must be a number',
      code: SettingsValidationErrorCode.INVALID_TYPE,
    };
  }

  if (value < min || value > max) {
    return {
      field: fieldPath,
      message: `Spacing must be between ${min}${unit} and ${max}${unit} (current: ${value}${unit})`,
      code: SettingsValidationErrorCode.SPACING_OUT_OF_RANGE,
    };
  }

  return null;
}

/**
 * Validates all PDF theme spacing values.
 */
export function validatePDFThemeSpacing(
  spacing: PDFThemeSettings['spacing'],
  basePath: string = 'pdfTheme.spacing'
): ValidationError[] {
  const errors: ValidationError[] = [];

  const pageError = validateSpacing(
    spacing.page,
    `${basePath}.page`,
    SPACING_CONSTRAINTS.page.min,
    SPACING_CONSTRAINTS.page.max
  );
  if (pageError) errors.push(pageError);

  const sectionGapError = validateSpacing(
    spacing.sectionGap,
    `${basePath}.sectionGap`,
    SPACING_CONSTRAINTS.sectionGap.min,
    SPACING_CONSTRAINTS.sectionGap.max
  );
  if (sectionGapError) errors.push(sectionGapError);

  const itemGapError = validateSpacing(
    spacing.itemGap,
    `${basePath}.itemGap`,
    SPACING_CONSTRAINTS.itemGap.min,
    SPACING_CONSTRAINTS.itemGap.max
  );
  if (itemGapError) errors.push(itemGapError);

  const lineHeightError = validateSpacing(
    spacing.lineHeight,
    `${basePath}.lineHeight`,
    SPACING_CONSTRAINTS.lineHeight.min,
    SPACING_CONSTRAINTS.lineHeight.max,
    'x'
  );
  if (lineHeightError) errors.push(lineHeightError);

  return errors;
}

// ============================================
// File Naming Pattern Validation
// ============================================

/**
 * Validates a file naming pattern.
 */
export function validateFileNamingPattern(pattern: unknown): {
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const fieldPath = 'fileNamingPattern';

  if (typeof pattern !== 'string') {
    errors.push({
      field: fieldPath,
      message: 'File naming pattern must be a string',
      code: SettingsValidationErrorCode.INVALID_TYPE,
    });
    return { errors, warnings };
  }

  // Check for empty pattern
  if (pattern.trim().length === 0) {
    errors.push({
      field: fieldPath,
      message: 'File naming pattern cannot be empty',
      code: SettingsValidationErrorCode.PATTERN_EMPTY,
    });
    return { errors, warnings };
  }

  // Check for max length
  if (pattern.length > 200) {
    errors.push({
      field: fieldPath,
      message: `File naming pattern is too long (${pattern.length} characters). Maximum is 200 characters.`,
      code: SettingsValidationErrorCode.PATTERN_TOO_LONG,
    });
  }

  // Check for invalid filename characters (excluding variable braces)
  const patternWithoutVars = pattern.replace(/\{[^}]+\}/g, '');
  const invalidChars = patternWithoutVars.match(INVALID_FILENAME_CHARS);
  if (invalidChars) {
    const uniqueChars = [...new Set(invalidChars)].join(', ');
    errors.push({
      field: fieldPath,
      message: `File naming pattern contains invalid characters: ${uniqueChars}`,
      code: SettingsValidationErrorCode.PATTERN_INVALID_CHARS,
    });
  }

  // Extract variables from pattern
  const variableMatches = pattern.match(/\{[^}]+\}/g) || [];

  // Check if pattern has no variables (warning)
  if (variableMatches.length === 0) {
    warnings.push({
      field: fieldPath,
      message: 'File naming pattern has no variables. All files will have the same name. Consider adding variables like {company} or {date}.',
    });
  }

  // Check for unknown variables
  const unknownVariables = variableMatches.filter((v) => !VALID_VARIABLES.includes(v));
  if (unknownVariables.length > 0) {
    errors.push({
      field: fieldPath,
      message: `Unknown variable(s) in pattern: ${unknownVariables.join(', ')}. Valid variables are: ${VALID_VARIABLES.join(', ')}`,
      code: SettingsValidationErrorCode.PATTERN_UNKNOWN_VARIABLE,
    });
  }

  return { errors, warnings };
}

// ============================================
// Prompt Template Validation
// ============================================

/**
 * Validates resume prompt template settings.
 */
export function validateResumePromptTemplate(
  template: ResumePromptTemplateSettings,
  basePath: string = 'resumePromptTemplate'
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate maxSummaryLength
  if (template.maxSummaryLength < 100 || template.maxSummaryLength > 1000) {
    errors.push({
      field: `${basePath}.maxSummaryLength`,
      message: `Summary length must be between 100 and 1000 characters (current: ${template.maxSummaryLength})`,
      code: SettingsValidationErrorCode.PROMPT_VALUE_OUT_OF_RANGE,
    });
  }

  // Validate maxHighlightsPerExperience
  if (template.maxHighlightsPerExperience < 1 || template.maxHighlightsPerExperience > 10) {
    errors.push({
      field: `${basePath}.maxHighlightsPerExperience`,
      message: `Highlights per experience must be between 1 and 10 (current: ${template.maxHighlightsPerExperience})`,
      code: SettingsValidationErrorCode.PROMPT_VALUE_OUT_OF_RANGE,
    });
  }

  // Validate customInstructions length
  if (template.customInstructions.length > 2000) {
    errors.push({
      field: `${basePath}.customInstructions`,
      message: `Custom instructions exceed maximum length of 2000 characters (current: ${template.customInstructions.length})`,
      code: SettingsValidationErrorCode.PROMPT_INSTRUCTIONS_TOO_LONG,
    });
  }

  // Validate focusAreas
  if (template.focusAreas.length === 0) {
    warnings.push({
      field: `${basePath}.focusAreas`,
      message: 'No focus areas selected. The AI will use balanced defaults.',
    });
  }

  return { errors, warnings };
}

/**
 * Validates cover letter prompt template settings.
 */
export function validateCoverLetterPromptTemplate(
  template: CoverLetterPromptTemplateSettings,
  basePath: string = 'coverLetterPromptTemplate'
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate maxOpeningLength
  if (template.maxOpeningLength < 100 || template.maxOpeningLength > 500) {
    errors.push({
      field: `${basePath}.maxOpeningLength`,
      message: `Opening length must be between 100 and 500 characters (current: ${template.maxOpeningLength})`,
      code: SettingsValidationErrorCode.PROMPT_VALUE_OUT_OF_RANGE,
    });
  }

  // Validate maxBodyParagraphs
  if (template.maxBodyParagraphs < 1 || template.maxBodyParagraphs > 5) {
    errors.push({
      field: `${basePath}.maxBodyParagraphs`,
      message: `Body paragraphs must be between 1 and 5 (current: ${template.maxBodyParagraphs})`,
      code: SettingsValidationErrorCode.PROMPT_VALUE_OUT_OF_RANGE,
    });
  }

  // Validate customInstructions length
  if (template.customInstructions.length > 2000) {
    errors.push({
      field: `${basePath}.customInstructions`,
      message: `Custom instructions exceed maximum length of 2000 characters (current: ${template.customInstructions.length})`,
      code: SettingsValidationErrorCode.PROMPT_INSTRUCTIONS_TOO_LONG,
    });
  }

  // Validate focusAreas
  if (template.focusAreas.length === 0) {
    warnings.push({
      field: `${basePath}.focusAreas`,
      message: 'No focus areas selected. The AI will use balanced defaults.',
    });
  }

  return { errors, warnings };
}

// ============================================
// PDF Theme Validation
// ============================================

/**
 * Validates the complete PDF theme settings.
 */
export function validatePDFTheme(
  theme: PDFThemeSettings,
  basePath: string = 'pdfTheme'
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate colors
  errors.push(...validatePDFThemeColors(theme.colors, `${basePath}.colors`));

  // Validate fonts
  errors.push(...validatePDFThemeFonts(theme.fonts, `${basePath}.fonts`));

  // Validate font sizes
  errors.push(...validatePDFThemeFontSizes(theme.fontSizes, `${basePath}.fontSizes`));

  // Validate spacing
  errors.push(...validatePDFThemeSpacing(theme.spacing, `${basePath}.spacing`));

  // Add warnings for potentially problematic combinations
  if (theme.fontSizes.body > theme.fontSizes.sectionTitle) {
    warnings.push({
      field: `${basePath}.fontSizes`,
      message: 'Body font size is larger than section title font size. This may look unusual.',
    });
  }

  if (theme.fontSizes.small > theme.fontSizes.body) {
    warnings.push({
      field: `${basePath}.fontSizes`,
      message: 'Small font size is larger than body font size. This may look unusual.',
    });
  }

  // Check color contrast (simplified check)
  const bgColor = theme.colors.pageBackground.toLowerCase();
  const textColor = theme.colors.body.toLowerCase();
  if (bgColor === textColor) {
    errors.push({
      field: `${basePath}.colors`,
      message: 'Background color and text color are the same. Text will not be visible.',
      code: SettingsValidationErrorCode.COLOR_INVALID_FORMAT,
    });
  }

  return { errors, warnings };
}

// ============================================
// Complete Settings Validation
// ============================================

/**
 * Validates complete application settings (excluding filesystem checks).
 *
 * This function validates settings data without checking filesystem
 * (folder existence/writability). For filesystem validation, use
 * the settings service methods in the main process.
 */
export function validateSettings(settings: AppSettings | PartialAppSettings): SettingsValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate file naming pattern if present
  if ('fileNamingPattern' in settings && settings.fileNamingPattern !== undefined) {
    const patternResult = validateFileNamingPattern(settings.fileNamingPattern);
    errors.push(...patternResult.errors);
    warnings.push(...patternResult.warnings);
  }

  // Validate resume prompt template if present
  if ('resumePromptTemplate' in settings && settings.resumePromptTemplate !== undefined) {
    const resumeResult = validateResumePromptTemplate(settings.resumePromptTemplate);
    errors.push(...resumeResult.errors);
    warnings.push(...resumeResult.warnings);
  }

  // Validate cover letter prompt template if present
  if ('coverLetterPromptTemplate' in settings && settings.coverLetterPromptTemplate !== undefined) {
    const coverLetterResult = validateCoverLetterPromptTemplate(settings.coverLetterPromptTemplate);
    errors.push(...coverLetterResult.errors);
    warnings.push(...coverLetterResult.warnings);
  }

  // Validate PDF theme if present
  if ('pdfTheme' in settings && settings.pdfTheme !== undefined) {
    const themeResult = validatePDFTheme(settings.pdfTheme);
    errors.push(...themeResult.errors);
    warnings.push(...themeResult.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Converts validation errors to a field-keyed error map.
 *
 * This is useful for displaying errors next to specific form fields.
 */
export function errorsToFieldMap(errors: ValidationError[]): Record<string, string> {
  const fieldMap: Record<string, string> = {};

  for (const error of errors) {
    // Use the field path as the key, but also add a simple key for nested fields
    fieldMap[error.field] = error.message;

    // Also add a simplified key for UI components that use simple field names
    const simpleKey = error.field.split('.').pop() || error.field;
    if (!(simpleKey in fieldMap)) {
      fieldMap[simpleKey] = error.message;
    }
  }

  return fieldMap;
}

/**
 * Gets user-friendly error messages for specific validation error codes.
 */
export function getErrorMessage(code: SettingsValidationErrorCode): string {
  const messages: Record<SettingsValidationErrorCode, string> = {
    [SettingsValidationErrorCode.FOLDER_NOT_EXISTS]: 'The selected folder does not exist',
    [SettingsValidationErrorCode.FOLDER_NOT_WRITABLE]: 'The selected folder is not writable. Please choose a different folder.',
    [SettingsValidationErrorCode.FOLDER_IS_FILE]: 'The selected path is a file, not a folder',
    [SettingsValidationErrorCode.FOLDER_INVALID_PATH]: 'The folder path is invalid',
    [SettingsValidationErrorCode.PATTERN_EMPTY]: 'File naming pattern cannot be empty',
    [SettingsValidationErrorCode.PATTERN_TOO_LONG]: 'File naming pattern is too long (max 200 characters)',
    [SettingsValidationErrorCode.PATTERN_INVALID_CHARS]: 'File naming pattern contains invalid characters',
    [SettingsValidationErrorCode.PATTERN_NO_VARIABLES]: 'Consider adding variables like {company} or {date} for unique file names',
    [SettingsValidationErrorCode.PATTERN_UNKNOWN_VARIABLE]: 'Unknown variable in file naming pattern',
    [SettingsValidationErrorCode.COLOR_INVALID_FORMAT]: 'Invalid color format. Use hex format like #RRGGBB',
    [SettingsValidationErrorCode.FONT_NOT_SUPPORTED]: 'Font is not supported for PDF generation',
    [SettingsValidationErrorCode.FONT_SIZE_OUT_OF_RANGE]: 'Font size is outside the allowed range',
    [SettingsValidationErrorCode.SPACING_OUT_OF_RANGE]: 'Spacing value is outside the allowed range',
    [SettingsValidationErrorCode.PROMPT_VALUE_OUT_OF_RANGE]: 'Value is outside the allowed range',
    [SettingsValidationErrorCode.PROMPT_INSTRUCTIONS_TOO_LONG]: 'Custom instructions are too long (max 2000 characters)',
    [SettingsValidationErrorCode.PROMPT_NO_FOCUS_AREAS]: 'No focus areas selected',
    [SettingsValidationErrorCode.REQUIRED_FIELD_MISSING]: 'This field is required',
    [SettingsValidationErrorCode.INVALID_TYPE]: 'Invalid value type',
  };

  return messages[code] || 'Validation error';
}

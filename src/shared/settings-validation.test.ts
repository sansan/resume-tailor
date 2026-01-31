/**
 * Manual Testing File for Settings Validation Utilities
 *
 * Run this file to verify settings validation functions work correctly.
 * Execute with: npx tsx src/utils/settings-validation.test.ts
 */

import {
  validateHexColor,
  validateFont,
  validateFontSize,
  validateSpacing,
  validateFileNamingPattern,
  validateResumePromptTemplate,
  validateCoverLetterPromptTemplate,
  validatePDFTheme,
  validateSettings,
  errorsToFieldMap,
  SettingsValidationErrorCode,
} from './settings-validation';
import {
  DEFAULT_APP_SETTINGS,
  type PartialAppSettings,
  type ResumePromptTemplateSettings,
  type CoverLetterPromptTemplateSettings,
} from '../schemas/settings.schema';

// Test utilities
let passedTests = 0;
let failedTests = 0;

function assertEqual(actual: unknown, expected: unknown, testName: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);

  if (actualStr === expectedStr) {
    console.log(`✓ ${testName}`);
    passedTests++;
  } else {
    console.log(`✗ ${testName}`);
    console.log(`  Expected: ${expectedStr}`);
    console.log(`  Actual:   ${actualStr}`);
    failedTests++;
  }
}

function assertNull(actual: unknown, testName: string): void {
  if (actual === null) {
    console.log(`✓ ${testName}`);
    passedTests++;
  } else {
    console.log(`✗ ${testName}`);
    console.log(`  Expected: null`);
    console.log(`  Actual: ${JSON.stringify(actual)}`);
    failedTests++;
  }
}

// Unused but kept for future tests
// function assertNotNull(actual: unknown, testName: string): void {
//   if (actual !== null) {
//     console.log(`✓ ${testName}`);
//     passedTests++;
//   } else {
//     console.log(`✗ ${testName}`);
//     console.log(`  Expected: not null`);
//     console.log(`  Actual: null`);
//     failedTests++;
//   }
// }

function assertTrue(actual: boolean, testName: string): void {
  if (actual === true) {
    console.log(`✓ ${testName}`);
    passedTests++;
  } else {
    console.log(`✗ ${testName}`);
    console.log(`  Expected: true`);
    console.log(`  Actual: ${actual}`);
    failedTests++;
  }
}

function assertFalse(actual: boolean, testName: string): void {
  if (actual === false) {
    console.log(`✓ ${testName}`);
    passedTests++;
  } else {
    console.log(`✗ ${testName}`);
    console.log(`  Expected: false`);
    console.log(`  Actual: ${actual}`);
    failedTests++;
  }
}

function assertErrorCode(actual: { code: SettingsValidationErrorCode } | null, expectedCode: SettingsValidationErrorCode, testName: string): void {
  if (actual && actual.code === expectedCode) {
    console.log(`✓ ${testName}`);
    passedTests++;
  } else {
    console.log(`✗ ${testName}`);
    console.log(`  Expected code: ${expectedCode}`);
    console.log(`  Actual: ${actual ? actual.code : 'null'}`);
    failedTests++;
  }
}

function testGroup(name: string, tests: () => void): void {
  console.log(`\n=== ${name} ===\n`);
  tests();
}

// ============================================
// Hex Color Validation Tests
// ============================================

testGroup('Hex Color Validation', () => {
  // Valid hex colors
  assertNull(
    validateHexColor('#000000', 'color'),
    'Accepts valid hex color #000000'
  );

  assertNull(
    validateHexColor('#ffffff', 'color'),
    'Accepts valid hex color #ffffff (lowercase)'
  );

  assertNull(
    validateHexColor('#FFFFFF', 'color'),
    'Accepts valid hex color #FFFFFF (uppercase)'
  );

  assertNull(
    validateHexColor('#1a2b3c', 'color'),
    'Accepts valid hex color #1a2b3c (mixed)'
  );

  // Invalid hex colors
  assertErrorCode(
    validateHexColor('#fff', 'color'),
    SettingsValidationErrorCode.COLOR_INVALID_FORMAT,
    'Rejects 3-digit hex color'
  );

  assertErrorCode(
    validateHexColor('000000', 'color'),
    SettingsValidationErrorCode.COLOR_INVALID_FORMAT,
    'Rejects hex color without #'
  );

  assertErrorCode(
    validateHexColor('#gggggg', 'color'),
    SettingsValidationErrorCode.COLOR_INVALID_FORMAT,
    'Rejects invalid hex characters'
  );

  assertErrorCode(
    validateHexColor('#12345', 'color'),
    SettingsValidationErrorCode.COLOR_INVALID_FORMAT,
    'Rejects 5-digit hex color'
  );

  assertErrorCode(
    validateHexColor(123, 'color'),
    SettingsValidationErrorCode.INVALID_TYPE,
    'Rejects non-string value'
  );
});

// ============================================
// Font Validation Tests
// ============================================

testGroup('Font Validation', () => {
  // Valid fonts
  assertNull(
    validateFont('Helvetica', 'font'),
    'Accepts Helvetica font'
  );

  assertNull(
    validateFont('Times-Roman', 'font'),
    'Accepts Times-Roman font'
  );

  assertNull(
    validateFont('Courier-Bold', 'font'),
    'Accepts Courier-Bold font'
  );

  // Invalid fonts
  assertErrorCode(
    validateFont('Arial', 'font'),
    SettingsValidationErrorCode.FONT_NOT_SUPPORTED,
    'Rejects unsupported Arial font'
  );

  assertErrorCode(
    validateFont('Comic Sans', 'font'),
    SettingsValidationErrorCode.FONT_NOT_SUPPORTED,
    'Rejects unsupported Comic Sans font'
  );

  assertErrorCode(
    validateFont(123, 'font'),
    SettingsValidationErrorCode.INVALID_TYPE,
    'Rejects non-string value'
  );
});

// ============================================
// Font Size Validation Tests
// ============================================

testGroup('Font Size Validation', () => {
  // Valid font sizes
  assertNull(
    validateFontSize(24, 'fontSize', 12, 36),
    'Accepts font size within range'
  );

  assertNull(
    validateFontSize(12, 'fontSize', 12, 36),
    'Accepts font size at minimum'
  );

  assertNull(
    validateFontSize(36, 'fontSize', 12, 36),
    'Accepts font size at maximum'
  );

  // Invalid font sizes
  assertErrorCode(
    validateFontSize(11, 'fontSize', 12, 36),
    SettingsValidationErrorCode.FONT_SIZE_OUT_OF_RANGE,
    'Rejects font size below minimum'
  );

  assertErrorCode(
    validateFontSize(37, 'fontSize', 12, 36),
    SettingsValidationErrorCode.FONT_SIZE_OUT_OF_RANGE,
    'Rejects font size above maximum'
  );

  assertErrorCode(
    validateFontSize('24', 'fontSize', 12, 36),
    SettingsValidationErrorCode.INVALID_TYPE,
    'Rejects non-number value'
  );
});

// ============================================
// Spacing Validation Tests
// ============================================

testGroup('Spacing Validation', () => {
  // Valid spacing
  assertNull(
    validateSpacing(40, 'spacing', 20, 80),
    'Accepts spacing within range'
  );

  assertNull(
    validateSpacing(20, 'spacing', 20, 80),
    'Accepts spacing at minimum'
  );

  assertNull(
    validateSpacing(80, 'spacing', 20, 80),
    'Accepts spacing at maximum'
  );

  // Invalid spacing
  assertErrorCode(
    validateSpacing(19, 'spacing', 20, 80),
    SettingsValidationErrorCode.SPACING_OUT_OF_RANGE,
    'Rejects spacing below minimum'
  );

  assertErrorCode(
    validateSpacing(81, 'spacing', 20, 80),
    SettingsValidationErrorCode.SPACING_OUT_OF_RANGE,
    'Rejects spacing above maximum'
  );
});

// ============================================
// File Naming Pattern Validation Tests
// ============================================

testGroup('File Naming Pattern Validation', () => {
  // Valid patterns
  let result = validateFileNamingPattern('{company}-resume-{date}');
  assertEqual(result.errors.length, 0, 'Accepts valid pattern with multiple variables');

  result = validateFileNamingPattern('{company}_{title}_{name}');
  assertEqual(result.errors.length, 0, 'Accepts pattern with all variables');

  // Pattern with no variables (warning only)
  result = validateFileNamingPattern('my-resume');
  assertEqual(result.errors.length, 0, 'Pattern without variables has no errors');
  assertTrue(result.warnings.length > 0, 'Pattern without variables has warnings');

  // Invalid patterns
  result = validateFileNamingPattern('');
  assertTrue(
    result.errors.some(e => e.code === SettingsValidationErrorCode.PATTERN_EMPTY),
    'Rejects empty pattern'
  );

  result = validateFileNamingPattern('{unknown}-resume');
  assertTrue(
    result.errors.some(e => e.code === SettingsValidationErrorCode.PATTERN_UNKNOWN_VARIABLE),
    'Rejects pattern with unknown variable'
  );

  result = validateFileNamingPattern('resume<name>');
  assertTrue(
    result.errors.some(e => e.code === SettingsValidationErrorCode.PATTERN_INVALID_CHARS),
    'Rejects pattern with invalid filename characters'
  );

  // Very long pattern
  const longPattern = 'a'.repeat(201);
  result = validateFileNamingPattern(longPattern);
  assertTrue(
    result.errors.some(e => e.code === SettingsValidationErrorCode.PATTERN_TOO_LONG),
    'Rejects pattern exceeding max length'
  );
});

// ============================================
// Resume Prompt Template Validation Tests
// ============================================

testGroup('Resume Prompt Template Validation', () => {
  // Valid template (using proper mutable array type)
  const validTemplate: ResumePromptTemplateSettings = {
    maxSummaryLength: 500,
    maxHighlightsPerExperience: 6,
    tone: 'professional',
    focusAreas: ['skills', 'experience'],
    customInstructions: '',
    preserveAllContent: false,
  };

  let result = validateResumePromptTemplate(validTemplate);
  assertEqual(result.errors.length, 0, 'Accepts valid resume template');

  // Invalid values
  const invalidSummaryLength: ResumePromptTemplateSettings = { ...validTemplate, maxSummaryLength: 50 };
  result = validateResumePromptTemplate(invalidSummaryLength);
  assertTrue(result.errors.length > 0, 'Rejects summary length below minimum');

  const invalidHighlights: ResumePromptTemplateSettings = { ...validTemplate, maxHighlightsPerExperience: 15 };
  result = validateResumePromptTemplate(invalidHighlights);
  assertTrue(result.errors.length > 0, 'Rejects highlights above maximum');

  const longInstructions: ResumePromptTemplateSettings = { ...validTemplate, customInstructions: 'a'.repeat(2500) };
  result = validateResumePromptTemplate(longInstructions);
  assertTrue(result.errors.length > 0, 'Rejects instructions exceeding max length');

  // No focus areas (warning only)
  const noFocusAreas: ResumePromptTemplateSettings = { ...validTemplate, focusAreas: [] };
  result = validateResumePromptTemplate(noFocusAreas);
  assertEqual(result.errors.length, 0, 'No errors for empty focus areas');
  assertTrue(result.warnings.length > 0, 'Warning for empty focus areas');
});

// ============================================
// Cover Letter Prompt Template Validation Tests
// ============================================

testGroup('Cover Letter Prompt Template Validation', () => {
  // Valid template (using proper mutable array type)
  const validTemplate: CoverLetterPromptTemplateSettings = {
    maxOpeningLength: 300,
    maxBodyParagraphs: 3,
    tone: 'formal',
    focusAreas: ['achievements', 'technical-skills'],
    customInstructions: '',
    style: 'detailed',
    emphasizeCompanyKnowledge: true,
  };

  let result = validateCoverLetterPromptTemplate(validTemplate);
  assertEqual(result.errors.length, 0, 'Accepts valid cover letter template');

  // Invalid values
  const invalidOpening: CoverLetterPromptTemplateSettings = { ...validTemplate, maxOpeningLength: 50 };
  result = validateCoverLetterPromptTemplate(invalidOpening);
  assertTrue(result.errors.length > 0, 'Rejects opening length below minimum');

  const invalidParagraphs: CoverLetterPromptTemplateSettings = { ...validTemplate, maxBodyParagraphs: 10 };
  result = validateCoverLetterPromptTemplate(invalidParagraphs);
  assertTrue(result.errors.length > 0, 'Rejects paragraphs above maximum');
});

// ============================================
// PDF Theme Validation Tests
// ============================================

testGroup('PDF Theme Validation', () => {
  // Valid theme (use defaults)
  const validTheme = DEFAULT_APP_SETTINGS.pdfTheme;
  let result = validatePDFTheme(validTheme);
  assertEqual(result.errors.length, 0, 'Accepts valid default theme');

  // Invalid color
  const invalidColor = {
    ...validTheme,
    colors: { ...validTheme.colors, primary: 'not-a-color' },
  };
  result = validatePDFTheme(invalidColor);
  assertTrue(result.errors.length > 0, 'Rejects invalid color format');

  // Invalid font
  const invalidFont = {
    ...validTheme,
    fonts: { ...validTheme.fonts, primary: 'Arial' },
  };
  result = validatePDFTheme(invalidFont);
  assertTrue(result.errors.length > 0, 'Rejects unsupported font');

  // Invalid font size
  const invalidFontSize = {
    ...validTheme,
    fontSizes: { ...validTheme.fontSizes, name: 50 },
  };
  result = validatePDFTheme(invalidFontSize);
  assertTrue(result.errors.length > 0, 'Rejects font size out of range');

  // Invalid spacing
  const invalidSpacing = {
    ...validTheme,
    spacing: { ...validTheme.spacing, page: 5 },
  };
  result = validatePDFTheme(invalidSpacing);
  assertTrue(result.errors.length > 0, 'Rejects spacing out of range');

  // Same background and text color
  const sameColors = {
    ...validTheme,
    colors: { ...validTheme.colors, background: '#ffffff', text: '#ffffff' },
  };
  result = validatePDFTheme(sameColors);
  assertTrue(result.errors.length > 0, 'Rejects same background and text colors');

  // Font size hierarchy warning
  const badHierarchy = {
    ...validTheme,
    fontSizes: { ...validTheme.fontSizes, body: 16, sectionTitle: 12 },
  };
  result = validatePDFTheme(badHierarchy);
  assertTrue(result.warnings.length > 0, 'Warns about bad font size hierarchy');
});

// ============================================
// Complete Settings Validation Tests
// ============================================

testGroup('Complete Settings Validation', () => {
  // Valid default settings
  let result = validateSettings(DEFAULT_APP_SETTINGS);
  assertTrue(result.isValid, 'Default settings are valid');

  // Partial settings update
  const partialUpdate: PartialAppSettings = {
    fileNamingPattern: '{company}-{date}',
    createCompanySubfolders: true,
  };
  result = validateSettings(partialUpdate);
  assertTrue(result.isValid, 'Valid partial settings update');

  // Invalid partial settings
  const invalidPartial: PartialAppSettings = {
    fileNamingPattern: '',
  };
  result = validateSettings(invalidPartial);
  assertFalse(result.isValid, 'Invalid empty pattern is caught');
});

// ============================================
// Errors to Field Map Tests
// ============================================

testGroup('Errors to Field Map', () => {
  const errors = [
    {
      field: 'pdfTheme.colors.primary',
      message: 'Invalid color format',
      code: SettingsValidationErrorCode.COLOR_INVALID_FORMAT,
    },
    {
      field: 'fileNamingPattern',
      message: 'Pattern is empty',
      code: SettingsValidationErrorCode.PATTERN_EMPTY,
    },
  ];

  const fieldMap = errorsToFieldMap(errors);

  assertEqual(
    fieldMap['pdfTheme.colors.primary'],
    'Invalid color format',
    'Maps full field path'
  );

  assertEqual(
    fieldMap['fileNamingPattern'],
    'Pattern is empty',
    'Maps simple field name'
  );

  // Simplified key should also be present
  assertTrue(
    'primary' in fieldMap,
    'Simplified key is present'
  );
});

// ============================================
// Summary
// ============================================

console.log('\n========================================');
console.log(`Tests completed: ${passedTests + failedTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
}

/**
 * Manual Testing File for AI Artifact Sanitization Utilities
 *
 * Run this file to verify sanitization functions work correctly.
 * Execute with: npx ts-node src/utils/sanitize.test.ts
 * Or: npx tsx src/utils/sanitize.test.ts
 */

import {
  removeZeroWidthChars,
  removeInvisibleChars,
  normalizeSpaces,
  normalizeLineEndings,
  collapseMultipleSpaces,
  normalizeBlankLines,
  trimLines,
  stripMarkdown,
  sanitize,
  sanitizeAIOutput,
  sanitizeObject,
  sanitizeAIResponse,
} from './sanitize';

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

function testGroup(name: string, tests: () => void): void {
  console.log(`\n=== ${name} ===\n`);
  tests();
}

// ============================================
// Zero-Width Character Tests
// ============================================

testGroup('Zero-Width Character Removal', () => {
  // Zero Width Space (U+200B)
  assertEqual(
    removeZeroWidthChars('hello\u200Bworld'),
    'helloworld',
    'Removes zero-width space'
  );

  // Zero Width Non-Joiner (U+200C)
  assertEqual(
    removeZeroWidthChars('test\u200Cvalue'),
    'testvalue',
    'Removes zero-width non-joiner'
  );

  // Zero Width Joiner (U+200D)
  assertEqual(
    removeZeroWidthChars('test\u200Dvalue'),
    'testvalue',
    'Removes zero-width joiner'
  );

  // Byte Order Mark / Zero Width No-Break Space (U+FEFF)
  assertEqual(
    removeZeroWidthChars('\uFEFFHello'),
    'Hello',
    'Removes BOM at start'
  );

  // Multiple zero-width chars
  assertEqual(
    removeZeroWidthChars('a\u200B\u200C\u200Db'),
    'ab',
    'Removes multiple consecutive zero-width chars'
  );

  // Normal text passes through unchanged
  assertEqual(
    removeZeroWidthChars('Normal text with spaces'),
    'Normal text with spaces',
    'Normal text unchanged'
  );

  // Left-to-Right Mark (U+200E) and Right-to-Left Mark (U+200F)
  assertEqual(
    removeZeroWidthChars('text\u200Ewith\u200Fmarks'),
    'textwithmarks',
    'Removes LTR and RTL marks'
  );

  // Word Joiner (U+2060)
  assertEqual(
    removeZeroWidthChars('word\u2060joiner'),
    'wordjoiner',
    'Removes word joiner'
  );
});

// ============================================
// Invisible Control Character Tests
// ============================================

testGroup('Invisible Control Character Removal', () => {
  // Null character
  assertEqual(
    removeInvisibleChars('hello\u0000world'),
    'helloworld',
    'Removes null character'
  );

  // Bell character
  assertEqual(
    removeInvisibleChars('test\u0007value'),
    'testvalue',
    'Removes bell character'
  );

  // Backspace
  assertEqual(
    removeInvisibleChars('test\u0008value'),
    'testvalue',
    'Removes backspace character'
  );

  // Preserves tabs
  assertEqual(
    removeInvisibleChars('hello\tworld'),
    'hello\tworld',
    'Preserves tab characters'
  );

  // Preserves newlines
  assertEqual(
    removeInvisibleChars('hello\nworld'),
    'hello\nworld',
    'Preserves newline characters'
  );

  // Delete character (U+007F)
  assertEqual(
    removeInvisibleChars('test\u007Fvalue'),
    'testvalue',
    'Removes delete character'
  );
});

// ============================================
// Space Normalization Tests
// ============================================

testGroup('Space Normalization', () => {
  // Non-breaking space (U+00A0)
  assertEqual(
    normalizeSpaces('hello\u00A0world'),
    'hello world',
    'Converts non-breaking space to regular space'
  );

  // En Space (U+2002)
  assertEqual(
    normalizeSpaces('hello\u2002world'),
    'hello world',
    'Converts en space to regular space'
  );

  // Em Space (U+2003)
  assertEqual(
    normalizeSpaces('hello\u2003world'),
    'hello world',
    'Converts em space to regular space'
  );

  // Thin Space (U+2009)
  assertEqual(
    normalizeSpaces('hello\u2009world'),
    'hello world',
    'Converts thin space to regular space'
  );

  // Ideographic Space (U+3000)
  assertEqual(
    normalizeSpaces('hello\u3000world'),
    'hello world',
    'Converts ideographic space to regular space'
  );

  // Multiple unusual spaces
  assertEqual(
    normalizeSpaces('a\u00A0\u2003\u2009b'),
    'a   b',
    'Converts multiple unusual spaces individually'
  );

  // Regular spaces unchanged
  assertEqual(
    normalizeSpaces('hello world'),
    'hello world',
    'Regular spaces unchanged'
  );
});

// ============================================
// Line Ending Normalization Tests
// ============================================

testGroup('Line Ending Normalization', () => {
  // CRLF to LF
  assertEqual(
    normalizeLineEndings('hello\r\nworld'),
    'hello\nworld',
    'Converts CRLF to LF'
  );

  // Standalone CR to LF
  assertEqual(
    normalizeLineEndings('hello\rworld'),
    'hello\nworld',
    'Converts standalone CR to LF'
  );

  // Multiple CRLFs
  assertEqual(
    normalizeLineEndings('a\r\nb\r\nc'),
    'a\nb\nc',
    'Converts multiple CRLFs to LFs'
  );

  // Mixed line endings
  assertEqual(
    normalizeLineEndings('a\r\nb\rc\nd'),
    'a\nb\nc\nd',
    'Handles mixed line endings'
  );

  // LF unchanged
  assertEqual(
    normalizeLineEndings('hello\nworld'),
    'hello\nworld',
    'LF unchanged'
  );
});

// ============================================
// Multiple Space Collapse Tests
// ============================================

testGroup('Multiple Space Collapse', () => {
  // Two spaces
  assertEqual(
    collapseMultipleSpaces('hello  world'),
    'hello world',
    'Collapses two spaces to one'
  );

  // Many spaces
  assertEqual(
    collapseMultipleSpaces('hello     world'),
    'hello world',
    'Collapses many spaces to one'
  );

  // Preserves newlines
  assertEqual(
    collapseMultipleSpaces('hello\n\nworld'),
    'hello\n\nworld',
    'Preserves multiple newlines'
  );

  // Multiple occurrences
  assertEqual(
    collapseMultipleSpaces('a  b   c    d'),
    'a b c d',
    'Collapses multiple occurrences'
  );

  // Single spaces unchanged
  assertEqual(
    collapseMultipleSpaces('hello world'),
    'hello world',
    'Single spaces unchanged'
  );

  // Leading spaces preserved (for indentation)
  assertEqual(
    collapseMultipleSpaces('  hello'),
    '  hello',
    'Leading spaces preserved'
  );
});

// ============================================
// Blank Line Normalization Tests
// ============================================

testGroup('Blank Line Normalization', () => {
  // Three newlines to two
  assertEqual(
    normalizeBlankLines('a\n\n\nb'),
    'a\n\nb',
    'Reduces three newlines to two'
  );

  // Many newlines to two
  assertEqual(
    normalizeBlankLines('a\n\n\n\n\nb'),
    'a\n\nb',
    'Reduces many newlines to two'
  );

  // Two newlines unchanged
  assertEqual(
    normalizeBlankLines('a\n\nb'),
    'a\n\nb',
    'Two newlines unchanged'
  );

  // Single newline unchanged
  assertEqual(
    normalizeBlankLines('a\nb'),
    'a\nb',
    'Single newline unchanged'
  );
});

// ============================================
// Line Trimming Tests
// ============================================

testGroup('Line Trimming', () => {
  // Trailing spaces
  assertEqual(
    trimLines('hello   \nworld  '),
    'hello\nworld',
    'Removes trailing spaces from lines'
  );

  // Leading spaces
  assertEqual(
    trimLines('   hello\n  world'),
    'hello\nworld',
    'Removes leading spaces from lines'
  );

  // Both leading and trailing
  assertEqual(
    trimLines('  hello  \n  world  '),
    'hello\nworld',
    'Removes both leading and trailing spaces'
  );
});

// ============================================
// Markdown Stripping Tests
// ============================================

testGroup('Markdown Stripping', () => {
  // Bold text
  assertEqual(
    stripMarkdown('This is **bold** text'),
    'This is bold text',
    'Strips bold markdown (asterisks)'
  );

  assertEqual(
    stripMarkdown('This is __bold__ text'),
    'This is bold text',
    'Strips bold markdown (underscores)'
  );

  // Italic text
  assertEqual(
    stripMarkdown('This is *italic* text'),
    'This is italic text',
    'Strips italic markdown (asterisk)'
  );

  assertEqual(
    stripMarkdown('This is _italic_ text'),
    'This is italic text',
    'Strips italic markdown (underscore)'
  );

  // Inline code
  assertEqual(
    stripMarkdown('Use `console.log()` for debugging'),
    'Use console.log() for debugging',
    'Strips inline code markdown'
  );

  // Links
  assertEqual(
    stripMarkdown('Check out [this link](https://example.com)'),
    'Check out this link',
    'Strips link markdown, keeps text'
  );

  // Headers
  assertEqual(
    stripMarkdown('# Header\nContent'),
    'Header\nContent',
    'Strips header markdown'
  );

  assertEqual(
    stripMarkdown('### Level 3 Header\nContent'),
    'Level 3 Header\nContent',
    'Strips multi-level header markdown'
  );

  // Blockquotes
  assertEqual(
    stripMarkdown('> This is a quote'),
    'This is a quote',
    'Strips blockquote markdown'
  );

  // Strikethrough
  assertEqual(
    stripMarkdown('This is ~~deleted~~ text'),
    'This is deleted text',
    'Strips strikethrough markdown'
  );

  // Code blocks
  assertEqual(
    stripMarkdown('```javascript\nconst x = 1;\n```'),
    'const x = 1;',
    'Strips code block markers'
  );

  // Combined markdown
  assertEqual(
    stripMarkdown('**Bold** and *italic* with `code`'),
    'Bold and italic with code',
    'Strips combined markdown'
  );

  // Plain text unchanged
  assertEqual(
    stripMarkdown('Just normal text here'),
    'Just normal text here',
    'Plain text unchanged'
  );

  // Preserves underscores in words (not markdown)
  assertEqual(
    stripMarkdown('variable_name and another_one'),
    'variable_name and another_one',
    'Preserves underscores in identifiers'
  );
});

// ============================================
// Main Sanitize Function Tests
// ============================================

testGroup('Main Sanitize Function', () => {
  // Comprehensive test
  const messyText =
    '\uFEFFHello\u200B world\u00A0\u00A0with   extra\n\n\n\nspaces';
  assertEqual(
    sanitize(messyText),
    'Hello world with extra\n\nspaces',
    'Sanitizes comprehensive messy text'
  );

  // Normal text passes through
  assertEqual(
    sanitize('Normal text with proper formatting.'),
    'Normal text with proper formatting.',
    'Normal text passes through unchanged'
  );

  // With markdown stripping option
  assertEqual(
    sanitize('**Bold** text', { stripMarkdown: true }),
    'Bold text',
    'Sanitize with stripMarkdown option'
  );

  // With trimLines option
  assertEqual(
    sanitize('  hello  \n  world  ', { trimLines: true }),
    'hello\nworld',
    'Sanitize with trimLines option'
  );

  // Disabling options
  assertEqual(
    sanitize('hello\u00A0world', { normalizeSpaces: false }),
    'hello\u00A0world',
    'Can disable space normalization'
  );

  // Empty string
  assertEqual(sanitize(''), '', 'Handles empty string');

  // Whitespace only
  assertEqual(sanitize('   \n\n   '), '', 'Trims whitespace-only strings');
});

// ============================================
// Sanitize AI Output Tests
// ============================================

testGroup('Sanitize AI Output', () => {
  // AI often includes markdown in responses
  const aiResponse =
    '**Developed** software using `React` and worked on [various projects](url)';
  assertEqual(
    sanitizeAIOutput(aiResponse),
    'Developed software using React and worked on various projects',
    'Sanitizes typical AI response'
  );

  // With invisible characters AI might include
  const withInvisible = '\uFEFFExperienced developer\u200B';
  assertEqual(
    sanitizeAIOutput(withInvisible),
    'Experienced developer',
    'Removes invisible chars from AI output'
  );
});

// ============================================
// Object Sanitization Tests
// ============================================

testGroup('Object Sanitization', () => {
  // Simple object
  const simpleObj = {
    name: 'John\u200B Doe',
    title: '**Software Engineer**',
  };
  assertEqual(
    sanitizeObject(simpleObj, { stripMarkdown: true }),
    { name: 'John Doe', title: 'Software Engineer' },
    'Sanitizes simple object'
  );

  // Nested object
  const nestedObj = {
    personal: {
      name: '\uFEFFJane Doe',
      email: 'jane@example.com',
    },
    skills: ['React\u200B', 'TypeScript\u00A0'],
  };
  assertEqual(
    sanitizeObject(nestedObj),
    {
      personal: {
        name: 'Jane Doe',
        email: 'jane@example.com',
      },
      skills: ['React', 'TypeScript'],
    },
    'Sanitizes nested object with arrays'
  );

  // Mixed types
  const mixedObj = {
    name: 'Test\u200B',
    count: 42,
    active: true,
    data: null,
  };
  const sanitizedMixed = sanitizeObject(mixedObj);
  assertEqual(sanitizedMixed.name, 'Test', 'Sanitizes strings in mixed object');
  assertEqual(
    sanitizedMixed.count,
    42,
    'Preserves numbers in mixed object'
  );
  assertEqual(
    sanitizedMixed.active,
    true,
    'Preserves booleans in mixed object'
  );
  assertEqual(sanitizedMixed.data, null, 'Preserves null in mixed object');
});

// ============================================
// Resume-Specific Tests
// ============================================

testGroup('Resume-Specific Scenarios', () => {
  // Resume highlight with AI artifacts
  const highlight =
    '\u200BDeveloped **RESTful APIs** using `Node.js` and `Express`\u200B';
  assertEqual(
    sanitizeAIOutput(highlight),
    'Developed RESTful APIs using Node.js and Express',
    'Sanitizes resume highlight with AI artifacts'
  );

  // Summary with multiple paragraphs (preserve intentional newlines)
  const summary =
    'Experienced developer.\n\nPassionate about clean code.';
  assertEqual(
    sanitizeAIOutput(summary),
    'Experienced developer.\n\nPassionate about clean code.',
    'Preserves intentional paragraph breaks'
  );

  // Full resume object
  const resume = {
    personalInfo: {
      name: '\uFEFFJohn Doe\u200B',
      summary:
        '**Experienced** developer with [proven track record](url).',
    },
    workExperience: [
      {
        company: 'Tech Corp\u00A0',
        title: 'Senior\u200BEngineer',
        highlights: [
          'Built `microservices`',
          'Led **team** of 5',
        ],
      },
    ],
  };

  const sanitizedResume = sanitizeAIResponse(resume);
  assertEqual(
    sanitizedResume.personalInfo.name,
    'John Doe',
    'Sanitizes name in resume'
  );
  assertEqual(
    sanitizedResume.personalInfo.summary,
    'Experienced developer with proven track record.',
    'Sanitizes summary in resume'
  );

  const firstExperience = sanitizedResume.workExperience[0];
  if (firstExperience) {
    assertEqual(
      firstExperience.company,
      'Tech Corp',
      'Sanitizes company name'
    );
    assertEqual(
      firstExperience.title,
      'SeniorEngineer',
      'Removes zero-width from title'
    );
    assertEqual(
      firstExperience.highlights[0],
      'Built microservices',
      'Sanitizes highlight with code formatting'
    );
    assertEqual(
      firstExperience.highlights[1],
      'Led team of 5',
      'Sanitizes highlight with bold formatting'
    );
  }
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

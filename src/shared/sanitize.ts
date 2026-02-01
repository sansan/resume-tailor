/**
 * AI Artifact Sanitization Utilities
 *
 * These utilities clean up text output from AI models by removing
 * invisible characters, normalizing whitespace, and stripping
 * unwanted markdown artifacts while preserving intentional formatting.
 */

// Zero-width characters to remove
const ZERO_WIDTH_CHARS = [
  '\u200B', // Zero Width Space
  '\u200C', // Zero Width Non-Joiner
  '\u200D', // Zero Width Joiner
  '\uFEFF', // Byte Order Mark / Zero Width No-Break Space
  '\u200E', // Left-to-Right Mark
  '\u200F', // Right-to-Left Mark
  '\u2060', // Word Joiner
  '\u2061', // Function Application
  '\u2062', // Invisible Times
  '\u2063', // Invisible Separator
  '\u2064', // Invisible Plus
]

// Regex pattern for zero-width and invisible characters
// eslint-disable-next-line no-misleading-character-class
const ZERO_WIDTH_REGEX = new RegExp(`[${ZERO_WIDTH_CHARS.join('')}]`, 'g')

// Various space characters that should be normalized to regular spaces
const UNUSUAL_SPACES = [
  '\u00A0', // Non-Breaking Space
  '\u1680', // Ogham Space Mark
  '\u2000', // En Quad
  '\u2001', // Em Quad
  '\u2002', // En Space
  '\u2003', // Em Space
  '\u2004', // Three-Per-Em Space
  '\u2005', // Four-Per-Em Space
  '\u2006', // Six-Per-Em Space
  '\u2007', // Figure Space
  '\u2008', // Punctuation Space
  '\u2009', // Thin Space
  '\u200A', // Hair Space
  '\u202F', // Narrow No-Break Space
  '\u205F', // Medium Mathematical Space
  '\u3000', // Ideographic Space
]

// Regex pattern for unusual space characters
const UNUSUAL_SPACE_REGEX = new RegExp(`[${UNUSUAL_SPACES.join('')}]`, 'g')

// Other invisible or control characters to remove (excluding newlines, tabs, and standard spaces)
const INVISIBLE_CONTROL_CHARS = [
  '\u0000', // Null
  '\u0001', // Start of Heading
  '\u0002', // Start of Text
  '\u0003', // End of Text
  '\u0004', // End of Transmission
  '\u0005', // Enquiry
  '\u0006', // Acknowledge
  '\u0007', // Bell
  '\u0008', // Backspace
  // Skip \u0009 (Tab) - we want to keep tabs
  // Skip \u000A (Line Feed/Newline) - we want to keep newlines
  '\u000B', // Vertical Tab
  '\u000C', // Form Feed
  // Skip \u000D (Carriage Return) - handled separately
  '\u000E', // Shift Out
  '\u000F', // Shift In
  '\u0010', // Data Link Escape
  '\u0011', // Device Control 1
  '\u0012', // Device Control 2
  '\u0013', // Device Control 3
  '\u0014', // Device Control 4
  '\u0015', // Negative Acknowledge
  '\u0016', // Synchronous Idle
  '\u0017', // End of Transmission Block
  '\u0018', // Cancel
  '\u0019', // End of Medium
  '\u001A', // Substitute
  '\u001B', // Escape
  '\u001C', // File Separator
  '\u001D', // Group Separator
  '\u001E', // Record Separator
  '\u001F', // Unit Separator
  '\u007F', // Delete
  '\u0080', // Padding Character
  '\u0081', // High Octet Preset
  '\u0082', // Break Permitted Here
  '\u0083', // No Break Here
  '\u0084', // Index
  '\u0085', // Next Line
  '\u0086', // Start of Selected Area
  '\u0087', // End of Selected Area
  '\u0088', // Character Tabulation Set
  '\u0089', // Character Tabulation with Justification
  '\u008A', // Line Tabulation Set
  '\u008B', // Partial Line Forward
  '\u008C', // Partial Line Backward
  '\u008D', // Reverse Line Feed
  '\u008E', // Single Shift Two
  '\u008F', // Single Shift Three
  '\u0090', // Device Control String
  '\u0091', // Private Use One
  '\u0092', // Private Use Two
  '\u0093', // Set Transmit State
  '\u0094', // Cancel Character
  '\u0095', // Message Waiting
  '\u0096', // Start of Guarded Area
  '\u0097', // End of Guarded Area
  '\u0098', // Start of String
  '\u0099', // Single Graphic Character Introducer
  '\u009A', // Single Character Introducer
  '\u009B', // Control Sequence Introducer
  '\u009C', // String Terminator
  '\u009D', // Operating System Command
  '\u009E', // Privacy Message
  '\u009F', // Application Program Command
]

// Regex pattern for invisible control characters
const INVISIBLE_CONTROL_REGEX = new RegExp(
  `[${INVISIBLE_CONTROL_CHARS.map(c => c.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')).join('')}]`,
  'g'
)

/**
 * Removes zero-width and invisible Unicode characters from text
 */
export function removeZeroWidthChars(text: string): string {
  return text.replace(ZERO_WIDTH_REGEX, '')
}

/**
 * Removes invisible control characters while preserving newlines and tabs
 */
export function removeInvisibleChars(text: string): string {
  return text.replace(INVISIBLE_CONTROL_REGEX, '')
}

/**
 * Normalizes various Unicode space characters to regular ASCII spaces
 * Non-breaking spaces and other unusual space characters are converted to regular spaces
 */
export function normalizeSpaces(text: string): string {
  return text.replace(UNUSUAL_SPACE_REGEX, ' ')
}

/**
 * Normalizes line endings to Unix-style (LF only)
 * Converts CRLF and standalone CR to LF
 */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/**
 * Collapses multiple consecutive spaces into a single space
 * Does NOT affect newlines - only horizontal whitespace within lines
 */
export function collapseMultipleSpaces(text: string): string {
  // Only collapse multiple spaces on the same line, preserving intentional spacing at line starts
  return text.replace(/([^\n]) {2,}/g, '$1 ')
}

/**
 * Removes excessive blank lines (more than 2 consecutive newlines become 2)
 * Preserves single blank lines for paragraph separation
 */
export function normalizeBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n')
}

/**
 * Trims whitespace from the start and end of each line
 * Useful for cleaning up AI output that may have trailing spaces
 */
export function trimLines(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .join('\n')
}

/**
 * Common markdown patterns that might appear in plain text fields
 */
const MARKDOWN_PATTERNS = {
  // Bold: **text** or __text__
  bold: /(\*\*|__)(.+?)\1/g,
  // Italic: *text* or _text_ (but not in the middle of words)
  italic: /(?<![a-zA-Z0-9])([*_])(?!\s)(.+?)(?<!\s)\1(?![a-zA-Z0-9])/g,
  // Inline code: `code`
  inlineCode: /`([^`]+)`/g,
  // Links: [text](url) - keep just the text
  links: /\[([^\]]+)\]\([^)]+\)/g,
  // Headers: # Header (remove the # but keep the text)
  headers: /^#{1,6}\s+/gm,
  // Bullet points: - item or * item (at start of line)
  bullets: /^[\s]*[-*+]\s+/gm,
  // Numbered lists: 1. item
  numberedList: /^[\s]*\d+\.\s+/gm,
  // Blockquotes: > text
  blockquotes: /^>\s*/gm,
  // Horizontal rules: --- or *** or ___
  horizontalRules: /^[-*_]{3,}\s*$/gm,
  // Code blocks: ```code``` (multi-line)
  codeBlocks: /```[\s\S]*?```/g,
  // Strikethrough: ~~text~~
  strikethrough: /~~(.+?)~~/g,
}

/**
 * Strips markdown formatting from text, keeping the underlying content
 * Useful for cleaning up AI responses that accidentally include markdown in plain text fields
 */
export function stripMarkdown(text: string): string {
  let result = text

  // Remove code blocks first (they might contain other markdown-like syntax)
  result = result.replace(MARKDOWN_PATTERNS.codeBlocks, match => {
    // Extract content between ``` markers
    const content = match.slice(3, -3).replace(/^[^\n]*\n/, '') // Remove language identifier line
    return content.trim()
  })

  // Remove other markdown formatting
  result = result.replace(MARKDOWN_PATTERNS.bold, '$2')
  result = result.replace(MARKDOWN_PATTERNS.italic, '$2')
  result = result.replace(MARKDOWN_PATTERNS.inlineCode, '$1')
  result = result.replace(MARKDOWN_PATTERNS.links, '$1')
  result = result.replace(MARKDOWN_PATTERNS.headers, '')
  result = result.replace(MARKDOWN_PATTERNS.strikethrough, '$1')
  result = result.replace(MARKDOWN_PATTERNS.blockquotes, '')
  result = result.replace(MARKDOWN_PATTERNS.horizontalRules, '')

  // Note: We don't remove bullets and numbered lists by default
  // as they might be intentional formatting in resume highlights

  return result
}

/**
 * Options for the sanitize function
 */
export interface SanitizeOptions {
  /** Remove zero-width and invisible characters (default: true) */
  removeZeroWidth?: boolean
  /** Remove invisible control characters (default: true) */
  removeInvisible?: boolean
  /** Normalize unusual space characters to regular spaces (default: true) */
  normalizeSpaces?: boolean
  /** Normalize line endings to Unix-style LF (default: true) */
  normalizeLineEndings?: boolean
  /** Collapse multiple consecutive spaces (default: true) */
  collapseSpaces?: boolean
  /** Normalize excessive blank lines (default: true) */
  normalizeBlankLines?: boolean
  /** Trim whitespace from start/end of each line (default: false) */
  trimLines?: boolean
  /** Strip markdown formatting (default: false) */
  stripMarkdown?: boolean
  /** Trim the entire string (default: true) */
  trim?: boolean
}

const DEFAULT_SANITIZE_OPTIONS: Required<SanitizeOptions> = {
  removeZeroWidth: true,
  removeInvisible: true,
  normalizeSpaces: true,
  normalizeLineEndings: true,
  collapseSpaces: true,
  normalizeBlankLines: true,
  trimLines: false,
  stripMarkdown: false,
  trim: true,
}

/**
 * Main sanitization function that applies all cleaning operations
 * Preserves intentional formatting like newlines for paragraph breaks
 *
 * @param text - The text to sanitize
 * @param options - Configuration options for sanitization
 * @returns The sanitized text
 */
export function sanitize(text: string, options: SanitizeOptions = {}): string {
  const opts = { ...DEFAULT_SANITIZE_OPTIONS, ...options }

  let result = text

  // Apply sanitization steps in a logical order
  if (opts.removeZeroWidth) {
    result = removeZeroWidthChars(result)
  }

  if (opts.removeInvisible) {
    result = removeInvisibleChars(result)
  }

  if (opts.normalizeLineEndings) {
    result = normalizeLineEndings(result)
  }

  if (opts.normalizeSpaces) {
    result = normalizeSpaces(result)
  }

  if (opts.stripMarkdown) {
    result = stripMarkdown(result)
  }

  if (opts.collapseSpaces) {
    result = collapseMultipleSpaces(result)
  }

  if (opts.normalizeBlankLines) {
    result = normalizeBlankLines(result)
  }

  if (opts.trimLines) {
    result = trimLines(result)
  }

  if (opts.trim) {
    result = result.trim()
  }

  return result
}

/**
 * Sanitizes text specifically for resume/cover letter content
 * Applies standard sanitization plus markdown stripping
 */
export function sanitizeAIOutput(text: string): string {
  return sanitize(text, {
    stripMarkdown: true,
    trimLines: true,
  })
}

/**
 * Recursively sanitizes all string values in an object
 * Useful for sanitizing entire AI response objects
 *
 * @param obj - The object to sanitize
 * @param options - Sanitization options to apply to each string
 * @returns A new object with all strings sanitized
 */
export function sanitizeObject<T>(obj: T, options: SanitizeOptions = {}): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return sanitize(obj, options) as T
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options)) as T
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value, options)
    }
    return result as T
  }

  // For other types (numbers, booleans, etc.), return as-is
  return obj
}

/**
 * Sanitizes an entire AI response object with settings optimized for resume content
 */
export function sanitizeAIResponse<T>(response: T): T {
  return sanitizeObject(response, {
    stripMarkdown: true,
    trimLines: true,
  })
}

// Sanitization utilities for AI artifact cleanup
export {
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
  type SanitizeOptions,
} from './sanitize'

// Schema instruction utilities
export {
  schemaToPromptDescription,
  schemaToJsonExample,
  generateSchemaInstructions,
  getResumeSchemaInstructions,
  getCoverLetterSchemaInstructions,
} from './schema-instructions';

// Resume refinement prompt templates
export {
  generateResumeRefinementSystemPrompt,
  generateResumeRefinementUserPrompt,
  buildResumeRefinementPrompt,
  buildCombinedResumeRefinementPrompt,
  DEFAULT_RESUME_TEMPLATES,
  type ResumeRefinementOptions,
  type ResumePromptTemplate,
} from './resume-refinement.prompt';

// Cover letter generation prompt templates
export {
  generateCoverLetterSystemPrompt,
  generateCoverLetterUserPrompt,
  buildCoverLetterPrompt,
  buildCombinedCoverLetterPrompt,
  DEFAULT_COVER_LETTER_TEMPLATES,
  type CoverLetterGenerationOptions,
  type CoverLetterPromptTemplate,
  type CompanyInfo,
} from './cover-letter.prompt';

// Resume extraction prompt templates
export {
  buildResumeExtractionPrompt,
  type ResumeExtractionOptions,
} from './resume-extraction.prompt';

// Job extraction prompt templates
export {
  buildJobExtractionPrompt,
  type JobExtractionOptions,
} from './job-extraction.prompt';

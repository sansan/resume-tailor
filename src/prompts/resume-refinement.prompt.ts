import type { Resume } from '@schemas/resume.schema'
import { getResumeSchemaInstructions } from './schema-instructions'

/**
 * Options for customizing the resume refinement prompt.
 * These can be stored in settings and applied per-user or per-session.
 */
export interface ResumeRefinementOptions {
  /** Maximum length for the summary in characters (default: 500) */
  maxSummaryLength?: number
  /** Maximum number of highlights per work experience (default: 6) */
  maxHighlightsPerExperience?: number
  /** Whether to include refinement metadata in output (default: true) */
  includeMetadata?: boolean
  /** Tone for the refined resume (default: 'professional') */
  tone?: 'professional' | 'conversational' | 'technical'
  /** Focus areas to prioritize during refinement */
  focusAreas?: ('skills' | 'experience' | 'achievements' | 'education')[]
  /** Custom instructions to append to the prompt */
  customInstructions?: string
  /** Whether to preserve all original content or allow trimming (default: false) */
  preserveAllContent?: boolean
}

const DEFAULT_OPTIONS: Required<ResumeRefinementOptions> = {
  maxSummaryLength: 500,
  maxHighlightsPerExperience: 6,
  includeMetadata: true,
  tone: 'professional',
  focusAreas: ['skills', 'experience', 'achievements'],
  customInstructions: '',
  preserveAllContent: false,
}

/**
 * Generates the system prompt for resume refinement.
 * This sets up Claude's role and general behavior.
 */
export function generateResumeRefinementSystemPrompt(
  options: ResumeRefinementOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return `You are an expert resume writer and career coach with deep knowledge of applicant tracking systems (ATS), hiring practices, and industry-specific requirements. Your task is to refine a candidate's resume to better match a specific job posting while maintaining complete factual accuracy.

## Core Principles

1. **Factual Accuracy is Paramount**: You must NEVER fabricate, invent, or embellish any information. Every statement in the refined resume must be directly supported by the original resume content. If the original resume doesn't mention a skill or experience, do not add it.

2. **Highlight Relevance**: Identify the most relevant experiences, skills, and achievements that align with the job requirements and bring them to prominence.

3. **ATS Optimization**: Incorporate relevant keywords from the job posting naturally into the resume content to improve ATS compatibility.

4. **Professional Tone**: Maintain a ${opts.tone} tone throughout the resume.

5. **Quantifiable Achievements**: Where present in the original, preserve and emphasize quantifiable achievements and metrics.

## Refinement Guidelines

- Reorder bullet points to prioritize the most relevant accomplishments
- Adjust wording to mirror terminology used in the job posting (without changing facts)
- Ensure the summary directly addresses the role's key requirements
- Categorize and order skills based on relevance to the position
- Keep highlights concise and impactful (maximum ${opts.maxHighlightsPerExperience} per experience)
- Summary should be no longer than ${opts.maxSummaryLength} characters

${opts.preserveAllContent ? '- Preserve all original content; do not remove any experiences, skills, or achievements' : '- You may deprioritize or condense less relevant content to maintain focus'}

${opts.customInstructions ? `\n## Additional Instructions\n\n${opts.customInstructions}` : ''}

## Output Format

You must respond with ONLY a valid JSON object matching the schema provided. Do not include any text before or after the JSON. Do not use markdown code blocks.`
}

/**
 * Generates the user prompt for resume refinement with the actual data.
 */
export function generateResumeRefinementUserPrompt(
  originalResume: Resume,
  jobPosting: string,
  options: ResumeRefinementOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const schemaInstructions = getResumeSchemaInstructions()

  const focusAreasSection =
    opts.focusAreas.length > 0
      ? `\n## Focus Areas\nPrioritize refinements in these areas: ${opts.focusAreas.join(', ')}\n`
      : ''

  return `## Job Posting

Please analyze the following job posting and identify:
- Required skills and qualifications
- Preferred skills and nice-to-haves
- Key responsibilities
- Industry-specific terminology and keywords
- Company culture indicators (if present)

<job_posting>
${jobPosting}
</job_posting>

## Original Resume

Here is the candidate's current resume in JSON format. Remember: you may only use information present in this resume.

<original_resume>
${JSON.stringify(originalResume, null, 2)}
</original_resume>

## Your Task

Refine this resume to better align with the job posting while following these specific instructions:

1. **Summary**: ${
    originalResume.personalInfo.summary
      ? "Rewrite the summary to directly address the role's key requirements using language from the job posting. Keep it under " +
        opts.maxSummaryLength +
        ' characters.'
      : 'Create a compelling summary (under ' +
        opts.maxSummaryLength +
        ' characters) that positions the candidate for this specific role, using ONLY information from their existing experience and skills.'
  }

2. **Work Experience**:
   - Reorder highlights to prioritize accomplishments most relevant to this role
   - Adjust wording to incorporate relevant keywords naturally
   - Focus on achievements that demonstrate skills mentioned in the job posting
   - Maximum ${opts.maxHighlightsPerExperience} highlights per position

3. **Skills**:
   - Reorder skills to prioritize those mentioned in or relevant to the job posting
   - Ensure skill categories align with the job's focus areas
   - Do not add skills that aren't present in the original resume

4. **Projects & Certifications**:
   - Reorder to prioritize those most relevant to the position
   - Adjust descriptions to highlight relevant technologies or methodologies
${focusAreasSection}
${schemaInstructions}

${
  opts.includeMetadata
    ? `
### Refinement Metadata

Include the refinementMetadata object with:
- targetedKeywords: List the key terms from the job posting that you incorporated
- changesSummary: Brief description of the main refinements made
- confidenceScore: Your confidence (0-1) in how well the refined resume matches the job requirements
`
    : ''
}

## Response

Respond with ONLY the refined resume as a valid JSON object. No additional text or formatting.`
}

/**
 * Builds a complete prompt pair (system + user) for resume refinement.
 * This is the main function to use when calling Claude Code.
 */
export function buildResumeRefinementPrompt(
  originalResume: Resume,
  jobPosting: string,
  options: ResumeRefinementOptions = {}
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: generateResumeRefinementSystemPrompt(options),
    userPrompt: generateResumeRefinementUserPrompt(originalResume, jobPosting, options),
  }
}

/**
 * Builds a single combined prompt for use with APIs that don't support
 * separate system prompts. Combines system context with user prompt.
 */
export function buildCombinedResumeRefinementPrompt(
  originalResume: Resume,
  jobPosting: string,
  options: ResumeRefinementOptions = {}
): string {
  const { systemPrompt, userPrompt } = buildResumeRefinementPrompt(
    originalResume,
    jobPosting,
    options
  )

  return `${systemPrompt}\n\n---\n\n${userPrompt}`
}

/**
 * Type definitions for the prompt template system.
 * Can be used for storing customizable templates in settings.
 */
export interface ResumePromptTemplate {
  id: string
  name: string
  description?: string
  options: ResumeRefinementOptions
  createdAt: string
  updatedAt: string
}

/**
 * Default prompt templates that users can choose from or customize.
 */
export const DEFAULT_RESUME_TEMPLATES: ResumePromptTemplate[] = [
  {
    id: 'default',
    name: 'Standard Professional',
    description: 'Balanced approach suitable for most job applications',
    options: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'technical',
    name: 'Technical Focus',
    description: 'Emphasizes technical skills and project experience',
    options: {
      tone: 'technical',
      focusAreas: ['skills', 'achievements'],
      maxHighlightsPerExperience: 5,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'leadership',
    name: 'Leadership & Management',
    description: 'Highlights leadership experience and achievements',
    options: {
      tone: 'professional',
      focusAreas: ['experience', 'achievements'],
      maxHighlightsPerExperience: 6,
      customInstructions:
        'Emphasize leadership, team management, strategic initiatives, and business impact metrics.',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'concise',
    name: 'Concise & Impactful',
    description: 'Shorter format focusing on key achievements',
    options: {
      maxSummaryLength: 300,
      maxHighlightsPerExperience: 4,
      preserveAllContent: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

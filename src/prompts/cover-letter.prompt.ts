import type { Resume } from '@schemas/resume.schema'
import { getCoverLetterSchemaInstructions } from './schema-instructions'

/**
 * Options for customizing the cover letter generation prompt.
 * These can be stored in settings and applied per-user or per-session.
 */
export interface CoverLetterGenerationOptions {
  /** Maximum length for the opening paragraph in characters (default: 300) */
  maxOpeningLength?: number
  /** Maximum number of body paragraphs (default: 3) */
  maxBodyParagraphs?: number
  /** Tone for the cover letter (default: 'professional') */
  tone?: 'formal' | 'conversational' | 'enthusiastic'
  /** Whether to include metadata about the generation (default: true) */
  includeMetadata?: boolean
  /** Focus on specific aspects of the candidate's background */
  focusAreas?: (
    | 'technical-skills'
    | 'leadership'
    | 'achievements'
    | 'culture-fit'
    | 'career-growth'
  )[]
  /** Custom instructions to append to the prompt */
  customInstructions?: string
  /** Writing style preference */
  style?: 'concise' | 'detailed' | 'storytelling'
  /** Whether to emphasize company research/knowledge (default: true) */
  emphasizeCompanyKnowledge?: boolean
}

/**
 * Company information that can be provided for more personalized cover letters.
 */
export interface CompanyInfo {
  /** Company name (required) */
  name: string
  /** Industry or sector */
  industry?: string
  /** Company size (e.g., "startup", "mid-size", "enterprise") */
  size?: string
  /** Company culture keywords or values */
  cultureKeywords?: string[]
  /** Recent news, achievements, or initiatives */
  recentNews?: string
  /** Products or services the company is known for */
  productsOrServices?: string
  /** Any specific information about the team or department */
  teamInfo?: string
}

const DEFAULT_OPTIONS: Required<CoverLetterGenerationOptions> = {
  maxOpeningLength: 100,
  maxBodyParagraphs: 2,
  tone: 'formal',
  includeMetadata: false,
  focusAreas: ['achievements'],
  customInstructions:
    'STRICT LIMIT: Total letter MUST be under 2000 characters (about 150-200 words). Be extremely brief.',
  style: 'concise',
  emphasizeCompanyKnowledge: false,
}

/**
 * Generates the system prompt for cover letter generation.
 * This sets up Claude's role and general behavior.
 */
export function generateCoverLetterSystemPrompt(
  options: CoverLetterGenerationOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const toneDescriptions = {
    formal: 'formal and professional, using traditional business letter conventions',
    conversational: 'warm and personable while maintaining professionalism',
    enthusiastic: 'energetic and passionate while remaining professional',
  }

  const styleDescriptions = {
    concise: 'Keep the letter concise and to the point, focusing on key qualifications.',
    detailed: 'Provide comprehensive coverage of relevant experiences and qualifications.',
    storytelling: 'Use narrative techniques to make the letter engaging and memorable.',
  }

  return `You are an expert cover letter writer with extensive experience in career coaching, HR, and recruitment. Your task is to generate a compelling, personalized cover letter that connects a candidate's qualifications to a specific job opportunity.

## Core Principles

1. **Authenticity is Essential**: Every claim in the cover letter must be directly supported by information in the provided resume. Never fabricate experiences, skills, or achievements.

2. **Relevance Over Completeness**: Focus on the experiences and skills most relevant to the position. Not everything from the resume needs to be mentioned.

3. **Show, Don't Just Tell**: Instead of simply stating qualities, demonstrate them through specific examples from the candidate's background.

4. **Company Connection**: Show genuine understanding of and interest in the specific company and role. ${opts.emphasizeCompanyKnowledge ? 'Incorporate company-specific details when provided.' : 'Keep company references general if specific details are not provided.'}

5. **Professional Tone**: Maintain a ${toneDescriptions[opts.tone]} tone throughout.

## Writing Guidelines

- **Opening Paragraph**: Create a compelling hook that immediately establishes relevance to the role. Keep it under ${opts.maxOpeningLength} characters. Mention the specific position being applied for.

- **Body Paragraphs**: Write ${opts.maxBodyParagraphs} focused body paragraphs that:
  - Connect specific resume experiences to job requirements
  - Highlight quantifiable achievements when available
  - Demonstrate understanding of the role's challenges
  - Show how the candidate can add value

- **Closing Paragraph**: End with a confident call to action, expressing enthusiasm for the opportunity to discuss further.

- **Style**: ${styleDescriptions[opts.style]}

## Length Constraints - CRITICAL - MUST FOLLOW

**The cover letter MUST be under 2000 characters total (including spaces).** This is a strict, non-negotiable requirement.

- **MAXIMUM 2000 characters** for the entire letter content (opening + body + closing combined)
- Total: 150-200 words maximum
- Opening: 1-2 sentences
- Body: 1-2 short paragraphs, 2 sentences each
- Closing: 1-2 sentences
- Be extremely concise - cut ruthlessly
- NO redundant phrases, NO filler words, NO excessive detail

## What to Avoid

- Generic statements that could apply to any job
- Repeating the resume verbatim; instead, expand on key points
- Apologetic language or underselling the candidate
- Overly long sentences or paragraphs
- Clichés like "I'm a team player" without supporting evidence
- Exceeding one page - brevity is essential

${opts.customInstructions ? `\n## Additional Instructions\n\n${opts.customInstructions}` : ''}

## Output Format - CRITICAL

You must respond with ONLY a valid JSON object. This is absolutely critical:
- Start your response with { and end with }
- Do NOT include any text, explanation, or commentary before or after the JSON
- Do NOT wrap the JSON in markdown code blocks (\`\`\`)
- Do NOT include phrases like "Here is the cover letter:" or similar
- The ENTIRE response must be parseable as a single JSON object`
}

/**
 * Generates the user prompt for cover letter generation with the actual data.
 */
export function generateCoverLetterUserPrompt(
  resume: Resume,
  jobPosting: string,
  companyInfo?: CompanyInfo,
  options: CoverLetterGenerationOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const schemaInstructions = getCoverLetterSchemaInstructions()

  const focusAreasSection =
    opts.focusAreas.length > 0
      ? `\n## Focus Areas\nEmphasize these aspects of the candidate's background: ${opts.focusAreas.join(', ')}\n`
      : ''

  const companySection = companyInfo
    ? `## Company Information

Use the following information about the company to personalize the cover letter:

<company_info>
Company Name: ${companyInfo.name}
${companyInfo.industry ? `Industry: ${companyInfo.industry}` : ''}
${companyInfo.size ? `Company Size: ${companyInfo.size}` : ''}
${companyInfo.cultureKeywords?.length ? `Culture & Values: ${companyInfo.cultureKeywords.join(', ')}` : ''}
${companyInfo.recentNews ? `Recent News/Achievements: ${companyInfo.recentNews}` : ''}
${companyInfo.productsOrServices ? `Products/Services: ${companyInfo.productsOrServices}` : ''}
${companyInfo.teamInfo ? `Team Information: ${companyInfo.teamInfo}` : ''}
</company_info>
`
    : ''

  const hasJobPosting = jobPosting && jobPosting.trim().length > 0

  const jobPostingSection = hasJobPosting
    ? `## Job Posting

Analyze the following job posting to understand:
- Required qualifications and skills
- Key responsibilities
- Company culture and values (if mentioned)
- What makes an ideal candidate
- Keywords and terminology used

<job_posting>
${jobPosting}
</job_posting>`
    : `## Job Posting

No specific job posting was provided. Generate a GENERIC cover letter that:
- Highlights the candidate's key strengths and experiences
- Can be easily customized for any position
- Uses placeholder "[Position Title]" for the job title
- Uses placeholder "[Company Name]" for the company name
- Focuses on transferable skills and achievements`

  return `${jobPostingSection}

${companySection}
## Candidate's Resume

Here is the candidate's resume in JSON format. Use ONLY information from this resume in the cover letter.

<resume>
${JSON.stringify(resume, null, 2)}
</resume>

## Your Task

Generate a compelling cover letter. **STRICT LIMIT: Maximum 2000 characters, 150-200 words.**

1. **Opening** (1-2 sentences): Hook + position + fit

2. **Body** (1-2 short paragraphs, 2 sentences each): Key strengths with specific examples

3. **Closing** (1-2 sentences): Enthusiasm + call to action

**CRITICAL: Total content MUST be under 2000 characters. This is approximately 150-200 words. Be extremely brief.**
${focusAreasSection}
${schemaInstructions}

${
  opts.includeMetadata
    ? `
### Generation Metadata

Include the metadata object with:
- highlightedExperiences: List the key experiences from the resume that you featured
- tone: The tone used (${opts.tone})
`
    : ''
}

## Response - IMPORTANT

Your response must be ONLY the JSON object. No text before or after. Start with { and end with }.`
}

/**
 * Builds a complete prompt pair (system + user) for cover letter generation.
 * This is the main function to use when calling Claude Code.
 */
export function buildCoverLetterPrompt(
  resume: Resume,
  jobPosting: string,
  companyInfo?: CompanyInfo,
  options: CoverLetterGenerationOptions = {}
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: generateCoverLetterSystemPrompt(options),
    userPrompt: generateCoverLetterUserPrompt(resume, jobPosting, companyInfo, options),
  }
}

/**
 * Builds a single combined prompt for use with APIs that don't support
 * separate system prompts. Combines system context with user prompt.
 */
export function buildCombinedCoverLetterPrompt(
  resume: Resume,
  jobPosting: string,
  companyInfo?: CompanyInfo,
  options: CoverLetterGenerationOptions = {}
): string {
  const { systemPrompt, userPrompt } = buildCoverLetterPrompt(
    resume,
    jobPosting,
    companyInfo,
    options
  )

  return `${systemPrompt}\n\n---\n\n${userPrompt}`
}

/**
 * Builds a prompt to shorten an existing cover letter.
 * Used when the rendered PDF exceeds one page.
 */
export function buildShortenCoverLetterPrompt(
  coverLetter: {
    opening: string
    body: string[]
    closing: string
    recipientName?: string | null | undefined
    recipientTitle?: string | null | undefined
    companyName: string
    companyAddress?: string | null | undefined
    date?: string | null | undefined
    signature: string
    metadata?: unknown
  },
  currentCharCount: number,
  targetCharCount: number
): string {
  const overageChars = currentCharCount - targetCharCount
  const overagePercent = Math.round((overageChars / currentCharCount) * 100)

  return `You are a professional editor. Your task is to shorten an existing cover letter while preserving its key message and professional tone.

## Current Cover Letter

Opening:
${coverLetter.opening}

Body paragraphs:
${coverLetter.body.map((p, i) => `${i + 1}. ${p}`).join('\n\n')}

Closing:
${coverLetter.closing}

## Problem

The cover letter is TOO LONG and doesn't fit on a single page.
- Current length: ${currentCharCount} characters
- Target length: ${targetCharCount} characters (maximum)
- Need to remove: ${overageChars} characters (${overagePercent}% reduction needed)

## Your Task

Shorten the cover letter to fit within ${targetCharCount} characters total (opening + body + closing combined).

Guidelines:
- Cut redundant phrases and filler words
- Combine similar points
- Remove less impactful details
- Keep the strongest examples and achievements
- Maintain professional tone
- Preserve the core message and key qualifications

## Output Format - CRITICAL

Respond with ONLY a valid JSON object. Start with { and end with }.
Do NOT include any text before or after the JSON.

Required JSON structure:
{
  "recipientName": ${JSON.stringify(coverLetter.recipientName)},
  "recipientTitle": ${JSON.stringify(coverLetter.recipientTitle)},
  "companyName": ${JSON.stringify(coverLetter.companyName)},
  "companyAddress": ${JSON.stringify(coverLetter.companyAddress)},
  "date": ${JSON.stringify(coverLetter.date)},
  "opening": "shortened opening paragraph here",
  "body": ["shortened body paragraph 1", "shortened body paragraph 2"],
  "closing": "shortened closing paragraph here",
  "signature": ${JSON.stringify(coverLetter.signature)}
}

Remember: The combined length of opening + body paragraphs + closing MUST be under ${targetCharCount} characters.`
}

/**
 * Type definitions for the prompt template system.
 * Can be used for storing customizable templates in settings.
 */
export interface CoverLetterPromptTemplate {
  id: string
  name: string
  description?: string
  options: CoverLetterGenerationOptions
  createdAt: string
  updatedAt: string
}

/**
 * Default prompt templates that users can choose from or customize.
 */
export const DEFAULT_COVER_LETTER_TEMPLATES: CoverLetterPromptTemplate[] = [
  {
    id: 'default',
    name: 'Standard Professional',
    description: 'Balanced, professional approach suitable for most job applications',
    options: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'formal-corporate',
    name: 'Formal Corporate',
    description: 'Traditional business letter style for corporate environments',
    options: {
      tone: 'formal',
      style: 'detailed',
      focusAreas: ['achievements', 'leadership'],
      maxBodyParagraphs: 3,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'startup-friendly',
    name: 'Startup & Tech',
    description: 'Modern, conversational tone ideal for startups and tech companies',
    options: {
      tone: 'enthusiastic',
      style: 'storytelling',
      focusAreas: ['technical-skills', 'achievements', 'culture-fit'],
      maxBodyParagraphs: 2,
      customInstructions:
        'Emphasize innovation, problem-solving abilities, and adaptability. Show passion for technology and willingness to take on diverse challenges.',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'executive-level',
    name: 'Executive & Leadership',
    description: 'Strategic focus for senior and executive positions',
    options: {
      tone: 'formal',
      style: 'detailed',
      focusAreas: ['leadership', 'achievements', 'career-growth'],
      maxBodyParagraphs: 3,
      customInstructions:
        'Focus on strategic thinking, vision, team building, and measurable business impact. Emphasize leadership philosophy and transformation achievements.',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'career-change',
    name: 'Career Transition',
    description: 'Emphasizes transferable skills for career changers',
    options: {
      tone: 'conversational',
      style: 'storytelling',
      focusAreas: ['achievements', 'career-growth', 'culture-fit'],
      maxBodyParagraphs: 3,
      customInstructions:
        'Focus on transferable skills and how past experiences apply to the new field. Address the career change directly with confidence, showing genuine passion for the new direction.',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'concise-impactful',
    name: 'Concise & Impactful',
    description: 'Short and powerful for busy hiring managers',
    options: {
      tone: 'formal',
      style: 'concise',
      maxOpeningLength: 200,
      maxBodyParagraphs: 2,
      focusAreas: ['achievements'],
      customInstructions:
        'Be extremely concise. Every sentence should deliver value. Cut all filler words and unnecessary qualifiers.',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

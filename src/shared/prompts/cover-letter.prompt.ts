import type { Resume } from '../schemas/resume.schema';
import { getCoverLetterSchemaInstructions } from './schema-instructions';

/**
 * Options for customizing the cover letter generation prompt.
 * These can be stored in settings and applied per-user or per-session.
 */
export interface CoverLetterGenerationOptions {
  /** Maximum length for the opening paragraph in characters (default: 300) */
  maxOpeningLength?: number;
  /** Maximum number of body paragraphs (default: 3) */
  maxBodyParagraphs?: number;
  /** Tone for the cover letter (default: 'professional') */
  tone?: 'formal' | 'conversational' | 'enthusiastic';
  /** Whether to include metadata about the generation (default: true) */
  includeMetadata?: boolean;
  /** Focus on specific aspects of the candidate's background */
  focusAreas?: ('technical-skills' | 'leadership' | 'achievements' | 'culture-fit' | 'career-growth')[];
  /** Custom instructions to append to the prompt */
  customInstructions?: string;
  /** Writing style preference */
  style?: 'concise' | 'detailed' | 'storytelling';
  /** Whether to emphasize company research/knowledge (default: true) */
  emphasizeCompanyKnowledge?: boolean;
}

/**
 * Company information that can be provided for more personalized cover letters.
 */
export interface CompanyInfo {
  /** Company name (required) */
  name: string;
  /** Industry or sector */
  industry?: string;
  /** Company size (e.g., "startup", "mid-size", "enterprise") */
  size?: string;
  /** Company culture keywords or values */
  cultureKeywords?: string[];
  /** Recent news, achievements, or initiatives */
  recentNews?: string;
  /** Products or services the company is known for */
  productsOrServices?: string;
  /** Any specific information about the team or department */
  teamInfo?: string;
}

const DEFAULT_OPTIONS: Required<CoverLetterGenerationOptions> = {
  maxOpeningLength: 300,
  maxBodyParagraphs: 3,
  tone: 'formal',
  includeMetadata: true,
  focusAreas: ['achievements', 'technical-skills'],
  customInstructions: '',
  style: 'detailed',
  emphasizeCompanyKnowledge: true,
};

/**
 * Generates the system prompt for cover letter generation.
 * This sets up Claude's role and general behavior.
 */
export function generateCoverLetterSystemPrompt(
  options: CoverLetterGenerationOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const toneDescriptions = {
    formal: 'formal and professional, using traditional business letter conventions',
    conversational: 'warm and personable while maintaining professionalism',
    enthusiastic: 'energetic and passionate while remaining professional',
  };

  const styleDescriptions = {
    concise: 'Keep the letter concise and to the point, focusing on key qualifications.',
    detailed: 'Provide comprehensive coverage of relevant experiences and qualifications.',
    storytelling: 'Use narrative techniques to make the letter engaging and memorable.',
  };

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

## What to Avoid

- Generic statements that could apply to any job
- Repeating the resume verbatim; instead, expand on key points
- Apologetic language or underselling the candidate
- Overly long sentences or paragraphs
- Clichés like "I'm a team player" without supporting evidence

${opts.customInstructions ? `\n## Additional Instructions\n\n${opts.customInstructions}` : ''}

## Output Format

You must respond with ONLY a valid JSON object matching the schema provided. Do not include any text before or after the JSON. Do not use markdown code blocks.`;
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
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const schemaInstructions = getCoverLetterSchemaInstructions();

  const focusAreasSection = opts.focusAreas.length > 0
    ? `\n## Focus Areas\nEmphasize these aspects of the candidate's background: ${opts.focusAreas.join(', ')}\n`
    : '';

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
    : '';

  return `## Job Posting

Analyze the following job posting to understand:
- Required qualifications and skills
- Key responsibilities
- Company culture and values (if mentioned)
- What makes an ideal candidate
- Keywords and terminology used

<job_posting>
${jobPosting}
</job_posting>

${companySection}
## Candidate's Resume

Here is the candidate's resume in JSON format. Use ONLY information from this resume in the cover letter.

<resume>
${JSON.stringify(resume, null, 2)}
</resume>

## Your Task

Generate a compelling cover letter that:

1. **Opening Paragraph** (max ${opts.maxOpeningLength} characters):
   - Start with an engaging hook that captures attention
   - Clearly state the position being applied for
   - Briefly establish why the candidate is an excellent fit
   - Show enthusiasm for the specific company/role

2. **Body Paragraphs** (${opts.maxBodyParagraphs} paragraphs):
   - Each paragraph should focus on a different strength or qualification
   - Connect specific experiences from the resume to job requirements
   - Use concrete examples and quantifiable achievements where available
   - Demonstrate understanding of the role's challenges and how the candidate can address them

3. **Closing Paragraph**:
   - Summarize the candidate's value proposition
   - Express genuine enthusiasm for the opportunity
   - Include a confident call to action
   - Thank the reader for their consideration
${focusAreasSection}
${schemaInstructions}

${opts.includeMetadata ? `
### Generation Metadata

Include the metadata object with:
- highlightedExperiences: List the key experiences from the resume that you featured
- tone: The tone used (${opts.tone})
` : ''}

## Response

Respond with ONLY the cover letter as a valid JSON object. No additional text or formatting.`;
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
  };
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
  );

  return `${systemPrompt}\n\n---\n\n${userPrompt}`;
}

/**
 * Type definitions for the prompt template system.
 * Can be used for storing customizable templates in settings.
 */
export interface CoverLetterPromptTemplate {
  id: string;
  name: string;
  description?: string;
  options: CoverLetterGenerationOptions;
  createdAt: string;
  updatedAt: string;
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
      customInstructions: 'Emphasize innovation, problem-solving abilities, and adaptability. Show passion for technology and willingness to take on diverse challenges.',
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
      customInstructions: 'Focus on strategic thinking, vision, team building, and measurable business impact. Emphasize leadership philosophy and transformation achievements.',
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
      customInstructions: 'Focus on transferable skills and how past experiences apply to the new field. Address the career change directly with confidence, showing genuine passion for the new direction.',
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
      customInstructions: 'Be extremely concise. Every sentence should deliver value. Cut all filler words and unnecessary qualifiers.',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Resume Extraction Prompt
 *
 * Prompt template for extracting structured resume data from raw text.
 */

import { getResumeSchemaInstructions } from './schema-instructions'

/**
 * Options for resume extraction prompt.
 */
export interface ResumeExtractionOptions {
  /** Whether to include skill levels (requires AI inference) */
  inferSkillLevels?: boolean
}

/**
 * Builds the prompt for extracting resume data from text.
 *
 * @param documentText - Raw text extracted from the resume document
 * @param options - Optional configuration
 * @returns The complete prompt string
 */
export function buildResumeExtractionPrompt(
  documentText: string,
  options: ResumeExtractionOptions = {}
): string {
  const schemaInstructions = getResumeSchemaInstructions()

  const skillLevelInstruction = options.inferSkillLevels
    ? 'Infer skill levels (beginner/intermediate/advanced/expert) based on context clues like years of experience, job responsibilities, and how skills are described.'
    : 'Set skill level to null unless explicitly stated in the document.'

  return `You are a resume parsing assistant. Extract structured data from the following resume text.

## Task
Parse the resume and extract all information into the specified JSON schema format.

## Instructions
1. Extract all available information accurately from the text
2. For dates, use formats like "2020-01", "2020", or "Present" for current positions
3. For contacts, identify the type appropriately:
   - Email addresses → type: "email"
   - Phone numbers → type: "phone"
   - LinkedIn URLs → type: "linkedin"
   - GitHub URLs → type: "github"
   - Twitter/X URLs → type: "twitter"
   - Personal websites → type: "website"
   - Portfolio sites → type: "portfolio"
   - Other contact info → type: "other"
4. ${skillLevelInstruction}
5. Group skills by category if apparent from the resume structure (e.g., "Programming Languages", "Frameworks", "Databases")
6. Extract work experience highlights as bullet points - these are key achievements and responsibilities
7. If information is missing or unclear, omit the field rather than guessing
8. Preserve the original wording of highlight bullet points when possible
9. For certifications, extract the issuing organization as "issuer"

${schemaInstructions}

## Resume Text
<resume_text>
${documentText}
</resume_text>

## Output Format
Return ONLY valid JSON matching the Resume schema. Do not include any explanation, markdown formatting, or code blocks around the JSON. Return raw JSON only.`
}

/**
 * Job Extraction Prompt
 *
 * Prompt template for extracting structured job posting data from raw text.
 */

/**
 * Options for job extraction prompt.
 */
export interface JobExtractionOptions {
  /** Include salary inference if not explicitly stated */
  inferSalary?: boolean
}

/**
 * Gets the schema instructions for job posting extraction.
 */
function getJobPostingSchemaInstructions(): string {
  return `## Output Schema

Return a JSON object with the following structure:

{
  "companyName": string | null,        // Name of the hiring company
  "companyDescription": string | null, // Brief description of the company if provided
  "jobTitle": string | null,           // Job title/position name
  "location": string | null,           // Location (e.g., "San Francisco, CA", "Remote", "Hybrid")
  "employmentType": string | null,     // Full-time, Part-time, Contract, Internship, etc.
  "salaryRange": string | null,        // Salary range if mentioned (e.g., "$120k-$150k")
  "requirements": string[],            // Required qualifications and experience
  "responsibilities": string[],        // Job duties and responsibilities
  "qualifications": string[],          // Nice-to-have qualifications
  "benefits": string[],                // Benefits and perks offered
  "requiredSkills": string[],          // Technical skills explicitly required
  "preferredSkills": string[],         // Technical skills that are nice to have
  "teamInfo": string | null,           // Information about the team or department
  "applicationDeadline": string | null // Application deadline if mentioned
}

All array fields should contain individual items as separate strings.
Use null for fields where information is not available.`
}

/**
 * Builds the prompt for extracting job posting data from text.
 *
 * @param jobPostingText - Raw text of the job posting
 * @param options - Optional configuration
 * @returns The complete prompt string
 */
export function buildJobExtractionPrompt(
  jobPostingText: string,
  options: JobExtractionOptions = {}
): string {
  const schemaInstructions = getJobPostingSchemaInstructions()

  const salaryInstruction = options.inferSalary
    ? 'If salary is not explicitly mentioned but can be inferred from context (e.g., "competitive salary for senior role"), note it.'
    : 'Only include salary if explicitly mentioned in the posting.'

  return `You are a job posting analysis assistant. Extract structured data from the following job posting.

## Task
Parse the job posting and extract all relevant information into the specified JSON schema format.

## Instructions
1. Extract all available information accurately from the text
2. Separate requirements into:
   - "requirements" - Must-have qualifications (years of experience, degrees, certifications)
   - "qualifications" - Nice-to-have or preferred qualifications
3. Separate skills into:
   - "requiredSkills" - Skills explicitly marked as required or must-have
   - "preferredSkills" - Skills marked as preferred, nice-to-have, or bonus
4. For responsibilities, extract each duty as a separate bullet point
5. For benefits, include all perks mentioned (health insurance, PTO, 401k, remote work, etc.)
6. ${salaryInstruction}
7. If information is missing or unclear, set the field to null (for strings) or empty array (for arrays)
8. Clean up and normalize text (remove excessive formatting, standardize punctuation)
9. For location, identify if it's Remote, Hybrid, or On-site and include the city/region if specified

${schemaInstructions}

## Job Posting Text
<job_posting>
${jobPostingText}
</job_posting>

## Output Format
Return ONLY valid JSON matching the schema above. Do not include any explanation, markdown formatting, or code blocks around the JSON. Return raw JSON only.`
}

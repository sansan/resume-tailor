import { z } from 'zod';

/**
 * Generates a human-readable description of a Zod schema for use in AI prompts.
 * This helps Claude understand the expected output structure.
 */

type ZodTypeInfo = {
  type: string;
  optional: boolean;
  description?: string;
  enumValues?: string[];
  arrayItemType?: string;
  objectFields?: Record<string, ZodTypeInfo>;
  constraints?: string[];
};

/**
 * Extracts type information from a Zod schema
 */
function extractTypeInfo(schema: z.ZodTypeAny): ZodTypeInfo {
  const info: ZodTypeInfo = {
    type: 'unknown',
    optional: false,
    constraints: [],
  };

  // Handle optional/nullable wrappers
  if (schema instanceof z.ZodOptional) {
    const innerInfo = extractTypeInfo(schema.unwrap());
    return { ...innerInfo, optional: true };
  }

  if (schema instanceof z.ZodNullable) {
    const innerInfo = extractTypeInfo(schema.unwrap());
    innerInfo.constraints = [...(innerInfo.constraints || []), 'can be null'];
    return innerInfo;
  }

  if (schema instanceof z.ZodDefault) {
    const innerInfo = extractTypeInfo(schema._def.innerType);
    return { ...innerInfo, optional: true };
  }

  // Handle primitive types
  if (schema instanceof z.ZodString) {
    info.type = 'string';
    const checks = schema._def.checks || [];
    for (const check of checks) {
      if (check.kind === 'min') {
        info.constraints?.push(`minimum ${check.value} characters`);
      }
      if (check.kind === 'max') {
        info.constraints?.push(`maximum ${check.value} characters`);
      }
      if (check.kind === 'email') {
        info.constraints?.push('must be a valid email');
      }
      if (check.kind === 'url') {
        info.constraints?.push('must be a valid URL');
      }
    }
    return info;
  }

  if (schema instanceof z.ZodNumber) {
    info.type = 'number';
    const checks = schema._def.checks || [];
    for (const check of checks) {
      if (check.kind === 'min') {
        info.constraints?.push(`minimum value: ${check.value}`);
      }
      if (check.kind === 'max') {
        info.constraints?.push(`maximum value: ${check.value}`);
      }
      if (check.kind === 'int') {
        info.constraints?.push('must be an integer');
      }
    }
    return info;
  }

  if (schema instanceof z.ZodBoolean) {
    info.type = 'boolean';
    return info;
  }

  // Handle enum
  if (schema instanceof z.ZodEnum) {
    info.type = 'enum';
    info.enumValues = schema._def.values;
    return info;
  }

  if (schema instanceof z.ZodLiteral) {
    info.type = 'literal';
    info.constraints = [`must be exactly: ${JSON.stringify(schema._def.value)}`];
    return info;
  }

  // Handle arrays
  if (schema instanceof z.ZodArray) {
    info.type = 'array';
    const itemInfo = extractTypeInfo(schema._def.type);
    info.arrayItemType = itemInfo.type;
    if (itemInfo.type === 'object' && itemInfo.objectFields) {
      info.objectFields = itemInfo.objectFields;
    }
    return info;
  }

  // Handle objects
  if (schema instanceof z.ZodObject) {
    info.type = 'object';
    info.objectFields = {};
    const shape = schema.shape;
    for (const [key, value] of Object.entries(shape)) {
      info.objectFields[key] = extractTypeInfo(value as z.ZodTypeAny);
    }
    return info;
  }

  // Handle union/discriminated union
  if (schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion) {
    info.type = 'union';
    info.constraints = ['one of multiple possible types'];
    return info;
  }

  return info;
}

/**
 * Converts type info to a human-readable string with proper indentation
 */
function typeInfoToString(info: ZodTypeInfo, indent: number = 0): string {
  const prefix = '  '.repeat(indent);
  const lines: string[] = [];

  let typeStr = info.type;
  if (info.optional) {
    typeStr += ' (optional)';
  }

  if (info.enumValues) {
    typeStr += `: one of [${info.enumValues.map(v => `"${v}"`).join(', ')}]`;
  }

  if (info.arrayItemType) {
    if (info.objectFields) {
      typeStr = `array of objects:`;
    } else {
      typeStr = `array of ${info.arrayItemType}`;
    }
  }

  if (info.constraints && info.constraints.length > 0) {
    typeStr += ` (${info.constraints.join(', ')})`;
  }

  lines.push(`${prefix}${typeStr}`);

  if (info.objectFields) {
    for (const [key, fieldInfo] of Object.entries(info.objectFields)) {
      const fieldStr = typeInfoToString(fieldInfo, indent + 1);
      lines.push(`${prefix}  - ${key}: ${fieldStr.trim()}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generates a human-readable schema description for use in prompts
 */
export function schemaToPromptDescription(
  schema: z.ZodTypeAny,
  name: string = 'Output'
): string {
  const info = extractTypeInfo(schema);
  const description = typeInfoToString(info);

  return `## ${name} Schema\n\n${description}`;
}

/**
 * Generates a JSON example structure from a Zod schema
 */
function generateExampleValue(info: ZodTypeInfo): unknown {
  if (info.optional) {
    // For optional fields in examples, sometimes include them
    return generateExampleValue({ ...info, optional: false });
  }

  switch (info.type) {
    case 'string':
      if (info.constraints?.some(c => c.includes('email'))) {
        return 'example@email.com';
      }
      if (info.constraints?.some(c => c.includes('URL'))) {
        return 'https://example.com';
      }
      return 'example string';

    case 'number':
      if (info.constraints?.some(c => c.includes('minimum value: 0') && c.includes('maximum value: 1'))) {
        return 0.85;
      }
      return 42;

    case 'boolean':
      return true;

    case 'enum':
      return info.enumValues?.[0] || 'value';

    case 'literal':
      // Extract the literal value from constraints
      const match = info.constraints?.[0]?.match(/must be exactly: (.+)/);
      if (match && match[1]) {
        try {
          return JSON.parse(match[1]);
        } catch {
          return match[1];
        }
      }
      return 'literal';

    case 'array':
      if (info.objectFields) {
        // Array of objects
        const exampleObj: Record<string, unknown> = {};
        for (const [key, fieldInfo] of Object.entries(info.objectFields)) {
          if (!fieldInfo.optional) {
            exampleObj[key] = generateExampleValue(fieldInfo);
          }
        }
        return [exampleObj];
      }
      return ['example item'];

    case 'object':
      const obj: Record<string, unknown> = {};
      if (info.objectFields) {
        for (const [key, fieldInfo] of Object.entries(info.objectFields)) {
          // Include required fields and some optional ones
          if (!fieldInfo.optional) {
            obj[key] = generateExampleValue(fieldInfo);
          }
        }
      }
      return obj;

    default:
      return null;
  }
}

/**
 * Generates a JSON example from a Zod schema
 */
export function schemaToJsonExample(schema: z.ZodTypeAny): string {
  const info = extractTypeInfo(schema);
  const example = generateExampleValue(info);
  return JSON.stringify(example, null, 2);
}

/**
 * Generates complete prompt instructions for a schema including description and example
 */
export function generateSchemaInstructions(
  schema: z.ZodTypeAny,
  name: string,
  additionalNotes?: string[]
): string {
  const description = schemaToPromptDescription(schema, name);
  const example = schemaToJsonExample(schema);

  let instructions = `${description}\n\n### Example ${name} Structure\n\n\`\`\`json\n${example}\n\`\`\``;

  if (additionalNotes && additionalNotes.length > 0) {
    instructions += '\n\n### Important Notes\n\n';
    instructions += additionalNotes.map(note => `- ${note}`).join('\n');
  }

  return instructions;
}

/**
 * Pre-built schema instructions for resume refinement output
 */
export function getResumeSchemaInstructions(): string {
  // Import the schema dynamically to avoid circular dependencies
  // In actual use, you'd import at the top of the file
  return `## Resume Output Schema

Your response must be a valid JSON object with the following structure:

### Required Fields:
- personalInfo (object):
  - name: string (required)
  - email: string, valid email format (required)
  - phone: string (optional)
  - location: string (optional)
  - linkedin: string, valid URL (optional)
  - website: string, valid URL (optional)
  - summary: string (optional)

- workExperience: array of objects, each containing:
  - company: string (required)
  - title: string (required)
  - startDate: string (required)
  - endDate: string (optional, omit for current positions)
  - location: string (optional)
  - highlights: array of strings (default: [])

- education: array of objects, each containing:
  - institution: string (required)
  - degree: string (required)
  - field: string (optional)
  - graduationDate: string (optional)
  - gpa: string (optional)
  - highlights: array of strings (default: [])

- skills: array of objects, each containing:
  - name: string (required)
  - level: one of ["beginner", "intermediate", "advanced", "expert"] (optional)
  - category: string (optional)

- projects: array of objects, each containing:
  - name: string (required)
  - description: string (optional)
  - technologies: array of strings (default: [])
  - url: string, valid URL (optional)
  - highlights: array of strings (default: [])

- certifications: array of objects, each containing:
  - name: string (required)
  - issuer: string (required)
  - date: string (optional)
  - url: string, valid URL (optional)

### Optional Metadata (refinementMetadata):
- targetedKeywords: array of strings - keywords from the job posting that were addressed
- changesSummary: string - brief summary of refinements made
- confidenceScore: number between 0 and 1 - confidence in the refinement quality`;
}

/**
 * Pre-built schema instructions for cover letter generation output
 */
export function getCoverLetterSchemaInstructions(): string {
  return `## Cover Letter Output Schema

Your response must be a valid JSON object with the following structure:

### Required Fields:
- companyName: string (required)
- opening: string (required) - The opening paragraph
- body: array of strings (required, at least 1) - Body paragraphs
- closing: string (required) - The closing paragraph
- signature: string (required) - The signature line (e.g., "Sincerely, [Name]")

### Optional Fields:
- recipientName: string - Name of the recipient
- recipientTitle: string - Title of the recipient
- companyAddress: string - Company address
- date: string - Date of the letter

### Optional Metadata:
- highlightedExperiences: array of strings - Key experiences from the resume that were highlighted
- tone: one of ["formal", "conversational", "enthusiastic"]`;
}

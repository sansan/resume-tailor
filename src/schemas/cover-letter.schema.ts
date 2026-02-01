import { z } from 'zod'

// Cover Letter Schema
// Using nullish() for optional fields to allow both null and undefined from AI responses
export const CoverLetterSchema = z.object({
  recipientName: z.string().nullish(),
  recipientTitle: z.string().nullish(),
  companyName: z.string().min(1, 'Company name is required'),
  companyAddress: z.string().nullish(),
  date: z.string().nullish(),
  opening: z.string().min(1, 'Opening paragraph is required'),
  body: z.array(z.string()).min(1, 'At least one body paragraph is required'),
  closing: z.string().min(1, 'Closing paragraph is required'),
  signature: z.string().min(1, 'Signature is required'),
})

// TypeScript type inferred from Zod schema
export type CoverLetter = z.infer<typeof CoverLetterSchema>

import { z } from 'zod';

// Cover Letter Schema
export const CoverLetterSchema = z.object({
  recipientName: z.string().optional(),
  recipientTitle: z.string().optional(),
  companyName: z.string().min(1, 'Company name is required'),
  companyAddress: z.string().optional(),
  date: z.string().optional(),
  opening: z.string().min(1, 'Opening paragraph is required'),
  body: z.array(z.string()).min(1, 'At least one body paragraph is required'),
  closing: z.string().min(1, 'Closing paragraph is required'),
  signature: z.string().min(1, 'Signature is required'),
});

// TypeScript type inferred from Zod schema
export type CoverLetter = z.infer<typeof CoverLetterSchema>;

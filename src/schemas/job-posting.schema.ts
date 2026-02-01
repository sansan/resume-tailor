import { z } from 'zod'

// Salary Schema (optional field within JobPosting)
export const SalarySchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  currency: z.string().default('USD'),
  period: z.enum(['hourly', 'yearly']).default('yearly'),
})

// Job Posting Schema
export const JobPostingSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  description: z.string().min(1, 'Job description is required'),
  requirements: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  location: z.string().optional(),
  salary: SalarySchema.optional(),
})

// TypeScript types inferred from Zod schemas
export type Salary = z.infer<typeof SalarySchema>
export type JobPosting = z.infer<typeof JobPostingSchema>

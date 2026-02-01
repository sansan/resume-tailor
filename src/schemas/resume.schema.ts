import { z } from 'zod'

// Contact types enum for common contact methods
export const ContactTypeSchema = z.enum([
  'email',
  'phone',
  'linkedin',
  'github',
  'twitter',
  'instagram',
  'website',
  'portfolio',
  'other',
])

// Contact item schema
export const ContactSchema = z.object({
  type: ContactTypeSchema,
  value: z.string().min(1, 'Contact value is required'),
  label: z.string().optional(), // Optional custom label for 'other' type
})

// Personal Information Schema
// Use .nullish() to allow both null and undefined from AI responses
export const PersonalInfoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().nullish(),
  summary: z.string().nullish(),
  contacts: z.array(ContactSchema).default([]),
})

// Work Experience Schema
export const WorkExperienceSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  title: z.string().min(1, 'Job title is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().nullish(), // Optional for current positions
  location: z.string().nullish(),
  highlights: z.array(z.string()).default([]),
})

// Education Schema
export const EducationSchema = z.object({
  institution: z.string().min(1, 'Institution name is required'),
  degree: z.string().min(1, 'Degree is required'),
  field: z.string().nullish(),
  graduationDate: z.string().nullish(),
  gpa: z.string().nullish(),
  highlights: z.array(z.string()).default([]),
})

// Skill Schema
export const SkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).nullish(),
  category: z.string().nullish(),
})

// Project Schema
export const ProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().nullish(),
  technologies: z.array(z.string()).default([]),
  url: z.string().url('Invalid project URL').nullish(),
  highlights: z.array(z.string()).default([]),
})

// Certification Schema
export const CertificationSchema = z.object({
  name: z.string().min(1, 'Certification name is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  date: z.string().nullish(),
  url: z.string().url('Invalid certification URL').nullish(),
})

// Full Resume Schema
export const ResumeSchema = z.object({
  personalInfo: PersonalInfoSchema,
  workExperience: z.array(WorkExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  skills: z.array(SkillSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
})

// TypeScript types inferred from Zod schemas
export type ContactType = z.infer<typeof ContactTypeSchema>
export type Contact = z.infer<typeof ContactSchema>
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>
export type WorkExperience = z.infer<typeof WorkExperienceSchema>
export type Education = z.infer<typeof EducationSchema>
export type Skill = z.infer<typeof SkillSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Certification = z.infer<typeof CertificationSchema>
export type Resume = z.infer<typeof ResumeSchema>

// Contact type labels for UI display
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  email: 'Email',
  phone: 'Phone',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  twitter: 'Twitter/X',
  instagram: 'Instagram',
  website: 'Website',
  portfolio: 'Portfolio',
  other: 'Other',
}

// Contact type placeholders
export const CONTACT_TYPE_PLACEHOLDERS: Record<ContactType, string> = {
  email: 'john@example.com',
  phone: '+1 (555) 123-4567',
  linkedin: 'https://linkedin.com/in/johndoe',
  github: 'https://github.com/johndoe',
  twitter: 'https://twitter.com/johndoe',
  instagram: 'https://instagram.com/johndoe',
  website: 'https://johndoe.com',
  portfolio: 'https://portfolio.johndoe.com',
  other: 'Enter contact info...',
}

// Helper function to get a contact value by type
export function getContactByType(
  contacts: Contact[] | undefined,
  type: ContactType
): string | undefined {
  return contacts?.find(c => c.type === type)?.value
}

// Helper function to get all contacts of a specific type
export function getContactsByType(contacts: Contact[] | undefined, type: ContactType): Contact[] {
  return contacts?.filter(c => c.type === type) ?? []
}

// User Profile Schema (extends Resume with import metadata)
export const UserProfileSchema = z.object({
  resume: ResumeSchema,
  importedAt: z.string().datetime().optional(),
  sourceFile: z.string().optional(),
  lastModifiedAt: z.string().datetime().optional(),
})

export type UserProfile = z.infer<typeof UserProfileSchema>

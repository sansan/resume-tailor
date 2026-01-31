import { z } from 'zod';
import type { PDFTheme } from '../types/pdf-theme.types';

/**
 * Schema for AI provider selection.
 * Includes both CLI-based providers and API-based providers.
 */
export const AIProviderTypeSchema = z.enum(['claude', 'codex', 'gemini', 'openai']);
export type AIProviderTypeSetting = z.infer<typeof AIProviderTypeSchema>;

/**
 * PDF Theme Settings Schema
 *
 * Defines user-customizable theme settings for PDF generation.
 * Maps to the PDFTheme interface with Zod validation.
 */
export const PDFThemeSettingsSchema = z.object({
  colors: z.object({
    pageBackground: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#FFFFFF'),
    sidebarBackground: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#E9E6E1'),
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#2A2A2A'),
    body: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#3A3A3A'),
    titleText: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#4A4A4A'),
    muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#8A8A8A'),
    light: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#A6A6A6'),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#1C1C1C'),
    white: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#FFFFFF'),
  }),
  fonts: z.object({
    primary: z.string().default('Helvetica'),
    heading: z.string().default('Times-Roman'),
  }),
  fontSizes: z.object({
    name: z.number().min(12).max(36).default(22),
    sectionTitle: z.number().min(10).max(24).default(11),
    itemTitle: z.number().min(8).max(18).default(10),
    body: z.number().min(8).max(14).default(9),
    small: z.number().min(6).max(12).default(8),
    tiny: z.number().min(5).max(10).default(7),
  }),
  spacing: z.object({
    page: z.number().min(20).max(80).default(40),
    sectionGap: z.number().min(8).max(40).default(22),
    itemGap: z.number().min(4).max(24).default(14),
    lineHeight: z.number().min(1).max(2).default(1.45),
  }),
  layout: z.object({
    sidebarWidth: z.number().min(100).max(250).default(170),
    gutter: z.number().min(10).max(60).default(30),
  }),
});

/**
 * File naming pattern variables schema.
 * Available variables: {company}, {date}, {title}, {name}
 */
export const FileNamingPatternSchema = z.string()
  .min(1, 'File naming pattern is required')
  .max(200, 'File naming pattern is too long')
  .default('{company}-resume-{date}');

/**
 * Custom prompt template schema for resume refinement.
 */
export const ResumePromptTemplateSettingsSchema = z.object({
  maxSummaryLength: z.number().min(100).max(1000).default(500),
  maxHighlightsPerExperience: z.number().min(1).max(10).default(6),
  tone: z.enum(['professional', 'conversational', 'technical']).default('professional'),
  focusAreas: z.array(z.enum(['skills', 'experience', 'achievements', 'education'])).default(['skills', 'experience', 'achievements']),
  customInstructions: z.string().max(2000).default(''),
  preserveAllContent: z.boolean().default(false),
});

/**
 * Custom prompt template schema for cover letter generation.
 */
export const CoverLetterPromptTemplateSettingsSchema = z.object({
  maxOpeningLength: z.number().min(100).max(500).default(300),
  maxBodyParagraphs: z.number().min(1).max(5).default(3),
  tone: z.enum(['formal', 'conversational', 'enthusiastic']).default('formal'),
  focusAreas: z.array(z.enum(['technical-skills', 'leadership', 'achievements', 'culture-fit', 'career-growth'])).default(['achievements', 'technical-skills']),
  customInstructions: z.string().max(2000).default(''),
  style: z.enum(['concise', 'detailed', 'storytelling']).default('detailed'),
  emphasizeCompanyKnowledge: z.boolean().default(true),
});

/**
 * Main App Settings Schema
 *
 * Defines all user-configurable settings for the application.
 */
export const AppSettingsSchema = z.object({
  // Output folder configuration
  outputFolderPath: z.string().default(''),  // Empty string means use default (Documents/cv-rebu-exports)
  createCompanySubfolders: z.boolean().default(true),
  fileNamingPattern: FileNamingPatternSchema,

  // AI prompt templates
  resumePromptTemplate: ResumePromptTemplateSettingsSchema,
  coverLetterPromptTemplate: CoverLetterPromptTemplateSettingsSchema,

  // PDF theme customization
  pdfTheme: PDFThemeSettingsSchema,

  // Onboarding state
  onboardingComplete: z.boolean().default(false),

  // AI provider selection
  selectedProvider: AIProviderTypeSchema.nullable().default(null),  // null means auto-select first available

  // Settings metadata
  version: z.number().default(1),  // Schema version for migrations
});

/**
 * Partial settings schema for updates (all fields optional).
 */
export const PartialAppSettingsSchema = AppSettingsSchema.partial();

/**
 * TypeScript types inferred from Zod schemas.
 */
export type PDFThemeSettings = z.infer<typeof PDFThemeSettingsSchema>;
export type ResumePromptTemplateSettings = z.infer<typeof ResumePromptTemplateSettingsSchema>;
export type CoverLetterPromptTemplateSettings = z.infer<typeof CoverLetterPromptTemplateSettingsSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type PartialAppSettings = z.infer<typeof PartialAppSettingsSchema>;

/**
 * Default settings values.
 * These are used when settings don't exist or need to be reset.
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  outputFolderPath: '',
  createCompanySubfolders: true,
  fileNamingPattern: '{company}-resume-{date}',
  resumePromptTemplate: {
    maxSummaryLength: 500,
    maxHighlightsPerExperience: 6,
    tone: 'professional',
    focusAreas: ['skills', 'experience', 'achievements'],
    customInstructions: '',
    preserveAllContent: false,
  },
  coverLetterPromptTemplate: {
    maxOpeningLength: 300,
    maxBodyParagraphs: 3,
    tone: 'formal',
    focusAreas: ['achievements', 'technical-skills'],
    customInstructions: '',
    style: 'detailed',
    emphasizeCompanyKnowledge: true,
  },
  onboardingComplete: false,
  selectedProvider: null,
  pdfTheme: {
    colors: {
      pageBackground: '#FFFFFF',
      sidebarBackground: '#E9E6E1',
      primary: '#2A2A2A',
      body: '#3A3A3A',
      titleText: '#4A4A4A',
      muted: '#8A8A8A',
      light: '#A6A6A6',
      accent: '#1C1C1C',
      white: '#FFFFFF',
    },
    fonts: {
      primary: 'Helvetica',
      heading: 'Times-Roman',
    },
    fontSizes: {
      name: 22,
      sectionTitle: 11,
      itemTitle: 10,
      body: 9,
      small: 8,
      tiny: 7,
    },
    spacing: {
      page: 40,
      sectionGap: 22,
      itemGap: 14,
      lineHeight: 1.45,
    },
    layout: {
      sidebarWidth: 170,
      gutter: 30,
    },
  },
  version: 1,
};

/**
 * Available file naming pattern variables with descriptions.
 */
export const FILE_NAMING_VARIABLES = [
  { variable: '{company}', description: 'Company name from job posting' },
  { variable: '{date}', description: 'Current date (YYYY-MM-DD format)' },
  { variable: '{title}', description: 'Job title from job posting' },
  { variable: '{name}', description: 'Candidate name from resume' },
] as const;

/**
 * List of supported fonts for PDF generation.
 * These are the fonts available in @react-pdf/renderer.
 */
export const SUPPORTED_PDF_FONTS = [
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Helvetica-BoldOblique',
  'Times-Roman',
  'Times-Bold',
  'Times-Italic',
  'Times-BoldItalic',
  'Courier',
  'Courier-Bold',
  'Courier-Oblique',
  'Courier-BoldOblique',
] as const;

/**
 * Validates that theme settings are compatible with PDFTheme interface.
 */
export function convertToPDFTheme(settings: PDFThemeSettings): PDFTheme {
  return {
    colors: {
      pageBackground: settings.colors.pageBackground,
      sidebarBackground: settings.colors.sidebarBackground,
      primary: settings.colors.primary,
      body: settings.colors.body,
      titleText: settings.colors.titleText,
      muted: settings.colors.muted,
      light: settings.colors.light,
      accent: settings.colors.accent,
      white: settings.colors.white,
    },
    fonts: {
      primary: settings.fonts.primary,
      heading: settings.fonts.heading,
    },
    fontSizes: {
      name: settings.fontSizes.name,
      sectionTitle: settings.fontSizes.sectionTitle,
      itemTitle: settings.fontSizes.itemTitle,
      body: settings.fontSizes.body,
      small: settings.fontSizes.small,
      tiny: settings.fontSizes.tiny,
    },
    spacing: {
      page: settings.spacing.page,
      sectionGap: settings.spacing.sectionGap,
      itemGap: settings.spacing.itemGap,
      lineHeight: settings.spacing.lineHeight,
    },
    layout: {
      sidebarWidth: settings.layout.sidebarWidth,
      gutter: settings.layout.gutter,
    },
  };
}

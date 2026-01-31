// Resume schemas and types
export {
  PersonalInfoSchema,
  WorkExperienceSchema,
  EducationSchema,
  SkillSchema,
  ProjectSchema,
  CertificationSchema,
  ResumeSchema,
  type PersonalInfo,
  type WorkExperience,
  type Education,
  type Skill,
  type Project,
  type Certification,
  type Resume,
} from './resume.schema';

// Cover letter schemas and types
export {
  CoverLetterSchema,
  type CoverLetter,
} from './cover-letter.schema';

// Job posting schemas and types
export {
  SalarySchema,
  JobPostingSchema,
  type Salary,
  type JobPosting,
} from './job-posting.schema';

// AI output schemas and types
export {
  RefinementMetadataSchema,
  RefinedResumeSchema,
  CoverLetterMetadataSchema,
  GeneratedCoverLetterSchema,
  AIErrorCodeSchema,
  AIErrorSchema,
  AISuccessResponseSchema,
  AIErrorResponseSchema,
  createAIResponseSchema,
  RefinedResumeResponseSchema,
  GeneratedCoverLetterResponseSchema,
  type RefinementMetadata,
  type RefinedResume,
  type CoverLetterMetadata,
  type GeneratedCoverLetter,
  type AIErrorCode,
  type AIError,
  type AISuccessResponse,
  type AIErrorResponse,
  type AIResponse,
  type RefinedResumeResponse,
  type GeneratedCoverLetterResponse,
} from './ai-output.schema';

// Settings schemas and types
export {
  PDFThemeSettingsSchema,
  FileNamingPatternSchema,
  ResumePromptTemplateSettingsSchema,
  CoverLetterPromptTemplateSettingsSchema,
  AppSettingsSchema,
  PartialAppSettingsSchema,
  DEFAULT_APP_SETTINGS,
  FILE_NAMING_VARIABLES,
  SUPPORTED_PDF_FONTS,
  convertToPDFTheme,
  type PDFThemeSettings,
  type ResumePromptTemplateSettings,
  type CoverLetterPromptTemplateSettings,
  type AppSettings,
  type PartialAppSettings,
} from './settings.schema';

// History schemas and types
export {
  HistoryEntrySchema,
  ExportHistorySchema,
  DEFAULT_EXPORT_HISTORY,
  MAX_HISTORY_ENTRIES,
  generateHistoryEntryId,
  type HistoryEntry,
  type ExportHistory,
} from './history.schema';

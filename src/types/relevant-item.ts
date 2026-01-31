import type { WorkExperience, Project } from '../schemas/resume.schema';

/**
 * Represents a scored item for relevance ranking.
 * Used by AI to select top items for "Relevant Experience" section.
 */
export type RelevantItemType = 'job' | 'project';

export interface RelevantItem {
  /** The type of item */
  type: RelevantItemType;
  /** Relevance score (0-100) assigned by AI */
  score: number;
  /** The actual item data */
  data: WorkExperience | Project;
}

/**
 * Type guard to check if an item is a work experience entry.
 */
export function isWorkExperience(item: RelevantItem): item is RelevantItem & { data: WorkExperience } {
  return item.type === 'job';
}

/**
 * Type guard to check if an item is a project entry.
 */
export function isProject(item: RelevantItem): item is RelevantItem & { data: Project } {
  return item.type === 'project';
}

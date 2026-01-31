/**
 * Template Factory
 *
 * Provides a factory function to select the appropriate PDF template
 * component based on the templateId.
 */

import type { Resume } from '@schemas/resume.schema';
import type { PDFTheme } from '@app-types/pdf-theme.types';
import { ClassicTemplate } from './ClassicTemplate';
import { ModernTemplate } from './ModernTemplate';
import { CreativeTemplate } from './CreativeTemplate';
import { ExecutiveTemplate } from './ExecutiveTemplate';

/**
 * Common props shared by all template components.
 */
export interface TemplateProps {
  resume: Resume;
  theme: PDFTheme;
  targetJobTitle?: string;
}

/**
 * Available template IDs.
 */
export const TEMPLATE_IDS = {
  CLASSIC: 'classic',
  MODERN: 'modern',
  CREATIVE: 'creative',
  EXECUTIVE: 'executive',
} as const;

export type TemplateId = (typeof TEMPLATE_IDS)[keyof typeof TEMPLATE_IDS];

/**
 * Template component map for direct lookup.
 */
const TEMPLATE_COMPONENTS: Record<string, React.ComponentType<TemplateProps>> = {
  [TEMPLATE_IDS.CLASSIC]: ClassicTemplate,
  [TEMPLATE_IDS.MODERN]: ModernTemplate,
  [TEMPLATE_IDS.CREATIVE]: CreativeTemplate,
  [TEMPLATE_IDS.EXECUTIVE]: ExecutiveTemplate,
};

/**
 * Returns the component for the given templateId.
 */
export function getTemplateComponent(templateId: string): React.ComponentType<TemplateProps> {
  return TEMPLATE_COMPONENTS[templateId] ?? ClassicTemplate;
}

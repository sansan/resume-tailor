/**
 * PDF Templates Index
 *
 * Exports all available resume PDF templates and a factory function
 * to select the appropriate template based on templateId.
 */

export { ClassicTemplate } from './ClassicTemplate'
export { ModernTemplate } from './ModernTemplate'
export { CreativeTemplate } from './CreativeTemplate'
export { ExecutiveTemplate } from './ExecutiveTemplate'
export { getTemplateComponent, type TemplateProps, TEMPLATE_IDS } from './template-factory'

/**
 * PDF Theme Configuration
 *
 * Defines all styling constants for the resume and cover letter PDF documents.
 * Implements the editorial-style template design.
 */

// Re-export the shared PDFTheme type
export type { PDFTheme, PartialPDFTheme } from '@app-types/pdf-theme.types';
import type { PDFTheme } from '@app-types/pdf-theme.types';

/**
 * Default PDF theme - Editorial style with warm gray accents.
 */
export const defaultPDFTheme: PDFTheme = {
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
};

import type { PartialPDFTheme } from '@app-types/pdf-theme.types';

/**
 * Creates a PDF theme by merging user overrides with defaults.
 */
export function createPDFTheme(overrides?: PartialPDFTheme): PDFTheme {
  if (!overrides) {
    return defaultPDFTheme;
  }

  return {
    colors: {
      ...defaultPDFTheme.colors,
      ...overrides.colors,
    },
    fonts: {
      ...defaultPDFTheme.fonts,
      ...overrides.fonts,
    },
    fontSizes: {
      ...defaultPDFTheme.fontSizes,
      ...overrides.fontSizes,
    },
    spacing: {
      ...defaultPDFTheme.spacing,
      ...overrides.spacing,
    },
    layout: {
      ...defaultPDFTheme.layout,
      ...overrides.layout,
    },
  };
}

export const pdfTheme: PDFTheme = defaultPDFTheme;
export default pdfTheme;

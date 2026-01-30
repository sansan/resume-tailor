/**
 * PDF Theme Configuration
 *
 * Defines all styling constants for the resume and cover letter PDF documents.
 * Implements the editorial-style template design.
 */

export interface PDFTheme {
  colors: {
    /** Page background - white */
    pageBackground: string;
    /** Sidebar and job title box background - light warm gray */
    sidebarBackground: string;
    /** Primary text color - near black */
    primary: string;
    /** Body text color - dark gray */
    body: string;
    /** Job title text - dark gray (high contrast) */
    titleText: string;
    /** Muted text - medium gray */
    muted: string;
    /** Light text - for subtle elements */
    light: string;
    /** Accent color - black for header bars */
    accent: string;
    /** White - for text on dark backgrounds */
    white: string;
  };
  fonts: {
    /** Primary font for body text */
    primary: string;
    /** Heading font for editorial feel */
    heading: string;
  };
  fontSizes: {
    /** Large name in header */
    name: number;
    /** Section titles */
    sectionTitle: number;
    /** Item titles (job titles, etc.) */
    itemTitle: number;
    /** Body text */
    body: number;
    /** Small text (dates, metadata) */
    small: number;
    /** Tiny text (bullets, captions) */
    tiny: number;
  };
  spacing: {
    /** Page margins */
    page: number;
    /** Gap between sections */
    sectionGap: number;
    /** Gap between items */
    itemGap: number;
    /** Line height multiplier */
    lineHeight: number;
  };
  layout: {
    /** Sidebar width in points */
    sidebarWidth: number;
    /** Gutter between sidebar and main content */
    gutter: number;
  };
}

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

/**
 * Partial theme type for overrides.
 */
export type PartialPDFTheme = {
  colors?: Partial<PDFTheme['colors']>;
  fonts?: Partial<PDFTheme['fonts']>;
  fontSizes?: Partial<PDFTheme['fontSizes']>;
  spacing?: Partial<PDFTheme['spacing']>;
  layout?: Partial<PDFTheme['layout']>;
};

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

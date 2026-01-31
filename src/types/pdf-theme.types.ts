/**
 * PDF Theme Type Definitions
 *
 * Defines the structure for PDF styling configuration.
 * Used by both schemas (for validation) and renderer (for PDF generation).
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
 * Partial theme type for overrides.
 */
export type PartialPDFTheme = {
  colors?: Partial<PDFTheme['colors']>;
  fonts?: Partial<PDFTheme['fonts']>;
  fontSizes?: Partial<PDFTheme['fontSizes']>;
  spacing?: Partial<PDFTheme['spacing']>;
  layout?: Partial<PDFTheme['layout']>;
};

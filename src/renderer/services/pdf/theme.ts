/**
 * PDF Theme Configuration
 *
 * Defines all styling constants for the resume and cover letter PDF documents.
 * Implements the editorial-style template design.
 */

// Re-export the shared PDFTheme type
export type { PDFTheme, PartialPDFTheme } from '@app-types/pdf-theme.types'
import type { PDFTheme } from '@app-types/pdf-theme.types'

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
}

import type { PartialPDFTheme } from '@app-types/pdf-theme.types'

/**
 * Creates a PDF theme by merging user overrides with defaults.
 */
export function createPDFTheme(overrides?: PartialPDFTheme): PDFTheme {
  if (!overrides) {
    return defaultPDFTheme
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
  }
}

export const pdfTheme: PDFTheme = defaultPDFTheme
export default pdfTheme

/**
 * Color palette interface for theme creation.
 */
export interface ColorPalette {
  id: string
  name: string
  primary: string
  secondary: string
  accent: string
}

/**
 * Converts a hex color to a lighter version (for backgrounds).
 * Returns a hex color with opacity applied as a lighter shade.
 */
function adjustColorOpacity(hexColor: string, opacity: number): string {
  // Parse hex color
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Blend with white based on opacity
  const blend = 1 - opacity
  const newR = Math.round(r * opacity + 255 * blend)
  const newG = Math.round(g * opacity + 255 * blend)
  const newB = Math.round(b * opacity + 255 * blend)

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

/**
 * Creates a PDF theme by applying a color palette to the default theme.
 * Maps palette colors to appropriate theme colors.
 */
export function createThemeFromPalette(palette: ColorPalette): PDFTheme {
  return {
    ...defaultPDFTheme,
    colors: {
      ...defaultPDFTheme.colors,
      // Primary color for headings and name
      primary: palette.primary,
      // Accent color for header bars and highlights
      accent: palette.secondary,
      // Use secondary as sidebar background tint
      sidebarBackground: adjustColorOpacity(palette.accent, 0.15),
    },
  }
}

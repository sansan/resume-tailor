import React, { useMemo } from 'react'
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer'
import type { GeneratedCoverLetter } from '@schemas/ai-output.schema'
import type { PersonalInfo } from '@schemas/resume.schema'
import { getContactByType } from '@schemas/resume.schema'
import { defaultPDFTheme, type PDFTheme } from './theme'

// =============================================================================
// LAYOUT CONSTANTS (points)
// =============================================================================
const LAYOUT = {
  padTop: 50,
  padBottom: 50,
  padLeft: 50,
  padRight: 50,
  mastheadH: 60,
  titleBoxMinW: 180,
}

// =============================================================================
// STYLE FACTORY
// =============================================================================
function createStyles(theme: PDFTheme) {
  return StyleSheet.create({
    page: {
      backgroundColor: theme.colors.pageBackground,
      paddingTop: LAYOUT.padTop,
      paddingBottom: LAYOUT.padBottom,
      paddingLeft: LAYOUT.padLeft,
      paddingRight: LAYOUT.padRight,
      fontFamily: theme.fonts.primary,
      fontSize: 10,
    },

    // Header row (matches resume)
    header: {
      height: LAYOUT.mastheadH,
      marginBottom: 30,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    nameWrap: {
      flexGrow: 1,
      paddingRight: 16,
      maxWidth: 450,
      justifyContent: 'center',
    },
    nameText: {
      fontSize: theme.fontSizes.name,
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 8,
    },
    titleBox: {
      minWidth: LAYOUT.titleBoxMinW,
      backgroundColor: theme.colors.sidebarBackground,
      paddingVertical: 10,
      paddingHorizontal: 18,
      alignItems: 'flex-end',
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    titleText: {
      fontSize: theme.fontSizes.small,
      fontFamily: theme.fonts.primary,
      color: theme.colors.titleText,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },

    // Letter body
    letterBody: {
      paddingTop: 10,
    },

    // Date
    date: {
      fontSize: 10,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
      marginBottom: 20,
    },

    // Recipient block
    recipientBlock: {
      marginBottom: 30,
    },
    recipientName: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.primary,
      marginBottom: 2,
    },
    recipientInfo: {
      fontSize: 10,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      marginBottom: 2,
    },

    // Salutation
    salutation: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.primary,
      marginBottom: 20,
    },

    // Paragraphs
    paragraph: {
      fontSize: 10,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      lineHeight: 1.6,
      marginBottom: 14,
      textAlign: 'left',
    },

    // Closing
    closingText: {
      fontSize: 10,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      marginTop: 20,
      marginBottom: 40,
    },

    // Signature
    signatureName: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    signatureContact: {
      fontSize: 9,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
      marginBottom: 2,
    },
    signatureLink: {
      fontSize: 9,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
      textDecoration: 'none',
      marginBottom: 2,
    },
  })
}

// =============================================================================
// HELPERS
// =============================================================================
function formatDate(dateStr?: string | null): string {
  if (dateStr) return dateStr
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================
export interface CoverLetterPDFDocumentProps {
  coverLetter: GeneratedCoverLetter
  /** Personal info for header name and signature contact details */
  personalInfo?: PersonalInfo | undefined
  /** Job title to display in header (position applying for) */
  targetJobTitle?: string | undefined
  /** Optional theme override */
  theme?: PDFTheme | undefined
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
function CoverLetterPDFDocument({
  coverLetter,
  personalInfo,
  targetJobTitle,
  theme,
}: CoverLetterPDFDocumentProps): React.JSX.Element {
  const {
    recipientName,
    recipientTitle,
    companyName,
    companyAddress,
    date,
    opening,
    body,
    closing,
    signature,
  } = coverLetter

  const styles = useMemo(() => createStyles(theme ?? defaultPDFTheme), [theme])

  // Name for header - ensure not empty
  const displayName = (personalInfo?.name || signature || '').trim() || 'Your Name'

  // Job title for header box
  const displayTitle = (targetJobTitle || '').trim()

  // Salutation
  const recipientNameTrimmed = (recipientName || '').trim()
  const salutation = recipientNameTrimmed ? `Dear ${recipientNameTrimmed},` : 'Dear Hiring Manager,'

  // Formatted date
  const formattedDate = formatDate(date)

  // Signature - ensure not empty
  const displaySignature = (signature || '').trim() || displayName

  // Body paragraphs - ensure array and filter empty
  const bodyParagraphs = (body || []).filter(para => para && para.trim())

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header (matches resume) */}
        <View style={styles.header}>
          <View style={styles.nameWrap}>
            <Text style={styles.nameText}>{displayName}</Text>
          </View>
          {displayTitle ? (
            <View style={styles.titleBox}>
              <Text style={styles.titleText}>{displayTitle}</Text>
            </View>
          ) : null}
        </View>

        {/* Full-width letter body */}
        <View style={styles.letterBody}>
          {/* Date */}
          <Text style={styles.date}>{formattedDate}</Text>

          {/* Recipient block */}
          <View style={styles.recipientBlock}>
            {recipientName?.trim() ? (
              <Text style={styles.recipientName}>{recipientName}</Text>
            ) : null}
            {recipientTitle?.trim() ? (
              <Text style={styles.recipientInfo}>{recipientTitle}</Text>
            ) : null}
            {companyName?.trim() ? <Text style={styles.recipientInfo}>{companyName}</Text> : null}
            {companyAddress?.trim() ? (
              <Text style={styles.recipientInfo}>{companyAddress}</Text>
            ) : null}
          </View>

          {/* Salutation */}
          <Text style={styles.salutation}>{salutation}</Text>

          {/* Opening paragraph */}
          {opening?.trim() ? <Text style={styles.paragraph}>{opening}</Text> : null}

          {/* Body paragraphs */}
          {bodyParagraphs.map((para, i) => (
            <Text key={i} style={styles.paragraph}>
              {para}
            </Text>
          ))}

          {/* Closing paragraph */}
          {closing?.trim() ? <Text style={styles.paragraph}>{closing}</Text> : null}

          {/* Sign-off */}
          <Text style={styles.closingText}>Sincerely,</Text>

          {/* Signature */}
          <Text style={styles.signatureName}>{displaySignature}</Text>
          {(() => {
            const phone = getContactByType(personalInfo?.contacts, 'phone')
            return phone && phone.trim() ? (
              <Text style={styles.signatureContact}>{phone}</Text>
            ) : null
          })()}
          {(() => {
            const email = getContactByType(personalInfo?.contacts, 'email')
            return email && email.trim() ? (
              <Link style={styles.signatureLink} src={`mailto:${email}`}>
                {email}
              </Link>
            ) : null
          })()}
        </View>
      </Page>
    </Document>
  )
}

export default CoverLetterPDFDocument

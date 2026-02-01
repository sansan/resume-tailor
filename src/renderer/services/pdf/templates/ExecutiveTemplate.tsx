/**
 * Executive Template
 *
 * Sophisticated design for senior professionals with an elegant
 * serif typography, refined spacing, and understated styling.
 */

import React, { useMemo } from 'react'
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer'
import { getContactByType } from '@schemas/resume.schema'
import type { TemplateProps } from './template-factory'
import type { PDFTheme } from '@app-types/pdf-theme.types'

// =============================================================================
// STYLE FACTORY
// =============================================================================
function createStyles(theme: PDFTheme) {
  return StyleSheet.create({
    page: {
      backgroundColor: theme.colors.pageBackground,
      paddingTop: 55,
      paddingBottom: 55,
      paddingHorizontal: 55,
      fontFamily: theme.fonts.primary,
      fontSize: theme.fontSizes.body,
    },
    // Header - elegant centered with decorative line
    header: {
      alignItems: 'center',
      marginBottom: 25,
    },
    name: {
      fontSize: 26,
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      letterSpacing: 6,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    title: {
      fontSize: 10,
      fontFamily: theme.fonts.heading,
      color: theme.colors.muted,
      fontStyle: 'italic',
      marginBottom: 16,
    },
    headerLine: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginBottom: 16,
    },
    headerLineSide: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.primary,
    },
    headerLineDiamond: {
      width: 6,
      height: 6,
      backgroundColor: theme.colors.primary,
      transform: 'rotate(45deg)',
      marginHorizontal: 12,
    },
    // Contact - centered row
    contactRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 20,
    },
    contactItem: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
    },
    contactLink: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
      textDecoration: 'none',
    },
    // Summary - elegant quote style
    summaryWrap: {
      marginVertical: 25,
      paddingHorizontal: 40,
    },
    summaryQuote: {
      fontSize: 24,
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      opacity: 0.3,
      marginBottom: -10,
    },
    summary: {
      fontSize: 9.5,
      fontFamily: theme.fonts.heading,
      color: theme.colors.body,
      lineHeight: 1.7,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    // Section styling
    section: {
      marginBottom: 22,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 10,
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 4,
    },
    sectionLineFill: {
      flex: 1,
      height: 0.5,
      backgroundColor: theme.colors.light,
      marginLeft: 15,
    },
    // Experience items
    item: {
      marginBottom: 18,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 3,
    },
    itemTitle: {
      fontSize: 10,
      fontFamily: theme.fonts.heading,
      color: theme.colors.body,
    },
    itemDate: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
    },
    itemCompany: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.primary,
      marginBottom: 6,
    },
    bulletList: {
      paddingLeft: 8,
    },
    bulletItem: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    bulletChar: {
      width: 14,
      fontSize: 8,
      color: theme.colors.light,
    },
    bulletText: {
      flex: 1,
      fontSize: 8.5,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      lineHeight: 1.55,
    },
    // Two column footer
    footer: {
      flexDirection: 'row',
      gap: 40,
      marginTop: 10,
    },
    footerColumn: {
      flex: 1,
    },
    // Skills - elegant list
    skillList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    skillItem: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '50%',
      marginBottom: 4,
    },
    skillDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: theme.colors.primary,
      marginRight: 8,
    },
    skillText: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
    },
    // Education - refined
    eduItem: {
      marginBottom: 12,
    },
    eduDegree: {
      fontSize: 9,
      fontFamily: theme.fonts.heading,
      color: theme.colors.body,
      marginBottom: 2,
    },
    eduDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    eduInstitution: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.primary,
    },
    eduDate: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
    },
    // Certifications
    certItem: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 6,
    },
    certName: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      flex: 1,
    },
    certDate: {
      fontSize: 7,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
    },
  })
}

// =============================================================================
// HELPERS
// =============================================================================
function formatDateRange(start: string, end?: string | null): string {
  return `${start} – ${end || 'Present'}`
}

// =============================================================================
// COMPONENT
// =============================================================================
export function ExecutiveTemplate({
  resume,
  theme,
  targetJobTitle,
}: TemplateProps): React.JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme])
  const { personalInfo, education, skills, certifications, workExperience } = resume

  const displayTitle = targetJobTitle || workExperience[0]?.title || ''
  const about = personalInfo.summary?.trim() || ''

  const email = getContactByType(personalInfo.contacts, 'email')
  const phone = getContactByType(personalInfo.contacts, 'phone')
  const linkedin = getContactByType(personalInfo.contacts, 'linkedin')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{personalInfo.name}</Text>
          {displayTitle && <Text style={styles.title}>{displayTitle}</Text>}

          {/* Decorative line */}
          <View style={styles.headerLine}>
            <View style={styles.headerLineSide} />
            <View style={styles.headerLineDiamond} />
            <View style={styles.headerLineSide} />
          </View>

          {/* Contact */}
          <View style={styles.contactRow}>
            {email && (
              <Link style={styles.contactLink} src={`mailto:${email}`}>
                {email}
              </Link>
            )}
            {phone && <Text style={styles.contactItem}>{phone}</Text>}
            {personalInfo.location && (
              <Text style={styles.contactItem}>{personalInfo.location}</Text>
            )}
            {linkedin && (
              <Link style={styles.contactLink} src={linkedin}>
                {linkedin.replace('https://', '').replace('www.', '')}
              </Link>
            )}
          </View>
        </View>

        {/* Summary */}
        {about && (
          <View style={styles.summaryWrap}>
            <Text style={styles.summaryQuote}>"</Text>
            <Text style={styles.summary}>{about}</Text>
          </View>
        )}

        {/* Experience */}
        {workExperience.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Professional Experience</Text>
              <View style={styles.sectionLineFill} />
            </View>
            {workExperience.map((job, i) => (
              <View key={i} style={styles.item}>
                <View style={styles.itemRow}>
                  <Text style={styles.itemTitle}>{job.title}</Text>
                  <Text style={styles.itemDate}>{formatDateRange(job.startDate, job.endDate)}</Text>
                </View>
                <Text style={styles.itemCompany}>
                  {job.company}
                  {job.location ? `, ${job.location}` : ''}
                </Text>
                {job.highlights && job.highlights.length > 0 && (
                  <View style={styles.bulletList}>
                    {job.highlights.map((h, hi) => (
                      <View key={hi} style={styles.bulletItem}>
                        <Text style={styles.bulletChar}>—</Text>
                        <Text style={styles.bulletText}>{h}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Footer - Skills & Education side by side */}
        <View style={styles.footer}>
          {/* Skills */}
          {skills.length > 0 && (
            <View style={styles.footerColumn}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Core Competencies</Text>
                <View style={styles.sectionLineFill} />
              </View>
              <View style={styles.skillList}>
                {skills.map((skill, i) => (
                  <View key={i} style={styles.skillItem}>
                    <View style={styles.skillDot} />
                    <Text style={styles.skillText}>{skill.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Education & Certifications */}
          <View style={styles.footerColumn}>
            {education.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Education</Text>
                  <View style={styles.sectionLineFill} />
                </View>
                {education.map((edu, i) => (
                  <View key={i} style={styles.eduItem}>
                    <Text style={styles.eduDegree}>
                      {edu.degree}
                      {edu.field ? ` in ${edu.field}` : ''}
                    </Text>
                    <View style={styles.eduDetails}>
                      <Text style={styles.eduInstitution}>{edu.institution}</Text>
                      {edu.graduationDate && (
                        <Text style={styles.eduDate}>{edu.graduationDate}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {certifications.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Credentials</Text>
                  <View style={styles.sectionLineFill} />
                </View>
                {certifications.map((cert, i) => (
                  <View key={i} style={styles.certItem}>
                    <Text style={styles.certName}>
                      {cert.name} — {cert.issuer}
                    </Text>
                    {cert.date && <Text style={styles.certDate}>{cert.date}</Text>}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}

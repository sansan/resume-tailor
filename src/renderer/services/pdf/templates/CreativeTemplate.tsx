/**
 * Creative Bold Template
 *
 * Eye-catching design with a bold colored header banner,
 * accent icons, and a dynamic two-column layout.
 */

import React, { useMemo } from 'react'
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer'
import type { Skill } from '@schemas/resume.schema'
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
      fontFamily: theme.fonts.primary,
      fontSize: theme.fontSizes.body,
    },
    // Full-width header banner
    headerBanner: {
      backgroundColor: theme.colors.primary,
      paddingTop: 35,
      paddingBottom: 35,
      paddingHorizontal: 45,
    },
    name: {
      fontSize: 32,
      fontFamily: theme.fonts.primary,
      color: theme.colors.white,
      letterSpacing: 2,
      marginBottom: 6,
    },
    title: {
      fontSize: 12,
      fontFamily: theme.fonts.primary,
      color: theme.colors.white,
      opacity: 0.85,
      textTransform: 'uppercase',
      letterSpacing: 3,
      marginBottom: 14,
    },
    // Contact row in header
    contactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    contactIcon: {
      fontSize: 8,
      color: theme.colors.white,
      opacity: 0.7,
      marginRight: 6,
    },
    contactText: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.white,
      opacity: 0.9,
    },
    contactLink: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.white,
      opacity: 0.9,
      textDecoration: 'none',
    },
    // Main content area
    content: {
      padding: 45,
      paddingTop: 30,
    },
    // Two column layout
    columns: {
      flexDirection: 'row',
      gap: 30,
    },
    mainColumn: {
      flex: 2,
    },
    sideColumn: {
      flex: 1,
    },
    // Section styling
    section: {
      marginBottom: 22,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionAccent: {
      width: 4,
      height: 16,
      backgroundColor: theme.colors.primary,
      marginRight: 10,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    // Summary
    summary: {
      fontSize: 9,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      lineHeight: 1.65,
      marginBottom: 20,
      paddingLeft: 14,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.sidebarBackground,
    },
    // Experience items
    item: {
      marginBottom: 16,
    },
    itemTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.body,
      marginBottom: 2,
    },
    itemMeta: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.primary,
      marginBottom: 6,
    },
    itemLocation: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
    },
    bulletList: {
      paddingLeft: 4,
    },
    bulletItem: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    bulletChar: {
      width: 12,
      fontSize: 10,
      color: theme.colors.primary,
      paddingTop: 0,
    },
    bulletText: {
      flex: 1,
      fontSize: 8.5,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      lineHeight: 1.5,
    },
    // Skills - progress bar style
    skillItem: {
      marginBottom: 10,
    },
    skillName: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      marginBottom: 3,
    },
    skillBarBg: {
      height: 4,
      backgroundColor: theme.colors.sidebarBackground,
      borderRadius: 2,
    },
    skillBarFill: {
      height: 4,
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
    // Education
    eduItem: {
      marginBottom: 12,
    },
    eduDegree: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.body,
      marginBottom: 2,
    },
    eduInstitution: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
      marginBottom: 1,
    },
    eduDate: {
      fontSize: 7,
      fontFamily: theme.fonts.primary,
      color: theme.colors.primary,
    },
    // Certifications
    certItem: {
      marginBottom: 8,
    },
    certName: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.body,
    },
    certIssuer: {
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

function getSkillLevel(skill: Skill): number {
  switch (skill.level) {
    case 'expert':
      return 100
    case 'advanced':
      return 80
    case 'intermediate':
      return 60
    case 'beginner':
      return 40
    default:
      return 70
  }
}

// =============================================================================
// COMPONENT
// =============================================================================
export function CreativeTemplate({
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
        {/* Header Banner */}
        <View style={styles.headerBanner}>
          <Text style={styles.name}>{personalInfo.name}</Text>
          {displayTitle && <Text style={styles.title}>{displayTitle}</Text>}

          <View style={styles.contactRow}>
            {email && (
              <View style={styles.contactItem}>
                <Text style={styles.contactIcon}>✉</Text>
                <Link style={styles.contactLink} src={`mailto:${email}`}>
                  {email}
                </Link>
              </View>
            )}
            {phone && (
              <View style={styles.contactItem}>
                <Text style={styles.contactIcon}>☎</Text>
                <Text style={styles.contactText}>{phone}</Text>
              </View>
            )}
            {personalInfo.location && (
              <View style={styles.contactItem}>
                <Text style={styles.contactIcon}>◎</Text>
                <Text style={styles.contactText}>{personalInfo.location}</Text>
              </View>
            )}
            {linkedin && (
              <View style={styles.contactItem}>
                <Text style={styles.contactIcon}>▣</Text>
                <Link style={styles.contactLink} src={linkedin}>
                  {linkedin.replace('https://', '').replace('www.', '')}
                </Link>
              </View>
            )}
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Summary */}
          {about && <Text style={styles.summary}>{about}</Text>}

          <View style={styles.columns}>
            {/* Main Column - Experience */}
            <View style={styles.mainColumn}>
              {workExperience.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionAccent} />
                    <Text style={styles.sectionTitle}>Experience</Text>
                  </View>
                  {workExperience.map((job, i) => (
                    <View key={i} style={styles.item}>
                      <Text style={styles.itemTitle}>{job.title}</Text>
                      <Text style={styles.itemMeta}>
                        {job.company} · {formatDateRange(job.startDate, job.endDate)}
                      </Text>
                      {job.location && <Text style={styles.itemLocation}>{job.location}</Text>}
                      {job.highlights && job.highlights.length > 0 && (
                        <View style={styles.bulletList}>
                          {job.highlights.map((h, hi) => (
                            <View key={hi} style={styles.bulletItem}>
                              <Text style={styles.bulletChar}>›</Text>
                              <Text style={styles.bulletText}>{h}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Side Column - Skills, Education, Certs */}
            <View style={styles.sideColumn}>
              {/* Skills */}
              {skills.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionAccent} />
                    <Text style={styles.sectionTitle}>Skills</Text>
                  </View>
                  {skills.map((skill, i) => (
                    <View key={i} style={styles.skillItem}>
                      <Text style={styles.skillName}>{skill.name}</Text>
                      <View style={styles.skillBarBg}>
                        <View
                          style={[styles.skillBarFill, { width: `${getSkillLevel(skill)}%` }]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Education */}
              {education.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionAccent} />
                    <Text style={styles.sectionTitle}>Education</Text>
                  </View>
                  {education.map((edu, i) => (
                    <View key={i} style={styles.eduItem}>
                      <Text style={styles.eduDegree}>
                        {edu.degree}
                        {edu.field ? ` in ${edu.field}` : ''}
                      </Text>
                      <Text style={styles.eduInstitution}>{edu.institution}</Text>
                      {edu.graduationDate && (
                        <Text style={styles.eduDate}>{edu.graduationDate}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Certifications */}
              {certifications.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionAccent} />
                    <Text style={styles.sectionTitle}>Certifications</Text>
                  </View>
                  {certifications.map((cert, i) => (
                    <View key={i} style={styles.certItem}>
                      <Text style={styles.certName}>{cert.name}</Text>
                      <Text style={styles.certIssuer}>
                        {cert.issuer}
                        {cert.date ? ` · ${cert.date}` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

/**
 * Modern Minimal Template
 *
 * Clean single-column layout with generous whitespace,
 * subtle dividers, and a focus on content hierarchy.
 */

import React, { useMemo } from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from '@react-pdf/renderer';
import type { Skill } from '@schemas/resume.schema';
import { getContactByType } from '@schemas/resume.schema';
import type { TemplateProps } from './template-factory';
import type { PDFTheme } from '@app-types/pdf-theme.types';

// =============================================================================
// STYLE FACTORY
// =============================================================================
function createStyles(theme: PDFTheme) {
  return StyleSheet.create({
    page: {
      backgroundColor: theme.colors.pageBackground,
      paddingTop: 50,
      paddingBottom: 50,
      paddingHorizontal: 50,
      fontFamily: theme.fonts.primary,
      fontSize: theme.fontSizes.body,
    },
    // Header - centered name with subtle styling
    header: {
      marginBottom: 30,
      alignItems: 'center',
    },
    name: {
      fontSize: 28,
      fontFamily: theme.fonts.primary,
      color: theme.colors.primary,
      letterSpacing: 3,
      marginBottom: 8,
    },
    title: {
      fontSize: 11,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 12,
    },
    // Contact row - horizontal layout
    contactRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 4,
    },
    contactItem: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
      paddingHorizontal: 8,
    },
    contactLink: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
      textDecoration: 'none',
      paddingHorizontal: 8,
    },
    contactDivider: {
      fontSize: 8,
      color: theme.colors.light,
    },
    // Divider line
    divider: {
      height: 1,
      backgroundColor: theme.colors.sidebarBackground,
      marginVertical: 20,
    },
    // Section styling
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      fontSize: 10,
      fontFamily: theme.fonts.primary,
      color: theme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 3,
      marginBottom: 12,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.sidebarBackground,
    },
    // Summary
    summary: {
      fontSize: 9,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      lineHeight: 1.7,
      textAlign: 'center',
      paddingHorizontal: 30,
    },
    // Experience items
    item: {
      marginBottom: 16,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 4,
    },
    itemTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.body,
    },
    itemDate: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
    },
    itemSubtitle: {
      fontSize: 9,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
      marginBottom: 6,
    },
    bulletList: {
      paddingLeft: 12,
    },
    bulletItem: {
      flexDirection: 'row',
      marginBottom: 3,
    },
    bulletChar: {
      width: 8,
      fontSize: 6,
      color: theme.colors.primary,
      paddingTop: 2,
    },
    bulletText: {
      flex: 1,
      fontSize: 8.5,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      lineHeight: 1.5,
    },
    // Skills - horizontal flow
    skillsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    skillTag: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      backgroundColor: theme.colors.sidebarBackground,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 2,
    },
    // Education - compact
    eduItem: {
      marginBottom: 10,
    },
    eduHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    eduDegree: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.body,
    },
    eduDate: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
    },
    eduInstitution: {
      fontSize: 8,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
    },
    // Two column footer for skills and education
    twoColumn: {
      flexDirection: 'row',
      gap: 30,
    },
    column: {
      flex: 1,
    },
  });
}

// =============================================================================
// HELPERS
// =============================================================================
function formatDateRange(start: string, end?: string | null): string {
  return `${start} – ${end || 'Present'}`;
}

function getAllSkills(skills: Skill[]): string[] {
  return skills.map((s) => s.name);
}

// =============================================================================
// COMPONENT
// =============================================================================
export function ModernTemplate({
  resume,
  theme,
  targetJobTitle,
}: TemplateProps): React.JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { personalInfo, education, skills, workExperience } = resume;

  const displayTitle = targetJobTitle || workExperience[0]?.title || '';
  const about = personalInfo.summary?.trim() || '';
  const allSkills = getAllSkills(skills);

  const email = getContactByType(personalInfo.contacts, 'email');
  const phone = getContactByType(personalInfo.contacts, 'phone');
  const linkedin = getContactByType(personalInfo.contacts, 'linkedin');

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{personalInfo.name}</Text>
          {displayTitle && <Text style={styles.title}>{displayTitle}</Text>}

          {/* Contact info */}
          <View style={styles.contactRow}>
            {email && (
              <>
                <Link style={styles.contactLink} src={`mailto:${email}`}>
                  {email}
                </Link>
                {(phone || personalInfo.location || linkedin) && (
                  <Text style={styles.contactDivider}>|</Text>
                )}
              </>
            )}
            {phone && (
              <>
                <Text style={styles.contactItem}>{phone}</Text>
                {(personalInfo.location || linkedin) && (
                  <Text style={styles.contactDivider}>|</Text>
                )}
              </>
            )}
            {personalInfo.location && (
              <>
                <Text style={styles.contactItem}>{personalInfo.location}</Text>
                {linkedin && <Text style={styles.contactDivider}>|</Text>}
              </>
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
          <>
            <Text style={styles.summary}>{about}</Text>
            <View style={styles.divider} />
          </>
        )}

        {/* Experience */}
        {workExperience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Experience</Text>
            {workExperience.slice(0, 3).map((job, i) => (
              <View key={i} style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{job.title}</Text>
                  <Text style={styles.itemDate}>
                    {formatDateRange(job.startDate, job.endDate)}
                  </Text>
                </View>
                <Text style={styles.itemSubtitle}>
                  {job.company}
                  {job.location ? ` · ${job.location}` : ''}
                </Text>
                {job.highlights && job.highlights.length > 0 && (
                  <View style={styles.bulletList}>
                    {job.highlights.map((h, hi) => (
                      <View key={hi} style={styles.bulletItem}>
                        <Text style={styles.bulletChar}>–</Text>
                        <Text style={styles.bulletText}>{h}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Skills & Education side by side */}
        <View style={styles.twoColumn}>
          {/* Skills */}
          {allSkills.length > 0 && (
            <View style={styles.column}>
              <Text style={styles.sectionHeader}>Skills</Text>
              <View style={styles.skillsGrid}>
                {allSkills.map((skill, i) => (
                  <Text key={i} style={styles.skillTag}>
                    {skill}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* Education */}
          {education.length > 0 && (
            <View style={styles.column}>
              <Text style={styles.sectionHeader}>Education</Text>
              {education.map((edu, i) => (
                <View key={i} style={styles.eduItem}>
                  <View style={styles.eduHeader}>
                    <Text style={styles.eduDegree}>
                      {edu.degree}
                      {edu.field ? ` in ${edu.field}` : ''}
                    </Text>
                    {edu.graduationDate && (
                      <Text style={styles.eduDate}>{edu.graduationDate}</Text>
                    )}
                  </View>
                  <Text style={styles.eduInstitution}>{edu.institution}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}

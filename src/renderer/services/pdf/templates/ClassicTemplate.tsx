/**
 * Classic Professional Template
 *
 * Traditional two-column layout with a sidebar for contact info,
 * education, and skills. Main content area for experience.
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
// LAYOUT CONSTANTS
// =============================================================================
const A4_HEIGHT = 842;
const HEADER_MARGIN_BOTTOM = 18;

const LAYOUT = {
  padTop: 40,
  padBottom: 40,
  padLeft: 40,
  padRight: 40,
  sidebarWidth: 195,
  gutter: 24,
  sidebarPadX: 14,
  sidebarPadY: 22,
  mastheadH1: 70,
  titleBoxMinW: 180,
  sectionGap: 22,
  headingToContent: 10,
  itemGap: 14,
  bulletGap: 4,
  rowHeight: A4_HEIGHT - 40 - 40 - 70 - HEADER_MARGIN_BOTTOM,
};

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
      fontSize: theme.fontSizes.body,
    },
    header: {
      height: LAYOUT.mastheadH1,
      marginBottom: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    nameWrap: {
      flexGrow: 1,
      paddingRight: 16,
      maxWidth: 400,
      justifyContent: 'center',
    },
    nameText: {
      fontSize: theme.fontSizes.name,
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 5,
    },
    titleBox: {
      minWidth: LAYOUT.titleBoxMinW,
      backgroundColor: theme.colors.sidebarBackground,
      marginTop: -LAYOUT.padTop,
      marginRight: -LAYOUT.padRight,
      marginBottom: -18,
      paddingTop: LAYOUT.padTop + 10,
      paddingBottom: 10 + 18,
      paddingLeft: 18,
      paddingRight: LAYOUT.padRight + 18,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
    },
    titleText: {
      fontSize: theme.fontSizes.small,
      fontFamily: theme.fonts.primary,
      color: theme.colors.titleText,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    row: {
      flexDirection: 'row',
      height: LAYOUT.rowHeight,
      width: '100%',
    },
    sidebar: {
      width: LAYOUT.sidebarWidth,
      flexShrink: 0,
      backgroundColor: theme.colors.sidebarBackground,
      marginLeft: -LAYOUT.padLeft,
      marginBottom: -LAYOUT.padBottom,
      paddingLeft: LAYOUT.padLeft + 12,
      paddingRight: LAYOUT.sidebarPadX,
      paddingTop: LAYOUT.sidebarPadY,
      paddingBottom: LAYOUT.padBottom + LAYOUT.sidebarPadY,
    },
    main: {
      flex: 1,
      minWidth: 0,
      marginLeft: LAYOUT.gutter,
      paddingTop: 6,
    },
    contactBar: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 18,
      paddingLeft: LAYOUT.padLeft + 12,
      paddingRight: 12,
      marginLeft: -(LAYOUT.padLeft + 12),
      marginRight: -LAYOUT.sidebarPadX,
      marginTop: -LAYOUT.sidebarPadY,
      marginBottom: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contactBarText: {
      fontSize: theme.fontSizes.tiny,
      fontFamily: theme.fonts.primary,
      color: theme.colors.white,
      textTransform: 'uppercase',
      letterSpacing: 2.5,
    },
    sidebarModule: {
      marginBottom: 18,
    },
    sidebarHeading: {
      fontSize: theme.fontSizes.body,
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2.5,
      marginBottom: 10,
      marginTop: 2,
    },
    sidebarText: {
      fontSize: theme.fontSizes.small,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
      marginBottom: 3,
      lineHeight: 1.45,
    },
    sidebarLink: {
      fontSize: theme.fontSizes.small,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
      textDecoration: 'none',
      marginBottom: 3,
      lineHeight: 1.45,
    },
    eduItem: {
      marginBottom: 14,
    },
    eduTitleWrap: {
      marginBottom: 3,
    },
    eduTitle: {
      fontSize: 7.5,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.body,
    },
    eduMeta: {
      fontSize: 7,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
    },
    skillCategory: {
      marginBottom: 8,
    },
    skillCategoryName: {
      fontSize: theme.fontSizes.small,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.body,
      marginBottom: 3,
    },
    skillItem: {
      flexDirection: 'row',
      marginBottom: 2,
    },
    skillBullet: {
      fontSize: 5,
      color: theme.colors.light,
      marginRight: 5,
      marginTop: 2,
    },
    skillText: {
      fontSize: theme.fontSizes.tiny + 0.5,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
      flex: 1,
      lineHeight: 1.35,
    },
    section: {
      marginBottom: LAYOUT.sectionGap,
    },
    sectionHeading: {
      fontSize: theme.fontSizes.sectionTitle,
      fontFamily: theme.fonts.heading,
      color: theme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 4,
      marginBottom: LAYOUT.headingToContent,
    },
    aboutText: {
      fontSize: theme.fontSizes.body,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      lineHeight: 1.6,
    },
    item: {
      marginBottom: LAYOUT.itemGap,
    },
    itemTitle: {
      fontSize: theme.fontSizes.itemTitle,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.body,
      marginBottom: 2,
    },
    itemMeta: {
      fontSize: theme.fontSizes.small,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
      marginBottom: 6,
      lineHeight: 1.3,
    },
    bulletItem: {
      flexDirection: 'row',
      marginBottom: LAYOUT.bulletGap,
    },
    bulletChar: {
      width: 10,
      fontSize: 5,
      color: theme.colors.light,
      paddingTop: 3,
    },
    bulletText: {
      flex: 1,
      fontSize: theme.fontSizes.small + 0.5,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      lineHeight: 1.45,
    },
  });
}

// =============================================================================
// HELPERS
// =============================================================================
function groupSkillsByCategory(skills: Skill[]): Record<string, Skill[]> {
  return skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const category = skill.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {});
}

function formatDateRange(start: string, end?: string | null): string {
  return `${start} – ${end || 'Present'}`;
}

// =============================================================================
// COMPONENT
// =============================================================================
export function ClassicTemplate({
  resume,
  theme,
  targetJobTitle,
}: TemplateProps): React.JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { personalInfo, education, skills, certifications, workExperience } = resume;

  const displayTitle = targetJobTitle || workExperience[0]?.title || '';
  const skillsByCategory = groupSkillsByCategory(skills);
  const about = personalInfo.summary?.trim() || '';

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.nameWrap}>
            <Text style={styles.nameText}>{personalInfo.name}</Text>
          </View>
          {displayTitle && (
            <View style={styles.titleBox}>
              <Text style={styles.titleText}>{displayTitle}</Text>
            </View>
          )}
        </View>

        {/* Two-column layout */}
        <View style={styles.row}>
          {/* Sidebar */}
          <View style={styles.sidebar}>
            {/* Contact & Info */}
            <View style={styles.sidebarModule}>
              <View style={styles.contactBar}>
                <Text style={styles.contactBarText}>Contact & Info</Text>
              </View>
              {getContactByType(personalInfo.contacts, 'phone') && (
                <Text style={styles.sidebarText}>
                  {getContactByType(personalInfo.contacts, 'phone')}
                </Text>
              )}
              {getContactByType(personalInfo.contacts, 'email') && (
                <Link
                  style={styles.sidebarLink}
                  src={`mailto:${getContactByType(personalInfo.contacts, 'email')}`}
                >
                  {getContactByType(personalInfo.contacts, 'email')}
                </Link>
              )}
              {personalInfo.location && (
                <Text style={styles.sidebarText}>{personalInfo.location}</Text>
              )}
              {getContactByType(personalInfo.contacts, 'linkedin') && (
                <Link
                  style={styles.sidebarLink}
                  src={getContactByType(personalInfo.contacts, 'linkedin')!}
                >
                  {getContactByType(personalInfo.contacts, 'linkedin')!
                    .replace('https://', '')
                    .replace('www.', '')}
                </Link>
              )}
            </View>

            {/* Education */}
            {education.length > 0 && (
              <View style={styles.sidebarModule}>
                <Text style={styles.sidebarHeading}>Education</Text>
                {education.map((edu, i) => (
                  <View key={i} style={styles.eduItem}>
                    <View style={styles.eduTitleWrap}>
                      <Text style={styles.eduTitle}>
                        {edu.degree}
                        {edu.field ? ` in ${edu.field}` : ''}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.eduMeta}>
                        {edu.institution}
                        {edu.graduationDate ? ` / ${edu.graduationDate}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <View style={styles.sidebarModule}>
                <Text style={styles.sidebarHeading}>Skills</Text>
                {Object.entries(skillsByCategory).map(([category, catSkills]) => (
                  <View key={category} style={styles.skillCategory}>
                    <Text style={styles.skillCategoryName}>{category}</Text>
                    {catSkills.map((skill, i) => (
                      <View key={i} style={styles.skillItem}>
                        <Text style={styles.skillBullet}>•</Text>
                        <Text style={styles.skillText}>{skill.name}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* Awards */}
            {certifications.length > 0 && (
              <View style={styles.sidebarModule}>
                <Text style={styles.sidebarHeading}>Awards</Text>
                {certifications.map((cert, i) => (
                  <View key={i} style={styles.eduItem}>
                    <View style={styles.eduTitleWrap}>
                      <Text style={styles.eduTitle}>{cert.name}</Text>
                    </View>
                    <View>
                      <Text style={styles.eduMeta}>
                        {cert.issuer}
                        {cert.date ? ` / ${cert.date}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Main content */}
          <View style={styles.main}>
            {/* About Me */}
            {about && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>About Me</Text>
                <Text style={styles.aboutText}>{about}</Text>
              </View>
            )}

            {/* Experience */}
            {workExperience.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Experience</Text>
                {workExperience.slice(0, 3).map((job, i) => (
                  <View key={i} style={styles.item}>
                    <Text style={styles.itemTitle}>{job.title}</Text>
                    <Text style={styles.itemMeta}>
                      {job.company}
                      {job.location ? ` / ${job.location}` : ''} /{' '}
                      {formatDateRange(job.startDate, job.endDate)}
                    </Text>
                    {job.highlights && job.highlights.length > 0 && (
                      <View>
                        {job.highlights.map((h, hi) => (
                          <View key={hi} style={styles.bulletItem}>
                            <Text style={styles.bulletChar}>•</Text>
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
        </View>
      </Page>
    </Document>
  );
}

import React, { useMemo } from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from '@react-pdf/renderer';
import type { Resume, Skill, WorkExperience, Project } from '@schemas/resume.schema';
import { getContactByType } from '@schemas/resume.schema';
import { defaultPDFTheme, type PDFTheme } from './theme';

// =============================================================================
// TYPES
// =============================================================================

interface RelevantItem {
  type: 'job' | 'project';
  data: WorkExperience | Project;
}

// =============================================================================
// LAYOUT CONSTANTS (points)
// =============================================================================
const A4_HEIGHT = 842; // A4 page height in points
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
  // Calculated: A4 height minus page padding, header height, and header margin
  rowHeight: A4_HEIGHT - 40 - 40 - 70 - HEADER_MARGIN_BOTTOM, // 674
};

// =============================================================================
// STYLE FACTORY
// =============================================================================
function createStyles(theme: PDFTheme) {
  return StyleSheet.create({
    // Page
    page: {
      backgroundColor: theme.colors.pageBackground,
      paddingTop: LAYOUT.padTop,
      paddingBottom: LAYOUT.padBottom,
      paddingLeft: LAYOUT.padLeft,
      paddingRight: LAYOUT.padRight,
      fontFamily: theme.fonts.primary,
      fontSize: theme.fontSizes.body,
    },

    // Header row
    header: {
      height: LAYOUT.mastheadH1,
      marginBottom: 18,
      flexDirection: 'row',
      alignItems: 'center', // Vertically center children
      justifyContent: 'space-between',
    },
    nameWrap: {
      flexGrow: 1,
      paddingRight: 16,
      maxWidth: 400,
      justifyContent: 'center', // Vertically center name text
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
      // Extend to page edges
      marginTop: -LAYOUT.padTop,
      marginRight: -LAYOUT.padRight,
      marginBottom: -18, // header.marginBottom
      // Compensate with padding for the extended areas
      paddingTop: LAYOUT.padTop + 10,
      paddingBottom: 10 + 18,
      paddingLeft: 18,
      paddingRight: LAYOUT.padRight + 18,
      alignItems: 'center', // Horizontally center title text
      justifyContent: 'center', // Vertically center title text
      alignSelf: 'stretch', // Fill parent height, then extend with negative margins
    },
    titleText: {
      fontSize: theme.fontSizes.small,
      fontFamily: theme.fonts.primary,
      color: theme.colors.titleText,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },

    // Two-column layout
    row: {
      flexDirection: 'row',
      height: LAYOUT.rowHeight, // Fixed height to maintain A4 page size
      width: '100%',
    },
    sidebar: {
      width: LAYOUT.sidebarWidth,
      flexShrink: 0,
      backgroundColor: theme.colors.sidebarBackground,
      marginLeft: -LAYOUT.padLeft, // Extend background to page's left edge
      marginBottom: -LAYOUT.padBottom, // Extend background to page's bottom edge
      paddingLeft: LAYOUT.padLeft + 12, // Content at 12pt from page edge
      paddingRight: LAYOUT.sidebarPadX,
      paddingTop: LAYOUT.sidebarPadY,
      paddingBottom: LAYOUT.padBottom + LAYOUT.sidebarPadY, // Compensate for negative margin
    },
    main: {
      flex: 1,
      minWidth: 0, // Required for proper text wrapping in flex children
      marginLeft: LAYOUT.gutter,
      paddingTop: 6,
    },

    // Page 2+ full-width content
    mainFull: {
      height: LAYOUT.rowHeight, // Same height constraint as page 1 content area
      paddingTop: 6,
    },

    // Sidebar - Contact header bar (black with white text)
    contactBar: {
      backgroundColor: theme.colors.accent,
      paddingVertical: 18, // Equal padding for vertical centering
      paddingLeft: LAYOUT.padLeft + 12, // Align text with sidebar content
      paddingRight: 12,
      marginLeft: -(LAYOUT.padLeft + 12), // Extend to page's left edge
      marginRight: -LAYOUT.sidebarPadX,
      marginTop: -LAYOUT.sidebarPadY, // Extend to top of sidebar
      marginBottom: 12,
      justifyContent: 'center', // Vertically center the text
      alignItems: 'center', // Horizontally center the text
    },
    contactBarText: {
      fontSize: theme.fontSizes.tiny,
      fontFamily: theme.fonts.primary,
      color: theme.colors.white,
      textTransform: 'uppercase',
      letterSpacing: 2.5,
    },

    // Sidebar module
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

    // Education
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

    // Skills
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

    // Certifications/Awards
    certItem: {
      marginBottom: 14,
    },
    certTitleWrap: {
      marginBottom: 3,
    },
    certTitle: {
      fontSize: 7.5,
      fontFamily: 'Helvetica-Bold',
      color: theme.colors.body,
    },
    certMeta: {
      fontSize: 7,
      fontFamily: theme.fonts.primary,
      color: theme.colors.muted,
    },

    // Main sections
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

    // Experience/Project items
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
    itemDesc: {
      fontSize: theme.fontSizes.small + 0.5,
      fontFamily: theme.fonts.primary,
      color: theme.colors.body,
      lineHeight: 1.45,
      marginBottom: 4,
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
// PAGINATION HELPERS
// =============================================================================
function estimateExperienceUnits(job: WorkExperience): number {
  let units = 4;
  units += (job.highlights?.length || 0) * 2;
  for (const h of job.highlights || []) {
    units += Math.max(0, Math.min(3, Math.ceil(h.length / 90) - 1));
  }
  return units;
}

function estimateProjectUnits(proj: Project): number {
  let units = 4;
  if (proj.technologies?.length) units += 1;
  if (proj.description) units += Math.max(1, Math.min(4, Math.ceil(proj.description.length / 95)));
  units += (proj.highlights?.length || 0) * 2;
  for (const h of proj.highlights || []) {
    units += Math.max(0, Math.min(3, Math.ceil(h.length / 95) - 1));
  }
  return units;
}

function paginateItems<T>(items: T[], estimateFn: (item: T) => number, maxUnits: number): T[][] {
  const pages: T[][] = [];
  let current: T[] = [];
  let used = 0;

  for (const item of items) {
    const cost = estimateFn(item);
    if (current.length > 0 && used + cost > maxUnits) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(item);
    used += cost;
  }
  if (current.length) pages.push(current);
  return pages;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================
export interface ResumePDFDocumentProps {
  resume: Resume;
  /** Job title to display in header (e.g., position applying for) */
  targetJobTitle?: string;
  /** Top 3 most relevant items (jobs/projects) - AI-scored */
  relevantItems?: RelevantItem[];
  /** Optional theme override */
  theme?: PDFTheme | undefined;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
function ResumePDFDocument({
  resume,
  targetJobTitle,
  relevantItems,
  theme,
}: ResumePDFDocumentProps): React.JSX.Element {
  const styles = useMemo(() => createStyles(theme ?? defaultPDFTheme), [theme]);
  const { personalInfo, education, skills, certifications, workExperience, projects } = resume;

  // Determine job title to show
  const displayTitle = targetJobTitle || workExperience[0]?.title || '';

  // Group skills by category
  const skillsByCategory = groupSkillsByCategory(skills);

  // About text
  const about = personalInfo.summary?.trim() || '';

  // Determine relevant vs other items
  const relevantJobs: WorkExperience[] = [];
  const relevantProjects: Project[] = [];
  const otherJobs: WorkExperience[] = [];
  const otherProjects: Project[] = [];

  if (relevantItems && relevantItems.length > 0) {
    // Use AI-scored relevant items (top 3)
    for (const item of relevantItems.slice(0, 3)) {
      if (item.type === 'job') {
        relevantJobs.push(item.data as WorkExperience);
      } else {
        relevantProjects.push(item.data as Project);
      }
    }

    // Everything else goes to "Other Experience"
    const relevantJobIds = new Set(relevantJobs.map(j => `${j.company}-${j.title}-${j.startDate}`));
    const relevantProjIds = new Set(relevantProjects.map(p => p.name));

    for (const job of workExperience) {
      if (!relevantJobIds.has(`${job.company}-${job.title}-${job.startDate}`)) {
        otherJobs.push(job);
      }
    }
    for (const proj of projects) {
      if (!relevantProjIds.has(proj.name)) {
        otherProjects.push(proj);
      }
    }
  } else {
    // No AI scoring - use first 3 jobs as relevant
    relevantJobs.push(...workExperience.slice(0, 3));
    otherJobs.push(...workExperience.slice(3));
    otherProjects.push(...projects);
  }

  // Combine other items and limit to 5+ based on space
  const otherItems: RelevantItem[] = [
    ...otherJobs.map(j => ({ type: 'job' as const, data: j })),
    ...otherProjects.map(p => ({ type: 'project' as const, data: p })),
  ].slice(0, 8); // Allow up to 8

  // Paginate other items for page 2+
  const PAGE2_MAX_UNITS = 62;
  const otherItemPages = paginateItems(
    otherItems,
    (item) => item.type === 'job'
      ? estimateExperienceUnits(item.data as WorkExperience)
      : estimateProjectUnits(item.data as Project),
    PAGE2_MAX_UNITS
  );

  return (
    <Document>
      {/* PAGE 1 */}
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
            {/* Contact & Info (with black bar) */}
            <View style={styles.sidebarModule}>
              <View style={styles.contactBar}>
                <Text style={styles.contactBarText}>Contact & Info</Text>
              </View>
              {getContactByType(personalInfo.contacts, 'phone') && (
                <Text style={styles.sidebarText}>{getContactByType(personalInfo.contacts, 'phone')}</Text>
              )}
              {getContactByType(personalInfo.contacts, 'email') && (
                <Link style={styles.sidebarLink} src={`mailto:${getContactByType(personalInfo.contacts, 'email')}`}>
                  {getContactByType(personalInfo.contacts, 'email')}
                </Link>
              )}
              {personalInfo.location && <Text style={styles.sidebarText}>{personalInfo.location}</Text>}
              {getContactByType(personalInfo.contacts, 'linkedin') && (
                <Link style={styles.sidebarLink} src={getContactByType(personalInfo.contacts, 'linkedin')!}>
                  {getContactByType(personalInfo.contacts, 'linkedin')!.replace('https://', '').replace('www.', '')}
                </Link>
              )}
              {getContactByType(personalInfo.contacts, 'website') && (
                <Link style={styles.sidebarLink} src={getContactByType(personalInfo.contacts, 'website')!}>
                  {getContactByType(personalInfo.contacts, 'website')!.replace('https://', '').replace('www.', '')}
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
                        {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.eduMeta}>
                        {edu.institution}{edu.graduationDate ? ` / ${edu.graduationDate}` : ''}
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

            {/* Awards/Certifications (conditional) */}
            {certifications.length > 0 && (
              <View style={styles.sidebarModule}>
                <Text style={styles.sidebarHeading}>Awards</Text>
                {certifications.map((cert, i) => (
                  <View key={i} style={styles.certItem}>
                    <View style={styles.certTitleWrap}>
                      <Text style={styles.certTitle}>{cert.name}</Text>
                    </View>
                    <View>
                      <Text style={styles.certMeta}>
                        {cert.issuer}{cert.date ? ` / ${cert.date}` : ''}
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

            {/* Relevant Experience */}
            {(relevantJobs.length > 0 || relevantProjects.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Relevant Experience</Text>
                {/* Jobs */}
                {relevantJobs.map((job, i) => (
                  <View key={`job-${i}`} style={styles.item}>
                    <Text style={styles.itemTitle}>{job.title}</Text>
                    <Text style={styles.itemMeta}>
                      {job.company}{job.location ? ` / ${job.location}` : ''} / {formatDateRange(job.startDate, job.endDate)}
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
                {/* Projects */}
                {relevantProjects.map((proj, i) => (
                  <View key={`proj-${i}`} style={styles.item}>
                    <Text style={styles.itemTitle}>{proj.name}</Text>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <Text style={styles.itemMeta}>{proj.technologies.join(' • ')}</Text>
                    )}
                    {proj.description && (
                      <Text style={styles.itemDesc}>{proj.description}</Text>
                    )}
                    {proj.highlights && proj.highlights.length > 0 && (
                      <View>
                        {proj.highlights.map((h, hi) => (
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

      {/* PAGE 2+ (Other Experience) */}
      {otherItemPages.map((pageItems, pageIdx) => (
        <Page key={`page-${pageIdx + 2}`} size="A4" style={styles.page} wrap={false}>
          {/* Header (same as page 1) */}
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

          {/* Full-width content */}
          <View style={styles.mainFull}>
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Other Experience</Text>
              {pageItems.map((item, i) => {
                if (item.type === 'job') {
                  const job = item.data as WorkExperience;
                  return (
                    <View key={`other-job-${i}`} style={styles.item}>
                      <Text style={styles.itemTitle}>{job.title}</Text>
                      <Text style={styles.itemMeta}>
                        {job.company}{job.location ? ` / ${job.location}` : ''} / {formatDateRange(job.startDate, job.endDate)}
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
                  );
                } else {
                  const proj = item.data as Project;
                  return (
                    <View key={`other-proj-${i}`} style={styles.item}>
                      <Text style={styles.itemTitle}>{proj.name}</Text>
                      {proj.technologies && proj.technologies.length > 0 && (
                        <Text style={styles.itemMeta}>{proj.technologies.join(' • ')}</Text>
                      )}
                      {proj.description && (
                        <Text style={styles.itemDesc}>{proj.description}</Text>
                      )}
                      {proj.highlights && proj.highlights.length > 0 && (
                        <View>
                          {proj.highlights.map((h, hi) => (
                            <View key={hi} style={styles.bulletItem}>
                              <Text style={styles.bulletChar}>•</Text>
                              <Text style={styles.bulletText}>{h}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                }
              })}
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
}

export default ResumePDFDocument;

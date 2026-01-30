import React, { useState, useCallback } from 'react';
import type { Resume } from '../../../shared/schemas/resume.schema';
import { saveResumePDF } from '../../services/pdf';

interface ResumePreviewProps {
  resume: Resume;
}

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

function ResumePreview({ resume }: ResumePreviewProps): React.JSX.Element {
  const { personalInfo, workExperience, education, skills, projects, certifications } = resume;
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [exportError, setExportError] = useState<string | null>(null);

  // Group skills by category
  const skillsByCategory = skills.reduce<Record<string, typeof skills>>((acc, skill) => {
    const category = skill.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {});

  const handleExportPDF = useCallback(async () => {
    setExportStatus('exporting');
    setExportError(null);

    try {
      const savedPath = await saveResumePDF(resume);
      if (savedPath) {
        setExportStatus('success');
        // Reset status after a short delay
        setTimeout(() => setExportStatus('idle'), 3000);
      } else {
        // User cancelled the save dialog
        setExportStatus('idle');
      }
    } catch (error) {
      setExportStatus('error');
      setExportError(error instanceof Error ? error.message : 'Failed to export PDF');
      // Reset status after a longer delay for error messages
      setTimeout(() => {
        setExportStatus('idle');
        setExportError(null);
      }, 5000);
    }
  }, [resume]);

  const getExportButtonText = (): string => {
    switch (exportStatus) {
      case 'exporting':
        return 'Exporting...';
      case 'success':
        return 'Exported!';
      case 'error':
        return 'Export Failed';
      default:
        return 'Export PDF';
    }
  };

  return (
    <div className="resume-preview">
      {/* Export PDF Button */}
      <div className="resume-preview__export-bar">
        <button
          type="button"
          className={`resume-preview__export-btn resume-preview__export-btn--${exportStatus}`}
          onClick={handleExportPDF}
          disabled={exportStatus === 'exporting'}
        >
          {getExportButtonText()}
        </button>
        {exportError && (
          <span className="resume-preview__export-error">{exportError}</span>
        )}
      </div>

      {/* Personal Info Header */}
      <header className="resume-preview__header">
        <h1 className="resume-preview__name">{personalInfo.name}</h1>
        <div className="resume-preview__contact">
          {personalInfo.email && (
            <span className="resume-preview__contact-item">
              <a href={`mailto:${personalInfo.email}`}>{personalInfo.email}</a>
            </span>
          )}
          {personalInfo.phone && (
            <span className="resume-preview__contact-item">{personalInfo.phone}</span>
          )}
          {personalInfo.location && (
            <span className="resume-preview__contact-item">{personalInfo.location}</span>
          )}
          {personalInfo.linkedin && (
            <span className="resume-preview__contact-item">
              <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            </span>
          )}
          {personalInfo.website && (
            <span className="resume-preview__contact-item">
              <a href={personalInfo.website} target="_blank" rel="noopener noreferrer">
                Website
              </a>
            </span>
          )}
        </div>
      </header>

      {/* Summary */}
      {personalInfo.summary && (
        <section className="resume-preview__section">
          <h2 className="resume-preview__section-title">Summary</h2>
          <p className="resume-preview__summary">{personalInfo.summary}</p>
        </section>
      )}

      {/* Work Experience */}
      {workExperience.length > 0 && (
        <section className="resume-preview__section">
          <h2 className="resume-preview__section-title">Work Experience</h2>
          {workExperience.map((job, index) => (
            <div key={index} className="resume-preview__item">
              <div className="resume-preview__item-header">
                <div className="resume-preview__item-title">
                  <strong>{job.title}</strong>
                  <span className="resume-preview__item-company"> at {job.company}</span>
                </div>
                <div className="resume-preview__item-meta">
                  <span className="resume-preview__item-date">
                    {job.startDate} – {job.endDate || 'Present'}
                  </span>
                  {job.location && (
                    <span className="resume-preview__item-location">{job.location}</span>
                  )}
                </div>
              </div>
              {job.highlights.length > 0 && (
                <ul className="resume-preview__highlights">
                  {job.highlights.map((highlight, hIndex) => (
                    <li key={hIndex}>{highlight}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section className="resume-preview__section">
          <h2 className="resume-preview__section-title">Education</h2>
          {education.map((edu, index) => (
            <div key={index} className="resume-preview__item">
              <div className="resume-preview__item-header">
                <div className="resume-preview__item-title">
                  <strong>{edu.degree}</strong>
                  {edu.field && <span> in {edu.field}</span>}
                </div>
                <div className="resume-preview__item-meta">
                  {edu.graduationDate && (
                    <span className="resume-preview__item-date">{edu.graduationDate}</span>
                  )}
                </div>
              </div>
              <div className="resume-preview__item-subtitle">{edu.institution}</div>
              {edu.gpa && <div className="resume-preview__item-detail">GPA: {edu.gpa}</div>}
              {edu.highlights.length > 0 && (
                <ul className="resume-preview__highlights">
                  {edu.highlights.map((highlight, hIndex) => (
                    <li key={hIndex}>{highlight}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <section className="resume-preview__section">
          <h2 className="resume-preview__section-title">Skills</h2>
          <div className="resume-preview__skills">
            {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
              <div key={category} className="resume-preview__skill-category">
                <h3 className="resume-preview__skill-category-title">{category}</h3>
                <div className="resume-preview__skill-list">
                  {categorySkills.map((skill, index) => (
                    <span key={index} className="resume-preview__skill-item">
                      {skill.name}
                      {skill.level && (
                        <span className="resume-preview__skill-level"> ({skill.level})</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section className="resume-preview__section">
          <h2 className="resume-preview__section-title">Projects</h2>
          {projects.map((project, index) => (
            <div key={index} className="resume-preview__item">
              <div className="resume-preview__item-header">
                <div className="resume-preview__item-title">
                  <strong>{project.name}</strong>
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resume-preview__item-link"
                    >
                      View Project
                    </a>
                  )}
                </div>
              </div>
              {project.description && (
                <p className="resume-preview__item-description">{project.description}</p>
              )}
              {project.technologies.length > 0 && (
                <div className="resume-preview__technologies">
                  <strong>Technologies:</strong> {project.technologies.join(', ')}
                </div>
              )}
              {project.highlights.length > 0 && (
                <ul className="resume-preview__highlights">
                  {project.highlights.map((highlight, hIndex) => (
                    <li key={hIndex}>{highlight}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <section className="resume-preview__section">
          <h2 className="resume-preview__section-title">Certifications</h2>
          {certifications.map((cert, index) => (
            <div key={index} className="resume-preview__item resume-preview__item--compact">
              <div className="resume-preview__item-header">
                <div className="resume-preview__item-title">
                  <strong>{cert.name}</strong>
                  {cert.url && (
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resume-preview__item-link"
                    >
                      View
                    </a>
                  )}
                </div>
                <div className="resume-preview__item-meta">
                  {cert.date && <span className="resume-preview__item-date">{cert.date}</span>}
                </div>
              </div>
              <div className="resume-preview__item-subtitle">{cert.issuer}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default ResumePreview;

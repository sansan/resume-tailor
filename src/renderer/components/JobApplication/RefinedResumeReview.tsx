import React, { useState, useCallback } from 'react'
import type { Resume, WorkExperience, Project } from '@schemas/resume.schema'
import { getContactByType } from '@schemas/resume.schema'
import type { RefinedResume } from '@schemas/ai-output.schema'
import ResumeSection from '../Resume/ResumeSection'

type ViewMode = 'sideBySide' | 'original' | 'refined'

interface RefinedResumeReviewProps {
  originalResume: Resume
  refinedResume: RefinedResume
  onAccept: () => void
  onRegenerate: () => void
  onUpdateRefinedResume: (resume: RefinedResume) => void
}

/**
 * Review interface for comparing original vs refined resume.
 * Provides side-by-side or tabbed view, editable fields, and action buttons.
 */
function RefinedResumeReview({
  originalResume,
  refinedResume,
  onAccept,
  onRegenerate,
  onUpdateRefinedResume,
}: RefinedResumeReviewProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('sideBySide')
  const [editingField, setEditingField] = useState<string | null>(null)

  const handleSummaryChange = useCallback(
    (newSummary: string) => {
      onUpdateRefinedResume({
        ...refinedResume,
        personalInfo: {
          ...refinedResume.personalInfo,
          summary: newSummary,
        },
      })
    },
    [refinedResume, onUpdateRefinedResume]
  )

  const handleWorkExperienceHighlightChange = useCallback(
    (itemIndex: number, highlightIndex: number, newValue: string) => {
      const updatedItems: WorkExperience[] = refinedResume.workExperience.map((item, index) => {
        if (index === itemIndex) {
          const updatedHighlights = item.highlights.map((h, hIdx) =>
            hIdx === highlightIndex ? newValue : h
          )
          return { ...item, highlights: updatedHighlights }
        }
        return item
      })

      onUpdateRefinedResume({
        ...refinedResume,
        workExperience: updatedItems,
      })
    },
    [refinedResume, onUpdateRefinedResume]
  )

  const handleProjectHighlightChange = useCallback(
    (itemIndex: number, highlightIndex: number, newValue: string) => {
      const updatedItems: Project[] = refinedResume.projects.map((item, index) => {
        if (index === itemIndex) {
          const updatedHighlights = item.highlights.map((h, hIdx) =>
            hIdx === highlightIndex ? newValue : h
          )
          return { ...item, highlights: updatedHighlights }
        }
        return item
      })

      onUpdateRefinedResume({
        ...refinedResume,
        projects: updatedItems,
      })
    },
    [refinedResume, onUpdateRefinedResume]
  )

  const renderSummaryComparison = () => {
    const originalSummary = originalResume.personalInfo.summary || ''
    const refinedSummary = refinedResume.personalInfo.summary || ''
    const isEditing = editingField === 'summary'

    if (!originalSummary && !refinedSummary) return null

    return (
      <div className="refined-resume-review__comparison">
        <h4 className="refined-resume-review__comparison-title">Summary</h4>
        <div className="refined-resume-review__comparison-content">
          {(viewMode === 'sideBySide' || viewMode === 'original') && (
            <div className="refined-resume-review__column refined-resume-review__column--original">
              {viewMode === 'sideBySide' && (
                <span className="refined-resume-review__column-label">Original</span>
              )}
              <p className="refined-resume-review__text">{originalSummary || '(No summary)'}</p>
            </div>
          )}
          {(viewMode === 'sideBySide' || viewMode === 'refined') && (
            <div className="refined-resume-review__column refined-resume-review__column--refined">
              {viewMode === 'sideBySide' && (
                <span className="refined-resume-review__column-label">Refined</span>
              )}
              {isEditing ? (
                <textarea
                  className="refined-resume-review__edit-textarea"
                  value={refinedSummary}
                  onChange={e => handleSummaryChange(e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                  rows={4}
                />
              ) : (
                <p
                  className="refined-resume-review__text refined-resume-review__text--editable"
                  onClick={() => setEditingField('summary')}
                  title="Click to edit"
                >
                  {refinedSummary || '(No summary)'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderWorkExperienceComparison = () => {
    if (originalResume.workExperience.length === 0 && refinedResume.workExperience.length === 0) {
      return null
    }

    return (
      <div className="refined-resume-review__comparison">
        <h4 className="refined-resume-review__comparison-title">Work Experience</h4>
        {refinedResume.workExperience.map((job, jobIndex) => {
          const originalJob = originalResume.workExperience[jobIndex]

          return (
            <div key={jobIndex} className="refined-resume-review__item">
              <div className="refined-resume-review__item-header">
                <strong>{job.title}</strong> at {job.company}
                <span className="refined-resume-review__item-dates">
                  {job.startDate} – {job.endDate || 'Present'}
                </span>
              </div>
              <div className="refined-resume-review__comparison-content">
                {(viewMode === 'sideBySide' || viewMode === 'original') && (
                  <div className="refined-resume-review__column refined-resume-review__column--original">
                    {viewMode === 'sideBySide' && (
                      <span className="refined-resume-review__column-label">Original</span>
                    )}
                    <ul className="refined-resume-review__highlights">
                      {originalJob?.highlights.map((highlight, hIndex) => (
                        <li key={hIndex}>{highlight}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(viewMode === 'sideBySide' || viewMode === 'refined') && (
                  <div className="refined-resume-review__column refined-resume-review__column--refined">
                    {viewMode === 'sideBySide' && (
                      <span className="refined-resume-review__column-label">Refined</span>
                    )}
                    <ul className="refined-resume-review__highlights">
                      {job.highlights.map((highlight, hIndex) => {
                        const fieldKey = `work-${jobIndex}-${hIndex}`
                        const isEditing = editingField === fieldKey

                        return (
                          <li key={hIndex}>
                            {isEditing ? (
                              <input
                                type="text"
                                className="refined-resume-review__edit-input"
                                value={highlight}
                                onChange={e =>
                                  handleWorkExperienceHighlightChange(
                                    jobIndex,
                                    hIndex,
                                    e.target.value
                                  )
                                }
                                onBlur={() => setEditingField(null)}
                                autoFocus
                              />
                            ) : (
                              <span
                                className="refined-resume-review__text--editable"
                                onClick={() => setEditingField(fieldKey)}
                                title="Click to edit"
                              >
                                {highlight}
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderSkillsComparison = () => {
    if (originalResume.skills.length === 0 && refinedResume.skills.length === 0) {
      return null
    }

    const groupByCategory = (skills: typeof originalResume.skills) => {
      return skills.reduce<Record<string, typeof skills>>((acc, skill) => {
        const category = skill.category || 'Other'
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(skill)
        return acc
      }, {})
    }

    const originalGrouped = groupByCategory(originalResume.skills)
    const refinedGrouped = groupByCategory(refinedResume.skills)

    return (
      <div className="refined-resume-review__comparison">
        <h4 className="refined-resume-review__comparison-title">Skills</h4>
        <div className="refined-resume-review__comparison-content">
          {(viewMode === 'sideBySide' || viewMode === 'original') && (
            <div className="refined-resume-review__column refined-resume-review__column--original">
              {viewMode === 'sideBySide' && (
                <span className="refined-resume-review__column-label">Original</span>
              )}
              {Object.entries(originalGrouped).map(([category, skills]) => (
                <div key={category} className="refined-resume-review__skill-group">
                  <strong>{category}:</strong> {skills.map(s => s.name).join(', ')}
                </div>
              ))}
            </div>
          )}
          {(viewMode === 'sideBySide' || viewMode === 'refined') && (
            <div className="refined-resume-review__column refined-resume-review__column--refined">
              {viewMode === 'sideBySide' && (
                <span className="refined-resume-review__column-label">Refined</span>
              )}
              {Object.entries(refinedGrouped).map(([category, skills]) => (
                <div key={category} className="refined-resume-review__skill-group">
                  <strong>{category}:</strong> {skills.map(s => s.name).join(', ')}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderProjectsComparison = () => {
    if (originalResume.projects.length === 0 && refinedResume.projects.length === 0) {
      return null
    }

    return (
      <div className="refined-resume-review__comparison">
        <h4 className="refined-resume-review__comparison-title">Projects</h4>
        {refinedResume.projects.map((project, projectIndex) => {
          const originalProject = originalResume.projects[projectIndex]

          return (
            <div key={projectIndex} className="refined-resume-review__item">
              <div className="refined-resume-review__item-header">
                <strong>{project.name}</strong>
                {project.technologies.length > 0 && (
                  <span className="refined-resume-review__item-tech">
                    ({project.technologies.join(', ')})
                  </span>
                )}
              </div>
              <div className="refined-resume-review__comparison-content">
                {(viewMode === 'sideBySide' || viewMode === 'original') && (
                  <div className="refined-resume-review__column refined-resume-review__column--original">
                    {viewMode === 'sideBySide' && (
                      <span className="refined-resume-review__column-label">Original</span>
                    )}
                    {originalProject?.description && (
                      <p className="refined-resume-review__description">
                        {originalProject.description}
                      </p>
                    )}
                    <ul className="refined-resume-review__highlights">
                      {originalProject?.highlights.map((highlight, hIndex) => (
                        <li key={hIndex}>{highlight}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(viewMode === 'sideBySide' || viewMode === 'refined') && (
                  <div className="refined-resume-review__column refined-resume-review__column--refined">
                    {viewMode === 'sideBySide' && (
                      <span className="refined-resume-review__column-label">Refined</span>
                    )}
                    {project.description && (
                      <p className="refined-resume-review__description">{project.description}</p>
                    )}
                    <ul className="refined-resume-review__highlights">
                      {project.highlights.map((highlight, hIndex) => {
                        const fieldKey = `project-${projectIndex}-${hIndex}`
                        const isEditing = editingField === fieldKey

                        return (
                          <li key={hIndex}>
                            {isEditing ? (
                              <input
                                type="text"
                                className="refined-resume-review__edit-input"
                                value={highlight}
                                onChange={e =>
                                  handleProjectHighlightChange(projectIndex, hIndex, e.target.value)
                                }
                                onBlur={() => setEditingField(null)}
                                autoFocus
                              />
                            ) : (
                              <span
                                className="refined-resume-review__text--editable"
                                onClick={() => setEditingField(fieldKey)}
                                title="Click to edit"
                              >
                                {highlight}
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderMetadata = () => {
    const metadata = refinedResume.refinementMetadata
    if (!metadata) return null

    return (
      <div className="refined-resume-review__metadata">
        {metadata.changesSummary && (
          <div className="refined-resume-review__changes-summary">
            <strong>AI Changes Summary:</strong>
            <p>{metadata.changesSummary}</p>
          </div>
        )}
        {metadata.targetedKeywords && metadata.targetedKeywords.length > 0 && (
          <div className="refined-resume-review__keywords">
            <strong>Targeted Keywords:</strong>
            <div className="refined-resume-review__keyword-list">
              {metadata.targetedKeywords.map((keyword, index) => (
                <span key={index} className="refined-resume-review__keyword">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
        {metadata.confidenceScore !== undefined && (
          <div className="refined-resume-review__confidence">
            <strong>Confidence Score:</strong>{' '}
            <span
              className={`refined-resume-review__confidence-value ${
                metadata.confidenceScore >= 0.8
                  ? 'refined-resume-review__confidence-value--high'
                  : metadata.confidenceScore >= 0.5
                    ? 'refined-resume-review__confidence-value--medium'
                    : 'refined-resume-review__confidence-value--low'
              }`}
            >
              {Math.round(metadata.confidenceScore * 100)}%
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="refined-resume-review">
      <div className="refined-resume-review__header">
        <h3>Review Refined Resume</h3>
        <p>Compare the original and AI-refined versions. Click on refined text to edit.</p>
      </div>

      {renderMetadata()}

      <div className="refined-resume-review__view-toggle">
        <button
          type="button"
          className={`refined-resume-review__toggle-btn ${viewMode === 'sideBySide' ? 'refined-resume-review__toggle-btn--active' : ''}`}
          onClick={() => setViewMode('sideBySide')}
        >
          Side by Side
        </button>
        <button
          type="button"
          className={`refined-resume-review__toggle-btn ${viewMode === 'original' ? 'refined-resume-review__toggle-btn--active' : ''}`}
          onClick={() => setViewMode('original')}
        >
          Original Only
        </button>
        <button
          type="button"
          className={`refined-resume-review__toggle-btn ${viewMode === 'refined' ? 'refined-resume-review__toggle-btn--active' : ''}`}
          onClick={() => setViewMode('refined')}
        >
          Refined Only
        </button>
      </div>

      <div className="refined-resume-review__content">
        <ResumeSection title="Personal Info">
          <div className="refined-resume-review__personal-info">
            <strong>{refinedResume.personalInfo.name}</strong>
            {getContactByType(refinedResume.personalInfo.contacts, 'email') && (
              <span>{getContactByType(refinedResume.personalInfo.contacts, 'email')}</span>
            )}
            {getContactByType(refinedResume.personalInfo.contacts, 'phone') && (
              <span>{getContactByType(refinedResume.personalInfo.contacts, 'phone')}</span>
            )}
            {refinedResume.personalInfo.location && (
              <span>{refinedResume.personalInfo.location}</span>
            )}
          </div>
        </ResumeSection>

        {renderSummaryComparison()}
        {renderWorkExperienceComparison()}
        {renderSkillsComparison()}
        {renderProjectsComparison()}
      </div>

      <div className="refined-resume-review__actions">
        <button
          type="button"
          className="refined-resume-review__btn refined-resume-review__btn--secondary"
          onClick={onRegenerate}
        >
          Regenerate
        </button>
        <button
          type="button"
          className="refined-resume-review__btn refined-resume-review__btn--primary"
          onClick={onAccept}
        >
          Accept & Continue
        </button>
      </div>
    </div>
  )
}

export default RefinedResumeReview

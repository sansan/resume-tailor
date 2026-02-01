import React from 'react'

export type ResumeSectionType =
  | 'summary'
  | 'workExperience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'

interface ResumeSectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

/**
 * Reusable component for displaying resume sections.
 * Used in both preview and review interfaces.
 */
function ResumeSection({ title, children, className = '' }: ResumeSectionProps): React.JSX.Element {
  return (
    <section className={`resume-section ${className}`.trim()}>
      <h3 className="resume-section__title">{title}</h3>
      <div className="resume-section__content">{children}</div>
    </section>
  )
}

export default ResumeSection

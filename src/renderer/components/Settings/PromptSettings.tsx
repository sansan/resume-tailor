import React from 'react';
import {
  type AppSettings,
  type ResumePromptTemplateSettings,
  type CoverLetterPromptTemplateSettings,
  DEFAULT_APP_SETTINGS,
} from '@schemas/settings.schema';

/**
 * Available prompt variables with descriptions.
 * These are used internally by the AI processor when building prompts.
 */
export const PROMPT_VARIABLES = {
  resume: [
    { variable: '{resume}', description: 'The complete resume JSON data' },
    { variable: '{jobPosting}', description: 'The job posting text' },
    { variable: '{schema}', description: 'The expected output JSON schema' },
  ],
  coverLetter: [
    { variable: '{resume}', description: 'The complete resume JSON data' },
    { variable: '{jobPosting}', description: 'The job posting text' },
    { variable: '{companyInfo}', description: 'Company information (if provided)' },
    { variable: '{schema}', description: 'The expected output JSON schema' },
  ],
} as const;

/**
 * Props for the PromptSettings component.
 */
export interface PromptSettingsProps {
  /** Current application settings */
  settings: AppSettings;
  /** Field validation errors */
  errors: Record<string, string>;
  /** Whether the resume prompt section is expanded */
  isResumeExpanded: boolean;
  /** Whether the cover letter prompt section is expanded */
  isCoverLetterExpanded: boolean;
  /** Toggle resume section expansion */
  onToggleResume: () => void;
  /** Toggle cover letter section expansion */
  onToggleCoverLetter: () => void;
  /** Update resume prompt settings */
  onUpdateResumePrompt: (updates: Partial<ResumePromptTemplateSettings>) => void;
  /** Update cover letter prompt settings */
  onUpdateCoverLetterPrompt: (updates: Partial<CoverLetterPromptTemplateSettings>) => void;
  /** Reset resume prompt to defaults */
  onResetResumePrompt: () => void;
  /** Reset cover letter prompt to defaults */
  onResetCoverLetterPrompt: () => void;
}

/**
 * Prompt Settings Component
 *
 * Provides UI for configuring AI prompt templates:
 * - Resume refinement settings (tone, focus areas, custom instructions)
 * - Cover letter generation settings (tone, style, focus areas, custom instructions)
 *
 * Each section has a "Reset to Default" button and help text explaining
 * the available options and how they affect the generated prompts.
 */
function PromptSettings({
  settings,
  errors,
  isResumeExpanded,
  isCoverLetterExpanded,
  onToggleResume,
  onToggleCoverLetter,
  onUpdateResumePrompt,
  onUpdateCoverLetterPrompt,
  onResetResumePrompt,
  onResetCoverLetterPrompt,
}: PromptSettingsProps): React.JSX.Element {
  return (
    <>
      {/* Resume Refinement Prompt Section */}
      <section className="settings-view__section">
        <button
          className={`settings-view__section-header ${isResumeExpanded ? 'settings-view__section-header--expanded' : ''}`}
          onClick={onToggleResume}
          type="button"
          aria-expanded={isResumeExpanded}
          aria-controls="resume-prompt-settings-content"
        >
          <span className="settings-view__section-title">Resume Refinement Settings</span>
          <span className="settings-view__section-toggle" aria-hidden="true">
            {isResumeExpanded ? '−' : '+'}
          </span>
        </button>

        {isResumeExpanded && (
          <div
            id="resume-prompt-settings-content"
            className="settings-view__section-content"
          >
            {/* Help text about prompt variables */}
            <div className="settings-view__field">
              <p className="settings-view__help">
                These settings control how the AI refines your resume for specific job postings.
                The AI uses your original resume and the job posting to create a tailored version.
              </p>
              <details className="settings-view__details">
                <summary className="settings-view__details-summary">
                  How it works (technical details)
                </summary>
                <div className="settings-view__variables" aria-label="Available prompt variables for resume refinement">
                  <p className="settings-view__help" style={{ marginBottom: '0.5rem' }}>
                    The AI prompt is built using these components:
                  </p>
                  {PROMPT_VARIABLES.resume.map((v) => (
                    <span key={v.variable} className="settings-view__variable">
                      <code>{v.variable}</code> - {v.description}
                    </span>
                  ))}
                </div>
              </details>
            </div>

            {/* Length Controls */}
            <div className="settings-view__field-row">
              <div className="settings-view__field">
                <label htmlFor="max-summary-length" className="settings-view__label">
                  Max Summary Length
                </label>
                <p className="settings-view__help">
                  Maximum character count for the professional summary section.
                </p>
                <div className="settings-view__range-input">
                  <input
                    id="max-summary-length"
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={settings.resumePromptTemplate.maxSummaryLength}
                    onChange={(e) => onUpdateResumePrompt({ maxSummaryLength: parseInt(e.target.value) })}
                    aria-describedby="max-summary-length-value"
                  />
                  <span id="max-summary-length-value" className="settings-view__range-value">
                    {settings.resumePromptTemplate.maxSummaryLength}
                  </span>
                </div>
              </div>

              <div className="settings-view__field">
                <label htmlFor="max-highlights" className="settings-view__label">
                  Max Highlights per Experience
                </label>
                <p className="settings-view__help">
                  Maximum bullet points per work experience entry.
                </p>
                <div className="settings-view__range-input">
                  <input
                    id="max-highlights"
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={settings.resumePromptTemplate.maxHighlightsPerExperience}
                    onChange={(e) => onUpdateResumePrompt({ maxHighlightsPerExperience: parseInt(e.target.value) })}
                    aria-describedby="max-highlights-value"
                  />
                  <span id="max-highlights-value" className="settings-view__range-value">
                    {settings.resumePromptTemplate.maxHighlightsPerExperience}
                  </span>
                </div>
              </div>
            </div>

            {/* Tone Selection */}
            <div className="settings-view__field">
              <label htmlFor="resume-tone" className="settings-view__label">
                Tone
              </label>
              <p className="settings-view__help">
                The writing style for your refined resume.
              </p>
              <select
                id="resume-tone"
                className="settings-view__select"
                value={settings.resumePromptTemplate.tone}
                onChange={(e) => onUpdateResumePrompt({ tone: e.target.value as ResumePromptTemplateSettings['tone'] })}
              >
                <option value="professional">Professional - Formal business language</option>
                <option value="conversational">Conversational - Approachable and personable</option>
                <option value="technical">Technical - Emphasizes expertise and precision</option>
              </select>
            </div>

            {/* Focus Areas */}
            <div className="settings-view__field">
              <label className="settings-view__label">Focus Areas</label>
              <p className="settings-view__help">
                Select which aspects to prioritize when refining the resume.
              </p>
              <div className="settings-view__checkbox-group">
                {(['skills', 'experience', 'achievements', 'education'] as const).map((area) => (
                  <label key={area} className="settings-view__label settings-view__label--checkbox">
                    <input
                      type="checkbox"
                      checked={settings.resumePromptTemplate.focusAreas.includes(area)}
                      onChange={(e) => {
                        const newAreas = e.target.checked
                          ? [...settings.resumePromptTemplate.focusAreas, area]
                          : settings.resumePromptTemplate.focusAreas.filter((a) => a !== area);
                        onUpdateResumePrompt({ focusAreas: newAreas });
                      }}
                    />
                    <span>{area.charAt(0).toUpperCase() + area.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preserve All Content Toggle */}
            <div className="settings-view__field">
              <label className="settings-view__label settings-view__label--checkbox">
                <input
                  type="checkbox"
                  checked={settings.resumePromptTemplate.preserveAllContent}
                  onChange={(e) => onUpdateResumePrompt({ preserveAllContent: e.target.checked })}
                />
                <span>Preserve all content</span>
              </label>
              <p className="settings-view__help">
                When enabled, the AI will not remove or significantly shorten any content.
                Useful when you want all experiences included regardless of relevance.
              </p>
            </div>

            {/* Custom Instructions */}
            <div className="settings-view__field">
              <label htmlFor="resume-custom-instructions" className="settings-view__label">
                Custom Instructions
              </label>
              <p className="settings-view__help">
                Additional instructions for the AI when refining your resume.
                These are appended to the system prompt.
              </p>
              <textarea
                id="resume-custom-instructions"
                className="settings-view__textarea"
                value={settings.resumePromptTemplate.customInstructions}
                onChange={(e) => onUpdateResumePrompt({ customInstructions: e.target.value })}
                rows={4}
                maxLength={2000}
                placeholder="E.g., Always emphasize leadership skills, avoid jargon, focus on quantifiable achievements..."
                aria-describedby="resume-custom-instructions-hint"
              />
              <p id="resume-custom-instructions-hint" className="settings-view__hint">
                {settings.resumePromptTemplate.customInstructions.length} / 2000 characters
              </p>
              {errors['resumePromptTemplate.customInstructions'] && (
                <p className="settings-view__field-error" role="alert">
                  {errors['resumePromptTemplate.customInstructions']}
                </p>
              )}
            </div>

            {/* Prompt Preview */}
            <div className="settings-view__field">
              <label className="settings-view__label">Settings Preview</label>
              <div className="settings-view__preview">
                <p className="settings-view__preview-text">
                  Your resume will be refined with a <strong>{settings.resumePromptTemplate.tone}</strong> tone,
                  focusing on <strong>{settings.resumePromptTemplate.focusAreas.join(', ') || 'all areas'}</strong>.
                  The summary will be limited to <strong>{settings.resumePromptTemplate.maxSummaryLength}</strong> characters,
                  with up to <strong>{settings.resumePromptTemplate.maxHighlightsPerExperience}</strong> highlights per experience.
                  {settings.resumePromptTemplate.preserveAllContent && ' All original content will be preserved.'}
                </p>
              </div>
            </div>

            {/* Reset to Default Button */}
            <div className="settings-view__section-actions">
              <button
                type="button"
                className="settings-view__btn settings-view__btn--secondary settings-view__btn--small"
                onClick={onResetResumePrompt}
              >
                Reset Resume Settings to Default
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Cover Letter Generation Prompt Section */}
      <section className="settings-view__section">
        <button
          className={`settings-view__section-header ${isCoverLetterExpanded ? 'settings-view__section-header--expanded' : ''}`}
          onClick={onToggleCoverLetter}
          type="button"
          aria-expanded={isCoverLetterExpanded}
          aria-controls="cover-letter-prompt-settings-content"
        >
          <span className="settings-view__section-title">Cover Letter Generation Settings</span>
          <span className="settings-view__section-toggle" aria-hidden="true">
            {isCoverLetterExpanded ? '−' : '+'}
          </span>
        </button>

        {isCoverLetterExpanded && (
          <div
            id="cover-letter-prompt-settings-content"
            className="settings-view__section-content"
          >
            {/* Help text about prompt variables */}
            <div className="settings-view__field">
              <p className="settings-view__help">
                These settings control how the AI generates cover letters tailored to specific job postings.
                The AI uses your resume and the job posting to create a personalized cover letter.
              </p>
              <details className="settings-view__details">
                <summary className="settings-view__details-summary">
                  How it works (technical details)
                </summary>
                <div className="settings-view__variables" aria-label="Available prompt variables for cover letter generation">
                  <p className="settings-view__help" style={{ marginBottom: '0.5rem' }}>
                    The AI prompt is built using these components:
                  </p>
                  {PROMPT_VARIABLES.coverLetter.map((v) => (
                    <span key={v.variable} className="settings-view__variable">
                      <code>{v.variable}</code> - {v.description}
                    </span>
                  ))}
                </div>
              </details>
            </div>

            {/* Length Controls */}
            <div className="settings-view__field-row">
              <div className="settings-view__field">
                <label htmlFor="max-opening-length" className="settings-view__label">
                  Max Opening Length
                </label>
                <p className="settings-view__help">
                  Maximum character count for the opening paragraph.
                </p>
                <div className="settings-view__range-input">
                  <input
                    id="max-opening-length"
                    type="range"
                    min="100"
                    max="500"
                    step="50"
                    value={settings.coverLetterPromptTemplate.maxOpeningLength}
                    onChange={(e) => onUpdateCoverLetterPrompt({ maxOpeningLength: parseInt(e.target.value) })}
                    aria-describedby="max-opening-length-value"
                  />
                  <span id="max-opening-length-value" className="settings-view__range-value">
                    {settings.coverLetterPromptTemplate.maxOpeningLength}
                  </span>
                </div>
              </div>

              <div className="settings-view__field">
                <label htmlFor="max-body-paragraphs" className="settings-view__label">
                  Max Body Paragraphs
                </label>
                <p className="settings-view__help">
                  Maximum number of body paragraphs in the cover letter.
                </p>
                <div className="settings-view__range-input">
                  <input
                    id="max-body-paragraphs"
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={settings.coverLetterPromptTemplate.maxBodyParagraphs}
                    onChange={(e) => onUpdateCoverLetterPrompt({ maxBodyParagraphs: parseInt(e.target.value) })}
                    aria-describedby="max-body-paragraphs-value"
                  />
                  <span id="max-body-paragraphs-value" className="settings-view__range-value">
                    {settings.coverLetterPromptTemplate.maxBodyParagraphs}
                  </span>
                </div>
              </div>
            </div>

            {/* Tone and Style Row */}
            <div className="settings-view__field-row">
              <div className="settings-view__field">
                <label htmlFor="cover-letter-tone" className="settings-view__label">
                  Tone
                </label>
                <p className="settings-view__help">
                  The overall voice of the cover letter.
                </p>
                <select
                  id="cover-letter-tone"
                  className="settings-view__select"
                  value={settings.coverLetterPromptTemplate.tone}
                  onChange={(e) => onUpdateCoverLetterPrompt({ tone: e.target.value as CoverLetterPromptTemplateSettings['tone'] })}
                >
                  <option value="formal">Formal - Traditional business style</option>
                  <option value="conversational">Conversational - Warm and personable</option>
                  <option value="enthusiastic">Enthusiastic - Energetic and passionate</option>
                </select>
              </div>

              <div className="settings-view__field">
                <label htmlFor="cover-letter-style" className="settings-view__label">
                  Style
                </label>
                <p className="settings-view__help">
                  The writing approach for the content.
                </p>
                <select
                  id="cover-letter-style"
                  className="settings-view__select"
                  value={settings.coverLetterPromptTemplate.style}
                  onChange={(e) => onUpdateCoverLetterPrompt({ style: e.target.value as CoverLetterPromptTemplateSettings['style'] })}
                >
                  <option value="concise">Concise - Short and impactful</option>
                  <option value="detailed">Detailed - Comprehensive coverage</option>
                  <option value="storytelling">Storytelling - Narrative and engaging</option>
                </select>
              </div>
            </div>

            {/* Focus Areas */}
            <div className="settings-view__field">
              <label className="settings-view__label">Focus Areas</label>
              <p className="settings-view__help">
                Select which aspects to emphasize in the cover letter.
              </p>
              <div className="settings-view__checkbox-group">
                {(['technical-skills', 'leadership', 'achievements', 'culture-fit', 'career-growth'] as const).map((area) => (
                  <label key={area} className="settings-view__label settings-view__label--checkbox">
                    <input
                      type="checkbox"
                      checked={settings.coverLetterPromptTemplate.focusAreas.includes(area)}
                      onChange={(e) => {
                        const newAreas = e.target.checked
                          ? [...settings.coverLetterPromptTemplate.focusAreas, area]
                          : settings.coverLetterPromptTemplate.focusAreas.filter((a) => a !== area);
                        onUpdateCoverLetterPrompt({ focusAreas: newAreas });
                      }}
                    />
                    <span>{area.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Emphasize Company Knowledge Toggle */}
            <div className="settings-view__field">
              <label className="settings-view__label settings-view__label--checkbox">
                <input
                  type="checkbox"
                  checked={settings.coverLetterPromptTemplate.emphasizeCompanyKnowledge}
                  onChange={(e) => onUpdateCoverLetterPrompt({ emphasizeCompanyKnowledge: e.target.checked })}
                />
                <span>Emphasize company knowledge</span>
              </label>
              <p className="settings-view__help">
                When enabled, the AI will incorporate company-specific details from the job posting
                to demonstrate genuine interest and research.
              </p>
            </div>

            {/* Custom Instructions */}
            <div className="settings-view__field">
              <label htmlFor="cover-letter-custom-instructions" className="settings-view__label">
                Custom Instructions
              </label>
              <p className="settings-view__help">
                Additional instructions for the AI when generating cover letters.
                These are appended to the system prompt.
              </p>
              <textarea
                id="cover-letter-custom-instructions"
                className="settings-view__textarea"
                value={settings.coverLetterPromptTemplate.customInstructions}
                onChange={(e) => onUpdateCoverLetterPrompt({ customInstructions: e.target.value })}
                rows={4}
                maxLength={2000}
                placeholder="E.g., Keep it under one page, mention remote work preference, highlight startup experience..."
                aria-describedby="cover-letter-custom-instructions-hint"
              />
              <p id="cover-letter-custom-instructions-hint" className="settings-view__hint">
                {settings.coverLetterPromptTemplate.customInstructions.length} / 2000 characters
              </p>
              {errors['coverLetterPromptTemplate.customInstructions'] && (
                <p className="settings-view__field-error" role="alert">
                  {errors['coverLetterPromptTemplate.customInstructions']}
                </p>
              )}
            </div>

            {/* Prompt Preview */}
            <div className="settings-view__field">
              <label className="settings-view__label">Settings Preview</label>
              <div className="settings-view__preview">
                <p className="settings-view__preview-text">
                  Your cover letter will be written in a <strong>{settings.coverLetterPromptTemplate.tone}</strong> tone
                  with a <strong>{settings.coverLetterPromptTemplate.style}</strong> style,
                  focusing on <strong>{settings.coverLetterPromptTemplate.focusAreas.map(a => a.split('-').join(' ')).join(', ') || 'all areas'}</strong>.
                  It will have an opening (up to <strong>{settings.coverLetterPromptTemplate.maxOpeningLength}</strong> chars)
                  and <strong>{settings.coverLetterPromptTemplate.maxBodyParagraphs}</strong> body paragraph{settings.coverLetterPromptTemplate.maxBodyParagraphs !== 1 ? 's' : ''}.
                  {settings.coverLetterPromptTemplate.emphasizeCompanyKnowledge && ' Company-specific details will be emphasized.'}
                </p>
              </div>
            </div>

            {/* Reset to Default Button */}
            <div className="settings-view__section-actions">
              <button
                type="button"
                className="settings-view__btn settings-view__btn--secondary settings-view__btn--small"
                onClick={onResetCoverLetterPrompt}
              >
                Reset Cover Letter Settings to Default
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

/**
 * Get the default resume prompt template settings.
 */
export function getDefaultResumePromptSettings(): ResumePromptTemplateSettings {
  return DEFAULT_APP_SETTINGS.resumePromptTemplate;
}

/**
 * Get the default cover letter prompt template settings.
 */
export function getDefaultCoverLetterPromptSettings(): CoverLetterPromptTemplateSettings {
  return DEFAULT_APP_SETTINGS.coverLetterPromptTemplate;
}

export default PromptSettings;

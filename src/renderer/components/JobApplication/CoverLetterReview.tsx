import React, { useState, useCallback } from 'react'
import type { GeneratedCoverLetter } from '@schemas/ai-output.schema'
import CoverLetterPreview from '../CoverLetter/CoverLetterPreview'

type ViewMode = 'edit' | 'preview'

interface CoverLetterReviewProps {
  coverLetter: GeneratedCoverLetter
  onAccept: () => void
  onRegenerate: () => void
  onUpdateCoverLetter: (coverLetter: GeneratedCoverLetter) => void
}

/**
 * Review interface for the generated cover letter.
 * Provides editable textarea and preview modes with action buttons.
 */
function CoverLetterReview({
  coverLetter,
  onAccept,
  onRegenerate,
  onUpdateCoverLetter,
}: CoverLetterReviewProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('edit')

  const handleOpeningChange = useCallback(
    (value: string) => {
      onUpdateCoverLetter({
        ...coverLetter,
        opening: value,
      })
    },
    [coverLetter, onUpdateCoverLetter]
  )

  const handleBodyParagraphChange = useCallback(
    (index: number, value: string) => {
      const updatedBody = coverLetter.body.map((paragraph, i) => (i === index ? value : paragraph))
      onUpdateCoverLetter({
        ...coverLetter,
        body: updatedBody,
      })
    },
    [coverLetter, onUpdateCoverLetter]
  )

  const handleClosingChange = useCallback(
    (value: string) => {
      onUpdateCoverLetter({
        ...coverLetter,
        closing: value,
      })
    },
    [coverLetter, onUpdateCoverLetter]
  )

  const handleSignatureChange = useCallback(
    (value: string) => {
      onUpdateCoverLetter({
        ...coverLetter,
        signature: value,
      })
    },
    [coverLetter, onUpdateCoverLetter]
  )

  const handleAddParagraph = useCallback(() => {
    onUpdateCoverLetter({
      ...coverLetter,
      body: [...coverLetter.body, ''],
    })
  }, [coverLetter, onUpdateCoverLetter])

  const handleRemoveParagraph = useCallback(
    (index: number) => {
      if (coverLetter.body.length <= 1) return
      const updatedBody = coverLetter.body.filter((_, i) => i !== index)
      onUpdateCoverLetter({
        ...coverLetter,
        body: updatedBody,
      })
    },
    [coverLetter, onUpdateCoverLetter]
  )

  const renderMetadata = () => {
    const metadata = coverLetter.metadata
    if (!metadata) return null

    return (
      <div className="cover-letter-review__metadata">
        {metadata.tone && (
          <div className="cover-letter-review__tone">
            <strong>Tone:</strong>{' '}
            <span className="cover-letter-review__tone-value">
              {metadata.tone.charAt(0).toUpperCase() + metadata.tone.slice(1)}
            </span>
          </div>
        )}
        {metadata.highlightedExperiences && metadata.highlightedExperiences.length > 0 && (
          <div className="cover-letter-review__highlights">
            <strong>Highlighted Experiences:</strong>
            <ul className="cover-letter-review__highlights-list">
              {metadata.highlightedExperiences.map((exp, index) => (
                <li key={index}>{exp}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const renderEditMode = () => (
    <div className="cover-letter-review__edit-container">
      {/* Recipient Info (Read-only display) */}
      <div className="cover-letter-review__recipient-info">
        <strong>To:</strong> {coverLetter.companyName}
        {coverLetter.recipientName && ` - ${coverLetter.recipientName}`}
        {coverLetter.recipientTitle && `, ${coverLetter.recipientTitle}`}
      </div>

      {/* Opening */}
      <div className="cover-letter-review__field">
        <label className="cover-letter-review__label">Opening</label>
        <textarea
          className="cover-letter-review__textarea"
          value={coverLetter.opening}
          onChange={e => handleOpeningChange(e.target.value)}
          rows={3}
          placeholder="Opening paragraph..."
        />
      </div>

      {/* Body Paragraphs */}
      <div className="cover-letter-review__field">
        <label className="cover-letter-review__label">
          Body Paragraphs
          <button
            type="button"
            className="cover-letter-review__add-btn"
            onClick={handleAddParagraph}
            title="Add paragraph"
          >
            + Add
          </button>
        </label>
        {coverLetter.body.map((paragraph, index) => (
          <div key={index} className="cover-letter-review__paragraph-field">
            <textarea
              className="cover-letter-review__textarea"
              value={paragraph}
              onChange={e => handleBodyParagraphChange(index, e.target.value)}
              rows={4}
              placeholder={`Body paragraph ${index + 1}...`}
            />
            {coverLetter.body.length > 1 && (
              <button
                type="button"
                className="cover-letter-review__remove-btn"
                onClick={() => handleRemoveParagraph(index)}
                title="Remove paragraph"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Closing */}
      <div className="cover-letter-review__field">
        <label className="cover-letter-review__label">Closing</label>
        <textarea
          className="cover-letter-review__textarea"
          value={coverLetter.closing}
          onChange={e => handleClosingChange(e.target.value)}
          rows={2}
          placeholder="Closing paragraph..."
        />
      </div>

      {/* Signature */}
      <div className="cover-letter-review__field">
        <label className="cover-letter-review__label">Signature</label>
        <input
          type="text"
          className="cover-letter-review__input"
          value={coverLetter.signature}
          onChange={e => handleSignatureChange(e.target.value)}
          placeholder="Your name"
        />
      </div>
    </div>
  )

  const renderPreviewMode = () => (
    <div className="cover-letter-review__preview-container">
      <CoverLetterPreview coverLetter={coverLetter} />
    </div>
  )

  return (
    <div className="cover-letter-review">
      <div className="cover-letter-review__header">
        <h3>Review Cover Letter</h3>
        <p>Edit your cover letter content or preview the final format.</p>
      </div>

      {renderMetadata()}

      <div className="cover-letter-review__view-toggle">
        <button
          type="button"
          className={`cover-letter-review__toggle-btn ${viewMode === 'edit' ? 'cover-letter-review__toggle-btn--active' : ''}`}
          onClick={() => setViewMode('edit')}
        >
          Edit
        </button>
        <button
          type="button"
          className={`cover-letter-review__toggle-btn ${viewMode === 'preview' ? 'cover-letter-review__toggle-btn--active' : ''}`}
          onClick={() => setViewMode('preview')}
        >
          Preview
        </button>
      </div>

      <div className="cover-letter-review__content">
        {viewMode === 'edit' ? renderEditMode() : renderPreviewMode()}
      </div>

      <div className="cover-letter-review__actions">
        <button
          type="button"
          className="cover-letter-review__btn cover-letter-review__btn--secondary"
          onClick={onRegenerate}
        >
          Regenerate
        </button>
        <button
          type="button"
          className="cover-letter-review__btn cover-letter-review__btn--primary"
          onClick={onAccept}
        >
          Accept & Export
        </button>
      </div>
    </div>
  )
}

export default CoverLetterReview

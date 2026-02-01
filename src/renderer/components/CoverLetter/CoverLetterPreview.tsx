import React from 'react';
import type { GeneratedCoverLetter } from '@schemas/ai-output.schema';

interface CoverLetterPreviewProps {
  coverLetter: GeneratedCoverLetter;
  className?: string;
}

/**
 * Formatted display of cover letter content in a professional letter layout.
 * Used in both preview and review interfaces.
 */
function CoverLetterPreview({
  coverLetter,
  className = '',
}: CoverLetterPreviewProps): React.JSX.Element {
  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) {
      return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return dateStr;
  };

  return (
    <div className={`cover-letter-preview ${className}`.trim()}>
      {/* Date */}
      <div className="cover-letter-preview__date">
        {formatDate(coverLetter.date)}
      </div>

      {/* Recipient Info */}
      <div className="cover-letter-preview__recipient">
        {coverLetter.recipientName && (
          <div className="cover-letter-preview__recipient-name">
            {coverLetter.recipientName}
          </div>
        )}
        {coverLetter.recipientTitle && (
          <div className="cover-letter-preview__recipient-title">
            {coverLetter.recipientTitle}
          </div>
        )}
        <div className="cover-letter-preview__company-name">
          {coverLetter.companyName}
        </div>
        {coverLetter.companyAddress && (
          <div className="cover-letter-preview__company-address">
            {coverLetter.companyAddress}
          </div>
        )}
      </div>

      {/* Letter Body */}
      <div className="cover-letter-preview__body">
        {/* Opening */}
        <p className="cover-letter-preview__paragraph cover-letter-preview__paragraph--opening">
          {coverLetter.opening}
        </p>

        {/* Body Paragraphs */}
        {coverLetter.body.map((paragraph, index) => (
          <p key={index} className="cover-letter-preview__paragraph">
            {paragraph}
          </p>
        ))}

        {/* Closing */}
        <p className="cover-letter-preview__paragraph cover-letter-preview__paragraph--closing">
          {coverLetter.closing}
        </p>
      </div>

      {/* Signature */}
      <div className="cover-letter-preview__signature">
        {coverLetter.signature}
      </div>
    </div>
  );
}

export default CoverLetterPreview;

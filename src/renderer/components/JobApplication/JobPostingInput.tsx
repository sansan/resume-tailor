import React, { useState, useCallback } from 'react';
import type { JobPostingData } from '../../hooks/useJobApplication';

interface JobPostingInputProps {
  jobPosting: JobPostingData;
  onJobPostingChange: (data: Partial<JobPostingData>) => void;
  onSubmit: () => void;
  hasResume: boolean;
  isAIAvailable: boolean | null;
}

const MIN_JOB_POSTING_LENGTH = 50;
const MAX_JOB_POSTING_LENGTH = 50000;

function JobPostingInput({
  jobPosting,
  onJobPostingChange,
  onSubmit,
  hasResume,
  isAIAvailable,
}: JobPostingInputProps): React.JSX.Element {
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateJobPosting = useCallback((): boolean => {
    if (!jobPosting.rawText.trim()) {
      setValidationError('Please paste a job posting');
      return false;
    }

    if (jobPosting.rawText.length < MIN_JOB_POSTING_LENGTH) {
      setValidationError(`Job posting must be at least ${MIN_JOB_POSTING_LENGTH} characters`);
      return false;
    }

    if (jobPosting.rawText.length > MAX_JOB_POSTING_LENGTH) {
      setValidationError(`Job posting must not exceed ${MAX_JOB_POSTING_LENGTH} characters`);
      return false;
    }

    setValidationError(null);
    return true;
  }, [jobPosting.rawText]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onJobPostingChange({ rawText: text });

    // Clear validation error when user types
    if (validationError) {
      setValidationError(null);
    }

    // Try to auto-extract company name and job title from the text
    // This is a simple heuristic - it looks for common patterns
    if (text.length > 100 && !jobPosting.companyName && !jobPosting.jobTitle) {
      const lines = text.split('\n').filter((line) => line.trim());

      // Try to find job title (often in the first few lines)
      const possibleTitlePatterns = [
        /^(senior|junior|lead|principal|staff)?\s*(software|frontend|backend|full[\s-]?stack|devops|data|ml|machine learning)?\s*(engineer|developer|architect|scientist|analyst)/i,
        /^(product|project|engineering|technical)\s*(manager|lead|director)/i,
      ];

      for (const line of lines.slice(0, 5)) {
        for (const pattern of possibleTitlePatterns) {
          if (pattern.test(line.trim())) {
            onJobPostingChange({ jobTitle: line.trim().slice(0, 100) });
            break;
          }
        }
      }
    }
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onJobPostingChange({ companyName: e.target.value });
  };

  const handleJobTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onJobPostingChange({ jobTitle: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateJobPosting()) {
      onSubmit();
    }
  };

  const isSubmitDisabled = !hasResume || !jobPosting.rawText.trim() || isAIAvailable === false;

  const getSubmitButtonText = (): string => {
    if (!hasResume) {
      return 'Load Resume First';
    }
    if (isAIAvailable === false) {
      return 'AI Unavailable';
    }
    if (isAIAvailable === null) {
      return 'Checking AI...';
    }
    return 'Analyze & Refine';
  };

  return (
    <form className="job-posting-input" onSubmit={handleSubmit}>
      <div className="job-posting-input__header">
        <h2 className="job-posting-input__title">Job Application</h2>
        <p className="job-posting-input__description">
          Paste the job posting below and we&apos;ll help you tailor your resume and generate a cover letter.
        </p>
      </div>

      {/* Warning if no resume loaded */}
      {!hasResume && (
        <div className="job-posting-input__warning">
          <span className="job-posting-input__warning-icon">⚠️</span>
          <span>Please load and validate your resume in the Resume tab before proceeding.</span>
        </div>
      )}

      {/* Warning if AI unavailable */}
      {isAIAvailable === false && (
        <div className="job-posting-input__warning job-posting-input__warning--error">
          <span className="job-posting-input__warning-icon">⚠️</span>
          <span>Claude Code CLI is not available. Please ensure it is installed and accessible.</span>
        </div>
      )}

      {/* Optional fields row */}
      <div className="job-posting-input__optional-fields">
        <div className="job-posting-input__field">
          <label htmlFor="company-name" className="job-posting-input__label">
            Company Name <span className="job-posting-input__optional">(optional)</span>
          </label>
          <input
            id="company-name"
            type="text"
            className="job-posting-input__text-input"
            placeholder="e.g., Acme Corporation"
            value={jobPosting.companyName}
            onChange={handleCompanyChange}
          />
        </div>
        <div className="job-posting-input__field">
          <label htmlFor="job-title" className="job-posting-input__label">
            Job Title <span className="job-posting-input__optional">(optional)</span>
          </label>
          <input
            id="job-title"
            type="text"
            className="job-posting-input__text-input"
            placeholder="e.g., Senior Software Engineer"
            value={jobPosting.jobTitle}
            onChange={handleJobTitleChange}
          />
        </div>
      </div>

      {/* Main textarea */}
      <div className="job-posting-input__field job-posting-input__field--main">
        <label htmlFor="job-posting" className="job-posting-input__label">
          Job Posting
        </label>
        <textarea
          id="job-posting"
          className="job-posting-input__textarea"
          placeholder="Paste the full job posting here including requirements, responsibilities, and qualifications..."
          value={jobPosting.rawText}
          onChange={handleTextChange}
          rows={15}
        />
        <div className="job-posting-input__char-count">
          {jobPosting.rawText.length.toLocaleString()} / {MAX_JOB_POSTING_LENGTH.toLocaleString()} characters
          {jobPosting.rawText.length < MIN_JOB_POSTING_LENGTH && jobPosting.rawText.length > 0 && (
            <span className="job-posting-input__char-count--warning">
              {' '}(minimum {MIN_JOB_POSTING_LENGTH})
            </span>
          )}
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="job-posting-input__error">
          {validationError}
        </div>
      )}

      {/* Submit button */}
      <div className="job-posting-input__actions">
        <button
          type="submit"
          className="job-posting-input__submit-btn"
          disabled={isSubmitDisabled}
        >
          {getSubmitButtonText()}
        </button>
      </div>
    </form>
  );
}

export default JobPostingInput;

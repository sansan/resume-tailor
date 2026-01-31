import React from 'react';
import JobPostingInput from './JobPostingInput';
import ProcessingStatus from './ProcessingStatus';
import ProcessingError from './ProcessingError';
import RefinedResumeReview from './RefinedResumeReview';
import CoverLetterReview from './CoverLetterReview';
import ExportPanel from './ExportPanel';
import type { Resume } from '@schemas/resume.schema';
import type {
  UseJobApplicationState,
  UseJobApplicationActions,
} from '../../hooks/useJobApplication';

type JobApplicationViewProps = UseJobApplicationState &
  Pick<
    UseJobApplicationActions,
    | 'setJobPosting'
    | 'refineResume'
    | 'generateCoverLetter'
    | 'cancelOperation'
    | 'retry'
    | 'clearError'
    | 'resetWorkflow'
    | 'acceptRefinedResume'
    | 'updateRefinedResume'
    | 'acceptCoverLetter'
    | 'updateCoverLetter'
  > & {
    resume: Resume | null;
  };

function JobApplicationView({
  currentStep,
  jobPosting,
  aiState,
  error,
  isAIAvailable,
  refinedResume,
  coverLetter,
  originalResume,
  resume,
  setJobPosting,
  refineResume,
  generateCoverLetter,
  cancelOperation,
  retry,
  clearError,
  resetWorkflow,
  acceptRefinedResume,
  updateRefinedResume,
  acceptCoverLetter,
  updateCoverLetter,
}: JobApplicationViewProps): React.JSX.Element {
  const renderStepIndicator = () => {
    const steps = [
      { key: 'input', label: 'Input' },
      { key: 'processing', label: 'Processing' },
      { key: 'review', label: 'Review' },
      { key: 'export', label: 'Export' },
    ];

    const currentIndex = steps.findIndex((s) => s.key === currentStep);

    return (
      <div className="job-application__steps">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className={`job-application__step ${
              index === currentIndex ? 'job-application__step--active' : ''
            } ${index < currentIndex ? 'job-application__step--completed' : ''}`}
          >
            <div className="job-application__step-number">
              {index < currentIndex ? '✓' : index + 1}
            </div>
            <span className="job-application__step-label">{step.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderInputStep = () => (
    <JobPostingInput
      jobPosting={jobPosting}
      onJobPostingChange={setJobPosting}
      onSubmit={refineResume}
      hasResume={resume !== null}
      isAIAvailable={isAIAvailable}
    />
  );

  const handleBackToInput = () => {
    clearError();
    resetWorkflow();
  };

  const renderProcessingStep = () => (
    <div className="job-application__processing">
      <ProcessingStatus aiState={aiState} onCancel={cancelOperation} />

      {error && (
        <ProcessingError
          error={error}
          onRetry={retry}
          onBackToInput={handleBackToInput}
        />
      )}
    </div>
  );

  const handleRegenerate = () => {
    refineResume();
  };

  const handleRegenerateCoverLetter = () => {
    generateCoverLetter();
  };

  const renderReviewStep = () => {
    // Get the original resume from the hook state or fallback to prop
    const original = originalResume ?? resume;

    return (
      <div className="job-application__review">
        {/* Refined Resume Review Section */}
        {refinedResume && original && !coverLetter && (
          <RefinedResumeReview
            originalResume={original}
            refinedResume={refinedResume}
            onAccept={acceptRefinedResume}
            onRegenerate={handleRegenerate}
            onUpdateRefinedResume={updateRefinedResume}
          />
        )}

        {/* Cover Letter Review Section - shown after accepting resume */}
        {coverLetter && (
          <CoverLetterReview
            coverLetter={coverLetter}
            onAccept={acceptCoverLetter}
            onRegenerate={handleRegenerateCoverLetter}
            onUpdateCoverLetter={updateCoverLetter}
          />
        )}

        {/* Footer actions */}
        <div className="job-application__review-actions">
          {!coverLetter && refinedResume && (
            <p className="job-application__review-note">
              Click "Accept & Continue" to generate a cover letter.
            </p>
          )}
          <button
            type="button"
            className="job-application__btn job-application__btn--secondary"
            onClick={resetWorkflow}
          >
            Start Over
          </button>
        </div>
      </div>
    );
  };

  const renderExportStep = () => {
    if (!refinedResume || !coverLetter) {
      return (
        <div className="job-application__export">
          <h3>Export Your Application</h3>
          <p>Something went wrong. Please start over.</p>
          <button
            type="button"
            className="job-application__btn job-application__btn--secondary"
            onClick={resetWorkflow}
          >
            Start Over
          </button>
        </div>
      );
    }

    return (
      <ExportPanel
        refinedResume={refinedResume}
        coverLetter={coverLetter}
        companyName={jobPosting.companyName || coverLetter.companyName}
        jobTitle={jobPosting.jobTitle}
        onStartOver={resetWorkflow}
      />
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'input':
        return renderInputStep();
      case 'processing':
        return renderProcessingStep();
      case 'review':
        return renderReviewStep();
      case 'export':
        return renderExportStep();
      default:
        return renderInputStep();
    }
  };

  return (
    <div className="job-application">
      {renderStepIndicator()}
      <div className="job-application__content">
        {renderCurrentStep()}
      </div>
    </div>
  );
}

export default JobApplicationView;

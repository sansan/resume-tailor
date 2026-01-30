import React from 'react';
import type { AIOperationState } from '../../hooks/useJobApplication';

interface ProcessingStatusProps {
  aiState: AIOperationState;
  onCancel: () => void;
}

function ProcessingStatus({
  aiState,
  onCancel,
}: ProcessingStatusProps): React.JSX.Element {
  const getOperationTitle = (): string => {
    switch (aiState.currentOperation) {
      case 'refine':
        return 'Refining Resume...';
      case 'coverLetter':
        return 'Generating Cover Letter...';
      default:
        return 'Processing...';
    }
  };

  const getDefaultMessage = (): string => {
    return 'Please wait while we analyze the job posting and optimize your application materials.';
  };

  return (
    <div className="processing-status">
      <div className="processing-status__content">
        <div className="processing-status__spinner" />
        <h3 className="processing-status__title">{getOperationTitle()}</h3>
        <p className="processing-status__message">
          {aiState.statusMessage || getDefaultMessage()}
        </p>
        <div className="processing-status__progress-bar">
          <div
            className="processing-status__progress-fill"
            style={{ width: `${aiState.progress}%` }}
          />
        </div>
        <span className="processing-status__progress-text">
          {aiState.progress}%
        </span>
        <button
          type="button"
          className="processing-status__cancel-btn"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ProcessingStatus;

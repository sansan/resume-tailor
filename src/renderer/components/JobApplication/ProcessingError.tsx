import React, { useState } from 'react'
import type { AIOperationError } from '../../hooks/useJobApplication'

interface ProcessingErrorProps {
  error: AIOperationError
  onRetry: () => void
  onBackToInput: () => void
}

function ProcessingError({
  error,
  onRetry,
  onBackToInput,
}: ProcessingErrorProps): React.JSX.Element {
  const [showDetails, setShowDetails] = useState(false)

  const hasDetails = error.details !== undefined || error.rawResponse !== undefined

  const formatDetails = (): string => {
    const parts: string[] = []

    if (error.details) {
      parts.push(JSON.stringify(error.details, null, 2))
    }

    if (error.rawResponse) {
      if (parts.length > 0) {
        parts.push('\n--- Raw Response ---\n')
      }
      parts.push(error.rawResponse)
    }

    return parts.join('')
  }

  return (
    <div className="processing-error">
      <div className="processing-error__header">
        <span className="processing-error__icon">⚠️</span>
        <span className="processing-error__title">Error: {error.code}</span>
      </div>
      <p className="processing-error__message">{error.message}</p>

      {hasDetails && (
        <details
          className="processing-error__details"
          open={showDetails}
          onToggle={e => setShowDetails((e.target as HTMLDetailsElement).open)}
        >
          <summary>Technical Details</summary>
          <pre>{formatDetails()}</pre>
        </details>
      )}

      <div className="processing-error__actions">
        <button
          type="button"
          className="processing-error__btn processing-error__btn--primary"
          onClick={onRetry}
        >
          Retry
        </button>
        <button
          type="button"
          className="processing-error__btn processing-error__btn--secondary"
          onClick={onBackToInput}
        >
          Back to Input
        </button>
      </div>
    </div>
  )
}

export default ProcessingError

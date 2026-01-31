/**
 * OnboardingFlow Component
 *
 * Wrapper component that manages the complete onboarding flow.
 * Integrates all three onboarding screens and handles navigation between them.
 */

import { useState, useCallback, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useOnboarding } from '@/hooks/useOnboarding'
import { ProviderSetupScreen } from './ProviderSetupScreen'
import { ResumeUploadScreen } from './ResumeUploadScreen'
import { TemplateSelectScreen } from './TemplateSelectScreen'
import type { Resume } from '@schemas/resume.schema'

/**
 * Props for the OnboardingFlow component.
 */
export interface OnboardingFlowProps {
  /**
   * Called when onboarding is complete.
   */
  onComplete: () => void
}

/**
 * OnboardingFlow - Complete onboarding experience.
 *
 * Manages the flow through three screens:
 * 1. Provider Setup - Configure AI provider (CLI detection + API keys)
 * 2. Resume Upload - Upload and process resume file
 * 3. Template Selection - Choose template and color palette
 *
 * Features:
 * - Step-based navigation
 * - State persistence between steps
 * - Resume data loading for template preview
 */
export function OnboardingFlow({
  onComplete,
}: Readonly<OnboardingFlowProps>): React.JSX.Element {
  const {
    step,
    nextStep,
    prevStep,
    detectedCLIs,
    isDetectingCLIs,
    detectCLIs,
    processingPhase,
    setProcessingPhase,
  } = useOnboarding()

  // Store resume data loaded after upload
  const [resume, setResume] = useState<Resume | null>(null)
  const [isLoadingResume, setIsLoadingResume] = useState(false)

  /**
   * Load the user's profile/resume after they complete the upload step.
   * This data is used for the template preview on the final step.
   */
  const loadResumeData = useCallback(async () => {
    setIsLoadingResume(true)
    try {
      const profile = await window.electronAPI.loadProfile()
      if (profile?.resume) {
        setResume(profile.resume)
      }
    } catch (error) {
      console.error('Failed to load profile for template preview:', error)
      // Continue without resume data - template screen will use sample data
    } finally {
      setIsLoadingResume(false)
    }
  }, [])

  /**
   * Load resume data when entering the template step.
   */
  useEffect(() => {
    if (step === 'template' && resume === null && !isLoadingResume) {
      loadResumeData()
    }
  }, [step, resume, isLoadingResume, loadResumeData])

  /**
   * Handle provider setup completion.
   */
  const handleProviderComplete = useCallback(() => {
    nextStep()
  }, [nextStep])

  /**
   * Handle resume upload completion.
   */
  const handleResumeComplete = useCallback(() => {
    nextStep()
  }, [nextStep])

  /**
   * Handle going back from resume step.
   */
  const handleResumeBack = useCallback(() => {
    prevStep()
  }, [prevStep])

  /**
   * Handle template selection completion (final step).
   */
  const handleTemplateComplete = useCallback(() => {
    onComplete()
  }, [onComplete])

  /**
   * Handle going back from template step.
   */
  const handleTemplateBack = useCallback(() => {
    prevStep()
  }, [prevStep])

  /**
   * Render the current step's screen.
   */
  const renderStep = () => {
    switch (step) {
      case 'provider':
        return (
          <ProviderSetupScreen
            onComplete={handleProviderComplete}
            detectedCLIs={detectedCLIs}
            isDetectingCLIs={isDetectingCLIs}
            detectCLIs={detectCLIs}
          />
        )

      case 'resume':
        return (
          <ResumeUploadScreen
            onComplete={handleResumeComplete}
            onBack={handleResumeBack}
            processingPhase={processingPhase}
            setProcessingPhase={setProcessingPhase}
          />
        )

      case 'template':
        // Show loading state while fetching resume data
        if (isLoadingResume) {
          return (
            <div className="flex min-h-full flex-col items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                Loading your profile...
              </p>
            </div>
          )
        }

        return (
          <TemplateSelectScreen
            onComplete={handleTemplateComplete}
            onBack={handleTemplateBack}
            resume={resume}
          />
        )

      default:
        // Should never reach here, but TypeScript exhaustiveness check
        return null
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Step indicator */}
      <div className="border-b">
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-4 py-4">
          <StepIndicator
            stepNumber={1}
            label="AI Setup"
            isActive={step === 'provider'}
            isComplete={step === 'resume' || step === 'template'}
          />
          <StepConnector isComplete={step === 'resume' || step === 'template'} />
          <StepIndicator
            stepNumber={2}
            label="Resume"
            isActive={step === 'resume'}
            isComplete={step === 'template'}
          />
          <StepConnector isComplete={step === 'template'} />
          <StepIndicator
            stepNumber={3}
            label="Template"
            isActive={step === 'template'}
            isComplete={false}
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">{renderStep()}</div>
      </div>
    </div>
  )
}

/**
 * Props for the StepIndicator component.
 */
interface StepIndicatorProps {
  stepNumber: number
  label: string
  isActive: boolean
  isComplete: boolean
}

/**
 * StepIndicator - Visual indicator for a single onboarding step.
 */
function StepIndicator({
  stepNumber,
  label,
  isActive,
  isComplete,
}: Readonly<StepIndicatorProps>): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
          isComplete
            ? 'bg-primary text-primary-foreground'
            : isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {isComplete ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          stepNumber
        )}
      </div>
      <span
        className={`text-sm font-medium ${
          isActive || isComplete ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

/**
 * Props for the StepConnector component.
 */
interface StepConnectorProps {
  isComplete: boolean
}

/**
 * StepConnector - Visual connector line between steps.
 */
function StepConnector({
  isComplete,
}: Readonly<StepConnectorProps>): React.JSX.Element {
  return (
    <div
      className={`h-0.5 w-12 transition-colors ${
        isComplete ? 'bg-primary' : 'bg-muted'
      }`}
    />
  )
}

export default OnboardingFlow

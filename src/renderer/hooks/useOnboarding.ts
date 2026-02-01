import { useState, useCallback, useEffect } from 'react'
import type { CLITool } from '@app-types/electron.d'

/**
 * Processing phases for resume import animation.
 */
export type ProcessingPhase =
  | 'idle'
  | 'reading'
  | 'extracting'
  | 'organizing'
  | 'finalizing'
  | 'complete'

/**
 * Onboarding steps.
 */
export type OnboardingStep = 'provider' | 'resume' | 'template'

/**
 * Return type for the useOnboarding hook.
 */
export interface UseOnboardingReturn {
  // Step navigation
  step: OnboardingStep
  nextStep: () => void
  prevStep: () => void
  canGoNext: boolean
  canGoPrev: boolean

  // Provider screen state
  detectedCLIs: CLITool[]
  isDetectingCLIs: boolean
  detectCLIs: () => Promise<void>

  // Resume processing phases (for animated progress)
  processingPhase: ProcessingPhase
  setProcessingPhase: (phase: ProcessingPhase) => void

  // Completion
  completeOnboarding: () => Promise<void>
  isComplete: boolean
  isCompleting: boolean
}

/**
 * Step order for navigation.
 */
const STEP_ORDER: readonly OnboardingStep[] = ['provider', 'resume', 'template'] as const

/**
 * Hook for managing onboarding flow state.
 *
 * Provides step navigation, CLI detection, processing phase tracking,
 * and onboarding completion functionality.
 */
export function useOnboarding(): UseOnboardingReturn {
  // Step navigation state
  const [step, setStep] = useState<OnboardingStep>('provider')

  // Provider screen state
  const [detectedCLIs, setDetectedCLIs] = useState<CLITool[]>([])
  const [isDetectingCLIs, setIsDetectingCLIs] = useState(false)

  // Resume processing phase
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>('idle')

  // Completion state
  const [isComplete, setIsComplete] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  // Check if onboarding is already complete on mount
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const complete = await window.electronAPI.isOnboardingComplete()
        setIsComplete(complete)
      } catch (error) {
        console.error('Failed to check onboarding status:', error)
      }
    }
    checkOnboardingStatus()
  }, [])

  // Detect CLIs on mount
  useEffect(() => {
    detectCLIsInternal()
  }, [])

  /**
   * Internal CLI detection function.
   */
  const detectCLIsInternal = async () => {
    setIsDetectingCLIs(true)
    try {
      const clis = await window.electronAPI.detectInstalledCLIs()
      setDetectedCLIs(clis)
    } catch (error) {
      console.error('Failed to detect CLIs:', error)
      setDetectedCLIs([])
    } finally {
      setIsDetectingCLIs(false)
    }
  }

  /**
   * Detect installed AI CLIs.
   */
  const detectCLIs = useCallback(async () => {
    await detectCLIsInternal()
  }, [])

  /**
   * Get current step index.
   */
  const getCurrentStepIndex = useCallback(() => {
    return STEP_ORDER.indexOf(step)
  }, [step])

  /**
   * Navigate to the next step.
   */
  const nextStep = useCallback(() => {
    const currentIndex = getCurrentStepIndex()
    const nextIndex = currentIndex + 1
    if (nextIndex < STEP_ORDER.length) {
      const nextStepValue = STEP_ORDER[nextIndex]
      if (nextStepValue !== undefined) {
        setStep(nextStepValue)
      }
    }
  }, [getCurrentStepIndex])

  /**
   * Navigate to the previous step.
   */
  const prevStep = useCallback(() => {
    const currentIndex = getCurrentStepIndex()
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      const prevStepValue = STEP_ORDER[prevIndex]
      if (prevStepValue !== undefined) {
        setStep(prevStepValue)
      }
    }
  }, [getCurrentStepIndex])

  /**
   * Check if we can navigate to the next step.
   */
  const canGoNext = getCurrentStepIndex() < STEP_ORDER.length - 1

  /**
   * Check if we can navigate to the previous step.
   */
  const canGoPrev = getCurrentStepIndex() > 0

  /**
   * Complete the onboarding process.
   */
  const completeOnboarding = useCallback(async () => {
    if (isCompleting) return

    setIsCompleting(true)
    try {
      await window.electronAPI.completeOnboarding()
      setIsComplete(true)
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      throw error
    } finally {
      setIsCompleting(false)
    }
  }, [isCompleting])

  return {
    // Step navigation
    step,
    nextStep,
    prevStep,
    canGoNext,
    canGoPrev,

    // Provider screen state
    detectedCLIs,
    isDetectingCLIs,
    detectCLIs,

    // Resume processing phases
    processingPhase,
    setProcessingPhase,

    // Completion
    completeOnboarding,
    isComplete,
    isCompleting,
  }
}

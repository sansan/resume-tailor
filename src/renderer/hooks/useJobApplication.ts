import { useState, useCallback, useEffect } from 'react'
import type { Resume } from '@schemas/resume.schema'
import type { RefinedResume, GeneratedCoverLetter } from '@schemas/ai-output.schema'
import type { AIProgressUpdate, AIResult } from '@app-types/electron'

export type JobApplicationStep = 'input' | 'processing' | 'review' | 'export'

export interface JobPostingData {
  rawText: string
  companyName: string
  jobTitle: string
}

export interface AIOperationState {
  isLoading: boolean
  currentOperation: 'refine' | 'coverLetter' | null
  progress: number
  statusMessage: string | null
  operationId: string | null
}

export interface AIOperationError {
  code: string
  message: string
  details?: Record<string, unknown>
  rawResponse?: string
}

export interface UseJobApplicationState {
  currentStep: JobApplicationStep
  jobPosting: JobPostingData
  originalResume: Resume | null
  refinedResume: RefinedResume | null
  coverLetter: GeneratedCoverLetter | null
  aiState: AIOperationState
  error: AIOperationError | null
  isAIAvailable: boolean | null
}

export interface UseJobApplicationActions {
  setJobPosting: (data: Partial<JobPostingData>) => void
  setOriginalResume: (resume: Resume | null) => void
  goToStep: (step: JobApplicationStep) => void
  refineResume: () => Promise<void>
  generateCoverLetter: () => Promise<void>
  cancelOperation: () => Promise<void>
  retry: () => Promise<void>
  acceptRefinedResume: () => void
  acceptCoverLetter: () => void
  updateRefinedResume: (resume: RefinedResume) => void
  updateCoverLetter: (coverLetter: GeneratedCoverLetter) => void
  resetWorkflow: () => void
  checkAIAvailability: () => Promise<boolean>
  clearError: () => void
}

export type UseJobApplicationReturn = UseJobApplicationState & UseJobApplicationActions

const MIN_JOB_POSTING_LENGTH = 50
const MAX_JOB_POSTING_LENGTH = 50000

export function useJobApplication(): UseJobApplicationReturn {
  const [currentStep, setCurrentStep] = useState<JobApplicationStep>('input')
  const [jobPosting, setJobPostingInternal] = useState<JobPostingData>({
    rawText: '',
    companyName: '',
    jobTitle: '',
  })
  const [originalResume, setOriginalResume] = useState<Resume | null>(null)
  const [refinedResume, setRefinedResume] = useState<RefinedResume | null>(null)
  const [coverLetter, setCoverLetter] = useState<GeneratedCoverLetter | null>(null)
  const [aiState, setAIState] = useState<AIOperationState>({
    isLoading: false,
    currentOperation: null,
    progress: 0,
    statusMessage: null,
    operationId: null,
  })
  const [error, setError] = useState<AIOperationError | null>(null)
  const [isAIAvailable, setIsAIAvailable] = useState<boolean | null>(null)
  const [lastOperation, setLastOperation] = useState<'refine' | 'coverLetter' | null>(null)

  // Listen for AI progress updates
  useEffect(() => {
    const unsubscribe = window.electronAPI.onAIProgress((update: AIProgressUpdate) => {
      if (update.operationId === aiState.operationId) {
        setAIState(prev => ({
          ...prev,
          progress: update.progress ?? prev.progress,
          statusMessage: update.message ?? prev.statusMessage,
        }))

        if (
          update.status === 'completed' ||
          update.status === 'error' ||
          update.status === 'cancelled'
        ) {
          setAIState(prev => ({
            ...prev,
            isLoading: false,
            operationId: null,
          }))
        }
      }
    })

    return unsubscribe
  }, [aiState.operationId])

  const checkAIAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const available = await window.electronAPI.checkAIAvailability()
      setIsAIAvailable(available)
      return available
    } catch {
      setIsAIAvailable(false)
      return false
    }
  }, [])

  // Check AI availability on mount
  useEffect(() => {
    checkAIAvailability()
  }, [checkAIAvailability])

  const setJobPosting = useCallback((data: Partial<JobPostingData>) => {
    setJobPostingInternal(prev => ({ ...prev, ...data }))
  }, [])

  const goToStep = useCallback((step: JobApplicationStep) => {
    setCurrentStep(step)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleAIError = useCallback((result: AIResult<unknown>) => {
    if (!result.success) {
      const errorObj: AIOperationError = {
        code: result.error.code,
        message: result.error.message,
      }
      if (result.error.details !== undefined) {
        errorObj.details = result.error.details
      }
      setError(errorObj)
      setAIState(prev => ({
        ...prev,
        isLoading: false,
        currentOperation: null,
        operationId: null,
      }))
    }
  }, [])

  const refineResume = useCallback(async () => {
    if (!originalResume) {
      setError({
        code: 'NO_RESUME',
        message: 'Please load a resume before refining',
      })
      return
    }

    if (jobPosting.rawText.length < MIN_JOB_POSTING_LENGTH) {
      setError({
        code: 'INVALID_JOB_POSTING',
        message: `Job posting must be at least ${MIN_JOB_POSTING_LENGTH} characters`,
      })
      return
    }

    if (jobPosting.rawText.length > MAX_JOB_POSTING_LENGTH) {
      setError({
        code: 'INVALID_JOB_POSTING',
        message: `Job posting must not exceed ${MAX_JOB_POSTING_LENGTH} characters`,
      })
      return
    }

    setError(null)
    setCurrentStep('processing')
    setLastOperation('refine')
    setAIState({
      isLoading: true,
      currentOperation: 'refine',
      progress: 0,
      statusMessage: 'Starting resume refinement...',
      operationId: `refine_${Date.now()}`,
    })

    try {
      const result = await window.electronAPI.refineResume({
        resume: originalResume,
        jobPosting: jobPosting.rawText,
        options: { includeMetadata: true },
      })

      if (result.success) {
        setRefinedResume(result.data)
        setAIState({
          isLoading: false,
          currentOperation: null,
          progress: 100,
          statusMessage: 'Resume refined successfully!',
          operationId: null,
        })
        setCurrentStep('review')
      } else {
        handleAIError(result)
      }
    } catch (err) {
      setError({
        code: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      })
      setAIState(prev => ({
        ...prev,
        isLoading: false,
        currentOperation: null,
        operationId: null,
      }))
    }
  }, [originalResume, jobPosting.rawText, handleAIError])

  const generateCoverLetter = useCallback(async () => {
    const resumeToUse = refinedResume ?? originalResume

    if (!resumeToUse) {
      setError({
        code: 'NO_RESUME',
        message: 'Please load a resume before generating a cover letter',
      })
      return
    }

    if (jobPosting.rawText.length < MIN_JOB_POSTING_LENGTH) {
      setError({
        code: 'INVALID_JOB_POSTING',
        message: `Job posting must be at least ${MIN_JOB_POSTING_LENGTH} characters`,
      })
      return
    }

    setError(null)
    setCurrentStep('processing')
    setLastOperation('coverLetter')
    setAIState({
      isLoading: true,
      currentOperation: 'coverLetter',
      progress: 0,
      statusMessage: 'Generating cover letter...',
      operationId: `coverLetter_${Date.now()}`,
    })

    try {
      const params: Parameters<typeof window.electronAPI.generateCoverLetter>[0] = {
        resume: resumeToUse,
        jobPosting: jobPosting.rawText,
        options: { includeMetadata: true },
      }
      if (jobPosting.companyName) {
        params.companyInfo = { name: jobPosting.companyName }
      }
      const result = await window.electronAPI.generateCoverLetter(params)

      if (result.success) {
        setCoverLetter(result.data)
        setAIState({
          isLoading: false,
          currentOperation: null,
          progress: 100,
          statusMessage: 'Cover letter generated successfully!',
          operationId: null,
        })
        setCurrentStep('review')
      } else {
        handleAIError(result)
      }
    } catch (err) {
      setError({
        code: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      })
      setAIState(prev => ({
        ...prev,
        isLoading: false,
        currentOperation: null,
        operationId: null,
      }))
    }
  }, [originalResume, refinedResume, jobPosting, handleAIError])

  const cancelOperation = useCallback(async () => {
    if (aiState.operationId) {
      try {
        await window.electronAPI.cancelAIOperation(aiState.operationId)
        setAIState({
          isLoading: false,
          currentOperation: null,
          progress: 0,
          statusMessage: 'Operation cancelled',
          operationId: null,
        })
        setCurrentStep('input')
      } catch (err) {
        console.error('Failed to cancel operation:', err)
      }
    }
  }, [aiState.operationId])

  const retry = useCallback(async () => {
    setError(null)
    if (lastOperation === 'refine') {
      await refineResume()
    } else if (lastOperation === 'coverLetter') {
      await generateCoverLetter()
    }
  }, [lastOperation, refineResume, generateCoverLetter])

  const acceptRefinedResume = useCallback(() => {
    // Move to cover letter generation if not done yet
    if (!coverLetter) {
      generateCoverLetter()
    }
  }, [coverLetter, generateCoverLetter])

  const acceptCoverLetter = useCallback(() => {
    if (refinedResume && coverLetter) {
      setCurrentStep('export')
    }
  }, [refinedResume, coverLetter])

  const updateRefinedResume = useCallback((resume: RefinedResume) => {
    setRefinedResume(resume)
  }, [])

  const updateCoverLetter = useCallback((letter: GeneratedCoverLetter) => {
    setCoverLetter(letter)
  }, [])

  const resetWorkflow = useCallback(() => {
    setCurrentStep('input')
    setJobPostingInternal({
      rawText: '',
      companyName: '',
      jobTitle: '',
    })
    setRefinedResume(null)
    setCoverLetter(null)
    setError(null)
    setAIState({
      isLoading: false,
      currentOperation: null,
      progress: 0,
      statusMessage: null,
      operationId: null,
    })
    setLastOperation(null)
  }, [])

  return {
    // State
    currentStep,
    jobPosting,
    originalResume,
    refinedResume,
    coverLetter,
    aiState,
    error,
    isAIAvailable,
    // Actions
    setJobPosting,
    setOriginalResume,
    goToStep,
    refineResume,
    generateCoverLetter,
    cancelOperation,
    retry,
    acceptRefinedResume,
    acceptCoverLetter,
    updateRefinedResume,
    updateCoverLetter,
    resetWorkflow,
    checkAIAvailability,
    clearError,
  }
}

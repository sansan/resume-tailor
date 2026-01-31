/**
 * ProcessingProgress Component
 *
 * Displays animated step-by-step progress during resume import.
 * Shows completed, current, and pending phases with rotating subtitles.
 */

import { useEffect, useState } from 'react'
import { CheckCircle2, FileText, Search, Brain, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProcessingPhase } from '@/hooks/useOnboarding'

/**
 * Props for the ProcessingProgress component.
 */
export interface ProcessingProgressProps {
  /**
   * Current processing phase.
   */
  phase: ProcessingPhase
}

/**
 * Configuration for each processing phase.
 */
interface PhaseConfig {
  id: ProcessingPhase
  icon: React.ReactNode
  label: string
  subtitles: string[]
}

/**
 * Ordered list of processing phases with their display configuration.
 */
const PHASES: PhaseConfig[] = [
  {
    id: 'reading',
    icon: <FileText className="size-5" />,
    label: 'Reading document',
    subtitles: ['Opening your resume...'],
  },
  {
    id: 'extracting',
    icon: <Search className="size-5" />,
    label: 'Extracting information',
    subtitles: [
      'Finding your skills...',
      'Spotting achievements...',
      'Identifying experience...',
    ],
  },
  {
    id: 'organizing',
    icon: <Brain className="size-5" />,
    label: 'Organizing sections',
    subtitles: [
      'Sorting experience...',
      'Grouping skills...',
      'Structuring content...',
    ],
  },
  {
    id: 'finalizing',
    icon: <Sparkles className="size-5" />,
    label: 'Finalizing profile',
    subtitles: ['Almost there...', 'Polishing up...', 'Final touches...'],
  },
]

/**
 * Get the index of a phase in the ordered list.
 */
function getPhaseIndex(phase: ProcessingPhase): number {
  if (phase === 'idle') return -1
  if (phase === 'complete') return PHASES.length
  return PHASES.findIndex((p) => p.id === phase)
}

/**
 * ProcessingProgress - Animated step-by-step progress indicator.
 *
 * Shows the current state of resume processing with:
 * - Checkmarks for completed steps
 * - Pulsing indicator for current step
 * - Empty circles for pending steps
 * - Rotating subtitles for the current phase
 */
export function ProcessingProgress({
  phase,
}: Readonly<ProcessingProgressProps>): React.JSX.Element {
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(0)
  const currentPhaseIndex = getPhaseIndex(phase)

  // Get the current phase config
  const currentPhase = PHASES.find((p) => p.id === phase)

  // Rotate through subtitles for the current phase
  useEffect(() => {
    if (!currentPhase || currentPhase.subtitles.length <= 1) {
      setCurrentSubtitleIndex(0)
      return
    }

    const interval = setInterval(() => {
      setCurrentSubtitleIndex(
        (prev) => (prev + 1) % currentPhase.subtitles.length
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [currentPhase])

  // Reset subtitle index when phase changes
  useEffect(() => {
    setCurrentSubtitleIndex(0)
  }, [phase])

  // Get current subtitle
  const currentSubtitle = currentPhase?.subtitles[currentSubtitleIndex] ?? ''

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Animated document icon */}
      <div className="relative mb-2">
        <div
          className={cn(
            'flex size-16 items-center justify-center rounded-full transition-all duration-500',
            phase === 'complete'
              ? 'bg-green-500/10 text-green-500'
              : 'bg-primary/10 text-primary'
          )}
        >
          {phase === 'complete' ? (
            <CheckCircle2 className="size-8" />
          ) : (
            <FileText className="size-8 animate-pulse" />
          )}
        </div>
        {/* Animated ring */}
        {phase !== 'complete' && phase !== 'idle' && (
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        )}
      </div>

      {/* Processing steps */}
      <div className="w-full max-w-xs space-y-3">
        {PHASES.map((phaseConfig, index) => {
          const isCompleted = index < currentPhaseIndex
          const isCurrent = phaseConfig.id === phase
          const isPending = index > currentPhaseIndex

          return (
            <div
              key={phaseConfig.id}
              className={cn(
                'flex items-center gap-3 transition-opacity duration-300',
                isPending && 'opacity-40'
              )}
            >
              {/* Status indicator */}
              <div className="flex size-6 shrink-0 items-center justify-center">
                {isCompleted ? (
                  <CheckCircle2 className="size-5 text-green-500" />
                ) : isCurrent ? (
                  <div className="relative flex size-5 items-center justify-center">
                    <div className="absolute size-3 animate-ping rounded-full bg-primary/50" />
                    <div className="size-3 rounded-full bg-primary" />
                  </div>
                ) : (
                  <div className="size-3 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>

              {/* Phase icon and label */}
              <div
                className={cn(
                  'flex items-center gap-2',
                  isCurrent && 'text-primary font-medium',
                  isCompleted && 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'text-muted-foreground',
                    isCurrent && 'text-primary'
                  )}
                >
                  {phaseConfig.icon}
                </span>
                <span>{phaseConfig.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Current subtitle */}
      <div className="h-6 text-center">
        <p
          className={cn(
            'text-sm text-muted-foreground transition-opacity duration-300',
            phase === 'complete' && 'text-green-600 dark:text-green-400 font-medium'
          )}
        >
          {phase === 'complete'
            ? 'Profile created!'
            : currentSubtitle}
        </p>
      </div>
    </div>
  )
}

export default ProcessingProgress

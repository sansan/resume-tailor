/**
 * ProcessingProgress Component
 *
 * Displays animated progress during resume import.
 * Shows only the current phase with flip animation on text transitions.
 */

import { useEffect, useState, useRef } from 'react'
import { CheckCircle2, FileText, Search, Brain, Sparkles, Loader2 } from 'lucide-react'
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
    icon: <FileText className="size-6" />,
    label: 'Reading document',
    subtitles: ['Opening your resume...'],
  },
  {
    id: 'extracting',
    icon: <Search className="size-6" />,
    label: 'Extracting information',
    subtitles: [
      'Finding your skills...',
      'Spotting achievements...',
      'Identifying experience...',
    ],
  },
  {
    id: 'organizing',
    icon: <Brain className="size-6" />,
    label: 'Organizing sections',
    subtitles: [
      'Sorting experience...',
      'Grouping skills...',
      'Structuring content...',
    ],
  },
  {
    id: 'finalizing',
    icon: <Sparkles className="size-6" />,
    label: 'Finalizing profile',
    subtitles: ['Almost there...', 'Polishing up...', 'Final touches...'],
  },
]

/**
 * ProcessingProgress - Minimalist animated progress indicator.
 *
 * Shows only the current state with smooth flip animations:
 * - Large animated icon
 * - Current phase label with flip transition
 * - Rotating subtitles with fade animation
 */
export function ProcessingProgress({
  phase,
}: Readonly<ProcessingProgressProps>): React.JSX.Element {
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(0)
  const [displayedPhase, setDisplayedPhase] = useState(phase)
  const [isFlipping, setIsFlipping] = useState(false)
  const prevPhaseRef = useRef(phase)

  // Get the current phase config
  const currentPhase = PHASES.find((p) => p.id === displayedPhase)

  // Handle phase transition with flip animation
  useEffect(() => {
    if (phase !== prevPhaseRef.current) {
      setIsFlipping(true)
      // Wait for exit animation, then update and animate in
      const timer = setTimeout(() => {
        setDisplayedPhase(phase)
        setIsFlipping(false)
      }, 150)
      prevPhaseRef.current = phase
      return () => clearTimeout(timer)
    }
  }, [phase])

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
  }, [displayedPhase])

  // Get current subtitle
  const currentSubtitle = currentPhase?.subtitles[currentSubtitleIndex] ?? ''
  const isComplete = phase === 'complete'

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Animated icon container */}
      <div className="relative">
        <div
          className={cn(
            'flex size-20 items-center justify-center rounded-full transition-all duration-500',
            isComplete
              ? 'bg-green-500/10 text-green-500'
              : 'bg-primary/10 text-primary'
          )}
        >
          {isComplete ? (
            <CheckCircle2 className="size-10" />
          ) : (
            <Loader2 className="size-10 animate-spin" />
          )}
        </div>
        {/* Animated ring */}
        {!isComplete && phase !== 'idle' && (
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 [animation-duration:1.5s]" />
        )}
      </div>

      {/* Current phase label with flip animation */}
      <div className="relative h-8 overflow-hidden">
        <p
          className={cn(
            'text-xl font-semibold transition-all duration-300',
            isFlipping
              ? 'translate-y-full opacity-0'
              : 'translate-y-0 opacity-100',
            isComplete ? 'text-green-600 dark:text-green-400' : 'text-foreground'
          )}
        >
          {isComplete ? 'Profile created!' : currentPhase?.label}
        </p>
      </div>

      {/* Current subtitle with fade animation */}
      <div className="h-6">
        <p
          key={currentSubtitle}
          className={cn(
            'text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300',
            isComplete && 'text-green-600/80 dark:text-green-400/80'
          )}
        >
          {isComplete
            ? 'Your information has been extracted successfully'
            : currentSubtitle}
        </p>
      </div>

      {/* Progress dots */}
      {!isComplete && (
        <div className="flex gap-2 pt-2">
          {PHASES.map((p, idx) => {
            const currentIdx = PHASES.findIndex((x) => x.id === displayedPhase)
            const isActive = idx === currentIdx
            const isDone = idx < currentIdx
            return (
              <div
                key={p.id}
                className={cn(
                  'size-2 rounded-full transition-all duration-300',
                  isActive && 'bg-primary scale-125',
                  isDone && 'bg-primary/60',
                  !isActive && !isDone && 'bg-muted-foreground/30'
                )}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProcessingProgress

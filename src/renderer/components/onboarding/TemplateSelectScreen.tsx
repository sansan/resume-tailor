/**
 * TemplateSelectScreen Component
 *
 * Third and final screen of the onboarding flow.
 * Allows users to select their preferred resume template and color palette
 * while seeing a live PDF preview.
 */

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Loader2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { TemplateCarousel } from '@/components/templates/TemplateCarousel'
import { PaletteSelector } from '@/components/templates/PaletteSelector'
import ResumePDFPreview from '@/components/Resume/ResumePDFPreview'
import { useTemplates } from '@/hooks/useTemplates'
import type { Resume } from '@schemas/resume.schema'

/**
 * Props for the TemplateSelectScreen component.
 */
export interface TemplateSelectScreenProps {
  /**
   * Called when user clicks Complete Setup.
   */
  onComplete: () => void
  /**
   * Called when user clicks Back.
   */
  onBack?: () => void
  /**
   * User's resume data. May be null if they skipped the upload step.
   */
  resume: Resume | null
}

/**
 * Sample resume data used when user has not uploaded their own resume.
 * Provides a realistic preview of how templates and palettes will look.
 */
const SAMPLE_RESUME: Resume = {
  personalInfo: {
    name: 'Alex Johnson',
    location: 'San Francisco, CA',
    summary:
      'Experienced software engineer with 5+ years building scalable web applications. Passionate about clean code, user experience, and mentoring junior developers.',
    contacts: [
      { type: 'email', value: 'alex.johnson@email.com' },
      { type: 'phone', value: '(555) 123-4567' },
      { type: 'linkedin', value: 'linkedin.com/in/alexjohnson' },
      { type: 'github', value: 'github.com/alexjohnson' },
    ],
  },
  workExperience: [
    {
      company: 'TechCorp Inc.',
      title: 'Senior Software Engineer',
      startDate: 'Jan 2021',
      endDate: 'Present',
      location: 'San Francisco, CA',
      highlights: [
        'Led development of microservices architecture serving 1M+ daily users',
        'Mentored team of 4 junior developers, improving code review velocity by 40%',
        'Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes',
      ],
    },
    {
      company: 'StartupXYZ',
      title: 'Software Engineer',
      startDate: 'Jun 2018',
      endDate: 'Dec 2020',
      location: 'San Francisco, CA',
      highlights: [
        'Built React-based dashboard used by 500+ enterprise customers',
        'Optimized database queries resulting in 60% faster page load times',
        'Collaborated with product team to define technical requirements for new features',
      ],
    },
  ],
  education: [
    {
      institution: 'University of California, Berkeley',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      graduationDate: 'May 2018',
      highlights: ['Dean\'s List', 'Teaching Assistant for Data Structures'],
    },
  ],
  skills: [
    { name: 'TypeScript', level: 'expert', category: 'Languages' },
    { name: 'React', level: 'expert', category: 'Frontend' },
    { name: 'Node.js', level: 'advanced', category: 'Backend' },
    { name: 'PostgreSQL', level: 'advanced', category: 'Databases' },
    { name: 'AWS', level: 'intermediate', category: 'Cloud' },
    { name: 'Docker', level: 'intermediate', category: 'DevOps' },
  ],
  projects: [],
  certifications: [],
}

/**
 * TemplateSelectScreen - Template and palette selection screen.
 *
 * Features:
 * - Template carousel for layout selection
 * - Palette selector for color scheme selection
 * - Live PDF preview that updates on selection changes
 * - Complete Setup button to finish onboarding
 */
export function TemplateSelectScreen({
  onComplete,
  onBack,
  resume,
}: Readonly<TemplateSelectScreenProps>): React.JSX.Element {
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    templates,
    selectedTemplate,
    setSelectedTemplate,
    palettes,
    selectedPalette,
    setSelectedPalette,
    getSelectedPalette,
    savePreferences,
    isSaving,
  } = useTemplates()

  // Use sample resume if user hasn't uploaded one
  const displayResume = resume ?? SAMPLE_RESUME
  const isUsingSample = resume === null

  // Get the currently selected palette object for the preview
  const currentPalette = getSelectedPalette()

  /**
   * Handle completing the onboarding setup.
   */
  const handleComplete = useCallback(async () => {
    if (isCompleting || isSaving) return

    setIsCompleting(true)
    setError(null)

    try {
      // Save template and palette preferences
      await savePreferences()

      // Mark onboarding as complete
      await window.electronAPI.completeOnboarding()

      // Notify parent component
      onComplete()
    } catch (err) {
      console.error('Failed to complete setup:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to complete setup. Please try again.'
      )
      setIsCompleting(false)
    }
  }, [isCompleting, isSaving, savePreferences, onComplete])

  const isLoading = isCompleting || isSaving

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Choose your template
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Select a layout and color scheme for your resume
        </p>
      </div>

      {/* Main content */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
        {/* Template Carousel Section */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Template Style
          </h2>
          <TemplateCarousel
            templates={templates}
            selectedId={selectedTemplate}
            onSelect={setSelectedTemplate}
          />
        </section>

        <Separator />

        {/* Palette Selector Section */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Color Palette
          </h2>
          <PaletteSelector
            palettes={palettes}
            selectedId={selectedPalette}
            onSelect={setSelectedPalette}
          />
        </section>

        <Separator />

        {/* PDF Preview Section */}
        <section className="flex-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Preview
            </h2>
            {isUsingSample && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="size-3" />
                Showing sample resume
              </span>
            )}
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-md">
              {currentPalette ? (
                <ResumePDFPreview
                  resume={displayResume}
                  templateId={selectedTemplate}
                  palette={currentPalette}
                  className="rounded-lg border shadow-sm"
                />
              ) : (
                <div className="flex aspect-[210/297] items-center justify-center rounded-lg border bg-muted">
                  <span className="text-sm text-muted-foreground">
                    Loading preview...
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-auto mt-4 max-w-md rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Spacer to ensure content doesn't hide behind sticky footer */}
      <div className="h-24" />

      {/* Footer Actions - fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isLoading}
            className="gap-1"
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>

          <Button
            size="lg"
            onClick={handleComplete}
            disabled={isLoading}
            className={cn('min-w-[180px]', isLoading && 'cursor-wait')}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Complete Setup
                <ChevronRight className="ml-1 size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TemplateSelectScreen

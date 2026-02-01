/**
 * TemplateSelectScreen Component
 *
 * Third and final screen of the onboarding flow.
 * Allows users to select their preferred resume template and color palette
 * while seeing a live PDF preview.
 */

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Loader2, FileText, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TemplateMiniPreview } from '@/components/templates/TemplateMiniPreview'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
      highlights: ["Dean's List", 'Teaching Assistant for Data Structures'],
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
 * - Accordion-based selection for templates and palettes
 * - Only one section open at a time
 * - Scrollable content within each section
 * - Live PDF preview always visible
 * - Complete Setup button to finish onboarding
 */
export function TemplateSelectScreen({
  onComplete,
  onBack,
  resume,
}: Readonly<TemplateSelectScreenProps>): React.JSX.Element {
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openSection, setOpenSection] = useState<string>('templates')

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
  const selectedPaletteData = palettes.find((p) => p.id === selectedPalette)
  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate)

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
      {/* Main content - vertically centered */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Choose your template
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Don't worry, you can change it later
          </p>
        </div>

        {/* Content area - accordion + preview */}
        <div className="flex w-full max-w-5xl items-start gap-8">
          {/* Left side - Accordion selectors */}
          <div className="w-96 flex-shrink-0">
            <Accordion
              type="single"
              value={openSection}
              onValueChange={(value) => {
                if (value) setOpenSection(value)
              }}
              className="w-full"
            >
              {/* Template Style Section */}
              <AccordionItem value="templates" className="border-border/50">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Template Style</span>
                    <span className="text-xs text-muted-foreground">
                      ({selectedTemplateData?.name ?? 'None'})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="max-h-[50vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-3">
                      {templates.map((template) => {
                        const isSelected = template.id === selectedTemplate
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => setSelectedTemplate(template.id)}
                            className={cn(
                              'relative flex flex-col items-center rounded-lg border-2 p-2 transition-all',
                              'hover:border-primary/50 hover:bg-accent/50',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border bg-card'
                            )}
                          >
                            {/* Mini preview */}
                            <div className="mb-1.5 aspect-[3/4] w-full overflow-hidden rounded border border-border/50 bg-muted">
                              <TemplateMiniPreview
                                templateId={template.id}
                                palette={selectedPaletteData}
                              />
                            </div>
                            {/* Name */}
                            <span
                              className={cn(
                                'w-full truncate text-center text-xs font-medium',
                                isSelected && 'text-primary'
                              )}
                            >
                              {template.name}
                            </span>
                            {/* Selection indicator */}
                            {isSelected && (
                              <div className="absolute -right-1 -top-1 rounded-full bg-primary p-0.5">
                                <Check className="size-3 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Color Palette Section */}
              <AccordionItem value="palettes" className="border-border/50">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Color Palette</span>
                    {selectedPaletteData && (
                      <div className="flex gap-0.5">
                        <div
                          className="size-3 rounded-sm"
                          style={{
                            backgroundColor: selectedPaletteData.primary,
                          }}
                        />
                        <div
                          className="size-3 rounded-sm"
                          style={{
                            backgroundColor: selectedPaletteData.secondary,
                          }}
                        />
                        <div
                          className="size-3 rounded-sm"
                          style={{ backgroundColor: selectedPaletteData.accent }}
                        />
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="max-h-[50vh] overflow-y-auto pr-1">
                    <div className="flex flex-col gap-1">
                      {palettes.map((palette) => {
                        const isSelected = palette.id === selectedPalette
                        return (
                          <button
                            key={palette.id}
                            type="button"
                            onClick={() => setSelectedPalette(palette.id)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg border-2 px-3 py-2 transition-all',
                              'hover:border-primary/50 hover:bg-accent/50',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border bg-card'
                            )}
                          >
                            <div className="flex gap-0.5">
                              <div
                                className="size-5 rounded-sm ring-1 ring-black/10"
                                style={{ backgroundColor: palette.primary }}
                              />
                              <div
                                className="size-5 rounded-sm ring-1 ring-black/10"
                                style={{ backgroundColor: palette.secondary }}
                              />
                              <div
                                className="size-5 rounded-sm ring-1 ring-black/10"
                                style={{ backgroundColor: palette.accent }}
                              />
                            </div>
                            <span
                              className={cn(
                                'flex-1 text-left text-sm',
                                isSelected && 'font-medium text-primary'
                              )}
                            >
                              {palette.name}
                            </span>
                            {isSelected && <Check className="size-4 text-primary" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Sample notice */}
            {isUsingSample && (
              <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="size-3" />
                Showing sample resume
              </div>
            )}
          </div>

          {/* Right side - PDF Preview (always visible) */}
          <div className="flex flex-1 flex-col min-w-0">
            <div className="aspect-[8.5/11] w-full overflow-hidden rounded-lg border bg-muted/30">
              {currentPalette ? (
                <ResumePDFPreview
                  resume={displayResume}
                  templateId={selectedTemplate}
                  palette={currentPalette}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-sm text-muted-foreground">
                    Loading preview...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-4 max-w-md rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Spacer to ensure content doesn't hide behind sticky footer */}
      <div className="h-20" />

      {/* Footer Actions - fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
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
            className={cn('min-w-[160px]', isLoading && 'cursor-wait')}
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

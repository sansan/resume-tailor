import { useCallback, useEffect, useRef, useState } from 'react'
import { FileJson, Eye, Check, Settings2, Layout, Palette, Download, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ExperienceSection } from './experience-section'
import { EducationSection } from './education-section'
import { SkillsSection } from './skills-section'
import { ContactsSection } from './contacts-section'
import ResumePDFPreview from '@/components/Resume/ResumePDFPreview'
import { saveResumePDF, createThemeFromPalette } from '@/services/pdf'
import { TemplateMiniPreview } from '@/components/templates/TemplateMiniPreview'
import { useTemplates, type ColorPalette, type Template } from '@/hooks/useTemplates'
import { cn } from '@/lib/utils'
import type { Resume, PersonalInfo, WorkExperience, Education, Skill, Contact } from '@schemas/resume.schema'

const SUMMARY_MAX_LENGTH = 500
const AUTO_SAVE_DELAY = 1000 // 1 second debounce

interface ProfileFormProps {
  resume: Resume | null
  jsonText: string
  onChange: (updates: Partial<Resume>) => void
  onJsonChange: (json: string) => void
  onSave: () => void
  isDirty: boolean
}

/**
 * Template selector list with mini previews (for use inside accordion)
 */
function TemplateList({
  templates,
  selectedTemplate,
  selectedPalette,
  onSelect,
}: {
  templates: Template[]
  selectedTemplate: string
  selectedPalette: ColorPalette | undefined
  onSelect: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {templates.map((template) => {
        const isSelected = template.id === selectedTemplate
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={cn(
              'relative flex flex-col items-center rounded-lg border-2 p-2 transition-all',
              'hover:border-primary/50 hover:bg-accent/50',
              isSelected ? 'border-primary bg-primary/5' : 'border-border'
            )}
          >
            {/* Mini preview */}
            <div className="mb-1.5 aspect-[3/4] w-full overflow-hidden rounded border border-border/50 bg-muted">
              <TemplateMiniPreview
                templateId={template.id}
                palette={selectedPalette}
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
  )
}

/**
 * Palette selector list (for use inside accordion)
 */
function PaletteList({
  palettes,
  selectedPalette,
  onSelect,
}: {
  palettes: ColorPalette[]
  selectedPalette: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {palettes.map((palette) => {
        const isSelected = palette.id === selectedPalette
        return (
          <button
            key={palette.id}
            type="button"
            onClick={() => onSelect(palette.id)}
            className={cn(
              'relative flex items-center gap-3 rounded-lg border-2 px-3 py-2 transition-all',
              'hover:border-primary/50 hover:bg-accent/50',
              isSelected ? 'border-primary bg-primary/5' : 'border-border'
            )}
          >
            <div className="flex gap-1 shrink-0">
              <div
                className="h-5 w-5 rounded ring-1 ring-black/10"
                style={{ backgroundColor: palette.primary }}
              />
              <div
                className="h-5 w-5 rounded ring-1 ring-black/10"
                style={{ backgroundColor: palette.secondary }}
              />
              <div
                className="h-5 w-5 rounded ring-1 ring-black/10"
                style={{ backgroundColor: palette.accent }}
              />
            </div>
            <span className={cn('flex-1 text-sm text-left', isSelected && 'font-medium text-primary')}>
              {palette.name}
            </span>
            {isSelected ? <Check className="h-4 w-4 text-primary shrink-0" /> : null}
          </button>
        )
      })}
    </div>
  )
}

export function ProfileForm({
  resume,
  jsonText,
  onChange,
  onJsonChange,
  onSave,
  isDirty,
}: Readonly<ProfileFormProps>) {
  const summary = resume?.personalInfo?.summary ?? ''
  const summaryLength = summary.length

  // Template and palette selection
  const {
    templates,
    selectedTemplate,
    setSelectedTemplate,
    palettes,
    selectedPalette,
    setSelectedPalette,
    savePreferences,
    getSelectedPalette,
  } = useTemplates()

  // Export state
  const [isExporting, setIsExporting] = useState(false)

  // Auto-save debounce ref
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-save when data changes
  useEffect(() => {
    if (isDirty) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        onSave()
      }, AUTO_SAVE_DELAY)
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [isDirty, jsonText, onSave])

  // Handle template selection with auto-save
  const handleTemplateSelect = useCallback(async (id: string) => {
    setSelectedTemplate(id)
    // Save preferences immediately
    setTimeout(() => savePreferences(), 0)
  }, [setSelectedTemplate, savePreferences])

  // Handle palette selection with auto-save
  const handlePaletteSelect = useCallback(async (id: string) => {
    setSelectedPalette(id)
    // Save preferences immediately
    setTimeout(() => savePreferences(), 0)
  }, [setSelectedPalette, savePreferences])

  const handlePersonalInfoChange = useCallback(
    (field: keyof PersonalInfo, value: string) => {
      if (!resume) return
      onChange({
        personalInfo: {
          ...resume.personalInfo,
          [field]: value || undefined,
        },
      })
    },
    [resume, onChange]
  )

  const handleExperienceChange = useCallback(
    (experiences: WorkExperience[]) => {
      onChange({ workExperience: experiences })
    },
    [onChange]
  )

  const handleEducationChange = useCallback(
    (education: Education[]) => {
      onChange({ education })
    },
    [onChange]
  )

  const handleSkillsChange = useCallback(
    (skills: Skill[]) => {
      onChange({ skills })
    },
    [onChange]
  )

  const handleContactsChange = useCallback(
    (contacts: Contact[]) => {
      if (!resume) return
      onChange({
        personalInfo: {
          ...resume.personalInfo,
          contacts,
        },
      })
    },
    [resume, onChange]
  )

  // Get current palette for PDF theme
  const currentPalette = getSelectedPalette()

  // Handle PDF export
  const handleExportPDF = useCallback(async () => {
    if (!resume || !currentPalette) return
    setIsExporting(true)
    try {
      const theme = createThemeFromPalette(currentPalette)
      await saveResumePDF(resume, { templateId: selectedTemplate, theme })
    } catch (error) {
      console.error('Failed to export PDF:', error)
    } finally {
      setIsExporting(false)
    }
  }, [resume, selectedTemplate, currentPalette])

  if (!resume) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No resume loaded. Please load a resume file to edit your profile.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="preview" className="w-full">
      {/* Header with tabs toggle and customize button */}
      <div className="flex items-center justify-between mb-4">
        <TabsList>
          <TabsTrigger value="preview">
            <Eye className="mr-1.5 h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="standard">Edit</TabsTrigger>
          <TabsTrigger value="json">
            <FileJson className="mr-1.5 h-4 w-4" />
            JSON
          </TabsTrigger>
        </TabsList>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>

          {/* Customize Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="mr-1.5 h-4 w-4" />
                Customize
              </Button>
            </SheetTrigger>
          <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Customize Resume</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <Accordion type="multiple" defaultValue={['template', 'colors']} className="w-full">
                <AccordionItem value="template">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Layout className="h-4 w-4" />
                      Template Style
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <TemplateList
                      templates={templates}
                      selectedTemplate={selectedTemplate}
                      selectedPalette={currentPalette}
                      onSelect={handleTemplateSelect}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="colors">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Color Scheme
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <PaletteList
                      palettes={palettes}
                      selectedPalette={selectedPalette}
                      onSelect={handlePaletteSelect}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Standard View */}
      <TabsContent value="standard" className="mt-0">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-6 pr-4">
            {/* Summary Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="summary">Professional Summary</Label>
                    <span
                      className={`text-xs ${
                        summaryLength > SUMMARY_MAX_LENGTH
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {summaryLength}/{SUMMARY_MAX_LENGTH}
                    </span>
                  </div>
                  <Textarea
                    id="summary"
                    value={summary}
                    onChange={(e) => handlePersonalInfoChange('summary', e.target.value)}
                    placeholder="Write a brief professional summary highlighting your key qualifications and career objectives..."
                    className="min-h-[120px] resize-none"
                    maxLength={SUMMARY_MAX_LENGTH}
                  />
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Personal Info Section */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                <div className="grid gap-4 sm:grid-cols-2 mb-6">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={resume.personalInfo.name}
                      onChange={(e) => handlePersonalInfoChange('name', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={resume.personalInfo.location ?? ''}
                      onChange={(e) => handlePersonalInfoChange('location', e.target.value)}
                      placeholder="San Francisco, CA"
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Contacts Section */}
                <ContactsSection
                  contacts={resume.personalInfo.contacts ?? []}
                  onChange={handleContactsChange}
                />
              </CardContent>
            </Card>

            <Separator />

            {/* Experience Section */}
            <ExperienceSection
              experiences={resume.workExperience}
              onChange={handleExperienceChange}
            />

            <Separator />

            {/* Education Section */}
            <EducationSection
              education={resume.education}
              onChange={handleEducationChange}
            />

            <Separator />

            {/* Skills Section */}
            <SkillsSection skills={resume.skills} onChange={handleSkillsChange} />
          </div>
        </ScrollArea>
      </TabsContent>

      {/* JSON View */}
      <TabsContent value="json" className="mt-0">
        <Card>
          <CardContent className="pt-6">
            <Textarea
              value={jsonText}
              onChange={(e) => onJsonChange(e.target.value)}
              className="min-h-[calc(100vh-340px)] font-mono text-sm resize-none"
              placeholder="Paste or edit your resume JSON here..."
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Preview View */}
      <TabsContent value="preview" className="mt-0">
        {/* Full-width PDF Preview - scales with screen size */}
        <div className="flex justify-center">
          <div className="w-full max-w-5xl">
            {currentPalette ? (
              <ResumePDFPreview
                resume={resume}
                templateId={selectedTemplate}
                palette={currentPalette}
              />
            ) : (
              <div className="aspect-[210/297] w-full rounded-lg border bg-muted/30 flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Loading preview...</span>
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}

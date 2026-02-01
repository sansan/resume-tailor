import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Link2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Mail,
  Building2,
  Briefcase,
  MapPin,
  FolderOpen,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Clock,
  Users,
  Pencil,
  Eye,
  GraduationCap,
  Wrench,
  Plus,
  Trash2,
} from 'lucide-react'
import { useJobApplication } from '@/hooks/useJobApplication'
import ResumePDFPreview from '@/components/Resume/ResumePDFPreview'
import { CoverLetterEditor } from '@/components/CoverLetter/CoverLetterEditor'
import { useTemplates } from '@/hooks/useTemplates'
import type { GeneratedCoverLetter, ExtractedJobPosting, RefinedResume } from '@schemas/ai-output.schema'
import type { Resume, WorkExperience } from '@schemas/resume.schema'

type Step = 'input' | 'extracting' | 'details' | 'tailoring' | 'review' | 'export'

export function TargetingPage() {
  // Resume/profile state
  const [resume, setResume] = useState<Resume | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // Job application workflow state
  const {
    jobPosting,
    aiState,
    error,
    isAIAvailable,
    refinedResume,
    coverLetter,
    setJobPosting,
    setOriginalResume,
    refineResume,
    generateCoverLetter,
    cancelOperation,
    clearError,
    resetWorkflow,
    updateCoverLetter,
    updateRefinedResume,
  } = useJobApplication()

  // Template/palette for PDF preview
  const { selectedTemplate, getSelectedPalette } = useTemplates()
  const currentPalette = getSelectedPalette()

  // Local UI state
  const [currentStep, setCurrentStep] = useState<Step>('input')
  const [jobUrl, setJobUrl] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [extractedJob, setExtractedJob] = useState<ExtractedJobPosting | null>(null)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [exportState, setExportState] = useState<{
    status: 'idle' | 'exporting' | 'success' | 'error'
    exportedPath: string | null
    error: string | null
  }>({ status: 'idle', exportedPath: null, error: null })
  const [resumeViewMode, setResumeViewMode] = useState<'preview' | 'edit'>('preview')

  // Load profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await window.electronAPI.loadProfile()
        if (profile?.resume) {
          setResume(profile.resume)
          setOriginalResume(profile.resume)
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }
    loadProfile()
  }, [setOriginalResume])

  // Move to review step when both refined resume and cover letter are ready
  useEffect(() => {
    if (currentStep === 'tailoring' && refinedResume && coverLetter && !aiState.isLoading) {
      setCurrentStep('review')
    }
  }, [currentStep, refinedResume, coverLetter, aiState.isLoading])

  // Go back to details step if there's an error during tailoring
  useEffect(() => {
    if (currentStep === 'tailoring' && error && !aiState.isLoading) {
      setCurrentStep('details')
    }
  }, [currentStep, error, aiState.isLoading])

  // Handle URL fetch
  const handleFetch = useCallback(async () => {
    if (!jobUrl.trim()) return

    setIsFetching(true)
    setFetchError(null)

    try {
      const result = await window.electronAPI.fetchJobPosting(jobUrl)
      if (result.success && result.content) {
        setJobPosting({ rawText: result.content })
      } else {
        setFetchError(result.error || 'Unable to fetch job posting. The page may be protected or require authentication.')
      }
    } catch (err) {
      setFetchError('Unable to fetch job posting. Please paste the description manually.')
    } finally {
      setIsFetching(false)
    }
  }, [jobUrl, setJobPosting])

  // Handle "Next" button - extract job details with AI
  const handleExtractJobDetails = useCallback(async () => {
    if (jobPosting.rawText.length < 50) return

    setCurrentStep('extracting')
    setExtractionError(null)

    try {
      const result = await window.electronAPI.extractJobPosting({
        jobPostingText: jobPosting.rawText,
      })

      if (result.success) {
        setExtractedJob(result.data)
        // Update job posting state with extracted data
        if (result.data.companyName) {
          setJobPosting({ companyName: result.data.companyName })
        }
        if (result.data.jobTitle) {
          setJobPosting({ jobTitle: result.data.jobTitle })
        }
        setCurrentStep('details')
      } else {
        setExtractionError(result.error.message)
        setCurrentStep('input')
      }
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : 'Failed to extract job details')
      setCurrentStep('input')
    }
  }, [jobPosting.rawText, setJobPosting])

  // Handle tailor button click - runs both refine and cover letter generation
  const handleTailor = useCallback(async () => {
    if (!resume) return
    if (jobPosting.rawText.length < 50) return

    setCurrentStep('tailoring')

    // First refine the resume
    await refineResume()

    // Then generate the cover letter
    // The useEffect will automatically move to review when both are ready
    await generateCoverLetter()
  }, [resume, jobPosting.rawText, refineResume, generateCoverLetter])

  // Handle export
  const handleExport = useCallback(async () => {
    if (!refinedResume || !coverLetter) return

    setExportState({ status: 'exporting', exportedPath: null, error: null })

    try {
      const settings = await window.electronAPI.getSettings()
      const defaultFolder = await window.electronAPI.getDefaultOutputFolder()
      const baseFolderPath = settings.outputFolderPath || defaultFolder

      const companyName = jobPosting.companyName || coverLetter.companyName || 'Application'
      const sanitizedCompany = companyName.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_')

      const date = new Date().toISOString().split('T')[0]
      const resumeFileName = `${sanitizedCompany}_Resume_${date}.pdf`
      const coverLetterFileName = `${sanitizedCompany}_Cover_Letter_${date}.pdf`

      const { renderResumeToPDFBlob, renderCoverLetterToPDFBlob } = await import('@/services/pdf')

      const result = await window.electronAPI.exportApplicationPDFs({
        baseFolderPath,
        subfolderName: settings.createCompanySubfolders ? sanitizedCompany : '',
        resumeBlob: await renderResumeToPDFBlob(refinedResume, { templateId: selectedTemplate }),
        coverLetterBlob: await renderCoverLetterToPDFBlob(coverLetter, { personalInfo: refinedResume.personalInfo }),
        resumeFileName,
        coverLetterFileName,
      })

      if (result.success) {
        setExportState({
          status: 'success',
          exportedPath: result.folderPath || baseFolderPath,
          error: null,
        })
        setCurrentStep('export')
      } else {
        setExportState({
          status: 'error',
          exportedPath: null,
          error: result.error || 'Failed to export PDFs',
        })
      }
    } catch (err) {
      setExportState({
        status: 'error',
        exportedPath: null,
        error: err instanceof Error ? err.message : 'Export failed',
      })
    }
  }, [refinedResume, coverLetter, jobPosting.companyName])

  // Handle open folder
  const handleOpenFolder = useCallback(async () => {
    if (exportState.exportedPath) {
      await window.electronAPI.openFolder(exportState.exportedPath)
    }
  }, [exportState.exportedPath])

  // Handle cover letter update
  const handleCoverLetterUpdate = useCallback((updated: GeneratedCoverLetter) => {
    updateCoverLetter(updated)
  }, [updateCoverLetter])

  // Handle refined resume updates
  const handleResumeUpdate = useCallback((updates: Partial<RefinedResume>) => {
    if (!refinedResume) return
    updateRefinedResume({ ...refinedResume, ...updates })
  }, [refinedResume, updateRefinedResume])

  const handleSummaryUpdate = useCallback((summary: string) => {
    if (!refinedResume) return
    handleResumeUpdate({
      personalInfo: { ...refinedResume.personalInfo, summary }
    })
  }, [refinedResume, handleResumeUpdate])

  const handleExperienceUpdate = useCallback((index: number, updates: Partial<WorkExperience>) => {
    if (!refinedResume) return
    const newExperiences = [...refinedResume.workExperience]
    const experience = newExperiences[index]
    if (!experience) return
    newExperiences[index] = { ...experience, ...updates }
    handleResumeUpdate({ workExperience: newExperiences })
  }, [refinedResume, handleResumeUpdate])

  const handleHighlightUpdate = useCallback((expIndex: number, highlightIndex: number, value: string) => {
    if (!refinedResume) return
    const newExperiences = [...refinedResume.workExperience]
    const experience = newExperiences[expIndex]
    if (!experience) return
    const highlights = [...(experience.highlights || [])]
    highlights[highlightIndex] = value
    newExperiences[expIndex] = { ...experience, highlights }
    handleResumeUpdate({ workExperience: newExperiences })
  }, [refinedResume, handleResumeUpdate])

  const handleAddHighlight = useCallback((expIndex: number) => {
    if (!refinedResume) return
    const newExperiences = [...refinedResume.workExperience]
    const experience = newExperiences[expIndex]
    if (!experience) return
    const highlights = [...(experience.highlights || []), '']
    newExperiences[expIndex] = { ...experience, highlights }
    handleResumeUpdate({ workExperience: newExperiences })
  }, [refinedResume, handleResumeUpdate])

  const handleRemoveHighlight = useCallback((expIndex: number, highlightIndex: number) => {
    if (!refinedResume) return
    const newExperiences = [...refinedResume.workExperience]
    const experience = newExperiences[expIndex]
    if (!experience) return
    const highlights = [...(experience.highlights || [])]
    highlights.splice(highlightIndex, 1)
    newExperiences[expIndex] = { ...experience, highlights }
    handleResumeUpdate({ workExperience: newExperiences })
  }, [refinedResume, handleResumeUpdate])

  // Handle start over
  const handleStartOver = useCallback(() => {
    setCurrentStep('input')
    setExtractedJob(null)
    setExtractionError(null)
    setExportState({ status: 'idle', exportedPath: null, error: null })
    setResumeViewMode('preview')
    resetWorkflow()
  }, [resetWorkflow])

  // Show loading state while profile loads
  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Render no resume warning
  if (!resume) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Tailoring</h1>
          <p className="text-muted-foreground">
            Tailor your CV and generate a cover letter for specific job applications.
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Resume Found</AlertTitle>
          <AlertDescription>
            Please create or import a resume in the Resume section before tailoring for a job.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Step definitions for indicator
  const steps = [
    { id: 'input', label: 'Job Input' },
    { id: 'details', label: 'Job Details' },
    { id: 'review', label: 'Review' },
    { id: 'export', label: 'Export' },
  ]

  const getStepIndex = (step: Step): number => {
    if (step === 'input') return 0
    if (step === 'extracting') return 0
    if (step === 'details') return 1
    if (step === 'tailoring') return 1
    if (step === 'review') return 2
    if (step === 'export') return 3
    return 0
  }

  // Render input step
  const renderInputStep = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Job Posting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label>Paste URL to auto-fetch</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/job/software-engineer"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleFetch} disabled={isFetching || !jobUrl.trim()}>
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
              </Button>
            </div>
          </div>

          {fetchError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fetch Failed</AlertTitle>
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">or paste description</span>
            <Separator className="flex-1" />
          </div>

          {/* Manual Paste */}
          <div className="space-y-2">
            <Label>Job Description</Label>
            <Textarea
              placeholder="Paste the full job description here..."
              value={jobPosting.rawText}
              onChange={(e) => setJobPosting({ rawText: e.target.value })}
              className="min-h-[300px]"
            />
            <p className="text-xs text-muted-foreground">
              {jobPosting.rawText.length} characters
              {jobPosting.rawText.length < 50 && jobPosting.rawText.length > 0 && (
                <span className="text-destructive"> (minimum 50 required)</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {(error || extractionError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error?.message || extractionError}</p>
            <Button variant="outline" size="sm" onClick={() => { clearError(); setExtractionError(null); }}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* AI Status Warning */}
      {isAIAvailable === false && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>AI Unavailable</AlertTitle>
          <AlertDescription>
            AI CLI is not available. Please ensure it's installed and configured in Settings.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleExtractJobDetails}
          disabled={!isAIAvailable || jobPosting.rawText.length < 50}
          className="gap-2"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  // Render extracting step
  const renderExtractingStep = () => (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="text-center space-y-2">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h3 className="text-lg font-semibold">Analyzing Job Posting</h3>
            <p className="text-muted-foreground">
              Extracting company info, requirements, and responsibilities...
            </p>
          </div>
          <Progress value={50} className="h-2" />
        </CardContent>
      </Card>
    </div>
  )

  // Render details step (extracted job info)
  const renderDetailsStep = () => {
    if (!extractedJob) return null

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleStartOver}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Job Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Job Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      value={jobPosting.companyName}
                      onChange={(e) => setJobPosting({ companyName: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input
                      value={jobPosting.jobTitle}
                      onChange={(e) => setJobPosting({ jobTitle: e.target.value })}
                      placeholder="Job title"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {extractedJob.location && (
                    <Badge variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {extractedJob.location}
                    </Badge>
                  )}
                  {extractedJob.employmentType && (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {extractedJob.employmentType}
                    </Badge>
                  )}
                  {extractedJob.salaryRange && (
                    <Badge variant="secondary" className="gap-1">
                      <DollarSign className="h-3 w-3" />
                      {extractedJob.salaryRange}
                    </Badge>
                  )}
                  {extractedJob.teamInfo && (
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {extractedJob.teamInfo.length > 30 ? extractedJob.teamInfo.slice(0, 30) + '...' : extractedJob.teamInfo}
                    </Badge>
                  )}
                </div>

                {extractedJob.companyDescription && (
                  <div className="pt-2">
                    <Label className="text-sm text-muted-foreground">About the Company</Label>
                    <p className="text-sm mt-1">{extractedJob.companyDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Requirements */}
            {(extractedJob.requirements.length > 0 || extractedJob.qualifications.length > 0) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Requirements & Qualifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[250px]">
                    <ul className="space-y-2 text-sm">
                      {extractedJob.requirements.map((req, i) => (
                        <li key={`req-${i}`} className="flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                      {extractedJob.qualifications.map((qual, i) => (
                        <li key={`qual-${i}`} className="flex items-start gap-2 text-muted-foreground">
                          <span>○</span>
                          <span>{qual}</span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Responsibilities */}
            {extractedJob.responsibilities.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Responsibilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[200px]">
                    <ul className="space-y-2 text-sm">
                      {extractedJob.responsibilities.map((resp, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Skills & Benefits */}
          <div className="space-y-6">
            {/* Required Skills */}
            {extractedJob.requiredSkills.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Required Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {extractedJob.requiredSkills.map((skill, i) => (
                      <Badge key={i} variant="default">{skill}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preferred Skills */}
            {extractedJob.preferredSkills.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Nice to Have</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {extractedJob.preferredSkills.map((skill, i) => (
                      <Badge key={i} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            {extractedJob.benefits.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Benefits & Perks</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {extractedJob.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500 mt-1 shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCurrentStep('input')}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Job Posting
          </Button>
          <Button size="lg" onClick={handleTailor} disabled={aiState.isLoading} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Tailor CV & Generate Cover Letter
          </Button>
        </div>
      </div>
    )
  }

  // Render tailoring step
  const renderTailoringStep = () => (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="text-center space-y-2">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h3 className="text-lg font-semibold">
              {aiState.currentOperation === 'refine' ? 'Tailoring Your Resume' : 'Generating Cover Letter'}
            </h3>
            <p className="text-muted-foreground">
              {aiState.statusMessage || 'Please wait...'}
            </p>
          </div>

          <Progress value={aiState.progress} className="h-2" />

          <div className="flex justify-center">
            <Button variant="outline" onClick={cancelOperation}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Render review step
  const renderReviewStep = () => {
    if (!refinedResume || !coverLetter || !currentPalette) return null

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleStartOver}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Start Over
            </Button>
            <Badge variant="outline" className="gap-1">
              <Building2 className="h-3 w-3" />
              {jobPosting.companyName || 'Application'}
            </Badge>
            {jobPosting.jobTitle && (
              <Badge variant="secondary">{jobPosting.jobTitle}</Badge>
            )}
          </div>
          <Button onClick={handleExport} disabled={exportState.status === 'exporting'}>
            {exportState.status === 'exporting' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FolderOpen className="h-4 w-4 mr-2" />
                Export PDFs
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="resume" className="w-full">
          <TabsList>
            <TabsTrigger value="resume">
              <FileText className="h-4 w-4 mr-2" />
              Tailored Resume
            </TabsTrigger>
            <TabsTrigger value="coverLetter">
              <Mail className="h-4 w-4 mr-2" />
              Cover Letter
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resume" className="mt-4">
            {/* Preview/Edit Toggle */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex rounded-lg border p-1">
                <Button
                  variant={resumeViewMode === 'preview' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setResumeViewMode('preview')}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  variant={resumeViewMode === 'edit' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setResumeViewMode('edit')}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>

            {resumeViewMode === 'preview' ? (
              <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                  <ResumePDFPreview
                    resume={refinedResume}
                    templateId={selectedTemplate}
                    palette={currentPalette}
                    maxHeight="calc(100vh - 300px)"
                  />
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="max-w-3xl mx-auto space-y-6 pr-4">
                  {/* Summary Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Professional Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={refinedResume.personalInfo.summary || ''}
                        onChange={(e) => handleSummaryUpdate(e.target.value)}
                        placeholder="Professional summary..."
                        className="min-h-[100px]"
                      />
                    </CardContent>
                  </Card>

                  {/* Work Experience Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Work Experience
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {refinedResume.workExperience.map((exp, expIndex) => (
                        <div key={expIndex} className="space-y-3 pb-4 border-b last:border-0 last:pb-0">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Company</Label>
                              <Input
                                value={exp.company}
                                onChange={(e) => handleExperienceUpdate(expIndex, { company: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Position</Label>
                              <Input
                                value={exp.title}
                                onChange={(e) => handleExperienceUpdate(expIndex, { title: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Highlights</Label>
                            <div className="space-y-2 mt-1">
                              {(exp.highlights || []).map((highlight, hIndex) => (
                                <div key={hIndex} className="flex gap-2">
                                  <Input
                                    value={highlight}
                                    onChange={(e) => handleHighlightUpdate(expIndex, hIndex, e.target.value)}
                                    placeholder="Achievement or responsibility..."
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveHighlight(expIndex, hIndex)}
                                    className="shrink-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddHighlight(expIndex)}
                                className="gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                Add Highlight
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Skills Section */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {refinedResume.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {skill.name}
                            {skill.category && (
                              <span className="text-xs text-muted-foreground">({skill.category})</span>
                            )}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Skills are automatically tailored based on the job requirements.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Education Section */}
                  {refinedResume.education.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          Education
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {refinedResume.education.map((edu, index) => (
                            <div key={index} className="text-sm">
                              <p className="font-medium">{edu.degree}</p>
                              <p className="text-muted-foreground">{edu.institution}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="coverLetter" className="mt-4">
            <div className="max-w-4xl mx-auto">
              <CoverLetterEditor
                coverLetter={coverLetter}
                personalInfo={refinedResume.personalInfo}
                onUpdate={handleCoverLetterUpdate}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // Render export success step
  const renderExportStep = () => (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Export Complete!</h3>
              <p className="text-muted-foreground mt-1">
                Your tailored resume and cover letter have been saved.
              </p>
            </div>
          </div>

          {exportState.exportedPath && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm font-mono break-all">{exportState.exportedPath}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={handleOpenFolder} className="w-full">
              <FolderOpen className="h-4 w-4 mr-2" />
              Open Folder
            </Button>
            <Button variant="outline" onClick={handleStartOver} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Tailor for Another Job
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Tailoring</h1>
        <p className="text-muted-foreground">
          Tailor your CV and generate a cover letter for specific job applications.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((step, index) => {
          const currentIndex = getStepIndex(currentStep)
          const isActive = index === currentIndex
          const isCompleted = currentIndex > index

          return (
            <div key={step.id} className="flex items-center">
              {index > 0 && <div className={`w-8 h-0.5 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />}
              <div className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                ${isActive ? 'bg-primary text-primary-foreground' : ''}
                ${isCompleted && !isActive ? 'text-primary' : ''}
                ${!isActive && !isCompleted ? 'text-muted-foreground' : ''}
              `}>
                <span className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-xs
                  ${isActive ? 'bg-primary-foreground text-primary' : ''}
                  ${isCompleted && !isActive ? 'bg-primary text-primary-foreground' : ''}
                  ${!isActive && !isCompleted ? 'bg-muted' : ''}
                `}>
                  {isCompleted && !isActive ? '✓' : index + 1}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Current Step Content */}
      {currentStep === 'input' && renderInputStep()}
      {currentStep === 'extracting' && renderExtractingStep()}
      {currentStep === 'details' && renderDetailsStep()}
      {currentStep === 'tailoring' && renderTailoringStep()}
      {currentStep === 'review' && renderReviewStep()}
      {currentStep === 'export' && renderExportStep()}
    </div>
  )
}

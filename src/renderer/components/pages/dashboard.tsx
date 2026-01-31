import { useCallback, useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Palette,
  Target,
  Sparkles,
  Upload,
  FileText,
  Clock
} from 'lucide-react'
import { useResume } from '@/hooks/useResume'
import { ResumeImportDropzone } from '@/components/profile/resume-import-dropzone'
import type { Resume } from '@schemas/resume.schema'
import { getContactByType } from '@schemas/resume.schema'
import { APP_PAGES } from '@config/constants'
import { toast } from 'sonner'

interface DashboardPageProps {
  onNavigate?: (page: APP_PAGES) => void
}

function calculateCompleteness(resume: Resume): number {
  let completeness = 0

  // personalInfo.name (15%)
  if (resume.personalInfo.name && resume.personalInfo.name.trim().length > 0) {
    completeness += 15
  }

  // personalInfo.contacts has email (15%)
  const email = getContactByType(resume.personalInfo.contacts, 'email')
  if (email && email.trim().length > 0) {
    completeness += 15
  }

  // personalInfo.summary (10%)
  if (resume.personalInfo.summary && resume.personalInfo.summary.trim().length > 0) {
    completeness += 10
  }

  // workExperience length > 0 (30%)
  if (resume.workExperience && resume.workExperience.length > 0) {
    completeness += 30
  }

  // education length > 0 (15%)
  if (resume.education && resume.education.length > 0) {
    completeness += 15
  }

  // skills length > 0 (25%)
  if (resume.skills && resume.skills.length > 0) {
    completeness += 25
  }

  return completeness
}


export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { resume, isValid, loadFromFile, setJsonText, validate } = useResume()
  const [hasPersistedProfile, setHasPersistedProfile] = useState<boolean | null>(null)

  // Check if there's a persisted profile on mount
  useEffect(() => {
    window.electronAPI.hasProfile().then(setHasPersistedProfile)
  }, [])

  // Load profile from persistence if it exists and current resume is empty
  useEffect(() => {
    if (hasPersistedProfile && !isValid) {
      window.electronAPI.loadProfile().then((profile) => {
        if (profile) {
          setJsonText(JSON.stringify(profile.resume, null, 2))
          validate()
        }
      })
    }
  }, [hasPersistedProfile, isValid, setJsonText, validate])

  const handleImportResume = async () => {
    try {
      await loadFromFile()
      // After loading, navigate to profile to validate/edit
      onNavigate?.(APP_PAGES.RESUME)
    } catch (error) {
      console.error('Failed to import resume:', error)
    }
  }

  const handleStartFromScratch = () => {
    // Create a basic empty resume structure
    const emptyResume = {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        location: '',
        summary: ''
      },
      workExperience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: []
    }
    setJsonText(JSON.stringify(emptyResume, null, 2))
    validate()
    onNavigate?.(APP_PAGES.RESUME)
  }

  const handleAIImportComplete = useCallback(
    (success: boolean, errorMessage?: string) => {
      if (success) {
        toast.success('Resume imported successfully!', {
          description: 'Your resume data has been extracted and saved.',
        })
        // Reload profile and navigate to edit
        window.electronAPI.loadProfile().then((profile) => {
          if (profile) {
            setJsonText(JSON.stringify(profile.resume, null, 2))
            validate()
            setHasPersistedProfile(true)
            onNavigate?.(APP_PAGES.RESUME)
          }
        })
      } else {
        toast.error('Failed to import resume', {
          description: errorMessage ?? 'Please try again or use a different file.',
        })
      }
    },
    [setJsonText, validate, onNavigate]
  )

  const hasResume = isValid && resume !== null
  const completeness = hasResume ? calculateCompleteness(resume) : 0

  // Empty state - no resume loaded
  if (!hasResume) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your resume tailoring progress.
          </p>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Welcome to Resume Tailor</CardTitle>
            <CardDescription>
              Get started by importing your existing resume. AI will extract your information automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {/* AI-powered import dropzone */}
            <ResumeImportDropzone
              onImportComplete={handleAIImportComplete}
              className="min-h-[180px]"
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={handleImportResume} className="gap-2">
                <Upload className="h-4 w-4" />
                Import JSON Resume
              </Button>
              <Button variant="outline" onClick={handleStartFromScratch} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Start from Scratch
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Resume loaded - show full dashboard
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your resume tailoring progress.
        </p>
      </div>

      {/* Status Cards Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Profile Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Status</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{completeness}%</span>
              <Badge variant={completeness === 100 ? 'default' : 'secondary'}>
                {completeness === 100 ? 'Complete' : 'In Progress'}
              </Badge>
            </div>
            <Progress value={completeness} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completeness === 100
                ? 'Your profile is complete!'
                : 'Complete your profile for best results'}
            </p>
          </CardContent>
        </Card>

        {/* Template Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cover Letter Status</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">Modern</span>
              <Badge variant="outline">Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Professional template with clean design
            </p>
            <Button
              variant="link"
              className="p-0 h-auto text-xs mt-1"
              onClick={() => onNavigate?.(APP_PAGES.COVER_LETTER)}
            >
              Browse templates
            </Button>
          </CardContent>
        </Card>

        {/* Tailoring Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tailoring Status</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">Ready</span>
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Idle
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              No active tailoring jobs
            </p>
            <Button
              variant="link"
              className="p-0 h-auto text-xs mt-1"
              onClick={() => onNavigate?.(APP_PAGES.TARGETING)}
            >
              Start tailoring
            </Button>
          </CardContent>
        </Card>
      </div>

     
    </div>
  )
}

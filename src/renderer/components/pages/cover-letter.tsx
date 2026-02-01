import { useState, useCallback, useEffect } from 'react'
import { Download, Sparkles, FileText, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import CoverLetterEditor from '@/components/CoverLetter/CoverLetterEditor'
import type { GeneratedCoverLetter } from '@schemas/ai-output.schema'
import type { Resume, PersonalInfo } from '@schemas/resume.schema'
import { pdf } from '@react-pdf/renderer'
import CoverLetterPDFDocument from '@/services/pdf/CoverLetterPDFDocument'

// localStorage key for persisting cover letter
const COVER_LETTER_STORAGE_KEY = 'resume-creator-cover-letter'

// Target character count for cover letter content (to fit on one page)
const TARGET_CHAR_COUNT = 2000
const MAX_SHORTEN_ATTEMPTS = 3

/**
 * Calculate the total character count of cover letter content.
 */
function getContentCharCount(letter: GeneratedCoverLetter): number {
  const opening = letter.opening || ''
  const body = letter.body?.join(' ') || ''
  const closing = letter.closing || ''
  return opening.length + body.length + closing.length
}

/**
 * Load cover letter from localStorage.
 */
function loadStoredCoverLetter(): GeneratedCoverLetter | null {
  try {
    const stored = localStorage.getItem(COVER_LETTER_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

/**
 * Save cover letter to localStorage.
 */
function saveCoverLetterToStorage(coverLetter: GeneratedCoverLetter): void {
  try {
    localStorage.setItem(COVER_LETTER_STORAGE_KEY, JSON.stringify(coverLetter))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Creates a default cover letter from resume data.
 * This generates a generic cover letter without AI, using just the resume information.
 */
function createDefaultCoverLetter(
  name: string,
  summary?: string | null
): GeneratedCoverLetter {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return {
    recipientName: '',
    recipientTitle: '',
    companyName: '',
    companyAddress: '',
    date: today,
    opening: summary
      ? `I am writing to express my interest in the open position at your company. ${summary}`
      : `I am writing to express my strong interest in the open position at your company. With my background and skills, I believe I would be a valuable addition to your team.`,
    body: [
      'Throughout my career, I have developed expertise in delivering high-quality work and collaborating effectively with teams. I am passionate about contributing to meaningful projects and continuously improving my skills.',
      'I am confident that my experience and dedication would enable me to make significant contributions to your organization. I am excited about the opportunity to bring my skills and enthusiasm to your team.',
    ],
    closing:
      'Thank you for considering my application. I look forward to the opportunity to discuss how my background and skills align with your needs. I am available at your convenience for an interview.',
    signature: name,
  }
}

/**
 * Formats a name for use in filename (replaces spaces with hyphens).
 */
function formatNameForFilename(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
}

export function CoverLetterPage() {
  // Resume/profile state
  const [resume, setResume] = useState<Resume | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // Cover letter state - initialize from localStorage
  const [coverLetter, setCoverLetter] = useState<GeneratedCoverLetter | null>(loadStoredCoverLetter)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // AI state
  const [isAIAvailable, setIsAIAvailable] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Load profile and check AI availability on mount
  useEffect(() => {
    async function initialize() {
      try {
        // Load profile
        const profile = await window.electronAPI.loadProfile()
        if (profile?.resume) {
          setResume(profile.resume)
        }

        // Check AI availability
        const aiAvailable = await window.electronAPI.checkAIAvailability()
        setIsAIAvailable(aiAvailable)
      } catch (error) {
        console.error('Failed to initialize:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }
    initialize()
  }, [])

  // Get personal info from resume
  const personalInfo: PersonalInfo | undefined = resume?.personalInfo
  const name = personalInfo?.name ?? 'Your Name'

  // Generation status for showing progress
  const [generationStatus, setGenerationStatus] = useState<string>('')

  /**
   * Generate a cover letter using AI or fall back to default template.
   * If the generated letter is too long, asks AI to shorten it (up to 3 times).
   */
  const handleGenerate = useCallback(async () => {
    if (!resume) {
      setGenerationError('No resume data available. Please import your resume first.')
      return
    }

    setIsGenerating(true)
    setGenerationError(null)
    setGenerationStatus('Generating cover letter...')

    try {
      if (isAIAvailable) {
        // Use AI to generate cover letter
        const result = await window.electronAPI.generateCoverLetter({
          resume,
          jobPosting: '', // Generic cover letter without specific job posting
          options: {
            tone: 'formal',
          },
        })

        if (result.success) {
          let letter = result.data
          let charCount = getContentCharCount(letter)

          // If too long, ask AI to shorten (up to MAX_SHORTEN_ATTEMPTS times)
          let attempt = 0
          while (charCount > TARGET_CHAR_COUNT && attempt < MAX_SHORTEN_ATTEMPTS) {
            attempt++
            setGenerationStatus(`Letter too long (${charCount} chars). Shortening... (attempt ${attempt}/${MAX_SHORTEN_ATTEMPTS})`)

            const shortenResult = await window.electronAPI.shortenCoverLetter({
              coverLetter: letter,
              currentCharCount: charCount,
              targetCharCount: TARGET_CHAR_COUNT,
            })

            if (shortenResult.success) {
              letter = shortenResult.data
              charCount = getContentCharCount(letter)
            } else {
              console.error('Failed to shorten cover letter:', shortenResult.error)
              // Continue with what we have
              break
            }
          }

          if (charCount > TARGET_CHAR_COUNT) {
            setGenerationError(`Cover letter is ${charCount} characters (target: ${TARGET_CHAR_COUNT}). It may not fit on one page.`)
          }

          setCoverLetter(letter)
          saveCoverLetterToStorage(letter)
        } else {
          // AI failed, show error and fall back to default
          console.error('AI generation failed:', result.error)
          setGenerationError(`AI generation failed: ${result.error.message}. Using template instead.`)
          const letter = createDefaultCoverLetter(name, personalInfo?.summary)
          setCoverLetter(letter)
          saveCoverLetterToStorage(letter)
        }
      } else {
        // AI not available, use default template
        const letter = createDefaultCoverLetter(name, personalInfo?.summary)
        setCoverLetter(letter)
        saveCoverLetterToStorage(letter)
      }
    } catch (error) {
      console.error('Failed to generate cover letter:', error)
      setGenerationError('Failed to generate cover letter. Using template instead.')
      // Fall back to default template
      const letter = createDefaultCoverLetter(name, personalInfo?.summary)
      setCoverLetter(letter)
      saveCoverLetterToStorage(letter)
    } finally {
      setIsGenerating(false)
      setGenerationStatus('')
    }
  }, [resume, isAIAvailable, name, personalInfo?.summary])

  /**
   * Export cover letter to PDF.
   */
  const handleExportPDF = useCallback(async () => {
    if (!coverLetter) return

    setIsExporting(true)

    try {
      // Generate PDF blob
      const doc = (
        <CoverLetterPDFDocument
          coverLetter={coverLetter}
          personalInfo={personalInfo}
        />
      )
      const blob = await pdf(doc).toBlob()

      // Convert to array buffer for Electron
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Create filename: Cover-Letter-FirstName-LastName.pdf
      const formattedName = formatNameForFilename(name)
      const fileName = formattedName && formattedName !== 'Your-Name'
        ? `Cover-Letter-${formattedName}.pdf`
        : 'Cover-Letter.pdf'

      // Use Electron's save dialog with custom filename
      await window.electronAPI.generatePDF(uint8Array, fileName)
    } catch (error) {
      console.error('Failed to export PDF:', error)
    } finally {
      setIsExporting(false)
    }
  }, [coverLetter, personalInfo, name])

  /**
   * Handle cover letter updates from the editor.
   */
  const handleCoverLetterUpdate = useCallback((updated: GeneratedCoverLetter) => {
    setCoverLetter(updated)
    saveCoverLetterToStorage(updated)
  }, [])

  // Show loading state while profile loads
  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cover Letter</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {generationStatus || 'Generating...'}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={!coverLetter || isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error message */}
      {generationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{generationError}</AlertDescription>
        </Alert>
      )}

      {/* Editor/Preview area - responsive width with max constraint */}
      <div className="mx-auto w-full" style={{ maxWidth: 'min(48rem, 100%)' }}>
        {coverLetter ? (
          <CoverLetterEditor
            coverLetter={coverLetter}
            personalInfo={personalInfo}
            onUpdate={handleCoverLetterUpdate}
          />
        ) : (
          <div
            className="mx-auto flex flex-col items-center justify-center rounded-lg bg-white shadow-lg border border-border w-full"
            style={{ aspectRatio: '8.5 / 11' }}
          >
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <FileText className="mb-4 h-16 w-16 opacity-50" />
              <p className="text-lg font-medium">No cover letter generated</p>
              <p className="mt-1 text-sm text-center px-8">
                {isAIAvailable
                  ? 'Click "Generate" to create a personalized cover letter using AI'
                  : 'Click "Generate" to create a cover letter based on your resume'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useCallback, useEffect } from 'react'
import { ProfileForm } from '@/components/profile'
import { useResume } from '@/hooks/useResume'
import type { Resume } from '@schemas/resume.schema'

export function ProfilePage() {
  const {
    resume,
    jsonText,
    setJsonText,
    isDirty,
    saveToFile,
    validate,
  } = useResume()

  // Validate JSON on mount and when jsonText changes
  useEffect(() => {
    if (jsonText.trim()) {
      validate()
    }
  }, [jsonText, validate])

  // Handler to merge partial updates into the resume
  const handleChange = useCallback(
    (updates: Partial<Resume>) => {
      if (!resume) return

      // Merge updates with existing resume
      const updatedResume: Resume = {
        ...resume,
        ...updates,
        personalInfo: {
          ...resume.personalInfo,
          ...(updates.personalInfo ?? {}),
        },
      }

      // Convert back to JSON and update
      const newJsonText = JSON.stringify(updatedResume, null, 2)
      setJsonText(newJsonText)
    },
    [resume, setJsonText]
  )

  const handleSave = useCallback(() => {
    saveToFile()
  }, [saveToFile])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Editor</h1>
        <p className="text-muted-foreground">
          Review and edit your professional details for AI-optimized tailoring.
        </p>
      </div>

      <ProfileForm
        resume={resume}
        jsonText={jsonText}
        onChange={handleChange}
        onJsonChange={setJsonText}
        onSave={handleSave}
        isDirty={isDirty}
      />
    </div>
  )
}

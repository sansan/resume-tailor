import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ProfileForm } from '@/components/profile'
import { useResume } from '@/hooks/useResume'
import type { Resume } from '@schemas/resume.schema'
import { ResumeSchema } from '@schemas/resume.schema'

// Default empty resume structure for new users
const EMPTY_RESUME: Resume = {
  personalInfo: {
    name: '',
    location: '',
    summary: '',
    contacts: [],
  },
  workExperience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
}

export function ProfilePage() {
  const { resume, jsonText, setJsonText, isDirty, validate } = useResume()

  // Initialize with empty resume if no data exists
  useEffect(() => {
    if (!jsonText.trim()) {
      setJsonText(JSON.stringify(EMPTY_RESUME, null, 2))
    }
  }, []) // Only run on mount

  // Validate JSON on mount and when jsonText changes
  useEffect(() => {
    if (jsonText.trim()) {
      validate()
    }
  }, [jsonText, validate])

  // Parse JSON for editing, even if validation fails (allows editing incomplete resumes)
  const editableResume = useMemo((): Resume | null => {
    // If validated resume exists, use it
    if (resume) return resume

    // Try to parse JSON directly for editing purposes
    if (jsonText.trim()) {
      try {
        const parsed = JSON.parse(jsonText)
        // Ensure minimum structure exists
        return {
          personalInfo: {
            name: parsed.personalInfo?.name ?? '',
            location: parsed.personalInfo?.location ?? '',
            summary: parsed.personalInfo?.summary ?? '',
            contacts: parsed.personalInfo?.contacts ?? [],
          },
          workExperience: parsed.workExperience ?? [],
          education: parsed.education ?? [],
          skills: parsed.skills ?? [],
          projects: parsed.projects ?? [],
          certifications: parsed.certifications ?? [],
        }
      } catch {
        // JSON parse failed, return null
        return null
      }
    }

    return null
  }, [resume, jsonText])

  // Handler to merge partial updates into the resume
  const handleChange = useCallback(
    (updates: Partial<Resume>) => {
      if (!editableResume) return

      // Merge updates with existing resume
      const updatedResume: Resume = {
        ...editableResume,
        ...updates,
        personalInfo: {
          ...editableResume.personalInfo,
          ...(updates.personalInfo ?? {}),
        },
      }

      // Convert back to JSON and update
      const newJsonText = JSON.stringify(updatedResume, null, 2)
      setJsonText(newJsonText)
    },
    [editableResume, setJsonText]
  )

  // Track if we're currently saving to prevent concurrent saves
  const isSavingRef = useRef(false)

  // Save to profile storage (not file dialog) - only if valid
  const handleSave = useCallback(async () => {
    if (!editableResume || isSavingRef.current) return

    // Validate before saving to profile storage
    const result = ResumeSchema.safeParse(editableResume)
    if (!result.success) {
      // Resume is not valid yet (e.g., empty name), skip auto-save silently
      return
    }

    isSavingRef.current = true
    try {
      await window.electronAPI.saveProfile(result.data)
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      isSavingRef.current = false
    }
  }, [editableResume])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Editor</h1>
        <p className="text-muted-foreground">
          Review and edit your professional details for AI-optimized tailoring.
        </p>
      </div>

      <ProfileForm
        resume={editableResume}
        jsonText={jsonText}
        onChange={handleChange}
        onJsonChange={setJsonText}
        onSave={handleSave}
        isDirty={isDirty}
      />
    </div>
  )
}

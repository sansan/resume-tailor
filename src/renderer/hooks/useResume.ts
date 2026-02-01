import { useState, useCallback } from 'react'
import { ResumeSchema, type Resume } from '@schemas/resume.schema'
import { ZodError } from 'zod'

export interface ValidationError {
  path: string
  message: string
}

export interface UseResumeState {
  resume: Resume | null
  jsonText: string
  validationErrors: ValidationError[]
  isValid: boolean
  filePath: string | null
  isDirty: boolean
}

export interface UseResumeActions {
  setJsonText: (text: string) => void
  validate: () => boolean
  loadFromFile: () => Promise<void>
  saveToFile: (saveAs?: boolean) => Promise<void>
  clearResume: () => void
}

export type UseResumeReturn = UseResumeState & UseResumeActions

const STORAGE_KEY = 'resume-creator-draft'

function loadFromLocalStorage(): { jsonText: string; filePath: string | null } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

function saveToLocalStorage(jsonText: string, filePath: string | null): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ jsonText, filePath }))
  } catch {
    // Ignore storage errors
  }
}

function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}

export function useResume(): UseResumeReturn {
  // Initialize from local storage if available
  const storedData = loadFromLocalStorage()

  const [jsonText, setJsonTextInternal] = useState<string>(storedData?.jsonText ?? '')
  const [resume, setResume] = useState<Resume | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isValid, setIsValid] = useState<boolean>(false)
  const [filePath, setFilePath] = useState<string | null>(storedData?.filePath ?? null)
  const [isDirty, setIsDirty] = useState<boolean>(false)

  const setJsonText = useCallback(
    (text: string) => {
      setJsonTextInternal(text)
      setIsDirty(true)
      // Clear validation state when text changes
      setIsValid(false)
      setValidationErrors([])
      // Auto-save to local storage
      saveToLocalStorage(text, filePath)
    },
    [filePath]
  )

  const validate = useCallback((): boolean => {
    if (!jsonText.trim()) {
      setValidationErrors([{ path: '', message: 'JSON content is empty' }])
      setIsValid(false)
      setResume(null)
      return false
    }

    try {
      // First try to parse as JSON
      const parsed = JSON.parse(jsonText)

      // Then validate against schema
      const validResume = ResumeSchema.parse(parsed)
      setResume(validResume)
      setValidationErrors([])
      setIsValid(true)
      return true
    } catch (error) {
      if (error instanceof SyntaxError) {
        setValidationErrors([{ path: '', message: `Invalid JSON: ${error.message}` }])
      } else if (error instanceof ZodError) {
        const errors: ValidationError[] = error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }))
        setValidationErrors(errors)
      } else {
        setValidationErrors([{ path: '', message: 'Unknown validation error' }])
      }
      setIsValid(false)
      setResume(null)
      return false
    }
  }, [jsonText])

  const loadFromFile = useCallback(async (): Promise<void> => {
    try {
      const result = await window.electronAPI.loadResume()
      if (result) {
        setJsonTextInternal(result.content)
        setFilePath(result.filePath)
        setIsDirty(false)
        // Clear validation state
        setIsValid(false)
        setValidationErrors([])
        setResume(null)
        // Save to local storage
        saveToLocalStorage(result.content, result.filePath)
      }
    } catch (error) {
      console.error('Failed to load resume from file:', error)
      throw error
    }
  }, [])

  const saveToFile = useCallback(
    async (saveAs: boolean = false): Promise<void> => {
      try {
        const saveData =
          saveAs || !filePath ? { content: jsonText } : { content: jsonText, filePath }
        const savedPath = await window.electronAPI.saveResume(saveData)
        if (savedPath) {
          setFilePath(savedPath)
          setIsDirty(false)
          // Update local storage with new path
          saveToLocalStorage(jsonText, savedPath)
        }
      } catch (error) {
        console.error('Failed to save resume to file:', error)
        throw error
      }
    },
    [jsonText, filePath]
  )

  const clearResume = useCallback((): void => {
    setJsonTextInternal('')
    setResume(null)
    setValidationErrors([])
    setIsValid(false)
    setFilePath(null)
    setIsDirty(false)
    clearLocalStorage()
  }, [])

  return {
    resume,
    jsonText,
    validationErrors,
    isValid,
    filePath,
    isDirty,
    setJsonText,
    validate,
    loadFromFile,
    saveToFile,
    clearResume,
  }
}

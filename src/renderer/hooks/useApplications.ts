import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  JobApplication,
  ApplicationStatistics,
  ApplicationStatus,
} from '@schemas/applications.schema'
import { DEFAULT_APPLICATION_STATUSES } from '@schemas/applications.schema'

/**
 * Filter and sort options for applications.
 */
export interface ApplicationsFilter {
  /** Filter by status ID (null = all) */
  statusId: string | null
  /** Search query for company/job title */
  searchQuery: string
  /** Sort order */
  sortOrder: 'newest' | 'oldest'
}

/**
 * State interface for the useApplications hook.
 */
export interface UseApplicationsState {
  /** All applications */
  applications: JobApplication[]
  /** Filtered and sorted applications */
  filteredApplications: JobApplication[]
  /** Application statistics */
  statistics: ApplicationStatistics | null
  /** Available statuses */
  statuses: ApplicationStatus[]
  /** Current filter settings */
  filter: ApplicationsFilter
  /** Whether applications are currently loading */
  isLoading: boolean
  /** Error message if an operation failed */
  error: string | null
}

/**
 * Actions interface for the useApplications hook.
 */
export interface UseApplicationsActions {
  /** Reload applications from disk */
  refresh: () => Promise<void>
  /** Add a new application */
  addApplication: (application: JobApplication) => Promise<boolean>
  /** Update an existing application */
  updateApplication: (applicationId: string, updates: Partial<JobApplication>) => Promise<boolean>
  /** Delete an application */
  deleteApplication: (applicationId: string) => Promise<boolean>
  /** Update application status */
  updateStatus: (applicationId: string, statusId: string, note?: string) => Promise<boolean>
  /** Clear all applications */
  clearApplications: () => Promise<boolean>
  /** Update filter settings */
  setFilter: (filter: Partial<ApplicationsFilter>) => void
  /** Get a status by ID */
  getStatusById: (statusId: string) => ApplicationStatus | undefined
  /** Open the folder containing an application's files */
  openFolder: (folderPath: string) => Promise<void>
  /** Open a file */
  openFile: (filePath: string) => Promise<boolean>
}

/**
 * Combined return type for the useApplications hook.
 */
export type UseApplicationsReturn = UseApplicationsState & UseApplicationsActions

/**
 * Default filter settings.
 */
const DEFAULT_FILTER: ApplicationsFilter = {
  statusId: null,
  searchQuery: '',
  sortOrder: 'newest',
}

/**
 * Hook for managing job applications.
 *
 * Provides loading, adding, updating, deleting, and filtering of job applications
 * with error handling and loading states.
 */
export function useApplications(): UseApplicationsReturn {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [statistics, setStatistics] = useState<ApplicationStatistics | null>(null)
  const [statuses, setStatuses] = useState<ApplicationStatus[]>(DEFAULT_APPLICATION_STATUSES)
  const [filter, setFilterState] = useState<ApplicationsFilter>(DEFAULT_FILTER)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load applications from the main process.
   */
  const loadApplications = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [loadedApplications, loadedStatistics, settings] = await Promise.all([
        window.electronAPI.getAllApplications(),
        window.electronAPI.getApplicationStatistics(),
        window.electronAPI.getSettings(),
      ])
      setApplications(loadedApplications)
      setStatistics(loadedStatistics)
      if (settings.applicationStatuses && settings.applicationStatuses.length > 0) {
        setStatuses(settings.applicationStatuses)
      }
    } catch (err) {
      console.error('Failed to load applications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load applications')
      setApplications([])
      setStatistics(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load applications on mount
  useEffect(() => {
    loadApplications()
  }, [loadApplications])

  /**
   * Filter and sort applications based on current filter.
   */
  const filteredApplications = useMemo(() => {
    let result = [...applications]

    // Filter by status
    if (filter.statusId) {
      result = result.filter(app => app.currentStatusId === filter.statusId)
    }

    // Filter by search query
    if (filter.searchQuery.trim()) {
      const query = filter.searchQuery.toLowerCase().trim()
      result = result.filter(
        app =>
          app.companyName.toLowerCase().includes(query) ||
          app.jobTitle.toLowerCase().includes(query)
      )
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return filter.sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [applications, filter])

  /**
   * Refresh applications from disk.
   */
  const refresh = useCallback(async () => {
    await loadApplications()
  }, [loadApplications])

  /**
   * Add a new application.
   */
  const addApplication = useCallback(
    async (application: JobApplication): Promise<boolean> => {
      setError(null)

      try {
        await window.electronAPI.addApplication(application)
        await loadApplications()
        return true
      } catch (err) {
        console.error('Failed to add application:', err)
        setError(err instanceof Error ? err.message : 'Failed to add application')
        return false
      }
    },
    [loadApplications]
  )

  /**
   * Update an existing application.
   */
  const updateApplication = useCallback(
    async (applicationId: string, updates: Partial<JobApplication>): Promise<boolean> => {
      setError(null)

      try {
        await window.electronAPI.updateApplication(applicationId, updates)
        await loadApplications()
        return true
      } catch (err) {
        console.error('Failed to update application:', err)
        setError(err instanceof Error ? err.message : 'Failed to update application')
        return false
      }
    },
    [loadApplications]
  )

  /**
   * Delete an application.
   */
  const deleteApplication = useCallback(
    async (applicationId: string): Promise<boolean> => {
      setError(null)

      try {
        await window.electronAPI.deleteApplication(applicationId)
        await loadApplications()
        return true
      } catch (err) {
        console.error('Failed to delete application:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete application')
        return false
      }
    },
    [loadApplications]
  )

  /**
   * Update application status.
   */
  const updateStatus = useCallback(
    async (applicationId: string, statusId: string, note?: string): Promise<boolean> => {
      setError(null)

      try {
        await window.electronAPI.updateApplicationStatus(applicationId, statusId, note)
        await loadApplications()
        return true
      } catch (err) {
        console.error('Failed to update application status:', err)
        setError(err instanceof Error ? err.message : 'Failed to update application status')
        return false
      }
    },
    [loadApplications]
  )

  /**
   * Clear all applications.
   */
  const clearApplications = useCallback(async (): Promise<boolean> => {
    setError(null)

    try {
      await window.electronAPI.clearApplications()
      await loadApplications()
      return true
    } catch (err) {
      console.error('Failed to clear applications:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear applications')
      return false
    }
  }, [loadApplications])

  /**
   * Update filter settings.
   */
  const setFilter = useCallback((updates: Partial<ApplicationsFilter>) => {
    setFilterState(prev => ({ ...prev, ...updates }))
  }, [])

  /**
   * Get a status by ID.
   */
  const getStatusById = useCallback(
    (statusId: string): ApplicationStatus | undefined => {
      return statuses.find(s => s.id === statusId)
    },
    [statuses]
  )

  /**
   * Open the folder containing an application's files.
   */
  const openFolder = useCallback(async (folderPath: string): Promise<void> => {
    try {
      await window.electronAPI.openFolder(folderPath)
    } catch (err) {
      console.error('Failed to open folder:', err)
      setError(err instanceof Error ? err.message : 'Failed to open folder')
    }
  }, [])

  /**
   * Open a file.
   */
  const openFile = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      const result = await window.electronAPI.openHistoryFile(filePath)
      if (!result) {
        setError('File not found. It may have been moved or deleted.')
      }
      return result
    } catch (err) {
      console.error('Failed to open file:', err)
      setError(err instanceof Error ? err.message : 'Failed to open file')
      return false
    }
  }, [])

  return {
    applications,
    filteredApplications,
    statistics,
    statuses,
    filter,
    isLoading,
    error,
    refresh,
    addApplication,
    updateApplication,
    deleteApplication,
    updateStatus,
    clearApplications,
    setFilter,
    getStatusById,
    openFolder,
    openFile,
  }
}

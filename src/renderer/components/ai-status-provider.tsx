import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type AIStatus = 'idle' | 'processing' | 'error' | 'unavailable'

type AIStatusState = {
  status: AIStatus
  isAvailable: boolean
  version: string | null
  error: string | null
  logs: string[]
  checkAvailability: () => Promise<void>
  addLog: (message: string) => void
  clearLogs: () => void
  setStatus: (status: AIStatus) => void
  setError: (error: string | null) => void
}

const AIStatusContext = createContext<AIStatusState | undefined>(undefined)

export function AIStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AIStatus>('idle')
  const [isAvailable, setIsAvailable] = useState(false)
  const [version, setVersion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-99), `[${timestamp}] ${message}`])
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const checkAvailability = useCallback(async () => {
    try {
      addLog('Checking AI availability...')
      const result = await window.electronAPI.checkAIAvailability()
      setIsAvailable(result.available)
      setVersion(result.version || null)
      setStatus(result.available ? 'idle' : 'unavailable')
      addLog(result.available
        ? `AI available: Claude CLI ${result.version}`
        : 'AI unavailable: Claude CLI not found')
    } catch (err) {
      setIsAvailable(false)
      setStatus('unavailable')
      setError(err instanceof Error ? err.message : 'Unknown error')
      addLog(`Error checking AI: ${err}`)
    }
  }, [addLog])

  useEffect(() => {
    checkAvailability()
  }, [checkAvailability])

  return (
    <AIStatusContext.Provider
      value={{
        status,
        isAvailable,
        version,
        error,
        logs,
        checkAvailability,
        addLog,
        clearLogs,
        setStatus,
        setError,
      }}
    >
      {children}
    </AIStatusContext.Provider>
  )
}

export const useAIStatus = () => {
  const context = useContext(AIStatusContext)
  if (context === undefined) {
    throw new Error('useAIStatus must be used within an AIStatusProvider')
  }
  return context
}

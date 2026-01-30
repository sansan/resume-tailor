import { useState, useEffect, useCallback } from 'react';
import type { ExportHistory, HistoryEntry } from '../../shared/schemas/history.schema';

/**
 * State interface for the useExportHistory hook.
 */
export interface UseExportHistoryState {
  /** Full export history including version */
  history: ExportHistory | null;
  /** Recent export entries */
  entries: HistoryEntry[];
  /** Whether history is currently loading */
  isLoading: boolean;
  /** Error message if an operation failed */
  error: string | null;
}

/**
 * Actions interface for the useExportHistory hook.
 */
export interface UseExportHistoryActions {
  /** Reload history from disk */
  refresh: () => Promise<void>;
  /** Add a new entry to history */
  addEntry: (entry: HistoryEntry) => Promise<boolean>;
  /** Delete a specific entry by ID */
  deleteEntry: (entryId: string) => Promise<boolean>;
  /** Clear all history entries */
  clearHistory: () => Promise<boolean>;
  /** Open a file from history in the system default application */
  openFile: (filePath: string) => Promise<boolean>;
  /** Open the folder containing an export */
  openFolder: (folderPath: string) => Promise<void>;
}

/**
 * Combined return type for the useExportHistory hook.
 */
export type UseExportHistoryReturn = UseExportHistoryState & UseExportHistoryActions;

/**
 * Hook for managing export history.
 *
 * Provides loading, adding, deleting, and clearing of export history entries
 * with error handling and loading states.
 */
export function useExportHistory(): UseExportHistoryReturn {
  const [history, setHistory] = useState<ExportHistory | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load history from the main process.
   */
  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedHistory = await window.electronAPI.getExportHistory();
      setHistory(loadedHistory);
      setEntries(loadedHistory.entries);
    } catch (err) {
      console.error('Failed to load export history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load export history');
      setHistory(null);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  /**
   * Refresh history from disk.
   */
  const refresh = useCallback(async () => {
    await loadHistory();
  }, [loadHistory]);

  /**
   * Add a new entry to history.
   */
  const addEntry = useCallback(async (entry: HistoryEntry): Promise<boolean> => {
    setError(null);

    try {
      await window.electronAPI.addToHistory(entry);
      // Refresh to get updated list
      await loadHistory();
      return true;
    } catch (err) {
      console.error('Failed to add history entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to add history entry');
      return false;
    }
  }, [loadHistory]);

  /**
   * Delete a specific entry by ID.
   */
  const deleteEntry = useCallback(async (entryId: string): Promise<boolean> => {
    setError(null);

    try {
      await window.electronAPI.deleteHistoryEntry(entryId);
      // Refresh to get updated list
      await loadHistory();
      return true;
    } catch (err) {
      console.error('Failed to delete history entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete history entry');
      return false;
    }
  }, [loadHistory]);

  /**
   * Clear all history entries.
   */
  const clearHistory = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      await window.electronAPI.clearHistory();
      // Refresh to get updated (empty) list
      await loadHistory();
      return true;
    } catch (err) {
      console.error('Failed to clear history:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear history');
      return false;
    }
  }, [loadHistory]);

  /**
   * Open a file from history in the system default application.
   */
  const openFile = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      const result = await window.electronAPI.openHistoryFile(filePath);
      if (!result) {
        setError('File not found. It may have been moved or deleted.');
      }
      return result;
    } catch (err) {
      console.error('Failed to open file:', err);
      setError(err instanceof Error ? err.message : 'Failed to open file');
      return false;
    }
  }, []);

  /**
   * Open the folder containing an export.
   */
  const openFolder = useCallback(async (folderPath: string): Promise<void> => {
    try {
      await window.electronAPI.openFolder(folderPath);
    } catch (err) {
      console.error('Failed to open folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to open folder');
    }
  }, []);

  return {
    history,
    entries,
    isLoading,
    error,
    refresh,
    addEntry,
    deleteEntry,
    clearHistory,
    openFile,
    openFolder,
  };
}

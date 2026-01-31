import React, { useCallback, useState } from 'react';
import { useExportHistory } from '@/hooks/useExportHistory';
import type { HistoryEntry } from '@schemas/history.schema';

/**
 * Format a date string for display.
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get relative time string (e.g., "2 hours ago").
 */
function getRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return formatDate(isoDate);
}

/**
 * Props for the HistoryItem component.
 */
interface HistoryItemProps {
  entry: HistoryEntry;
  onOpenFolder: (folderPath: string) => void;
  onOpenFile: (filePath: string) => void;
  onDelete: (entryId: string) => void;
}

/**
 * Individual history entry item.
 */
function HistoryItem({ entry, onOpenFolder, onOpenFile, onDelete }: HistoryItemProps): React.JSX.Element {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Remove this entry from history?\n\n${entry.companyName} - ${entry.jobTitle}\n\nNote: This will not delete the exported files.`)) {
      setIsDeleting(true);
      onDelete(entry.id);
    }
  }, [entry, onDelete]);

  const handleOpenFolder = useCallback(() => {
    onOpenFolder(entry.folderPath);
  }, [entry.folderPath, onOpenFolder]);

  const handleOpenResume = useCallback(() => {
    if (entry.resumePath) {
      onOpenFile(entry.resumePath);
    }
  }, [entry.resumePath, onOpenFile]);

  const handleOpenCoverLetter = useCallback(() => {
    if (entry.coverLetterPath) {
      onOpenFile(entry.coverLetterPath);
    }
  }, [entry.coverLetterPath, onOpenFile]);

  return (
    <div className={`recent-exports__item ${isDeleting ? 'recent-exports__item--deleting' : ''}`}>
      <div className="recent-exports__item-header">
        <div className="recent-exports__item-title">
          <span className="recent-exports__company">{entry.companyName}</span>
          <span className="recent-exports__job-title">{entry.jobTitle}</span>
        </div>
        <span className="recent-exports__date" title={formatDate(entry.date)}>
          {getRelativeTime(entry.date)}
        </span>
      </div>
      <div className="recent-exports__item-actions">
        {entry.resumePath && (
          <button
            className="recent-exports__action-btn"
            onClick={handleOpenResume}
            title="Open resume PDF"
          >
            Resume
          </button>
        )}
        {entry.coverLetterPath && (
          <button
            className="recent-exports__action-btn"
            onClick={handleOpenCoverLetter}
            title="Open cover letter PDF"
          >
            Cover Letter
          </button>
        )}
        <button
          className="recent-exports__action-btn recent-exports__action-btn--folder"
          onClick={handleOpenFolder}
          title="Open folder in file explorer"
        >
          Open Folder
        </button>
        <button
          className="recent-exports__action-btn recent-exports__action-btn--delete"
          onClick={handleDelete}
          title="Remove from history"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

/**
 * Props for the RecentExports component.
 */
interface RecentExportsProps {
  /** Maximum number of entries to show (default: 5) */
  maxEntries?: number;
  /** Whether to show the header */
  showHeader?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * RecentExports component displays a list of recent export history entries.
 *
 * Provides quick access to:
 * - Open exported PDFs
 * - Open the folder containing exports
 * - Remove entries from history
 * - Clear all history
 */
export function RecentExports({
  maxEntries = 5,
  showHeader = true,
  className = '',
}: RecentExportsProps): React.JSX.Element {
  const {
    entries,
    isLoading,
    error,
    deleteEntry,
    clearHistory,
    openFile,
    openFolder,
    refresh,
  } = useExportHistory();

  const [isClearing, setIsClearing] = useState(false);

  const displayedEntries = entries.slice(0, maxEntries);

  const handleClearHistory = useCallback(async () => {
    if (window.confirm('Clear all export history?\n\nThis will not delete the exported files, only the history.')) {
      setIsClearing(true);
      await clearHistory();
      setIsClearing(false);
    }
  }, [clearHistory]);

  const handleDeleteEntry = useCallback(async (entryId: string) => {
    await deleteEntry(entryId);
  }, [deleteEntry]);

  const handleOpenFile = useCallback(async (filePath: string) => {
    const success = await openFile(filePath);
    if (!success) {
      // File not found - refresh the list in case it was deleted
      await refresh();
    }
  }, [openFile, refresh]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`recent-exports recent-exports--loading ${className}`}>
        <div className="recent-exports__loading-spinner" />
        <span>Loading history...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`recent-exports recent-exports--error ${className}`}>
        <span className="recent-exports__error-icon">!</span>
        <span>{error}</span>
        <button className="recent-exports__retry-btn" onClick={refresh}>
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className={`recent-exports recent-exports--empty ${className}`}>
        {showHeader && <h3 className="recent-exports__title">Recent Exports</h3>}
        <p className="recent-exports__empty-message">
          No exports yet. Export your first resume and cover letter to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className={`recent-exports ${className}`}>
      {showHeader && (
        <div className="recent-exports__header">
          <h3 className="recent-exports__title">Recent Exports</h3>
          {entries.length > 0 && (
            <button
              className="recent-exports__clear-btn"
              onClick={handleClearHistory}
              disabled={isClearing}
            >
              {isClearing ? 'Clearing...' : 'Clear History'}
            </button>
          )}
        </div>
      )}
      <div className="recent-exports__list">
        {displayedEntries.map((entry) => (
          <HistoryItem
            key={entry.id}
            entry={entry}
            onOpenFolder={openFolder}
            onOpenFile={handleOpenFile}
            onDelete={handleDeleteEntry}
          />
        ))}
      </div>
      {entries.length > maxEntries && (
        <p className="recent-exports__more">
          +{entries.length - maxEntries} more export{entries.length - maxEntries === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}

export default RecentExports;

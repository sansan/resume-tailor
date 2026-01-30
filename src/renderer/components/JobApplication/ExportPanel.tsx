import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { RefinedResume, GeneratedCoverLetter } from '../../../shared/schemas/ai-output.schema';
import type { AppSettings } from '../../../shared/schemas/settings.schema';
import { generateHistoryEntryId } from '../../../shared/schemas/history.schema';
import { renderResumeToPDFBlob, renderCoverLetterToPDFBlob, createPDFTheme, type PDFTheme } from '../../services/pdf';
import { convertToPDFTheme } from '../../../shared/schemas/settings.schema';

export interface ExportPanelProps {
  refinedResume: RefinedResume;
  coverLetter: GeneratedCoverLetter;
  companyName: string;
  jobTitle: string;
  onStartOver: () => void;
}

export interface ExportState {
  status: 'idle' | 'exporting' | 'success' | 'error' | 'loading';
  exportedPath: string | null;
  error: string | null;
  exportedFiles: {
    resume: boolean;
    coverLetter: boolean;
  };
}

export interface OverwriteConfirmation {
  show: boolean;
  existingFiles: string[];
  onConfirm: () => void;
}

/**
 * Sanitizes a string to be safe for use as a folder or file name.
 * Removes or replaces characters that are invalid in file system paths.
 */
function sanitizeForFileName(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Generates a default folder name from company name.
 */
function generateFolderName(companyName: string): string {
  const sanitized = sanitizeForFileName(companyName);
  return sanitized || 'Application';
}

/**
 * Applies the file naming pattern with variable substitution.
 * Available variables: {company}, {date}, {title}, {name}
 */
function applyFileNamingPattern(
  pattern: string,
  variables: {
    company: string;
    date: string;
    title: string;
    name: string;
  },
  documentType: 'resume' | 'cover-letter'
): string {
  // Apply variable substitution
  let result = pattern
    .replace(/\{company\}/gi, sanitizeForFileName(variables.company) || 'Company')
    .replace(/\{date\}/gi, variables.date)
    .replace(/\{title\}/gi, sanitizeForFileName(variables.title) || 'Position')
    .replace(/\{name\}/gi, sanitizeForFileName(variables.name) || 'Candidate');

  // Ensure file has proper suffix based on document type
  if (documentType === 'resume' && !result.toLowerCase().includes('resume')) {
    result = `${result}_Resume`;
  } else if (documentType === 'cover-letter' && !result.toLowerCase().includes('cover')) {
    result = `${result}_Cover_Letter`;
  }

  // Ensure extension
  if (!result.toLowerCase().endsWith('.pdf')) {
    result = `${result}.pdf`;
  }

  return result;
}

/**
 * Gets the current date in YYYY-MM-DD format.
 */
function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ExportPanel({
  refinedResume,
  coverLetter,
  companyName,
  jobTitle,
  onStartOver,
}: ExportPanelProps): React.JSX.Element {
  // Settings state
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [defaultExportFolder, setDefaultExportFolder] = useState<string>('');

  // Export state
  const [baseFolderPath, setBaseFolderPath] = useState<string | null>(null);
  const [subfolderName, setSubfolderName] = useState<string>(generateFolderName(companyName));
  const [useCompanySubfolders, setUseCompanySubfolders] = useState<boolean>(true);
  const [exportState, setExportState] = useState<ExportState>({
    status: 'loading',
    exportedPath: null,
    error: null,
    exportedFiles: {
      resume: false,
      coverLetter: false,
    },
  });
  const [overwriteConfirmation, setOverwriteConfirmation] = useState<OverwriteConfirmation>({
    show: false,
    existingFiles: [],
    onConfirm: () => {},
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [loadedSettings, defaultFolder] = await Promise.all([
          window.electronAPI.getSettings(),
          window.electronAPI.getDefaultOutputFolder(),
        ]);

        setSettings(loadedSettings);
        setDefaultExportFolder(defaultFolder);

        // Apply settings defaults
        const effectiveOutputFolder = loadedSettings.outputFolderPath || defaultFolder;
        setBaseFolderPath(effectiveOutputFolder);
        setUseCompanySubfolders(loadedSettings.createCompanySubfolders);

        setExportState((prev) => ({
          ...prev,
          status: 'idle',
        }));
      } catch (err) {
        console.error('Failed to load settings:', err);
        setExportState({
          status: 'idle',
          exportedPath: null,
          error: null,
          exportedFiles: { resume: false, coverLetter: false },
        });
      }
    };
    loadSettings();
  }, []);

  // Create PDF theme from settings
  const pdfTheme: PDFTheme = useMemo(() => {
    if (!settings) {
      return createPDFTheme();
    }
    return convertToPDFTheme(settings.pdfTheme);
  }, [settings]);

  // Generate file names based on settings pattern
  const fileNames = useMemo(() => {
    const pattern = settings?.fileNamingPattern || '{company}-{name}-{date}';
    const variables = {
      company: companyName || 'Company',
      date: getCurrentDateString(),
      title: jobTitle || 'Position',
      name: refinedResume.personalInfo.name || 'Candidate',
    };

    return {
      resume: applyFileNamingPattern(pattern, variables, 'resume'),
      coverLetter: applyFileNamingPattern(pattern, variables, 'cover-letter'),
    };
  }, [settings?.fileNamingPattern, companyName, jobTitle, refinedResume.personalInfo.name]);

  // Compute effective subfolder name
  const effectiveSubfolderName = useCompanySubfolders ? subfolderName : '';

  const handleSelectFolder = useCallback(async () => {
    try {
      const selectedPath = await window.electronAPI.selectFolder();
      if (selectedPath) {
        setBaseFolderPath(selectedPath);
      }
    } catch (err) {
      console.error('Failed to select folder:', err);
    }
  }, []);

  const performExportAll = useCallback(async () => {
    if (!baseFolderPath) {
      return;
    }

    setExportState({
      status: 'exporting',
      exportedPath: null,
      error: null,
      exportedFiles: { resume: false, coverLetter: false },
    });

    try {
      // Create the company subfolder (if enabled) and export both PDFs
      const result = await window.electronAPI.exportApplicationPDFs({
        baseFolderPath,
        subfolderName: effectiveSubfolderName,
        resumeBlob: await renderResumeToPDFBlob(refinedResume, { theme: pdfTheme }),
        coverLetterBlob: await renderCoverLetterToPDFBlob(coverLetter, { theme: pdfTheme, personalInfo: refinedResume.personalInfo }),
        resumeFileName: fileNames.resume,
        coverLetterFileName: fileNames.coverLetter,
      });

      if (result.success) {
        const folderPath = result.folderPath ?? baseFolderPath;

        // Add to export history
        try {
          await window.electronAPI.addToHistory({
            id: generateHistoryEntryId(),
            companyName: companyName || 'Unknown Company',
            jobTitle: jobTitle || 'Unknown Position',
            date: new Date().toISOString(),
            resumePath: `${folderPath}/${fileNames.resume}`,
            coverLetterPath: `${folderPath}/${fileNames.coverLetter}`,
            folderPath,
          });
        } catch (historyError) {
          // Log but don't fail the export if history fails
          console.warn('Failed to save to history:', historyError);
        }

        setExportState({
          status: 'success',
          exportedPath: result.folderPath ?? null,
          error: null,
          exportedFiles: { resume: true, coverLetter: true },
        });
      } else {
        setExportState({
          status: 'error',
          exportedPath: null,
          error: result.error ?? 'Failed to export PDFs',
          exportedFiles: { resume: false, coverLetter: false },
        });
      }
    } catch (err) {
      setExportState({
        status: 'error',
        exportedPath: null,
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
        exportedFiles: { resume: false, coverLetter: false },
      });
    }
  }, [baseFolderPath, effectiveSubfolderName, refinedResume, coverLetter, fileNames, pdfTheme, companyName, jobTitle]);

  const handleExportAll = useCallback(async () => {
    if (!baseFolderPath) {
      setExportState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Please select a folder first',
      }));
      return;
    }

    try {
      // Check if files already exist
      const checkResult = await window.electronAPI.checkExportFiles({
        baseFolderPath,
        subfolderName: effectiveSubfolderName,
        fileNames: [fileNames.resume, fileNames.coverLetter],
      });

      if (checkResult.exists) {
        // Show confirmation dialog
        setOverwriteConfirmation({
          show: true,
          existingFiles: checkResult.existingFiles,
          onConfirm: () => {
            setOverwriteConfirmation({ show: false, existingFiles: [], onConfirm: () => {} });
            performExportAll();
          },
        });
      } else {
        // No existing files, proceed with export
        performExportAll();
      }
    } catch (err) {
      // If check fails, proceed with export anyway
      performExportAll();
    }
  }, [baseFolderPath, effectiveSubfolderName, fileNames, performExportAll]);

  const performExportResume = useCallback(async () => {
    if (!baseFolderPath) {
      return;
    }

    setExportState((prev) => ({
      ...prev,
      status: 'exporting',
      error: null,
    }));

    try {
      const result = await window.electronAPI.exportSinglePDF({
        baseFolderPath,
        subfolderName: effectiveSubfolderName,
        pdfBlob: await renderResumeToPDFBlob(refinedResume, { theme: pdfTheme }),
        fileName: fileNames.resume,
      });

      if (result.success) {
        setExportState((prev) => ({
          ...prev,
          status: 'success',
          exportedPath: result.folderPath ?? null,
          exportedFiles: { ...prev.exportedFiles, resume: true },
        }));
      } else {
        setExportState((prev) => ({
          ...prev,
          status: 'error',
          error: result.error ?? 'Failed to export resume PDF',
        }));
      }
    } catch (err) {
      setExportState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      }));
    }
  }, [baseFolderPath, effectiveSubfolderName, refinedResume, fileNames.resume, pdfTheme]);

  const handleExportResume = useCallback(async () => {
    if (!baseFolderPath) {
      setExportState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Please select a folder first',
      }));
      return;
    }

    try {
      // Check if file already exists
      const checkResult = await window.electronAPI.checkExportFiles({
        baseFolderPath,
        subfolderName: effectiveSubfolderName,
        fileNames: [fileNames.resume],
      });

      if (checkResult.exists) {
        // Show confirmation dialog
        setOverwriteConfirmation({
          show: true,
          existingFiles: checkResult.existingFiles,
          onConfirm: () => {
            setOverwriteConfirmation({ show: false, existingFiles: [], onConfirm: () => {} });
            performExportResume();
          },
        });
      } else {
        // No existing file, proceed with export
        performExportResume();
      }
    } catch (err) {
      // If check fails, proceed with export anyway
      performExportResume();
    }
  }, [baseFolderPath, effectiveSubfolderName, fileNames.resume, performExportResume]);

  const performExportCoverLetter = useCallback(async () => {
    if (!baseFolderPath) {
      return;
    }

    setExportState((prev) => ({
      ...prev,
      status: 'exporting',
      error: null,
    }));

    try {
      const result = await window.electronAPI.exportSinglePDF({
        baseFolderPath,
        subfolderName: effectiveSubfolderName,
        pdfBlob: await renderCoverLetterToPDFBlob(coverLetter, { theme: pdfTheme, personalInfo: refinedResume.personalInfo }),
        fileName: fileNames.coverLetter,
      });

      if (result.success) {
        setExportState((prev) => ({
          ...prev,
          status: 'success',
          exportedPath: result.folderPath ?? null,
          exportedFiles: { ...prev.exportedFiles, coverLetter: true },
        }));
      } else {
        setExportState((prev) => ({
          ...prev,
          status: 'error',
          error: result.error ?? 'Failed to export cover letter PDF',
        }));
      }
    } catch (err) {
      setExportState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      }));
    }
  }, [baseFolderPath, effectiveSubfolderName, coverLetter, fileNames.coverLetter, pdfTheme]);

  const handleExportCoverLetter = useCallback(async () => {
    if (!baseFolderPath) {
      setExportState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Please select a folder first',
      }));
      return;
    }

    try {
      // Check if file already exists
      const checkResult = await window.electronAPI.checkExportFiles({
        baseFolderPath,
        subfolderName: effectiveSubfolderName,
        fileNames: [fileNames.coverLetter],
      });

      if (checkResult.exists) {
        // Show confirmation dialog
        setOverwriteConfirmation({
          show: true,
          existingFiles: checkResult.existingFiles,
          onConfirm: () => {
            setOverwriteConfirmation({ show: false, existingFiles: [], onConfirm: () => {} });
            performExportCoverLetter();
          },
        });
      } else {
        // No existing file, proceed with export
        performExportCoverLetter();
      }
    } catch (err) {
      // If check fails, proceed with export anyway
      performExportCoverLetter();
    }
  }, [baseFolderPath, effectiveSubfolderName, fileNames.coverLetter, performExportCoverLetter]);

  const handleOpenFolder = useCallback(async () => {
    if (exportState.exportedPath) {
      await window.electronAPI.openFolder(exportState.exportedPath);
    }
  }, [exportState.exportedPath]);

  const handleSubfolderNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSubfolderName(e.target.value);
    },
    []
  );

  const handleToggleSubfolders = useCallback(() => {
    setUseCompanySubfolders((prev) => !prev);
  }, []);

  const handleCancelOverwrite = useCallback(() => {
    setOverwriteConfirmation({ show: false, existingFiles: [], onConfirm: () => {} });
  }, []);

  const renderOverwriteConfirmation = () => {
    if (!overwriteConfirmation.show) {
      return null;
    }

    return (
      <div className="export-panel__overlay">
        <div className="export-panel__confirmation-dialog">
          <h4 className="export-panel__confirmation-title">Overwrite Existing Files?</h4>
          <p className="export-panel__confirmation-message">
            The following file(s) already exist and will be overwritten:
          </p>
          <ul className="export-panel__confirmation-files">
            {overwriteConfirmation.existingFiles.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
          <div className="export-panel__confirmation-actions">
            <button
              type="button"
              className="export-panel__btn export-panel__btn--secondary"
              onClick={handleCancelOverwrite}
            >
              Cancel
            </button>
            <button
              type="button"
              className="export-panel__btn export-panel__btn--danger"
              onClick={overwriteConfirmation.onConfirm}
            >
              Overwrite
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFolderSelection = () => {
    // Compute the full export path for preview
    const fullExportPath = baseFolderPath
      ? useCompanySubfolders && subfolderName
        ? `${baseFolderPath}/${subfolderName}/`
        : `${baseFolderPath}/`
      : '...';

    return (
      <div className="export-panel__folder-selection">
        <div className="export-panel__folder-row">
          <label className="export-panel__label">Export Location</label>
          <div className="export-panel__folder-input">
            <input
              type="text"
              className="export-panel__path-display"
              value={baseFolderPath ?? ''}
              placeholder="Select a folder..."
              readOnly
            />
            <button
              type="button"
              className="export-panel__btn export-panel__btn--secondary"
              onClick={handleSelectFolder}
            >
              Browse...
            </button>
          </div>
          {settings && !settings.outputFolderPath && baseFolderPath === defaultExportFolder && (
            <p className="export-panel__hint export-panel__hint--info">
              Using default export folder. Configure in Settings.
            </p>
          )}
        </div>

        <div className="export-panel__folder-row">
          <label className="export-panel__checkbox-label">
            <input
              type="checkbox"
              checked={useCompanySubfolders}
              onChange={handleToggleSubfolders}
            />
            Create company subfolder
          </label>
        </div>

        {useCompanySubfolders && (
          <div className="export-panel__folder-row">
            <label className="export-panel__label">Company Folder Name</label>
            <input
              type="text"
              className="export-panel__subfolder-input"
              value={subfolderName}
              onChange={handleSubfolderNameChange}
              placeholder="Company name"
            />
          </div>
        )}

        <p className="export-panel__hint">
          PDFs will be saved to: <code>{fullExportPath}</code>
        </p>
      </div>
    );
  };

  const renderPDFPreview = () => (
    <div className="export-panel__pdf-list">
      <h4 className="export-panel__section-title">Documents to Export</h4>

      <div className="export-panel__pdf-item">
        <div className="export-panel__pdf-icon">
          <span className="export-panel__icon">
            {exportState.exportedFiles.resume ? '✓' : '📄'}
          </span>
        </div>
        <div className="export-panel__pdf-info">
          <span className="export-panel__pdf-name">{fileNames.resume}</span>
          <span className="export-panel__pdf-type">Tailored Resume</span>
        </div>
        <button
          type="button"
          className="export-panel__btn export-panel__btn--small"
          onClick={handleExportResume}
          disabled={!baseFolderPath || exportState.status === 'exporting' || exportState.status === 'loading'}
        >
          Export
        </button>
      </div>

      <div className="export-panel__pdf-item">
        <div className="export-panel__pdf-icon">
          <span className="export-panel__icon">
            {exportState.exportedFiles.coverLetter ? '✓' : '📄'}
          </span>
        </div>
        <div className="export-panel__pdf-info">
          <span className="export-panel__pdf-name">{fileNames.coverLetter}</span>
          <span className="export-panel__pdf-type">Cover Letter</span>
        </div>
        <button
          type="button"
          className="export-panel__btn export-panel__btn--small"
          onClick={handleExportCoverLetter}
          disabled={!baseFolderPath || exportState.status === 'exporting' || exportState.status === 'loading'}
        >
          Export
        </button>
      </div>
    </div>
  );

  const renderExportActions = () => (
    <div className="export-panel__actions">
      <button
        type="button"
        className="export-panel__btn export-panel__btn--primary export-panel__btn--large"
        onClick={handleExportAll}
        disabled={!baseFolderPath || exportState.status === 'exporting' || exportState.status === 'loading'}
      >
        {exportState.status === 'exporting' ? 'Exporting...' : 'Export All'}
      </button>
    </div>
  );

  const renderSuccessState = () => (
    <div className="export-panel__success">
      <div className="export-panel__success-icon">✓</div>
      <h4 className="export-panel__success-title">Export Complete!</h4>
      <p className="export-panel__success-message">
        Your application documents have been saved to:
      </p>
      <p className="export-panel__success-path">{exportState.exportedPath}</p>
      <div className="export-panel__success-actions">
        <button
          type="button"
          className="export-panel__btn export-panel__btn--primary"
          onClick={handleOpenFolder}
        >
          Open Folder
        </button>
        <button
          type="button"
          className="export-panel__btn export-panel__btn--secondary"
          onClick={onStartOver}
        >
          Start New Application
        </button>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="export-panel__error">
      <p className="export-panel__error-message">{exportState.error}</p>
      <button
        type="button"
        className="export-panel__btn export-panel__btn--secondary"
        onClick={() => setExportState((prev) => ({ ...prev, status: 'idle', error: null }))}
      >
        Try Again
      </button>
    </div>
  );

  const renderLoadingState = () => (
    <div className="export-panel__loading">
      <p>Loading export settings...</p>
    </div>
  );

  // Loading state
  if (exportState.status === 'loading') {
    return (
      <div className="export-panel">
        <h3 className="export-panel__title">Export Your Application</h3>
        {renderLoadingState()}
      </div>
    );
  }

  // If we have a full success (both files exported), show the success state
  if (
    exportState.status === 'success' &&
    exportState.exportedFiles.resume &&
    exportState.exportedFiles.coverLetter
  ) {
    return (
      <div className="export-panel">
        <h3 className="export-panel__title">Export Your Application</h3>
        {renderSuccessState()}
        {renderOverwriteConfirmation()}
      </div>
    );
  }

  return (
    <div className="export-panel">
      <h3 className="export-panel__title">Export Your Application</h3>
      <p className="export-panel__description">
        Your tailored resume and cover letter for{' '}
        <strong>{companyName || 'this position'}</strong>
        {jobTitle && (
          <>
            {' '}
            ({jobTitle})
          </>
        )}{' '}
        are ready for export.
      </p>

      {renderFolderSelection()}
      {renderPDFPreview()}
      {exportState.error && renderErrorState()}
      {renderExportActions()}

      <div className="export-panel__footer">
        <button
          type="button"
          className="export-panel__btn export-panel__btn--secondary"
          onClick={onStartOver}
        >
          Start New Application
        </button>
      </div>

      {renderOverwriteConfirmation()}
    </div>
  );
}

export default ExportPanel;

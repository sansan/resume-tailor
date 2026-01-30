import React, { useCallback } from 'react';
import type { ValidationError } from '../../hooks/useResume';

interface ResumeEditorProps {
  jsonText: string;
  onJsonTextChange: (text: string) => void;
  onValidate: () => boolean;
  onLoadFromFile: () => Promise<void>;
  onSaveToFile: (saveAs?: boolean) => Promise<void>;
  validationErrors: ValidationError[];
  isValid: boolean;
  filePath: string | null;
  isDirty: boolean;
}

function ResumeEditor({
  jsonText,
  onJsonTextChange,
  onValidate,
  onLoadFromFile,
  onSaveToFile,
  validationErrors,
  isValid,
  filePath,
  isDirty,
}: ResumeEditorProps): React.JSX.Element {
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onJsonTextChange(e.target.value);
    },
    [onJsonTextChange]
  );

  const handleValidate = useCallback(() => {
    onValidate();
  }, [onValidate]);

  const handleLoad = useCallback(async () => {
    try {
      await onLoadFromFile();
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  }, [onLoadFromFile]);

  const handleSave = useCallback(async () => {
    try {
      await onSaveToFile(false);
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }, [onSaveToFile]);

  const handleSaveAs = useCallback(async () => {
    try {
      await onSaveToFile(true);
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }, [onSaveToFile]);

  return (
    <div className="resume-editor">
      <div className="resume-editor__header">
        <div className="resume-editor__file-info">
          {filePath ? (
            <span className="resume-editor__file-path" title={filePath}>
              {filePath.split('/').pop()}
              {isDirty && <span className="resume-editor__dirty-indicator">*</span>}
            </span>
          ) : (
            <span className="resume-editor__file-path resume-editor__file-path--unsaved">
              Unsaved Resume
              {isDirty && <span className="resume-editor__dirty-indicator">*</span>}
            </span>
          )}
        </div>
        <div className="resume-editor__actions">
          <button
            type="button"
            className="resume-editor__btn resume-editor__btn--secondary"
            onClick={handleLoad}
          >
            Load from File
          </button>
          <button
            type="button"
            className="resume-editor__btn resume-editor__btn--secondary"
            onClick={handleSave}
            disabled={!jsonText.trim()}
          >
            Save
          </button>
          <button
            type="button"
            className="resume-editor__btn resume-editor__btn--secondary"
            onClick={handleSaveAs}
            disabled={!jsonText.trim()}
          >
            Save As...
          </button>
          <button
            type="button"
            className="resume-editor__btn resume-editor__btn--primary"
            onClick={handleValidate}
            disabled={!jsonText.trim()}
          >
            Validate
          </button>
        </div>
      </div>

      <div className="resume-editor__content">
        <textarea
          className="resume-editor__textarea"
          value={jsonText}
          onChange={handleTextChange}
          placeholder='Paste your resume JSON here or click "Load from File" to open a file...'
          spellCheck={false}
        />
      </div>

      {validationErrors.length > 0 && (
        <div className="resume-editor__errors">
          <h4 className="resume-editor__errors-title">Validation Errors</h4>
          <ul className="resume-editor__errors-list">
            {validationErrors.map((error, index) => (
              <li key={index} className="resume-editor__error-item">
                {error.path && <span className="resume-editor__error-path">{error.path}: </span>}
                <span className="resume-editor__error-message">{error.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isValid && (
        <div className="resume-editor__success">
          Resume JSON is valid!
        </div>
      )}
    </div>
  );
}

export default ResumeEditor;

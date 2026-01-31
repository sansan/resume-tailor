import { contextBridge, ipcRenderer } from 'electron';

// Import shared types from the single source of truth
import type {
  ElectronAPI,
  AIProgressUpdate,
  ExportApplicationPDFsParams,
  ExportSinglePDFParams,
  ExportApplicationPDFsIPCParams,
  ExportSinglePDFIPCParams,
} from '../types/electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // File operations
  loadResume: () => ipcRenderer.invoke('load-resume'),
  saveResume: (data) => ipcRenderer.invoke('save-resume', data),
  generatePDF: (pdfData) => ipcRenderer.invoke('generate-pdf', Buffer.from(pdfData)),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Export Operations
  checkExportFiles: (params) => ipcRenderer.invoke('check-export-files', params),
  exportApplicationPDFs: async (params: ExportApplicationPDFsParams) => {
    // Convert Blobs to Uint8Array since Blobs don't serialize through IPC
    const resumeArrayBuffer = await params.resumeBlob.arrayBuffer();
    const coverLetterArrayBuffer = await params.coverLetterBlob.arrayBuffer();
    const ipcParams: ExportApplicationPDFsIPCParams = {
      baseFolderPath: params.baseFolderPath,
      subfolderName: params.subfolderName,
      resumeData: new Uint8Array(resumeArrayBuffer),
      coverLetterData: new Uint8Array(coverLetterArrayBuffer),
      resumeFileName: params.resumeFileName,
      coverLetterFileName: params.coverLetterFileName,
    };
    return ipcRenderer.invoke('export-application-pdfs', ipcParams);
  },
  exportSinglePDF: async (params: ExportSinglePDFParams) => {
    // Convert Blob to Uint8Array since Blobs don't serialize through IPC
    const arrayBuffer = await params.pdfBlob.arrayBuffer();
    const ipcParams: ExportSinglePDFIPCParams = {
      baseFolderPath: params.baseFolderPath,
      subfolderName: params.subfolderName,
      pdfData: new Uint8Array(arrayBuffer),
      fileName: params.fileName,
    };
    return ipcRenderer.invoke('export-single-pdf', ipcParams);
  },

  // AI Operations
  refineResume: (params) => ipcRenderer.invoke('ai:refine-resume', params),
  generateCoverLetter: (params) => ipcRenderer.invoke('ai:generate-cover-letter', params),
  cancelAIOperation: (operationId) => ipcRenderer.invoke('ai:cancel-operation', operationId),
  checkAIAvailability: () => ipcRenderer.invoke('ai:check-availability'),

  // AI Progress events
  onAIProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, update: AIProgressUpdate) => {
      callback(update);
    };
    ipcRenderer.on('ai:progress', handler);
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('ai:progress', handler);
    };
  },

  // Settings Operations
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  selectOutputFolder: () => ipcRenderer.invoke('settings:select-folder'),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  validateSettings: (settings) => ipcRenderer.invoke('settings:validate', settings),
  getDefaultOutputFolder: () => ipcRenderer.invoke('settings:get-default-folder'),

  // History Operations
  getExportHistory: () => ipcRenderer.invoke('history:get'),
  getRecentExports: (limit) => ipcRenderer.invoke('history:get-recent', limit),
  addToHistory: (entry) => ipcRenderer.invoke('history:add', entry),
  deleteHistoryEntry: (entryId) => ipcRenderer.invoke('history:delete', entryId),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  openHistoryFile: (filePath) => ipcRenderer.invoke('history:open-file', filePath),

  // Profile Operations
  hasProfile: () => ipcRenderer.invoke('profile:has'),
  loadProfile: () => ipcRenderer.invoke('profile:load'),
  importResumeFromFile: (filePath) => ipcRenderer.invoke('profile:import-file', filePath),
  importResumeFromText: (text, fileName) => ipcRenderer.invoke('profile:import-text', text, fileName),
  saveProfile: (resume) => ipcRenderer.invoke('profile:save', resume),
  clearProfile: () => ipcRenderer.invoke('profile:clear'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

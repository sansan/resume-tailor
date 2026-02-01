import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.electronAPI for renderer tests
const mockElectronAPI = {
  loadResume: vi.fn(),
  saveResume: vi.fn(),
  loadProfile: vi.fn(),
  saveProfile: vi.fn(),
  generatePDF: vi.fn(),
  openFolder: vi.fn(),
  selectFolder: vi.fn(),
  refineResume: vi.fn(),
  generateCoverLetter: vi.fn(),
  checkAIAvailability: vi.fn(),
  cancelAIOperation: vi.fn(),
  onAIProgress: vi.fn(),
  removeAIProgressListener: vi.fn(),
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  hasAPIKey: vi.fn(),
  saveAPIKey: vi.fn(),
  deleteAPIKey: vi.fn(),
  detectInstalledCLIs: vi.fn(),
  getAllApplications: vi.fn(),
  getApplication: vi.fn(),
  addApplication: vi.fn(),
  updateApplication: vi.fn(),
  updateApplicationStatus: vi.fn(),
  deleteApplication: vi.fn(),
  getApplicationStatistics: vi.fn(),
  getExportHistory: vi.fn(),
  addExportRecord: vi.fn(),
  extractJobPosting: vi.fn(),
  shortenCoverLetter: vi.fn(),
}

vi.stubGlobal('electronAPI', mockElectronAPI)

// Also stub on window object
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

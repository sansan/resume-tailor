# Resume Creator

A desktop application for creating professional resumes and cover letters, built with Electron + React + TypeScript.

## Project Structure

```
resume-creator/
├── electron/           # Electron main process
│   ├── main.ts         # Main entry point
│   └── preload.ts      # Preload script with contextBridge
├── src/
│   ├── main/           # Electron main process helpers
│   ├── renderer/       # React app
│   │   ├── components/ # React components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── schemas/    # Renderer-specific schemas
│   │   ├── services/   # Services (PDF generation, etc.)
│   │   ├── styles/     # CSS files
│   │   └── types/      # TypeScript types
│   └── shared/         # Shared types and utilities
├── dist/               # Vite build output
├── dist-electron/      # Electron TypeScript output
└── release/            # Electron-builder output
```

## Development Commands

- `npm run dev` - Run development mode (Vite + Electron concurrently)
- `npm run dev:vite` - Run Vite dev server only
- `npm run dev:electron` - Compile and run Electron only
- `npm run build` - Build for production
- `npm run build:electron` - Build distributable
- `npm run typecheck` - Run TypeScript type checking
- `npm run test:integration` - Run integration tests (non-live, tests validation/sanitization)
- `npm run test:integration:live` - Run full integration tests including live AI calls (requires Claude CLI)

## Tech Stack

- **Electron** - Desktop application framework
- **React 18** - UI framework
- **TypeScript** - Type safety with strict mode
- **Vite** - Fast React builds
- **Zod** - Schema validation
- **@react-pdf/renderer** - PDF generation
- **electron-builder** - App packaging

## TypeScript Configuration

- `tsconfig.json` - React renderer (bundler mode, strict)
- `tsconfig.electron.json` - Electron main process (CommonJS, strict)
- `tsconfig.node.json` - Vite config

## IPC API (via window.electronAPI)

### File Operations
- `loadResume()` - Open file dialog to load JSON resume
- `saveResume({ content, filePath? })` - Save resume to file
- `generatePDF(pdfData)` - Save PDF to file
- `openFolder(folderPath)` - Open folder in file explorer
- `selectFolder()` - Open folder selection dialog

### AI Operations (requires Claude CLI installed)
- `refineResume(params)` - Refine resume for a job posting using AI
- `generateCoverLetter(params)` - Generate cover letter using AI
- `checkAIAvailability()` - Check if Claude CLI is available
- `cancelAIOperation(operationId)` - Cancel an in-progress AI operation
- `onAIProgress(callback)` - Listen for AI operation progress updates

## Claude Code Integration

The app uses Claude Code CLI as the AI backend for resume refinement and cover letter generation.

### Architecture
- `src/main/services/claude-code.service.ts` - Low-level Claude CLI interaction
- `src/main/services/ai-processor.service.ts` - High-level orchestration (prompt building, validation, sanitization)
- `src/shared/schemas/ai-output.schema.ts` - Zod schemas for AI response validation
- `src/shared/prompts/` - Prompt templates for resume and cover letter generation
- `src/shared/utils/sanitize.ts` - AI output sanitization utilities

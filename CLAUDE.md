# Resume Tailor

A desktop application for creating professional resumes and cover letters, built with Electron + React + TypeScript.

## Project Structure

```
resume-creator/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.ts        # Main entry point
│   │   ├── preload.ts     # Preload script with contextBridge
│   │   ├── ipc-handlers.ts
│   │   └── services/      # Main-process services (Node.js APIs)
│   │       ├── providers/ # AI provider implementations
│   │       │   ├── claude.provider.ts
│   │       │   ├── codex.provider.ts
│   │       │   ├── gemini.provider.ts
│   │       │   └── index.ts
│   │       ├── ai-processor.service.ts
│   │       ├── settings.service.ts
│   │       └── history.service.ts
│   ├── renderer/          # React app (browser context)
│   │   ├── App.tsx        # Main React component
│   │   ├── main.tsx       # React entry point
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/pdf/  # PDF generation
│   │   ├── lib/           # Utilities (cn, etc.)
│   │   └── styles/        # CSS files
│   ├── schemas/           # Shared Zod schemas
│   ├── types/             # Shared TypeScript types
│   ├── shared/            # Shared utilities
│   ├── config/            # Configuration constants
│   └── prompts/           # AI prompt templates
├── dist/                  # Vite build output
├── dist-electron/         # Electron TypeScript output
└── release/               # Electron-builder output
```

## Path Aliases

- `@/*` - `src/renderer/*` (for renderer files)
- `@schemas/*` - `src/schemas/*`
- `@app-types/*` - `src/types/*`
- `@shared/*` - `src/shared/*`
- `@config/*` - `src/config/*`
- `@prompts/*` - `src/prompts/*`

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

### AI Operations (requires AI CLI installed)
- `refineResume(params)` - Refine resume for a job posting using AI
- `generateCoverLetter(params)` - Generate cover letter using AI
- `checkAIAvailability()` - Check if AI CLI is available
- `cancelAIOperation(operationId)` - Cancel an in-progress AI operation
- `onAIProgress(callback)` - Listen for AI operation progress updates

## AI Provider Architecture

The app supports multiple AI backends through a provider abstraction:

### Supported Providers
- **Claude** (`claude`) - Claude Code CLI
- **Codex** (`codex`) - OpenAI Codex CLI
- **Gemini** (`gemini`) - Google Gemini CLI

### Architecture
```
src/main/services/providers/
├── ai-provider.interface.ts  # IAIProvider interface
├── claude.provider.ts        # spawn('claude', ['--print', ...])
├── codex.provider.ts         # spawn('codex', [...])
├── gemini.provider.ts        # spawn('gemini', ['-p', ...])
└── index.ts                  # ProviderRegistry
```

### Usage
```typescript
import { aiProcessorService } from './ai-processor.service';
import { providerRegistry, checkProviders } from './providers';

// Check available providers
const statuses = await checkProviders();

// Switch provider
aiProcessorService.setProvider('gemini');

// Configure provider
providerRegistry.updateProviderConfig('claude', { timeout: 180000 });
```

### Key Files
- `src/main/services/providers/` - AI provider implementations
- `src/main/services/ai-processor.service.ts` - High-level orchestration
- `src/types/ai-provider.types.ts` - Shared provider types
- `src/schemas/ai-output.schema.ts` - Zod schemas for AI response validation
- `src/prompts/` - Prompt templates
- `src/shared/sanitize.ts` - AI output sanitization

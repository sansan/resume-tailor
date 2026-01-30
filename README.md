# Resume Creator

A desktop application for creating professional resumes and cover letters.

## Features

- Create and edit resumes from JSON data
- Validate resume data against schemas
- Generate professional PDF exports
- Job application management (coming soon)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This will start both the Vite dev server and Electron application.

### Building

```bash
npm run build
npm run build:electron
```

## Tech Stack

- Electron
- React 18
- TypeScript
- Vite
- Zod (schema validation)
- @react-pdf/renderer (PDF generation)

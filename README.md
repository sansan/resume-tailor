# Resume Tailor

A desktop application for creating professional resumes and cover letters.

> ⚠️ **Important: Unsigned Binaries**
>
> The published release files are **not code-signed**. Your operating system may
> block or warn about the application. You have two options:
>
> ### Option 1: Build Locally (Recommended)
>
> ```bash
> git clone https://github.com/sansan/resume-tailor.git
> cd resume-tailor
> npm install
> npm run build:electron
> ```
>
> The built application will be in the `release/` folder.
>
> ### Option 2: Remove from Quarantine After Download
>
> <details>
> <summary><strong>macOS</strong></summary>
>
> ```bash
> # For .dmg or .app files:
> xattr -cr /path/to/Resume\ Tailor.app
> # Or right-click the app → Open → click "Open" in the dialog
> ```
>
> </details>
>
> <details>
> <summary><strong>Windows</strong></summary>
>
> 1. Right-click the downloaded `.exe` file
> 2. Select **Properties**
> 3. Check **Unblock** at the bottom of the General tab
> 4. Click **Apply** → **OK**
>
> Or when SmartScreen appears: click **More info** → **Run anyway**
>
> </details>
>
> <details>
> <summary><strong>Linux</strong></summary>
>
> ```bash
> # For AppImage:
> chmod +x Resume-Tailor-*.AppImage
> ./Resume-Tailor-*.AppImage
>
> # For .deb:
> sudo dpkg -i Resume-Tailor-*.deb
> ```
>
> </details>

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

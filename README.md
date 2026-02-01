# Resume Tailor

A **free, open-source desktop application** that uses artificial intelligence to
optimize your resume for specific job postings. Simply paste a job description,
and watch as AI transforms your existing resume into a perfectly tailored
application.

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

### AI-Powered Resume Optimization

Automatically highlights relevant skills and experience, matches keywords from
job descriptions, and restructures content for maximum ATS compatibility.

### Cover Letter Generation

Generate personalized cover letters in seconds. AI analyzes the job posting to
craft compelling narratives. Edit and refine with built-in editor.

### Professional PDF Export

Multiple modern templates to choose from, customizable color schemes, and clean,
recruiter-friendly formatting.

### Job Application Tracking

Keep track of all your applications in one place with status updates, notes, and
history.

## Why Tailoring Your Resume Matters

Studies show that tailored resumes are **3x more likely** to get past Applicant
Tracking Systems (ATS). Generic resumes often get filtered out before a human
ever sees them.

Resume Tailor helps you:

- **Beat the ATS** by matching job-specific keywords
- **Save hours** of manual editing per application
- **Increase interview callbacks** with targeted content

## Supported AI Providers

Resume Tailor works with popular AI coding assistants:

- [Claude CLI](https://docs.anthropic.com/en/docs/claude-code)
- [OpenAI Codex CLI](https://github.com/openai/codex)
- [Google Gemini CLI](https://github.com/google-gemini/gemini-cli)

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
- SQLite (better-sqlite3)
- Zod (schema validation)
- @react-pdf/renderer (PDF generation)

## Roadmap

Planned improvements and features:

### Job Posting Parser

- Improve URL/link extraction from job postings
- Better handling of various job board formats (LinkedIn, Indeed, Greenhouse,
  etc.)
- Auto-detect company name, location, and salary from job descriptions

### PDF Templates

- Additional resume template layouts (modern, creative, academic, etc.)
- Cover letter templates
- Fine-tune existing template spacing and typography
- Custom template builder

### Testing & Quality

- ~~Basic Vitest setup~~ (Done)
- Expand unit test coverage (schemas, services, components)
- End-to-end testing with Playwright
- AI response validation and error handling improvements

### User Experience

- Resume import from LinkedIn profile
- Batch application processing
- Application analytics and insights
- Dark/light theme improvements

### Integrations

- Direct job board integrations
- Calendar integration for interview scheduling
- Email tracking for application follow-ups

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)

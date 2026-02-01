# Contributing to Resume Tailor

Thank you for your interest in contributing to Resume Tailor! This document
provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 20 or later
- npm 10 or later
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/resume-tailor.git
   cd resume-tailor
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development:
   ```bash
   npm run dev
   ```

## Code Style

This project uses:

- **ESLint** for linting TypeScript/JavaScript
- **Prettier** for code formatting
- **Husky** for git hooks
- **Commitlint** for commit message validation

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/). Each
commit message should be structured as:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI configuration
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

#### Examples

```
feat(pdf): add new modern resume template
fix(ai): handle timeout errors in Claude provider
docs: update installation instructions
refactor(ipc): simplify handler registration
```

## Pull Request Process

1. Create a feature branch from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes and commit using conventional commits

3. Ensure all checks pass:

   ```bash
   npm run lint
   npm run format:check
   npm run typecheck
   npm run build
   ```

4. Push to your fork and create a Pull Request

5. Wait for review and address any feedback

## Project Structure

```
src/
├── main/              # Electron main process
│   ├── services/      # Business logic services
│   └── providers/     # AI provider implementations
├── renderer/          # React application
│   ├── components/    # UI components
│   └── hooks/         # Custom React hooks
├── schemas/           # Zod validation schemas
├── types/             # TypeScript type definitions
├── shared/            # Cross-process utilities
└── prompts/           # AI prompt templates
```

## Testing

Run integration tests:

```bash
npm run test:integration
```

Run tests with live AI calls (requires Claude CLI):

```bash
npm run test:integration:live
```

## Building

Build for development:

```bash
npm run build
```

Build distributable:

```bash
npm run build:electron
```

## Releasing

Releases are automated via GitHub Actions when a version tag is pushed:

```bash
# Update version
npm version patch  # or minor, major

# Push with tags
git push --follow-tags
```

## Questions?

Feel free to open an issue for any questions or concerns.

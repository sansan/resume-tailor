# Onboarding Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create an onboarding experience that detects AI providers, imports user's resume, and lets them choose template/theme preferences.

**Architecture:** Three-step wizard flow shown on first app launch. Reusable template/palette components shared with profile page. API keys stored in Electron safeStorage.

**Tech Stack:** React, TypeScript, Electron safeStorage, react-pdf for preview, shadcn/ui components

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| API Key Providers | All three: Claude API, OpenAI API, Google AI API |
| CLI Detection | Auto-detect and pre-select installed CLIs |
| Processing Animation | Step-by-step progress with distinct phases |
| Template Selection | Horizontal scroll carousel with snap |
| Theme Selection | Predefined color palettes (6 options) |

---

## Screen 1: AI Provider Selection

**Header:** "Let's set up your AI assistant"
**Subtitle:** "We'll use AI to help tailor your resume and generate cover letters"

**Layout:**
1. **Detected CLIs section** (if any found):
   - Green checkmark + "Claude CLI detected — Ready to use"
   - Auto-detected, no user action needed

2. **API Key Cards** (expandable):
   - Claude API: "Add API key for Anthropic's Claude"
   - OpenAI API: "Add API key for GPT models"
   - Google AI API: "Add API key for Gemini models"
   - Each has input field + Save button
   - Keys stored in Electron safeStorage (encrypted)

3. **Continue button** - enabled if at least one CLI detected OR one API key saved

---

## Screen 2: Resume Upload & Processing

**Initial State:**
- Header: "Upload your resume"
- Subtitle: "We'll extract your information automatically"
- Drop zone (reuse existing `ResumeImportDropzone` patterns)
- Supported formats: PDF, Word (.docx), plain text

**Processing State (step-by-step progress):**

| Phase | Icon | Text | Rotating Subtitles |
|-------|------|------|-------------------|
| 1 | 📄 | Reading document | "Opening your resume..." |
| 2 | 🔍 | Extracting information | "Finding your skills...", "Spotting achievements..." |
| 3 | 🧠 | Organizing sections | "Sorting experience...", "Grouping skills..." |
| 4 | ✨ | Finalizing profile | "Almost there...", "Polishing up..." |

**Visual indicators:**
- ✓ Checkmark for completed steps
- ● Pulsing dot for current step
- ○ Empty circle for pending steps

**Success:** Brief "✓ Profile created!" then auto-advance after 1 second

---

## Screen 3: Template & Theme Selection

**Layout (top to bottom):**

1. **Template Carousel:**
   - Horizontal scrolling with snap-to-center
   - Selected template slightly larger/highlighted
   - Arrow buttons for navigation
   - 3-5 templates visible at once

2. **Color Palette Selector:**
   - Horizontal row of palette cards
   - Each shows 3 color swatches + name
   - Radio-style selection (one active)

3. **Live PDF Preview:**
   - Bottom 50-60% of screen
   - Uses @react-pdf/renderer
   - Updates in real-time on template/palette change
   - Shows user's actual resume data

**Predefined Palettes:**

| Name | Primary | Secondary | Accent |
|------|---------|-----------|--------|
| Professional Blue | #1e40af | #3b82f6 | #60a5fa |
| Modern Teal | #0d9488 | #14b8a6 | #2dd4bf |
| Bold Red | #b91c1c | #ef4444 | #f87171 |
| Classic Gray | #374151 | #6b7280 | #9ca3af |
| Forest Green | #166534 | #22c55e | #4ade80 |
| Royal Purple | #7c3aed | #a78bfa | #c4b5fd |

**"Complete Setup" button** → Saves preferences, navigates to Dashboard

---

## Component Structure

```
src/renderer/
├── components/
│   ├── onboarding/
│   │   ├── OnboardingFlow.tsx        # Main wrapper, step router
│   │   ├── ProviderSetupScreen.tsx   # Step 1
│   │   ├── ResumeUploadScreen.tsx    # Step 2
│   │   ├── TemplateSelectScreen.tsx  # Step 3
│   │   ├── ProcessingProgress.tsx    # Animated step indicator
│   │   └── index.ts
│   │
│   ├── templates/                    # REUSABLE
│   │   ├── TemplateCarousel.tsx
│   │   ├── PaletteSelector.tsx
│   │   ├── template-card.tsx         # (existing)
│   │   └── index.ts
│   │
│   └── Resume/
│       ├── ResumePDFPreview.tsx      # REUSABLE live preview
│       └── ...existing
│
├── hooks/
│   ├── useOnboarding.ts
│   ├── useTemplates.ts
│   └── ...existing
```

---

## Data Persistence

| Data | Storage | Location |
|------|---------|----------|
| API Keys | Electron safeStorage | Encrypted in OS keychain |
| Provider preference | settings.json | App data folder |
| Template/palette preference | settings.json | App data folder |
| Resume data | profile.json | App data folder (existing) |
| Onboarding complete flag | settings.json | App data folder |

---

## New IPC Methods

```typescript
// In electron.d.ts - add to ElectronAPI interface

// Provider detection
detectInstalledCLIs: () => Promise<string[]>;

// API key management (safeStorage)
saveAPIKey: (provider: string, key: string) => Promise<void>;
hasAPIKey: (provider: string) => Promise<boolean>;
deleteAPIKey: (provider: string) => Promise<void>;

// Onboarding status
isOnboardingComplete: () => Promise<boolean>;
completeOnboarding: () => Promise<void>;
```

---

## App.tsx Integration

```typescript
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      const hasProfile = await window.electronAPI.hasProfile();
      const isComplete = await window.electronAPI.isOnboardingComplete();
      setShowOnboarding(!hasProfile || !isComplete);
      setIsLoading(false);
    }
    checkOnboarding();
  }, []);

  if (isLoading) return <SplashScreen />;
  if (showOnboarding) return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  return <AppShell>...</AppShell>;
}
```

---

## Implementation Tasks

### Task 1: Backend - CLI Detection & API Key Storage

**Files:**
- Create: `src/main/services/api-key.service.ts`
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/types/electron.d.ts`
- Modify: `src/main/preload.ts`

**Steps:**
1. Create `ApiKeyService` using Electron safeStorage for encryption
2. Add CLI detection function (check for claude, codex, gemini in PATH)
3. Add IPC handlers for `detectInstalledCLIs`, `saveAPIKey`, `hasAPIKey`, `deleteAPIKey`
4. Add `isOnboardingComplete` and `completeOnboarding` handlers (uses settings.json)
5. Update preload.ts with new methods
6. Update electron.d.ts types

### Task 2: Hooks - useOnboarding & useTemplates

**Files:**
- Create: `src/renderer/hooks/useOnboarding.ts`
- Create: `src/renderer/hooks/useTemplates.ts`

**Steps:**
1. Create `useOnboarding` hook with step state, CLI detection, processing phases
2. Create `useTemplates` hook with template/palette selection and persistence

### Task 3: Reusable Components - Template Carousel & Palette Selector

**Files:**
- Create: `src/renderer/components/templates/TemplateCarousel.tsx`
- Create: `src/renderer/components/templates/PaletteSelector.tsx`
- Modify: `src/renderer/components/templates/index.ts`

**Steps:**
1. Create `TemplateCarousel` with horizontal scroll, snap behavior, arrow navigation
2. Create `PaletteSelector` with predefined palettes, radio selection
3. Export from index.ts

### Task 4: Reusable Component - Resume PDF Preview

**Files:**
- Create: `src/renderer/components/Resume/ResumePDFPreview.tsx`
- Modify: `src/renderer/components/Resume/index.ts`

**Steps:**
1. Create `ResumePDFPreview` using @react-pdf/renderer
2. Accept resume data, template, and palette as props
3. Render live PDF preview

### Task 5: Onboarding Screen 1 - Provider Setup

**Files:**
- Create: `src/renderer/components/onboarding/ProviderSetupScreen.tsx`

**Steps:**
1. Create screen with detected CLIs section
2. Add expandable API key cards for each provider
3. Implement save/validation for API keys
4. Continue button logic

### Task 6: Onboarding Screen 2 - Resume Upload

**Files:**
- Create: `src/renderer/components/onboarding/ResumeUploadScreen.tsx`
- Create: `src/renderer/components/onboarding/ProcessingProgress.tsx`

**Steps:**
1. Create upload screen with drop zone
2. Create `ProcessingProgress` component with step-by-step animation
3. Integrate with existing resume import logic
4. Auto-advance on completion

### Task 7: Onboarding Screen 3 - Template Selection

**Files:**
- Create: `src/renderer/components/onboarding/TemplateSelectScreen.tsx`

**Steps:**
1. Create screen layout with carousel, palette selector, preview
2. Wire up live preview updates
3. Complete Setup button saves preferences and completes onboarding

### Task 8: Onboarding Flow & App Integration

**Files:**
- Create: `src/renderer/components/onboarding/OnboardingFlow.tsx`
- Create: `src/renderer/components/onboarding/index.ts`
- Modify: `src/renderer/App.tsx`

**Steps:**
1. Create `OnboardingFlow` wrapper with step navigation
2. Integrate all three screens
3. Modify App.tsx to check onboarding status and show flow when needed

### Task 9: Testing & Polish

**Steps:**
1. Test full onboarding flow end-to-end
2. Test skipping steps (e.g., no API key, just CLI)
3. Verify preferences persist correctly
4. Test reusable components work on profile page
5. Add any missing error handling

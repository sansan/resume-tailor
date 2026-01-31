# Resume Tailor - shadcn Redesign

## Overview

Redesign the Resume Tailor app using shadcn/ui components for a consistent, modern interface. The app helps users create tailored resumes and cover letters using local AI (Claude CLI).

## Design Decisions

| Decision | Choice |
|----------|--------|
| App name | Resume Tailor |
| Navigation | Sidebar for main app, top bar only for onboarding |
| User flow | Quick start - no elaborate onboarding wizard |
| Theme | Dark + Light with system preference detection |
| AI status | Prominent - badge in header, status panel, logs |
| Resume editing | Structured forms primary, JSON toggle for power users |
| Job input | URL fetch primary, paste description as fallback |
| Templates | Visual gallery with preview thumbnails |

## App Shell

```
┌─────────────────────────────────────────────────────────┐
│ [Logo] Resume Tailor    [LOCAL AI ACTIVE]  [Theme] [?]  │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│ Dashboard  │                                            │
│ Profile    │           Main Content Area                │
│ Templates  │                                            │
│ Job Target │                                            │
│ Preview    │                                            │
│ History    │                                            │
│            │                                            │
├────────────┤                                            │
│ Settings   │                                            │
├────────────┼────────────────────────────────────────────┤
│ AI: Idle   │  Status footer                             │
└────────────┴────────────────────────────────────────────┘
```

## Pages

### 1. Dashboard

Landing page showing project status at a glance.

**Components:**
- Status cards (Profile, Template, Tailoring readiness)
- Quick action buttons
- Recent activity list

**Empty state:** Welcome message with "Import Resume" / "Start from Scratch" buttons.

### 2. Profile Editor

Structured form editor for resume data with section navigation.

**Sections:**
- Summary (textarea with character count)
- Experience (draggable entries with bullet points)
- Education (draggable entries)
- Skills (tag-style input)
- Projects (optional)

**Features:**
- Standard/JSON view toggle
- Drag-to-reorder entries
- "AI EXTRACTED" badges on auto-filled fields
- Section navigation in sidebar

### 3. Templates Gallery

Visual grid of CV and cover letter templates.

**Features:**
- Search/filter
- All Templates / Favorites tabs
- Template cards with thumbnail preview
- Selection state with checkmark
- "ATS OPTIMIZED" badges

### 4. Job Targeting

Input job details and configure AI tailoring.

**Layout:** Two-column - input on left, analysis on right.

**Left column:**
- URL input with Fetch button
- Fallback textarea for manual paste
- Fine-tune controls (seniority slider, tone toggle)

**Right column:**
- Requirements checklist with match status
- Keyword coverage progress bars
- Skill badges

**Error state:** Alert with "Paste manually" CTA, expandable error logs.

### 5. Preview & Export

PDF preview with template settings.

**Layout:** Preview on left, settings panel on right.

**Settings panel:**
- Template/layout selector
- Typography controls (font size, line height sliders)
- Content visibility checkboxes
- Export PDF button
- Version history list

### 6. History

List of exported documents.

**Features:**
- File name, date, template, match score
- Open file / Open folder actions
- Clear all button

### 7. Settings

App configuration organized into sections.

**Sections:**
- General: CLI path configuration
- AI Tools: Model preferences, status
- Storage: Output folder, file naming
- Privacy: Data handling options

## shadcn Components Required

### Core Layout
- `Sidebar` (SidebarProvider, SidebarMenu, SidebarMenuItem, SidebarFooter)
- `Separator`
- `ScrollArea`

### Navigation & Actions
- `Button` (default, outline, ghost, destructive variants)
- `Tabs` (TabsList, TabsTrigger, TabsContent)
- `DropdownMenu`
- `Tooltip`

### Forms
- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `RadioGroup`
- `Slider`
- `Switch`
- `Label`
- `ToggleGroup`

### Display
- `Card` (CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- `Badge`
- `Progress`
- `Alert`
- `AspectRatio`
- `Avatar`

### Overlay
- `Dialog`
- `Sheet`
- `Collapsible`
- `Accordion`

### Feedback
- `Sonner` (toast)
- `Skeleton`

**Total: ~25 components**

## Technical Notes

### Preserved from Current App
- `@react-pdf/renderer` for PDF generation
- Electron IPC architecture
- Claude CLI integration
- Zod validation schemas

### File Structure Changes
```
src/
├── components/
│   └── ui/              # shadcn components (expand from current)
├── renderer/
│   ├── components/
│   │   ├── layout/      # Shell, Sidebar, Header
│   │   ├── dashboard/   # Dashboard page components
│   │   ├── profile/     # Profile editor components
│   │   ├── templates/   # Template gallery components
│   │   ├── targeting/   # Job targeting components
│   │   ├── preview/     # Preview & export components
│   │   ├── history/     # History components
│   │   └── settings/    # Settings components
│   ├── pages/           # Page-level components
│   └── hooks/           # Custom hooks
```

### Theme Implementation
- Use shadcn's built-in dark mode support
- CSS variables in `globals.css`
- `next-themes` or manual toggle with localStorage

### AI Status System
- Global context for AI status
- Status types: `idle`, `processing`, `error`, `unavailable`
- Background health check on app launch
- Status panel (Sheet) with detailed logs

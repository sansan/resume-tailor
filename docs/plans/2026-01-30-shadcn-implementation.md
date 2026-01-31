# Resume Tailor shadcn Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the Resume Creator UI using shadcn components with a sidebar-based navigation structure.

**Architecture:** Replace the current tab-based Header with a persistent Sidebar. Create 7 pages (Dashboard, Profile, Templates, Job Targeting, Preview, History, Settings) as separate components. Keep existing hooks and services intact - only replace the UI layer.

**Tech Stack:** React 18, TypeScript, shadcn/ui (new-york style), Tailwind CSS v4, Lucide icons, existing Zod schemas

---

## Phase 1: Foundation

### Task 1.1: Install Required shadcn Components

**Files:**
- Modify: `package.json` (auto-updated by shadcn CLI)
- Create: Multiple files in `src/components/ui/`

**Step 1: Install all shadcn components via CLI**

Run:
```bash
cd /Users/lovesan/Workspace/private/resume-creator
npx shadcn@latest add sidebar button card badge tabs input textarea select checkbox slider switch label separator scroll-area tooltip dropdown-menu dialog sheet progress alert avatar sonner skeleton toggle-group collapsible radio-group aspect-ratio
```

Expected: Components installed to `src/components/ui/`

**Step 2: Verify installation**

Run: `ls src/components/ui/ | wc -l`
Expected: 20+ files

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: install shadcn components for redesign"
```

---

### Task 1.2: Create Theme Provider

**Files:**
- Create: `src/renderer/components/theme-provider.tsx`
- Modify: `src/renderer/main.tsx`

**Step 1: Create theme provider component**

Create `src/renderer/components/theme-provider.tsx`:
```tsx
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'resume-tailor-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
```

**Step 2: Update main.tsx to wrap app with ThemeProvider**

Modify `src/renderer/main.tsx` - add ThemeProvider import and wrap App:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './components/theme-provider'
import '../styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="resume-tailor-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
```

**Step 3: Verify app still loads**

Run: `npm run dev`
Expected: App loads without errors

**Step 4: Commit**

```bash
git add src/renderer/components/theme-provider.tsx src/renderer/main.tsx
git commit -m "feat: add theme provider with dark/light/system support"
```

---

### Task 1.3: Create AI Status Context

**Files:**
- Create: `src/renderer/components/ai-status-provider.tsx`

**Step 1: Create AI status context**

Create `src/renderer/components/ai-status-provider.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type AIStatus = 'idle' | 'processing' | 'error' | 'unavailable'

type AIStatusState = {
  status: AIStatus
  isAvailable: boolean
  version: string | null
  error: string | null
  logs: string[]
  checkAvailability: () => Promise<void>
  addLog: (message: string) => void
  clearLogs: () => void
  setStatus: (status: AIStatus) => void
  setError: (error: string | null) => void
}

const AIStatusContext = createContext<AIStatusState | undefined>(undefined)

export function AIStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AIStatus>('idle')
  const [isAvailable, setIsAvailable] = useState(false)
  const [version, setVersion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-99), `[${timestamp}] ${message}`])
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const checkAvailability = useCallback(async () => {
    try {
      addLog('Checking AI availability...')
      const result = await window.electronAPI.checkAIAvailability()
      setIsAvailable(result.available)
      setVersion(result.version || null)
      setStatus(result.available ? 'idle' : 'unavailable')
      addLog(result.available
        ? `AI available: Claude CLI ${result.version}`
        : 'AI unavailable: Claude CLI not found')
    } catch (err) {
      setIsAvailable(false)
      setStatus('unavailable')
      setError(err instanceof Error ? err.message : 'Unknown error')
      addLog(`Error checking AI: ${err}`)
    }
  }, [addLog])

  useEffect(() => {
    checkAvailability()
  }, [checkAvailability])

  return (
    <AIStatusContext.Provider
      value={{
        status,
        isAvailable,
        version,
        error,
        logs,
        checkAvailability,
        addLog,
        clearLogs,
        setStatus,
        setError,
      }}
    >
      {children}
    </AIStatusContext.Provider>
  )
}

export const useAIStatus = () => {
  const context = useContext(AIStatusContext)
  if (context === undefined) {
    throw new Error('useAIStatus must be used within an AIStatusProvider')
  }
  return context
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/ai-status-provider.tsx
git commit -m "feat: add AI status context for global status tracking"
```

---

### Task 1.4: Create App Shell with Sidebar

**Files:**
- Create: `src/renderer/components/layout/app-sidebar.tsx`
- Create: `src/renderer/components/layout/app-shell.tsx`
- Create: `src/renderer/components/layout/index.ts`

**Step 1: Create app-sidebar component**

Create `src/renderer/components/layout/app-sidebar.tsx`:
```tsx
import {
  LayoutDashboard,
  User,
  Palette,
  Target,
  FileOutput,
  History,
  Settings,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTheme } from '../theme-provider'
import { useAIStatus } from '../ai-status-provider'

export type PageId =
  | 'dashboard'
  | 'profile'
  | 'templates'
  | 'targeting'
  | 'preview'
  | 'history'
  | 'settings'

const mainNavItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'profile' as const, label: 'Profile', icon: User },
  { id: 'templates' as const, label: 'Templates', icon: Palette },
  { id: 'targeting' as const, label: 'Job Targeting', icon: Target },
  { id: 'preview' as const, label: 'Preview & Export', icon: FileOutput },
  { id: 'history' as const, label: 'History', icon: History },
]

interface AppSidebarProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
}

export function AppSidebar({ activePage, onNavigate }: AppSidebarProps) {
  const { theme, setTheme } = useTheme()
  const { status, isAvailable } = useAIStatus()

  const getStatusColor = () => {
    if (!isAvailable) return 'bg-yellow-500'
    if (status === 'processing') return 'bg-blue-500 animate-pulse'
    if (status === 'error') return 'bg-red-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (!isAvailable) return 'AI Unavailable'
    if (status === 'processing') return 'Processing...'
    if (status === 'error') return 'Error'
    return 'AI Ready'
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileOutput className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Resume Tailor</span>
            <span className="text-xs text-muted-foreground">Local AI</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activePage === item.id}
                    onClick={() => onNavigate(item.id)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activePage === 'settings'}
                  onClick={() => onNavigate('settings')}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
            <span className="text-xs text-muted-foreground">{getStatusText()}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : theme === 'light' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="mr-2 h-4 w-4" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
```

**Step 2: Create app-shell component**

Create `src/renderer/components/layout/app-shell.tsx`:
```tsx
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AppSidebar, type PageId } from './app-sidebar'
import { useAIStatus } from '../ai-status-provider'

interface AppShellProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
  children: React.ReactNode
}

export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  const { isAvailable, status } = useAIStatus()

  return (
    <SidebarProvider>
      <AppSidebar activePage={activePage} onNavigate={onNavigate} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
          {isAvailable && status === 'idle' && (
            <Badge variant="outline" className="gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              LOCAL AI ACTIVE
            </Badge>
          )}
          {isAvailable && status === 'processing' && (
            <Badge variant="outline" className="gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              PROCESSING
            </Badge>
          )}
          {!isAvailable && (
            <Badge variant="destructive" className="gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              AI UNAVAILABLE
            </Badge>
          )}
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

**Step 3: Create index barrel export**

Create `src/renderer/components/layout/index.ts`:
```tsx
export { AppSidebar, type PageId } from './app-sidebar'
export { AppShell } from './app-shell'
```

**Step 4: Commit**

```bash
git add src/renderer/components/layout/
git commit -m "feat: create app shell with sidebar navigation"
```

---

### Task 1.5: Create Placeholder Pages

**Files:**
- Create: `src/renderer/pages/dashboard.tsx`
- Create: `src/renderer/pages/profile.tsx`
- Create: `src/renderer/pages/templates.tsx`
- Create: `src/renderer/pages/targeting.tsx`
- Create: `src/renderer/pages/preview.tsx`
- Create: `src/renderer/pages/history.tsx`
- Create: `src/renderer/pages/settings.tsx`
- Create: `src/renderer/pages/index.ts`

**Step 1: Create placeholder pages**

Create `src/renderer/pages/dashboard.tsx`:
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your resume tailoring progress.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Resume Tailor</CardTitle>
          <CardDescription>Get started by importing your resume or creating one from scratch.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Dashboard content coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}
```

Create `src/renderer/pages/profile.tsx`:
```tsx
export function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Editor</h1>
        <p className="text-muted-foreground">
          Review and edit your professional details.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">Profile editor coming soon...</p>
    </div>
  )
}
```

Create `src/renderer/pages/templates.tsx`:
```tsx
export function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <p className="text-muted-foreground">
          Choose a template for your resume and cover letter.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">Template gallery coming soon...</p>
    </div>
  )
}
```

Create `src/renderer/pages/targeting.tsx`:
```tsx
export function TargetingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Targeting</h1>
        <p className="text-muted-foreground">
          Input job details to start the AI tailoring process.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">Job targeting coming soon...</p>
    </div>
  )
}
```

Create `src/renderer/pages/preview.tsx`:
```tsx
export function PreviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Preview & Export</h1>
        <p className="text-muted-foreground">
          Preview and export your tailored resume.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">Preview coming soon...</p>
    </div>
  )
}
```

Create `src/renderer/pages/history.tsx`:
```tsx
export function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Export History</h1>
        <p className="text-muted-foreground">
          View your previously exported documents.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">History coming soon...</p>
    </div>
  )
}
```

Create `src/renderer/pages/settings.tsx`:
```tsx
export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure how Resume Tailor works.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">Settings coming soon...</p>
    </div>
  )
}
```

Create `src/renderer/pages/index.ts`:
```tsx
export { DashboardPage } from './dashboard'
export { ProfilePage } from './profile'
export { TemplatesPage } from './templates'
export { TargetingPage } from './targeting'
export { PreviewPage } from './preview'
export { HistoryPage } from './history'
export { SettingsPage } from './settings'
```

**Step 2: Commit**

```bash
git add src/renderer/pages/
git commit -m "feat: add placeholder pages for all navigation items"
```

---

### Task 1.6: Wire Up New App Structure

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/main.tsx`

**Step 1: Replace App.tsx with new structure**

Replace contents of `src/renderer/App.tsx`:
```tsx
import { useState } from 'react'
import { AppShell, type PageId } from './components/layout'
import {
  DashboardPage,
  ProfilePage,
  TemplatesPage,
  TargetingPage,
  PreviewPage,
  HistoryPage,
  SettingsPage,
} from './pages'

function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard')

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />
      case 'profile':
        return <ProfilePage />
      case 'templates':
        return <TemplatesPage />
      case 'targeting':
        return <TargetingPage />
      case 'preview':
        return <PreviewPage />
      case 'history':
        return <HistoryPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </AppShell>
  )
}

export default App
```

**Step 2: Update main.tsx with AIStatusProvider**

Replace contents of `src/renderer/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './components/theme-provider'
import { AIStatusProvider } from './components/ai-status-provider'
import '../styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="resume-tailor-theme">
      <AIStatusProvider>
        <App />
      </AIStatusProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
```

**Step 3: Run and verify**

Run: `npm run dev`
Expected: App loads with sidebar navigation, all pages accessible, theme toggle works

**Step 4: Commit**

```bash
git add src/renderer/App.tsx src/renderer/main.tsx
git commit -m "feat: wire up new app shell with sidebar navigation"
```

---

## Phase 2: Core Pages

### Task 2.1: Build Dashboard Page

**Files:**
- Modify: `src/renderer/pages/dashboard.tsx`

**Step 1: Implement full dashboard**

Replace `src/renderer/pages/dashboard.tsx`:
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  User,
  Palette,
  Target,
  Sparkles,
  Pencil,
  Upload,
  FileText,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { useResume } from '../hooks/useResume'

interface DashboardPageProps {
  onNavigate?: (page: string) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { resume, loadFromFile } = useResume()

  const hasProfile = resume !== null
  const profileCompleteness = hasProfile ? calculateCompleteness(resume) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your resume tailoring progress.
        </p>
      </div>

      {!hasProfile ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle>Welcome to Resume Tailor</CardTitle>
            <CardDescription>
              Get started by importing your existing resume or creating one from scratch.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-4">
            <Button onClick={loadFromFile}>
              <Upload className="mr-2 h-4 w-4" />
              Import Resume
            </Button>
            <Button variant="outline" onClick={() => onNavigate?.('profile')}>
              <FileText className="mr-2 h-4 w-4" />
              Start from Scratch
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Status Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profile</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profileCompleteness}%</div>
                <Progress value={profileCompleteness} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {resume.workExperience.length} experiences, {resume.skills.length} skills
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Template</CardTitle>
                <Palette className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Modern</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Professional Minimal v2.0
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tailoring</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Ready
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Profile ready for job targeting
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <div className="flex gap-4">
              <Button onClick={() => onNavigate?.('targeting')}>
                <Sparkles className="mr-2 h-4 w-4" />
                Tailor to a Job
              </Button>
              <Button variant="outline" onClick={() => onNavigate?.('profile')}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Profile imported</p>
                      <p className="text-xs text-muted-foreground">Just now</p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function calculateCompleteness(resume: any): number {
  let score = 0
  const weights = {
    personalInfo: 30,
    workExperience: 30,
    education: 15,
    skills: 25,
  }

  if (resume.personalInfo?.name) score += weights.personalInfo * 0.5
  if (resume.personalInfo?.email) score += weights.personalInfo * 0.3
  if (resume.personalInfo?.summary) score += weights.personalInfo * 0.2

  if (resume.workExperience?.length > 0) score += weights.workExperience
  if (resume.education?.length > 0) score += weights.education
  if (resume.skills?.length > 0) score += weights.skills

  return Math.round(score)
}
```

**Step 2: Update App.tsx to pass onNavigate**

In `src/renderer/App.tsx`, update the DashboardPage render:
```tsx
case 'dashboard':
  return <DashboardPage onNavigate={(page) => setActivePage(page as PageId)} />
```

**Step 3: Commit**

```bash
git add src/renderer/pages/dashboard.tsx src/renderer/App.tsx
git commit -m "feat: implement dashboard page with status cards and quick actions"
```

---

### Task 2.2: Build Profile Editor Page - Structure

**Files:**
- Modify: `src/renderer/pages/profile.tsx`
- Create: `src/renderer/components/profile/profile-form.tsx`
- Create: `src/renderer/components/profile/experience-section.tsx`
- Create: `src/renderer/components/profile/education-section.tsx`
- Create: `src/renderer/components/profile/skills-section.tsx`
- Create: `src/renderer/components/profile/index.ts`

This task creates the profile editor structure. Implementation continues in Task 2.3.

**Step 1: Create profile component directory and index**

Create `src/renderer/components/profile/index.ts`:
```tsx
export { ProfileForm } from './profile-form'
export { ExperienceSection } from './experience-section'
export { EducationSection } from './education-section'
export { SkillsSection } from './skills-section'
```

**Step 2: Create experience-section component**

Create `src/renderer/components/profile/experience-section.tsx`:
```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Plus, Trash2, X } from 'lucide-react'
import type { WorkExperience } from '@/schemas/resume.schema'

interface ExperienceSectionProps {
  experiences: WorkExperience[]
  onChange: (experiences: WorkExperience[]) => void
}

export function ExperienceSection({ experiences, onChange }: ExperienceSectionProps) {
  const addExperience = () => {
    onChange([
      ...experiences,
      {
        company: '',
        title: '',
        startDate: '',
        endDate: '',
        location: '',
        highlights: [],
      },
    ])
  }

  const updateExperience = (index: number, updates: Partial<WorkExperience>) => {
    const updated = [...experiences]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  const removeExperience = (index: number) => {
    onChange(experiences.filter((_, i) => i !== index))
  }

  const addHighlight = (expIndex: number) => {
    const updated = [...experiences]
    updated[expIndex].highlights = [...updated[expIndex].highlights, '']
    onChange(updated)
  }

  const updateHighlight = (expIndex: number, hlIndex: number, value: string) => {
    const updated = [...experiences]
    updated[expIndex].highlights[hlIndex] = value
    onChange(updated)
  }

  const removeHighlight = (expIndex: number, hlIndex: number) => {
    const updated = [...experiences]
    updated[expIndex].highlights = updated[expIndex].highlights.filter((_, i) => i !== hlIndex)
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>Experience</span>
        </h3>
        <Button variant="outline" size="sm" onClick={addExperience}>
          <Plus className="h-4 w-4 mr-1" />
          Add Entry
        </Button>
      </div>

      {experiences.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            No work experience added yet. Click "Add Entry" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {experiences.map((exp, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex items-start pt-2 cursor-move">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Job Title</Label>
                        <Input
                          value={exp.title}
                          onChange={(e) => updateExperience(index, { title: e.target.value })}
                          placeholder="Senior Software Engineer"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Input
                            value={exp.startDate}
                            onChange={(e) => updateExperience(index, { startDate: e.target.value })}
                            placeholder="Jan 2021"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Date</Label>
                          <Input
                            value={exp.endDate || ''}
                            onChange={(e) => updateExperience(index, { endDate: e.target.value })}
                            placeholder="Present"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company</Label>
                        <Input
                          value={exp.company}
                          onChange={(e) => updateExperience(index, { company: e.target.value })}
                          placeholder="TechCorp Inc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input
                          value={exp.location || ''}
                          onChange={(e) => updateExperience(index, { location: e.target.value })}
                          placeholder="San Francisco, CA"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Responsibilities & Achievements</Label>
                      <div className="space-y-2">
                        {exp.highlights.map((highlight, hlIndex) => (
                          <div key={hlIndex} className="flex gap-2">
                            <span className="text-muted-foreground mt-2">•</span>
                            <Input
                              value={highlight}
                              onChange={(e) => updateHighlight(index, hlIndex, e.target.value)}
                              placeholder="Describe an achievement or responsibility..."
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeHighlight(index, hlIndex)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => addHighlight(index)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add bullet
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeExperience(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Create education-section component**

Create `src/renderer/components/profile/education-section.tsx`:
```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { Education } from '@/schemas/resume.schema'

interface EducationSectionProps {
  education: Education[]
  onChange: (education: Education[]) => void
}

export function EducationSection({ education, onChange }: EducationSectionProps) {
  const addEducation = () => {
    onChange([
      ...education,
      {
        institution: '',
        degree: '',
        field: '',
        graduationDate: '',
        gpa: '',
        highlights: [],
      },
    ])
  }

  const updateEducation = (index: number, updates: Partial<Education>) => {
    const updated = [...education]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  const removeEducation = (index: number) => {
    onChange(education.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Education</h3>
        <Button variant="outline" size="sm" onClick={addEducation}>
          <Plus className="h-4 w-4 mr-1" />
          Add Entry
        </Button>
      </div>

      {education.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            No education added yet. Click "Add Entry" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {education.map((edu, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex items-start pt-2 cursor-move">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Degree</Label>
                        <Input
                          value={edu.degree}
                          onChange={(e) => updateEducation(index, { degree: e.target.value })}
                          placeholder="B.S. in Computer Science"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Field of Study</Label>
                        <Input
                          value={edu.field || ''}
                          onChange={(e) => updateEducation(index, { field: e.target.value })}
                          placeholder="Computer Science"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Institution</Label>
                        <Input
                          value={edu.institution}
                          onChange={(e) => updateEducation(index, { institution: e.target.value })}
                          placeholder="Stanford University"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Graduation Date</Label>
                        <Input
                          value={edu.graduationDate || ''}
                          onChange={(e) => updateEducation(index, { graduationDate: e.target.value })}
                          placeholder="May 2020"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>GPA (optional)</Label>
                        <Input
                          value={edu.gpa || ''}
                          onChange={(e) => updateEducation(index, { gpa: e.target.value })}
                          placeholder="3.8"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeEducation(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Create skills-section component**

Create `src/renderer/components/profile/skills-section.tsx`:
```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import type { Skill } from '@/schemas/resume.schema'

interface SkillsSectionProps {
  skills: Skill[]
  onChange: (skills: Skill[]) => void
}

export function SkillsSection({ skills, onChange }: SkillsSectionProps) {
  const [newSkill, setNewSkill] = useState('')

  const addSkill = () => {
    if (newSkill.trim()) {
      onChange([...skills, { name: newSkill.trim() }])
      setNewSkill('')
    }
  }

  const removeSkill = (index: number) => {
    onChange(skills.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Skills</h3>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a skill (e.g., React, TypeScript, Project Management)"
              />
              <Button onClick={addSkill} disabled={!newSkill.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {skills.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No skills added yet. Type a skill name and press Enter or click Add.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 pr-1">
                    {skill.name}
                    <button
                      onClick={() => removeSkill(index)}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add src/renderer/components/profile/
git commit -m "feat: create profile section components (experience, education, skills)"
```

---

### Task 2.3: Build Profile Editor Page - Main Form

**Files:**
- Create: `src/renderer/components/profile/profile-form.tsx`
- Modify: `src/renderer/pages/profile.tsx`

**Step 1: Create profile-form component**

Create `src/renderer/components/profile/profile-form.tsx`:
```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Save, FileJson, Sparkles } from 'lucide-react'
import { ExperienceSection } from './experience-section'
import { EducationSection } from './education-section'
import { SkillsSection } from './skills-section'
import type { Resume } from '@/schemas/resume.schema'

interface ProfileFormProps {
  resume: Resume | null
  jsonText: string
  onChange: (resume: Partial<Resume>) => void
  onJsonChange: (json: string) => void
  onSave: () => void
  isDirty: boolean
}

export function ProfileForm({
  resume,
  jsonText,
  onChange,
  onJsonChange,
  onSave,
  isDirty,
}: ProfileFormProps) {
  const [viewMode, setViewMode] = useState<'standard' | 'json'>('standard')

  const handlePersonalInfoChange = (field: string, value: string) => {
    onChange({
      personalInfo: {
        ...resume?.personalInfo,
        name: resume?.personalInfo?.name || '',
        email: resume?.personalInfo?.email || '',
        [field]: value,
      },
    })
  }

  const summaryLength = resume?.personalInfo?.summary?.length || 0
  const maxSummary = 500

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'standard' | 'json')}>
          <TabsList>
            <TabsTrigger value="standard">Standard</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-1" />
            AI Re-scan
          </Button>
          <Button size="sm" onClick={onSave} disabled={!isDirty}>
            <Save className="h-4 w-4 mr-1" />
            Save Profile
          </Button>
        </div>
      </div>

      {viewMode === 'standard' ? (
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-8 pr-4">
            {/* Summary Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Summary
              </h3>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Professional Bio</Label>
                      <Badge variant="outline" className="text-xs">
                        {summaryLength} / {maxSummary}
                      </Badge>
                    </div>
                    <Textarea
                      value={resume?.personalInfo?.summary || ''}
                      onChange={(e) => handlePersonalInfoChange('summary', e.target.value)}
                      placeholder="Results-driven professional with experience in..."
                      className="min-h-[120px]"
                      maxLength={maxSummary}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Personal Info Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={resume?.personalInfo?.name || ''}
                        onChange={(e) => handlePersonalInfoChange('name', e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={resume?.personalInfo?.email || ''}
                        onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={resume?.personalInfo?.phone || ''}
                        onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={resume?.personalInfo?.location || ''}
                        onChange={(e) => handlePersonalInfoChange('location', e.target.value)}
                        placeholder="San Francisco, CA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>LinkedIn</Label>
                      <Input
                        value={resume?.personalInfo?.linkedin || ''}
                        onChange={(e) => handlePersonalInfoChange('linkedin', e.target.value)}
                        placeholder="https://linkedin.com/in/johndoe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input
                        value={resume?.personalInfo?.website || ''}
                        onChange={(e) => handlePersonalInfoChange('website', e.target.value)}
                        placeholder="https://johndoe.com"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Experience Section */}
            <ExperienceSection
              experiences={resume?.workExperience || []}
              onChange={(workExperience) => onChange({ workExperience })}
            />

            <Separator />

            {/* Education Section */}
            <EducationSection
              education={resume?.education || []}
              onChange={(education) => onChange({ education })}
            />

            <Separator />

            {/* Skills Section */}
            <SkillsSection
              skills={resume?.skills || []}
              onChange={(skills) => onChange({ skills })}
            />
          </div>
        </ScrollArea>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Textarea
              value={jsonText}
              onChange={(e) => onJsonChange(e.target.value)}
              className="font-mono text-sm min-h-[calc(100vh-300px)]"
              placeholder="Paste your resume JSON here..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

**Step 2: Update profile page**

Replace `src/renderer/pages/profile.tsx`:
```tsx
import { ProfileForm } from '../components/profile'
import { useResume } from '../hooks/useResume'

export function ProfilePage() {
  const {
    resume,
    jsonText,
    setJsonText,
    isDirty,
    saveToFile,
    updateResume,
  } = useResume()

  const handleChange = (updates: any) => {
    if (resume) {
      updateResume({ ...resume, ...updates })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Editor</h1>
        <p className="text-muted-foreground">
          Review and edit your professional details for AI-optimized tailoring.
        </p>
      </div>

      <ProfileForm
        resume={resume}
        jsonText={jsonText}
        onChange={handleChange}
        onJsonChange={setJsonText}
        onSave={saveToFile}
        isDirty={isDirty}
      />
    </div>
  )
}
```

**Step 3: Update useResume hook to support updateResume**

Check if `useResume` has an `updateResume` function. If not, we need to add it.

**Step 4: Commit**

```bash
git add src/renderer/components/profile/profile-form.tsx src/renderer/pages/profile.tsx
git commit -m "feat: implement profile editor page with structured form"
```

---

### Task 2.4: Build Templates Gallery Page

**Files:**
- Modify: `src/renderer/pages/templates.tsx`
- Create: `src/renderer/components/templates/template-card.tsx`
- Create: `src/renderer/components/templates/index.ts`

**Step 1: Create template-card component**

Create `src/renderer/components/templates/template-card.tsx`:
```tsx
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TemplateCardProps {
  id: string
  name: string
  description: string
  thumbnail: string
  tags?: string[]
  isSelected?: boolean
  onClick?: () => void
}

export function TemplateCard({
  id,
  name,
  description,
  thumbnail,
  tags = [],
  isSelected = false,
  onClick,
}: TemplateCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <AspectRatio ratio={3 / 4} className="bg-muted rounded-md overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
            <span className="text-4xl text-muted-foreground/30">CV</span>
          </div>
          {isSelected && (
            <div className="absolute top-2 right-2">
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          )}
        </AspectRatio>
        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">{name}</h4>
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
```

Create `src/renderer/components/templates/index.ts`:
```tsx
export { TemplateCard } from './template-card'
```

**Step 2: Update templates page**

Replace `src/renderer/pages/templates.tsx`:
```tsx
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import { TemplateCard } from '../components/templates'

const cvTemplates = [
  { id: 'modern-minimal', name: 'Modern Minimal', description: 'Clean ATS-friendly layout for tech roles. High impact, visual hierarchy.', tags: ['ATS OPTIMIZED'] },
  { id: 'classic-professional', name: 'Classic Professional', description: 'Traditional two-column layout for corporate and formal roles.', tags: [] },
  { id: 'tech-compact', name: 'Tech Compact', description: 'ATS-focused layout optimized to pass AI screening in engineering.', tags: ['ATS OPTIMIZED'] },
  { id: 'executive', name: 'Executive', description: 'High-level summary format for leadership and C-suite positions.', tags: [] },
  { id: 'creative', name: 'Creative', description: 'Bold, unique design for designers, marketers, and artists.', tags: [] },
  { id: 'academic', name: 'Academic', description: 'Multi-page optimized layout for research and teaching portfolios.', tags: [] },
]

const coverLetterTemplates = [
  { id: 'short-sweet', name: 'Short & Sweet', description: 'Concise one-paragraph format that gets to the point quickly.', tags: [] },
  { id: 'formal-standard', name: 'Formal Standard', description: 'Traditional three-paragraph business letter format.', tags: [] },
  { id: 'value-proposition', name: 'Value Proposition', description: 'Highlights key achievements and value you bring.', tags: [] },
  { id: 'creative-pitch', name: 'Creative Pitch', description: 'Storytelling approach for creative industries.', tags: [] },
]

export function TemplatesPage() {
  const [selectedCV, setSelectedCV] = useState('modern-minimal')
  const [selectedCoverLetter, setSelectedCoverLetter] = useState('formal-standard')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const filteredCVTemplates = cvTemplates.filter(
    (t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredCoverLetterTemplates = coverLetterTemplates.filter(
    (t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalTemplates = cvTemplates.length + coverLetterTemplates.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Choose a template for your resume and cover letter.
          </p>
        </div>
        <Badge variant="outline">{totalTemplates} templates available</Badge>
      </div>

      <div className="flex items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">All Templates</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">CV Templates</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCVTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                id={template.id}
                name={template.name}
                description={template.description}
                thumbnail=""
                tags={template.tags}
                isSelected={selectedCV === template.id}
                onClick={() => setSelectedCV(template.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Cover Letter Templates</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCoverLetterTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                id={template.id}
                name={template.name}
                description={template.description}
                thumbnail=""
                tags={template.tags}
                isSelected={selectedCoverLetter === template.id}
                onClick={() => setSelectedCoverLetter(template.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/renderer/components/templates/ src/renderer/pages/templates.tsx
git commit -m "feat: implement templates gallery page with card grid"
```

---

## Phase 3: Job Flow Pages

### Task 3.1: Build Job Targeting Page

**Files:**
- Modify: `src/renderer/pages/targeting.tsx`

**Step 1: Implement job targeting page**

Replace `src/renderer/pages/targeting.tsx`:
```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Link2,
  FileText,
  Sparkles,
  Eye,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Circle,
  ChevronDown,
  Info
} from 'lucide-react'
import { useJobApplication } from '../hooks/useJobApplication'
import { useResume } from '../hooks/useResume'

export function TargetingPage() {
  const { resume } = useResume()
  const { jobPosting, setJobPosting, refineResume, isAIAvailable, aiState } = useJobApplication()

  const [inputMode, setInputMode] = useState<'url' | 'paste'>('url')
  const [jobUrl, setJobUrl] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [seniority, setSeniority] = useState([2]) // 0-4: Junior, Associate, Mid, Senior, Exec
  const [tone, setTone] = useState('professional')
  const [showLogs, setShowLogs] = useState(false)

  const seniorityLabels = ['Junior', 'Associate', 'Mid', 'Senior', 'Exec']

  const handleFetch = async () => {
    // Simulate fetch failure for demo
    setFetchError('HTTP 403 Forbidden - This often happens with password-protected job boards or LinkedIn security filters.')
    setInputMode('paste')
  }

  const handleTailor = () => {
    if (jobDescription) {
      setJobPosting({
        title: 'Target Role',
        company: 'Company',
        description: jobDescription,
        requirements: [],
        niceToHave: [],
      })
      // Trigger AI processing
    }
  }

  // Mock requirements for demo
  const requirements = [
    { name: 'React & Next.js', status: 'matched' },
    { name: 'TypeScript', status: 'matched' },
    { name: 'AWS Cloud Practitioner', status: 'partial' },
    { name: 'Docker & Kubernetes', status: 'missing' },
  ]

  const technicalMatch = 80
  const softSkillsMatch = 45

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Target this Role</h1>
        <p className="text-muted-foreground">
          Input job details to start the AI tailoring process.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Input */}
        <div className="lg:col-span-2 space-y-6">
          {/* URL Input */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  <Label>Job URL</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="https://linkedin.com/jobs/view/..."
                    disabled={inputMode === 'paste'}
                  />
                  <Button onClick={handleFetch} disabled={!jobUrl || inputMode === 'paste'}>
                    Fetch
                  </Button>
                </div>

                {fetchError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Job URL fetch blocked</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>{fetchError}</p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="secondary" onClick={() => setInputMode('paste')}>
                          <FileText className="h-4 w-4 mr-1" />
                          Paste description manually
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setFetchError(null)}>
                          Try again
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {(inputMode === 'paste' || fetchError) && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          or paste description
                        </span>
                      </div>
                    </div>

                    <Textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job description here..."
                      className="min-h-[200px]"
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* What will change */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                What will change?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Our local AI will analyze the job's core requirements and automatically rewrite your professional summary, highlight specific technical skills, and reorder your experience to emphasize matching achievements. A custom cover letter will also be generated addressing the hiring manager's likely pain points.
              </p>
            </CardContent>
          </Card>

          {/* Fine-tune Output */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fine-tune Output</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Target Seniority</Label>
                  <span className="text-sm text-primary font-medium">
                    {seniorityLabels[seniority[0]]}
                  </span>
                </div>
                <Slider
                  value={seniority}
                  onValueChange={setSeniority}
                  max={4}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {seniorityLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tone of Voice</Label>
                <ToggleGroup type="single" value={tone} onValueChange={(v) => v && setTone(v)}>
                  <ToggleGroupItem value="professional">Professional</ToggleGroupItem>
                  <ToggleGroupItem value="creative">Creative</ToggleGroupItem>
                  <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardContent>
          </Card>

          {/* Error Logs */}
          {fetchError && (
            <Collapsible open={showLogs} onOpenChange={setShowLogs}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  Raw CLI Fetch Error Logs
                  <ChevronDown className={`h-4 w-4 transition-transform ${showLogs ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card>
                  <CardContent className="pt-4">
                    <pre className="text-xs font-mono text-muted-foreground bg-muted p-4 rounded overflow-auto max-h-40">
{`[WARN] 2024-05-24 14:32:01 - Initializing fetch request to "https://www.linkedin.com/jobs/view/39522412..."
[INFO] User-Agent: Mozilla/5.0 (Electron/3.4.0) TailorCV/AI-Core
[ERR] 2024-05-24 14:32:03 - Received HTTP 403 Forbidden. CSRF Token mismatch or Auth Wall detected.
[ERR] Crawler failed to bypass security middleware. Retrying with headless profile: FAILED.
[DEBUG] Trace-ID: 0821-XA-952-B021 | Source: targeting_controller.js:241`}
                    </pre>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Action buttons */}
          <div className="flex justify-between">
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview CV
            </Button>
            <Button
              onClick={handleTailor}
              disabled={!jobDescription || !resume || !isAIAvailable}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Tailor CV + Draft Cover Letter
            </Button>
          </div>
        </div>

        {/* Right column - Analysis */}
        <div className="space-y-6">
          {/* Requirements Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requirements Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {requirements.map((req) => (
                <div key={req.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {req.status === 'matched' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {req.status === 'partial' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                    {req.status === 'missing' && <Circle className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm">{req.name}</span>
                  </div>
                  <Badge variant={
                    req.status === 'matched' ? 'default' :
                    req.status === 'partial' ? 'secondary' : 'outline'
                  }>
                    {req.status === 'matched' ? 'EXPERT' :
                     req.status === 'partial' ? 'UPDATING' : 'MISSING'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Keyword Coverage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Keyword Coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-500">TECHNICAL MATCH</span>
                  <span>{technicalMatch}%</span>
                </div>
                <Progress value={technicalMatch} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-500">SOFT SKILLS</span>
                  <span>{softSkillsMatch}%</span>
                </div>
                <Progress value={softSkillsMatch} className="h-2" />
              </div>
              <div className="flex flex-wrap gap-1 mt-4">
                {['TailwindCSS', 'Node.js', 'Agile', 'PostgreSQL', 'SQL'].map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/pages/targeting.tsx
git commit -m "feat: implement job targeting page with URL fetch and analysis"
```

---

### Task 3.2: Build Preview & Export Page

**Files:**
- Modify: `src/renderer/pages/preview.tsx`

**Step 1: Implement preview page**

Replace `src/renderer/pages/preview.tsx`:
```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Download,
  Save,
  FileText,
  Clock,
} from 'lucide-react'
import { useResume } from '../hooks/useResume'
import { ResumePreview } from '../components/Resume/ResumePreview'

export function PreviewPage() {
  const { resume } = useResume()

  const [activeTab, setActiveTab] = useState('resume')
  const [template, setTemplate] = useState('professional-modern')
  const [fontSize, setFontSize] = useState([11])
  const [lineHeight, setLineHeight] = useState([1.4])
  const [showSummary, setShowSummary] = useState(true)
  const [showSkills, setShowSkills] = useState(true)
  const [showCertifications, setShowCertifications] = useState(true)
  const [showReferences, setShowReferences] = useState(false)

  const versionHistory = [
    { id: '1', name: 'Exported v2.4', date: 'Today, 2:30 PM', description: 'ATS-optimized typography tweaks' },
    { id: '2', name: 'Saved Draft', date: 'Yesterday', description: 'Added new skills section' },
    { id: '3', name: 'AI Revision @ 4:15 PM', date: 'Jan 28', description: 'AI-tailored for Senior Engineer role' },
    { id: '4', name: 'Initial Import', date: 'Jan 25', description: 'Originally imported from source PDF' },
  ]

  const handleExport = async () => {
    // Will integrate with existing PDF export logic
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Preview & Export</h1>
          <p className="text-muted-foreground">
            Preview and export your tailored resume.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview area */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
            </TabsList>
            <TabsContent value="resume" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="bg-white rounded-lg shadow-lg aspect-[8.5/11] overflow-hidden">
                    {resume ? (
                      <ScrollArea className="h-full">
                        <ResumePreview resume={resume} />
                      </ScrollArea>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No resume loaded</p>
                          <p className="text-sm">Import a resume to preview</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Page 1 of 1
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="cover-letter" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="bg-white rounded-lg shadow-lg aspect-[8.5/11] overflow-hidden">
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No cover letter generated</p>
                        <p className="text-sm">Use Job Targeting to generate one</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Settings panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Current Layout</Label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional-modern">Professional Modern (Default)</SelectItem>
                    <SelectItem value="minimalist-bold">Minimalist Bold</SelectItem>
                    <SelectItem value="executive-two-column">Executive Two-Column</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Typography</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>Font Size</Label>
                    <span>{fontSize[0]}pt</span>
                  </div>
                  <Slider
                    value={fontSize}
                    onValueChange={setFontSize}
                    min={9}
                    max={14}
                    step={0.5}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>Line Height</Label>
                    <span>{lineHeight[0].toFixed(1)}</span>
                  </div>
                  <Slider
                    value={lineHeight}
                    onValueChange={setLineHeight}
                    min={1}
                    max={2}
                    step={0.1}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Content Visibility</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="summary"
                      checked={showSummary}
                      onCheckedChange={(c) => setShowSummary(c === true)}
                    />
                    <Label htmlFor="summary">Professional Summary</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="skills"
                      checked={showSkills}
                      onCheckedChange={(c) => setShowSkills(c === true)}
                    />
                    <Label htmlFor="skills">Core Skills</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="certs"
                      checked={showCertifications}
                      onCheckedChange={(c) => setShowCertifications(c === true)}
                    />
                    <Label htmlFor="certs">Certifications</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="refs"
                      checked={showReferences}
                      onCheckedChange={(c) => setShowReferences(c === true)}
                    />
                    <Label htmlFor="refs">References</Label>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-4">
                  {versionHistory.map((version, index) => (
                    <div key={version.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted-foreground'}`} />
                        {index < versionHistory.length - 1 && (
                          <div className="w-px h-full bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">{version.name}</p>
                        <p className="text-xs text-muted-foreground">{version.date}</p>
                        <p className="text-xs text-muted-foreground">{version.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/pages/preview.tsx
git commit -m "feat: implement preview & export page with template settings"
```

---

## Phase 4: Supporting Pages

### Task 4.1: Build History Page

**Files:**
- Modify: `src/renderer/pages/history.tsx`

**Step 1: Implement history page**

Replace `src/renderer/pages/history.tsx`:
```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText,
  Folder,
  ExternalLink,
  Trash2,
  Clock
} from 'lucide-react'
import { useExportHistory } from '../hooks/useExportHistory'

export function HistoryPage() {
  const { history, clearHistory, openFile, openFolder } = useExportHistory()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Export History</h1>
          <p className="text-muted-foreground">
            View your previously exported documents.
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="outline" onClick={clearHistory}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-1">No exports yet</h3>
            <p className="text-sm text-muted-foreground">
              Your exported resumes and cover letters will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="divide-y">
              {history.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{item.fileName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{item.date}</span>
                        <span>•</span>
                        <span>{item.template}</span>
                        {item.matchScore && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              {item.matchScore}% match
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openFile(item.filePath)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openFolder(item.folderPath)}
                    >
                      <Folder className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/pages/history.tsx
git commit -m "feat: implement history page with export list"
```

---

### Task 4.2: Build Settings Page

**Files:**
- Modify: `src/renderer/pages/settings.tsx`

**Step 1: Implement settings page**

Replace `src/renderer/pages/settings.tsx`:
```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Settings as SettingsIcon,
  Cpu,
  FolderOpen,
  Shield,
  CheckCircle2,
  AlertCircle,
  Folder
} from 'lucide-react'
import { useSettings } from '../hooks/useSettings'
import { useAIStatus } from '../components/ai-status-provider'

export function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const { isAvailable, version, checkAvailability } = useAIStatus()

  const [cliPath, setCliPath] = useState('/usr/local/bin/claude')
  const [outputFolder, setOutputFolder] = useState('~/Documents/Resumes')
  const [selectedTemplate, setSelectedTemplate] = useState('modern-professional')

  const handleBrowseOutput = async () => {
    const result = await window.electronAPI.selectFolder()
    if (result) {
      setOutputFolder(result)
    }
  }

  const templates = [
    { id: 'modern-professional', name: 'Modern Professional' },
    { id: 'minimalist-bold', name: 'Minimalist Bold' },
    { id: 'executive-two-column', name: 'Executive Two-Column' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure how Resume Tailor interacts with your system and data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-4">
            <nav className="space-y-1">
              <Button variant="secondary" className="w-full justify-start">
                <SettingsIcon className="h-4 w-4 mr-2" />
                General
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Cpu className="h-4 w-4 mr-2" />
                AI Tools
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <FolderOpen className="h-4 w-4 mr-2" />
                Storage
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Privacy
              </Button>
            </nav>
          </CardContent>
        </Card>

        {/* Settings Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* CLI Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                CLI Configuration
              </CardTitle>
              <CardDescription>
                Configure the path to your Claude CLI installation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>CLI Executable Path</Label>
                <div className="flex gap-2">
                  <Input
                    value={cliPath}
                    onChange={(e) => setCliPath(e.target.value)}
                    placeholder="/usr/local/bin/claude"
                  />
                  <Button variant="outline">
                    <Folder className="h-4 w-4 mr-2" />
                    Browse
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {isAvailable ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-500">Path validated successfully</span>
                      {version && <Badge variant="outline">v{version}</Badge>}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="text-yellow-500">CLI not found at this path</span>
                    </>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={checkAvailability}>
                Re-check Status
              </Button>
            </CardContent>
          </Card>

          {/* Default Template */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Default Template</CardTitle>
              <CardDescription>
                Choose the default template for new resumes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all ${
                      selectedTemplate === template.id
                        ? 'ring-2 ring-primary'
                        : 'hover:ring-1 hover:ring-primary/50'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="aspect-[3/4] bg-muted rounded-md mb-3 flex items-center justify-center relative">
                        <span className="text-2xl text-muted-foreground/30">CV</span>
                        {selectedTemplate === template.id && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-center">{template.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Output Folder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Output Folder
              </CardTitle>
              <CardDescription>
                Where exported PDFs will be saved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={outputFolder}
                  onChange={(e) => setOutputFolder(e.target.value)}
                  placeholder="~/Documents/Resumes"
                />
                <Button variant="outline" onClick={handleBrowseOutput}>
                  <Folder className="h-4 w-4 mr-2" />
                  Browse
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Privacy & Security
              </CardTitle>
              <CardDescription>
                Control how your data is handled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Local Processing Only</Label>
                  <p className="text-sm text-muted-foreground">
                    All AI processing happens on your machine
                  </p>
                </div>
                <Switch checked disabled />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Save History</Label>
                  <p className="text-sm text-muted-foreground">
                    Keep track of exported documents
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Send anonymous usage statistics
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/pages/settings.tsx
git commit -m "feat: implement settings page with CLI config and privacy options"
```

---

## Phase 5: Polish & Integration

### Task 5.1: Add AI Status Sheet

**Files:**
- Create: `src/renderer/components/ai-status-sheet.tsx`
- Modify: `src/renderer/components/layout/app-shell.tsx`

**Step 1: Create AI status sheet component**

Create `src/renderer/components/ai-status-sheet.tsx`:
```tsx
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Trash2 } from 'lucide-react'
import { useAIStatus } from './ai-status-provider'

export function AIStatusSheet({ children }: { children: React.ReactNode }) {
  const {
    status,
    isAvailable,
    version,
    error,
    logs,
    checkAvailability,
    clearLogs
  } = useAIStatus()

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            AI Status
            <Badge variant={isAvailable ? 'default' : 'destructive'}>
              {isAvailable ? 'Available' : 'Unavailable'}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Local AI processing status and logs.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Info */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="capitalize">{status}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Claude CLI Version</span>
              <span>{version || 'Not detected'}</span>
            </div>
            {error && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Error</span>
                <span className="text-destructive">{error}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={checkAvailability}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-check
            </Button>
          </div>

          <Separator />

          {/* Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">System Logs</h4>
              <Button variant="ghost" size="sm" onClick={clearLogs}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <ScrollArea className="h-[300px] rounded-md border bg-muted p-4">
              <pre className="text-xs font-mono">
                {logs.length > 0
                  ? logs.join('\n')
                  : 'No logs yet...'}
              </pre>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

**Step 2: Update app-shell to use AI status sheet**

In `src/renderer/components/layout/app-shell.tsx`, wrap the AI status badge with the sheet:

```tsx
import { AIStatusSheet } from '../ai-status-sheet'

// In the header section, wrap the badges:
<AIStatusSheet>
  <button className="cursor-pointer">
    {isAvailable && status === 'idle' && (
      <Badge variant="outline" className="gap-1.5">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        LOCAL AI ACTIVE
      </Badge>
    )}
    {/* ... other status badges ... */}
  </button>
</AIStatusSheet>
```

**Step 3: Commit**

```bash
git add src/renderer/components/ai-status-sheet.tsx src/renderer/components/layout/app-shell.tsx
git commit -m "feat: add AI status sheet with logs panel"
```

---

### Task 5.2: Add Sonner Toast Notifications

**Files:**
- Modify: `src/renderer/main.tsx`
- Update various pages to use toast notifications

**Step 1: Add Toaster to main.tsx**

Update `src/renderer/main.tsx` to include Sonner:

```tsx
import { Toaster } from '@/components/ui/sonner'

// Add inside the providers, after App:
<Toaster />
```

**Step 2: Commit**

```bash
git add src/renderer/main.tsx
git commit -m "feat: add toast notifications with Sonner"
```

---

### Task 5.3: Update Path Aliases

**Files:**
- Modify: `tsconfig.json`
- Modify: `vite.config.ts` (if needed)

**Step 1: Verify path aliases work**

The shadcn components use `@/components/ui/...` imports. Verify these resolve correctly.

Check `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Step 2: Commit if changes needed**

```bash
git add tsconfig.json vite.config.ts
git commit -m "fix: configure path aliases for shadcn imports"
```

---

### Task 5.4: Clean Up Old Components

**Files:**
- Remove: `src/renderer/components/Layout/Header.tsx`
- Remove: `src/renderer/components/Layout/MainContent.tsx`
- Remove: `src/renderer/styles/global.css` (old styles)

**Step 1: Remove old layout components**

Once the new layout is working, remove the old components that are no longer used.

**Step 2: Commit**

```bash
git rm src/renderer/components/Layout/Header.tsx src/renderer/components/Layout/MainContent.tsx
git commit -m "chore: remove old layout components replaced by shadcn shell"
```

---

### Task 5.5: Final Integration Test

**Step 1: Run the app**

```bash
npm run dev
```

**Step 2: Verify all pages**

- [ ] Dashboard loads with status cards
- [ ] Profile editor shows form sections
- [ ] Templates gallery displays grid
- [ ] Job targeting has URL input and analysis
- [ ] Preview shows PDF preview area
- [ ] History shows export list
- [ ] Settings has all configuration options
- [ ] Theme toggle works (dark/light)
- [ ] AI status badge updates
- [ ] Sidebar navigation works

**Step 3: Run typecheck**

```bash
npm run typecheck
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete shadcn redesign implementation"
```

---

## Summary

This plan implements the Resume Tailor redesign in 5 phases:

1. **Foundation** (Tasks 1.1-1.6): Install components, create providers, build shell
2. **Core Pages** (Tasks 2.1-2.4): Dashboard, Profile Editor, Templates
3. **Job Flow** (Tasks 3.1-3.2): Job Targeting, Preview & Export
4. **Supporting** (Tasks 4.1-4.2): History, Settings
5. **Polish** (Tasks 5.1-5.5): AI status sheet, toasts, cleanup

Each task is self-contained with exact file paths and code snippets.

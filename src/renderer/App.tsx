import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/Layout'
import {
  DashboardPage,
  ProfilePage,
  TargetingPage,
  CoverLetterPage,
  SettingsPage,
  TrackingPage,
} from '@/components/pages'
import { OnboardingFlow } from '@/components/onboarding'
import { APP_PAGES } from '@config/constants'

/**
 * Loading screen component displayed while checking onboarding status.
 */
function LoadingScreen(): React.JSX.Element {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="text-primary size-10 animate-spin" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  )
}

// Key for storing current page in sessionStorage (survives refresh, not tab close)
const PAGE_STORAGE_KEY = 'resume-creator-active-page'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  // Restore page from sessionStorage on mount
  const [activePage, setActivePage] = useState<APP_PAGES>(() => {
    const stored = sessionStorage.getItem(PAGE_STORAGE_KEY)
    if (stored && Object.values(APP_PAGES).includes(stored as APP_PAGES)) {
      return stored as APP_PAGES
    }
    return APP_PAGES.DASHBOARD
  })

  // Persist active page to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(PAGE_STORAGE_KEY, activePage)
  }, [activePage])

  /**
   * Check if onboarding is needed on app startup.
   * Shows onboarding if user has no profile or hasn't completed onboarding.
   */
  useEffect(() => {
    async function checkOnboarding() {
      try {
        const [hasProfile, isComplete] = await Promise.all([
          window.electronAPI.hasProfile(),
          window.electronAPI.isOnboardingComplete(),
        ])
        setShowOnboarding(!hasProfile || !isComplete)
      } catch (error) {
        console.error('Failed to check onboarding status:', error)
        // On error, assume we need onboarding to be safe
        setShowOnboarding(true)
      } finally {
        setIsLoading(false)
      }
    }
    checkOnboarding()
  }, [])

  /**
   * Handle onboarding completion.
   */
  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false)
  }, [])

  const renderPage = () => {
    switch (activePage) {
      case APP_PAGES.DASHBOARD:
        return <DashboardPage onNavigate={page => setActivePage(page)} />
      case APP_PAGES.RESUME:
        return <ProfilePage />
      case APP_PAGES.TARGETING:
        return <TargetingPage />
      case APP_PAGES.COVER_LETTER:
        return <CoverLetterPage />
      case APP_PAGES.TRACKING:
        return <TrackingPage />
      case APP_PAGES.SETTINGS:
        return <SettingsPage />
      default:
        return <DashboardPage onNavigate={page => setActivePage(page)} />
    }
  }

  // Show loading screen while checking onboarding status
  if (isLoading) {
    return <LoadingScreen />
  }

  // Show onboarding flow if needed
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  // Show main app
  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </AppShell>
  )
}

export default App

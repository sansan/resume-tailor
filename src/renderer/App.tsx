import { useState } from 'react'
import { AppShell } from '@/components/Layout'
import {
  DashboardPage,
  ProfilePage,
  TargetingPage,
  PreviewPage,
  SettingsPage,
} from '@/components/pages'
import { APP_PAGES } from '@config/constants'

function App() {
  const [activePage, setActivePage] = useState<APP_PAGES>(APP_PAGES.DASHBOARD)

  const renderPage = () => {
    switch (activePage) {
      case APP_PAGES.DASHBOARD:
        return <DashboardPage onNavigate={(page) => setActivePage(page)} />
      case APP_PAGES.RESUME:
        return <ProfilePage />
      case APP_PAGES.TARGETING:
        return <TargetingPage />
      case APP_PAGES.COVER_LETTER:
        return <PreviewPage />
      case APP_PAGES.SETTINGS:
        return <SettingsPage />
      default:
        return <DashboardPage onNavigate={(page) => setActivePage(page)} />
    }
  }

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </AppShell>
  )
}

export default App

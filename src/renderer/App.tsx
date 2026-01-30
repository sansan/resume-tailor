import { useState } from 'react'
import { AppShell, type PageId } from './components/Layout'
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
        return <DashboardPage onNavigate={(page) => setActivePage(page as PageId)} />
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

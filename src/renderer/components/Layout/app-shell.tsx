import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'
import { APP_PAGES } from '@config/constants'

interface AppShellProps {
  activePage: APP_PAGES
  onNavigate: (page: APP_PAGES) => void
  children: React.ReactNode
}

export function AppShell({ activePage, onNavigate, children }: Readonly<AppShellProps>) {
  return (
    <SidebarProvider>
      <AppSidebar activePage={activePage} onNavigate={onNavigate} />
      <SidebarInset>
        <main className="flex-1 overflow-auto scrollbar-hide p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

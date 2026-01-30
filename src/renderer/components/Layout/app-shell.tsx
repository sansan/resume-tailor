import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AppSidebar, type PageId } from './app-sidebar'
import { useAIStatus } from '@renderer/components/ai-status-provider'
import { AIStatusSheet } from '@renderer/components/ai-status-sheet'

interface AppShellProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
  children: React.ReactNode
}

function AIStatusBadge() {
  const { status, isAvailable } = useAIStatus()

  const badge = (() => {
    if (!isAvailable) {
      return <Badge variant="destructive">AI Unavailable</Badge>
    }

    if (status === 'processing') {
      return <Badge variant="secondary">AI Processing</Badge>
    }

    if (status === 'error') {
      return <Badge variant="destructive">AI Error</Badge>
    }

    return <Badge variant="outline">AI Ready</Badge>
  })()

  return (
    <AIStatusSheet>
      <button className="cursor-pointer">
        {badge}
      </button>
    </AIStatusSheet>
  )
}

export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar activePage={activePage} onNavigate={onNavigate} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-sm font-medium capitalize">{activePage}</h1>
            <AIStatusBadge />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

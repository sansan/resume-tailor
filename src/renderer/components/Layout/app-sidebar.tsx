import { useState } from 'react'
import {
  LayoutDashboard,
  User,
  Target,
  FileOutput,
  Settings,
  PanelLeftClose,
  PanelLeft,
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
  useSidebar,
} from '@/components/ui/sidebar'
import { useAIStatus } from '@/components/ai-status-provider'
import { APP_PAGES } from '@config/constants'

interface AppSidebarProps {
  activePage: APP_PAGES
  onNavigate: (page: APP_PAGES) => void
}

// Main nav items (without Settings)
const navItems: Array<{ id: APP_PAGES; label: string; icon: typeof LayoutDashboard }> = [
  { id: APP_PAGES.DASHBOARD, label: APP_PAGES.DASHBOARD, icon: LayoutDashboard },
  { id: APP_PAGES.RESUME, label: APP_PAGES.RESUME, icon: User },
  { id: APP_PAGES.COVER_LETTER, label: APP_PAGES.COVER_LETTER, icon: FileOutput },
  { id: APP_PAGES.TARGETING, label: APP_PAGES.TARGETING, icon: Target },
]

function AIStatusIndicator() {
  const { status, isAvailable } = useAIStatus()

  const getStatusColor = () => {
    if (!isAvailable) return 'bg-red-500'
    if (status === 'processing') return 'bg-yellow-500'
    if (status === 'error') return 'bg-red-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (!isAvailable) return 'AI Unavailable'
    if (status === 'processing') return 'AI Processing'
    if (status === 'error') return 'AI Error'
    return 'AI Ready'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        <span className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap group-data-[collapsible=icon]:hidden">{getStatusText()}</span>
    </div>
  )
}

export function AppSidebar({ activePage, onNavigate }: AppSidebarProps) {
  const { toggleSidebar, open } = useSidebar()
  const [isHeaderHovered, setIsHeaderHovered] = useState(false)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className="shrink-0 border-b border-sidebar-border p-2"
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
        <div className="flex items-center gap-2">
          {/* Logo - clickable to expand when collapsed */}
          <button
            onClick={() => !open && toggleSidebar()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground relative"
          >
            {/* Show expand icon on hover when collapsed */}
            {!open && isHeaderHovered ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <FileOutput className="h-4 w-4" />
            )}
          </button>
          <span className="font-semibold whitespace-nowrap group-data-[collapsible=icon]:hidden flex-1">Resume Tailor</span>
          {/* Collapse button - only visible when expanded */}
          {open && (
            <button
              onClick={toggleSidebar}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-auto scrollbar-hide">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="items-start">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activePage === item.id}
                    onClick={() => onNavigate(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="shrink-0 border-t border-sidebar-border p-2">
        <AIStatusIndicator />
        {/* Settings at the very bottom */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activePage === APP_PAGES.SETTINGS}
              onClick={() => onNavigate(APP_PAGES.SETTINGS)}
              tooltip="Settings"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap group-data-[collapsible=icon]:hidden">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

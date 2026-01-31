import {
  LayoutDashboard,
  User,
  Target,
  FileOutput,
  Settings,
  Moon,
  Sun,
  Monitor,
  PanelLeftClose, PanelLeft
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/theme-provider'
import { useAIStatus } from '@/components/ai-status-provider'
import { APP_PAGES } from '@config/constants'

interface AppSidebarProps {
  activePage: APP_PAGES
  onNavigate: (page: APP_PAGES) => void
}

const navItems: Array<{ id: APP_PAGES; label: string; icon: typeof LayoutDashboard }> = [
  { id: APP_PAGES.DASHBOARD, label: APP_PAGES.DASHBOARD, icon: LayoutDashboard },
  { id: APP_PAGES.RESUME, label: APP_PAGES.RESUME, icon: User },
  { id: APP_PAGES.COVER_LETTER, label: APP_PAGES.COVER_LETTER, icon: FileOutput },
  { id: APP_PAGES.TARGETING, label: APP_PAGES.TARGETING, icon: Target },
  { id: APP_PAGES.SETTINGS, label: APP_PAGES.SETTINGS, icon: Settings },
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

function SidebarToggle() {
  const { toggleSidebar, open } = useSidebar()

  return (
    <button
      onClick={toggleSidebar}
      className="flex h-8 w-full items-center gap-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
      </div>
      <span className="text-xs whitespace-nowrap group-data-[collapsible=icon]:hidden">
        {open ? 'Collapse' : 'Expand'}
      </span>
    </button>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const getIcon = () => {
    if (theme === 'dark') return <Moon className="h-4 w-4" />
    if (theme === 'light') return <Sun className="h-4 w-4" />
    return <Monitor className="h-4 w-4" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 w-full items-center gap-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center">
            {getIcon()}
          </div>
          <span className="text-xs whitespace-nowrap group-data-[collapsible=icon]:hidden">
            {theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-32">
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
  )
}

export function AppSidebar({ activePage, onNavigate }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="shrink-0 border-b border-sidebar-border p-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileOutput className="h-4 w-4" />
          </div>
          <span className="font-semibold whitespace-nowrap group-data-[collapsible=icon]:hidden">Resume Tailor</span>
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
        <ThemeToggle />
        <SidebarToggle />
      </SidebarFooter>
    </Sidebar>
  )
}

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
import { Button } from '@/components/ui/button'
import { useTheme } from '@renderer/components/theme-provider'
import { useAIStatus } from '@renderer/components/ai-status-provider'

export type PageId =
  | 'dashboard'
  | 'profile'
  | 'templates'
  | 'targeting'
  | 'preview'
  | 'history'
  | 'settings'

interface AppSidebarProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
}

const navItems: Array<{ id: PageId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'templates', label: 'Templates', icon: Palette },
  { id: 'targeting', label: 'Job Targeting', icon: Target },
  { id: 'preview', label: 'Preview & Export', icon: FileOutput },
  { id: 'history', label: 'History', icon: History },
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
    <div className="flex items-center gap-2 px-2 py-1.5">
      <span className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
      <span className="text-xs text-muted-foreground">{getStatusText()}</span>
    </div>
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
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
          {getIcon()}
          <span className="text-xs">
            {theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'}
          </span>
        </Button>
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
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileOutput className="h-4 w-4" />
          </div>
          <span className="font-semibold">Resume Tailor</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activePage === item.id}
                    onClick={() => onNavigate(item.id)}
                    tooltip={item.label}
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
                  tooltip="Settings"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <AIStatusIndicator />
        <ThemeToggle />
      </SidebarFooter>
    </Sidebar>
  )
}

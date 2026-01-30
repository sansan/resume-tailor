import { useState, useEffect } from 'react'
import {
  Settings,
  Cpu,
  FolderOpen,
  Shield,
  CheckCircle2,
  AlertCircle,
  Folder,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { cn } from '@/lib/utils'
import { useSettings } from '@/renderer/hooks/useSettings'
import { useAIStatus } from '@/renderer/components/ai-status-provider'

// Template data for the default template selector
const TEMPLATES = [
  {
    id: 'modern-professional',
    name: 'Modern Professional',
    description: 'Clean and contemporary design with plenty of white space.',
  },
  {
    id: 'minimalist-bold',
    name: 'Minimalist Bold',
    description: 'Simple yet impactful layout with bold typography.',
  },
  {
    id: 'executive-two-column',
    name: 'Executive Two-Column',
    description: 'Traditional two-column layout for senior positions.',
  },
]

// Navigation items for the left sidebar
const NAV_ITEMS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'ai-tools', label: 'AI Tools', icon: Cpu },
  { id: 'storage', label: 'Storage', icon: FolderOpen },
  { id: 'privacy', label: 'Privacy', icon: Shield },
]

export function SettingsPage() {
  const { settings, isLoading, updateSettings, selectOutputFolder } = useSettings()
  const { isAvailable, version, checkAvailability } = useAIStatus()

  // Local state
  const [selectedTemplate, setSelectedTemplate] = useState('modern-professional')
  const [outputFolder, setOutputFolder] = useState('')
  const [activeNav, setActiveNav] = useState('general')

  // Sync output folder from settings
  useEffect(() => {
    if (settings?.outputFolderPath) {
      setOutputFolder(settings.outputFolderPath)
    }
  }, [settings?.outputFolderPath])

  // Handle output folder selection
  const handleSelectOutputFolder = async () => {
    const folderPath = await selectOutputFolder()
    if (folderPath) {
      setOutputFolder(folderPath)
    }
  }

  // Handle re-check AI status
  const handleRecheckStatus = () => {
    checkAvailability()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure how Resume Tailor works.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure how Resume Tailor works.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-4 gap-6">
        {/* Left Navigation Card */}
        <div className="col-span-1">
          <Card>
            <CardContent className="p-4">
              <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  const isActive = activeNav === item.id
                  return (
                    <Button
                      key={item.id}
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="justify-start gap-2"
                      onClick={() => setActiveNav(item.id)}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Right Content Cards */}
        <div className="col-span-3 space-y-6">
          {/* CLI Configuration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                <CardTitle>CLI Configuration</CardTitle>
              </div>
              <CardDescription>
                Configure the path to your Claude CLI installation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cli-path">CLI Executable Path</Label>
                <div className="flex gap-2">
                  <Input
                    id="cli-path"
                    placeholder="/usr/local/bin/claude"
                    value=""
                    readOnly
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon">
                    <Folder className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Status Line */}
              <div className="flex items-center gap-2">
                {isAvailable ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">
                      Path validated successfully
                    </span>
                    {version && (
                      <Badge variant="secondary" className="ml-2">
                        v{version}
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-yellow-600">CLI not found</span>
                  </>
                )}
              </div>

              <Button variant="outline" onClick={handleRecheckStatus}>
                Re-check Status
              </Button>
            </CardContent>
          </Card>

          {/* Default Template Card */}
          <Card>
            <CardHeader>
              <CardTitle>Default Template</CardTitle>
              <CardDescription>
                Choose the default template for new resumes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {TEMPLATES.map((template) => (
                  <TemplateSelectionCard
                    key={template.id}
                    id={template.id}
                    name={template.name}
                    description={template.description}
                    isSelected={selectedTemplate === template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Output Folder Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                <CardTitle>Output Folder</CardTitle>
              </div>
              <CardDescription>
                Where exported PDFs will be saved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="~/Documents/cv-rebu-exports"
                  value={outputFolder}
                  onChange={(e) => {
                    setOutputFolder(e.target.value)
                    updateSettings({ outputFolderPath: e.target.value })
                  }}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleSelectOutputFolder}>
                  <Folder className="h-4 w-4 mr-2" />
                  Browse
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Privacy & Security</CardTitle>
              </div>
              <CardDescription>
                Control how your data is handled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Local Processing Only */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="local-processing">Local Processing Only</Label>
                  <p className="text-sm text-muted-foreground">
                    All AI processing happens on your machine
                  </p>
                </div>
                <Switch id="local-processing" checked disabled />
              </div>

              <Separator />

              {/* Save History */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="save-history">Save History</Label>
                  <p className="text-sm text-muted-foreground">
                    Keep track of exported documents
                  </p>
                </div>
                <Switch id="save-history" defaultChecked />
              </div>

              <Separator />

              {/* Analytics */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics">Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Send anonymous usage statistics
                  </p>
                </div>
                <Switch id="analytics" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Template selection card component (simplified version)
interface TemplateSelectionCardProps {
  id: string
  name: string
  description: string
  isSelected: boolean
  onClick: () => void
}

function TemplateSelectionCard({
  id,
  name,
  description,
  isSelected,
  onClick,
}: TemplateSelectionCardProps) {
  return (
    <Card
      data-template-id={id}
      className={cn(
        'cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Thumbnail area with 3:4 aspect ratio */}
        <div className="relative mb-3">
          <AspectRatio ratio={3 / 4}>
            <div className="h-full w-full rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <span className="text-4xl font-bold text-muted-foreground/30">
                CV
              </span>
            </div>
          </AspectRatio>

          {/* Selected checkmark overlay */}
          {isSelected && (
            <div className="absolute top-2 right-2">
              <CheckCircle2 className="h-6 w-6 text-primary fill-background" />
            </div>
          )}
        </div>

        {/* Template name */}
        <div className="space-y-1.5">
          <h3 className="font-medium text-sm">{name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

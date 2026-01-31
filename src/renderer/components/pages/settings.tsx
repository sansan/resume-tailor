import { useEffect } from 'react'
import {
  Cpu,
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
import { useSettings } from '@/hooks/useSettings'

export function SettingsPage() {
  const { settings, isLoading } = useSettings()

  // Sync output folder from settings
  useEffect(() => {
    // Future: sync output folder from settings
  }, [settings?.outputFolderPath])

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


        {/* Right Content Cards */}
        <div className="col-span-4 space-y-6">
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

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

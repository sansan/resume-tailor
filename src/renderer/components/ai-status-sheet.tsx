import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Trash2 } from 'lucide-react'
import { useAIStatus } from './ai-status-provider'

export function AIStatusSheet({ children }: { children: React.ReactNode }) {
  const { status, isAvailable, version, error, logs, checkAvailability, clearLogs } = useAIStatus()

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            AI Status
            <Badge variant={isAvailable ? 'default' : 'destructive'}>
              {isAvailable ? 'Available' : 'Unavailable'}
            </Badge>
          </SheetTitle>
          <SheetDescription>Local AI processing status and logs.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-4">
          {/* Status Info */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="capitalize">{status}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Claude CLI Version</span>
              <span>{version || 'Not detected'}</span>
            </div>
            {error && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Error</span>
                <span className="text-destructive">{error}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={checkAvailability}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-check
            </Button>
          </div>

          <Separator />

          {/* Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">System Logs</h4>
              <Button variant="ghost" size="sm" onClick={clearLogs}>
                <Trash2 className="mr-1 h-4 w-4" />
                Clear
              </Button>
            </div>
            <ScrollArea className="bg-muted h-[300px] rounded-md border p-4">
              <pre className="font-mono text-xs">
                {logs.length > 0 ? logs.join('\n') : 'No logs yet...'}
              </pre>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

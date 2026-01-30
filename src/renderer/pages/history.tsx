import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Folder, ExternalLink, Trash2, Clock } from 'lucide-react'
import { useExportHistory } from '../hooks/useExportHistory'

export function HistoryPage() {
  const { entries, isLoading, clearHistory, openFile, openFolder } = useExportHistory()

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleOpenFile = async (filePath: string | undefined) => {
    if (filePath) {
      await openFile(filePath)
    }
  }

  const handleOpenFolder = async (folderPath: string) => {
    await openFolder(folderPath)
  }

  const handleClearHistory = async () => {
    await clearHistory()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Export History</h1>
          <p className="text-muted-foreground">
            View your previously exported documents.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">Loading history...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Export History</h1>
          <p className="text-muted-foreground">
            View your previously exported documents.
          </p>
        </div>
        {entries.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Empty State */}
      {entries.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No exports yet</h3>
            <p className="text-sm text-muted-foreground text-center">
              Your exported resumes and cover letters will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* History List */}
      {entries.length > 0 && (
        <Card>
          <ScrollArea className="h-[500px]">
            <CardContent className="p-0">
              <div className="divide-y">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {entry.jobTitle} at {entry.companyName}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <span>{formatDate(entry.date)}</span>
                        {entry.resumePath && (
                          <>
                            <span className="mx-1">-</span>
                            <Badge variant="secondary" className="text-xs">
                              Resume
                            </Badge>
                          </>
                        )}
                        {entry.coverLetterPath && (
                          <>
                            <span className="mx-1">-</span>
                            <Badge variant="secondary" className="text-xs">
                              Cover Letter
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {entry.resumePath && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenFile(entry.resumePath)}
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Resume
                        </Button>
                      )}
                      {entry.coverLetterPath && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenFile(entry.coverLetterPath)}
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Letter
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenFolder(entry.folderPath)}
                      >
                        <Folder className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}

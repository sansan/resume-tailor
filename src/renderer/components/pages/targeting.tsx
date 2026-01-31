import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Link2,
  FileText,
  Sparkles,
  Eye,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Circle,
  ChevronDown,
  Info,
} from 'lucide-react'

type InputMode = 'url' | 'paste'
type Tone = 'professional' | 'creative' | 'bold'

const SENIORITY_LABELS = ['Junior', 'Associate', 'Mid', 'Senior', 'Exec']

// Mock requirements data
const mockRequirements = [
  {
    id: 1,
    label: 'React & Next.js',
    status: 'matched' as const,
    badge: 'EXPERT',
    badgeVariant: 'default' as const,
  },
  {
    id: 2,
    label: 'TypeScript',
    status: 'matched' as const,
    badge: null,
    badgeVariant: 'default' as const,
  },
  {
    id: 3,
    label: 'AWS Cloud Practitioner',
    status: 'partial' as const,
    badge: 'UPDATING',
    badgeVariant: 'secondary' as const,
  },
  {
    id: 4,
    label: 'Docker & Kubernetes',
    status: 'missing' as const,
    badge: 'MISSING',
    badgeVariant: 'outline' as const,
  },
]

// Mock keywords
const mockKeywords = ['TailwindCSS', 'Node.js', 'Agile', 'PostgreSQL', 'SQL']

// Mock CLI error logs
const mockErrorLogs = `[2024-01-15 14:32:01] INFO: Initiating URL fetch...
[2024-01-15 14:32:02] DEBUG: Resolving DNS for job-portal.example.com
[2024-01-15 14:32:03] WARN: SSL certificate validation warning
[2024-01-15 14:32:05] ERROR: Connection timeout after 5000ms
[2024-01-15 14:32:05] ERROR: Failed to fetch job description
[2024-01-15 14:32:05] INFO: Retry attempt 1 of 3...
[2024-01-15 14:32:08] ERROR: Connection refused by remote host
[2024-01-15 14:32:08] FATAL: Unable to retrieve job posting content`

export function TargetingPage() {
  const [inputMode, setInputMode] = useState<InputMode>('url')
  const [jobUrl, setJobUrl] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [seniority, setSeniority] = useState<number[]>([2])
  const [tone, setTone] = useState<Tone>('professional')
  const [showLogs, setShowLogs] = useState(false)

  const handleFetch = () => {
    // Simulated fetch that sets an error for demo
    setFetchError(
      'Unable to fetch job description. The page may be protected or require authentication.'
    )
  }

  const handlePasteManually = () => {
    setInputMode('paste')
    setFetchError(null)
  }

  const handleTryAgain = () => {
    setFetchError(null)
    handleFetch()
  }

  const getStatusIcon = (status: 'matched' | 'partial' | 'missing') => {
    switch (status) {
      case 'matched':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'missing':
        return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Targeting</h1>
        <p className="text-muted-foreground">
          Input job details to start the AI tailoring process.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job URL Input Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Job URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/job/software-engineer"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleFetch}>Fetch</Button>
              </div>

              {fetchError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Fetch Failed</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>{fetchError}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePasteManually}
                      >
                        Paste description manually
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleTryAgain}>
                        Try again
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">
                  or paste description
                </span>
                <Separator className="flex-1" />
              </div>

              {(inputMode === 'paste' || fetchError) && (
                <Textarea
                  placeholder="Paste the job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[200px]"
                />
              )}
            </CardContent>
          </Card>

          {/* What will change Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                What will change
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The AI will analyze your resume against the job description and
                optimize your skills, experience descriptions, and summary to
                better match the role requirements. Your original data is
                preserved - only the presentation and emphasis will be adjusted.
              </p>
            </CardContent>
          </Card>

          {/* Fine-tune Output Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Fine-tune Output
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Seniority Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Seniority Level</Label>
                  <span className="text-sm font-medium">
                    {SENIORITY_LABELS[seniority[0] ?? 2]}
                  </span>
                </div>
                <Slider
                  value={seniority}
                  onValueChange={setSeniority}
                  min={0}
                  max={4}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {SENIORITY_LABELS.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>

              {/* Tone ToggleGroup */}
              <div className="space-y-3">
                <Label>Tone</Label>
                <ToggleGroup
                  type="single"
                  value={tone}
                  onValueChange={(value) => value && setTone(value as Tone)}
                  variant="outline"
                >
                  <ToggleGroupItem value="professional">
                    Professional
                  </ToggleGroupItem>
                  <ToggleGroupItem value="creative">Creative</ToggleGroupItem>
                  <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardContent>
          </Card>

          {/* Error Logs (Collapsible) */}
          {fetchError && (
            <Collapsible open={showLogs} onOpenChange={setShowLogs}>
              <Card>
                <CardHeader className="pb-3">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-0 h-auto hover:bg-transparent"
                    >
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        Error Logs
                      </CardTitle>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          showLogs ? 'rotate-180' : ''
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto scrollbar-hide font-mono">
                      {mockErrorLogs}
                    </pre>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview CV
            </Button>
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" />
              Tailor CV + Draft Cover Letter
            </Button>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Requirements Checklist Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Requirements Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockRequirements.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(req.status)}
                    <span className="text-sm">{req.label}</span>
                  </div>
                  {req.badge && (
                    <Badge variant={req.badgeVariant}>{req.badge}</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Keyword Coverage Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Keyword Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Technical Match */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Technical Match</span>
                  <span className="font-medium">80%</span>
                </div>
                <Progress value={80} className="h-2" />
              </div>

              {/* Soft Skills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Soft Skills</span>
                  <span className="font-medium">45%</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>

              {/* Keywords */}
              <div className="flex flex-wrap gap-2 pt-2">
                {mockKeywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Download, Save, FileText, Clock } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import ResumePreview from '@/components/Resume/ResumePreview'
import { useResume } from '@/hooks/useResume'

export function PreviewPage() {
  const { resume } = useResume()

  // Tab state
  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>('resume')

  // Template settings state
  const [template, setTemplate] = useState('professional-modern')
  const [fontSize, setFontSize] = useState(11)
  const [lineHeight, setLineHeight] = useState(1.4)
  const [showSummary, setShowSummary] = useState(true)
  const [showSkills, setShowSkills] = useState(true)
  const [showCertifications, setShowCertifications] = useState(true)
  const [showReferences, setShowReferences] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Preview & Export</h1>
          <p className="text-muted-foreground">
            Preview your resume and export it to PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - Preview area (2/3) */}
        <div className="lg:col-span-2">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'resume' | 'cover-letter')}
          >
            <TabsList>
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
            </TabsList>

            <TabsContent value="resume" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {/* Preview container with letter aspect ratio (8.5:11) */}
                  <div
                    className="mx-auto bg-white shadow-lg overflow-auto scrollbar-hide"
                    style={{
                      aspectRatio: '8.5 / 11',
                      maxHeight: '80vh',
                    }}
                  >
                    {resume ? (
                      <div className="h-full w-full p-6">
                        <ResumePreview resume={resume} />
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                        <FileText className="mb-4 h-16 w-16 opacity-50" />
                        <p className="text-lg font-medium">No resume loaded</p>
                        <p className="text-sm">
                          Load or create a resume to see the preview
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Page indicator */}
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Page 1 of 1
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cover-letter" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {/* Preview container with letter aspect ratio */}
                  <div
                    className="mx-auto bg-white shadow-lg overflow-auto scrollbar-hide"
                    style={{
                      aspectRatio: '8.5 / 11',
                      maxHeight: '80vh',
                    }}
                  >
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                      <FileText className="mb-4 h-16 w-16 opacity-50" />
                      <p className="text-lg font-medium">No cover letter generated</p>
                      <p className="text-sm text-center px-4">
                        Use Job Targeting to generate one
                      </p>
                    </div>
                  </div>
                  {/* Page indicator */}
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Page 1 of 1
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column - Settings panel (1/3) */}
        <div className="space-y-6">
          {/* Template Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Template Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Layout Select */}
              <div className="space-y-2">
                <Label htmlFor="layout-select">Current Layout</Label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger id="layout-select" className="w-full">
                    <SelectValue placeholder="Select a layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional-modern">
                      Professional Modern (Default)
                    </SelectItem>
                    <SelectItem value="minimalist-bold">Minimalist Bold</SelectItem>
                    <SelectItem value="executive-two-column">
                      Executive Two-Column
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Typography Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Typography</h4>

                {/* Font Size Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="font-size">Font Size</Label>
                    <span className="text-sm text-muted-foreground">
                      {fontSize}pt
                    </span>
                  </div>
                  <Slider
                    id="font-size"
                    min={9}
                    max={14}
                    step={0.5}
                    value={[fontSize]}
                    onValueChange={(values) => setFontSize(values[0] ?? fontSize)}
                  />
                </div>

                {/* Line Height Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="line-height">Line Height</Label>
                    <span className="text-sm text-muted-foreground">
                      {lineHeight.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    id="line-height"
                    min={1}
                    max={2}
                    step={0.1}
                    value={[lineHeight]}
                    onValueChange={(values) => setLineHeight(values[0] ?? lineHeight)}
                  />
                </div>
              </div>

              <Separator />

              {/* Content Visibility Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Content Visibility</h4>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-summary"
                      checked={showSummary}
                      onCheckedChange={(checked) =>
                        setShowSummary(checked as boolean)
                      }
                    />
                    <Label htmlFor="show-summary" className="cursor-pointer">
                      Professional Summary
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-skills"
                      checked={showSkills}
                      onCheckedChange={(checked) =>
                        setShowSkills(checked as boolean)
                      }
                    />
                    <Label htmlFor="show-skills" className="cursor-pointer">
                      Core Skills
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-certifications"
                      checked={showCertifications}
                      onCheckedChange={(checked) =>
                        setShowCertifications(checked as boolean)
                      }
                    />
                    <Label htmlFor="show-certifications" className="cursor-pointer">
                      Certifications
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-references"
                      checked={showReferences}
                      onCheckedChange={(checked) =>
                        setShowReferences(checked as boolean)
                      }
                    />
                    <Label htmlFor="show-references" className="cursor-pointer">
                      References
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Export PDF Button */}
              <Button className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </CardContent>
          </Card>

          {/* Version History Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-4">
                  {/* Version timeline items */}
                  <div className="relative border-l-2 border-muted pl-4">
                    <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">v2.4</span>
                        <span className="text-xs text-muted-foreground">
                          Today, 2:30 PM
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ATS-optimized typography tweaks
                      </p>
                    </div>
                  </div>

                  <div className="relative border-l-2 border-muted pl-4">
                    <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-muted-foreground" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Saved Draft</span>
                        <span className="text-xs text-muted-foreground">
                          Yesterday
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Added new skills section
                      </p>
                    </div>
                  </div>

                  <div className="relative border-l-2 border-muted pl-4">
                    <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-muted-foreground" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">AI Revision @ 4:15 PM</span>
                        <span className="text-xs text-muted-foreground">Jan 28</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        AI-tailored for Senior Engineer role
                      </p>
                    </div>
                  </div>

                  <div className="relative border-l-2 border-muted pl-4">
                    <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-muted-foreground" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Initial Import</span>
                        <span className="text-xs text-muted-foreground">Jan 25</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Originally imported from source PDF
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

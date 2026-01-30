import { useCallback } from 'react'
import { Save, FileJson, Sparkles } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ExperienceSection } from './experience-section'
import { EducationSection } from './education-section'
import { SkillsSection } from './skills-section'
import type { Resume, PersonalInfo, WorkExperience, Education, Skill } from '@/shared/schemas/resume.schema'

const SUMMARY_MAX_LENGTH = 500

interface ProfileFormProps {
  resume: Resume | null
  jsonText: string
  onChange: (updates: Partial<Resume>) => void
  onJsonChange: (json: string) => void
  onSave: () => void
  isDirty: boolean
}

export function ProfileForm({
  resume,
  jsonText,
  onChange,
  onJsonChange,
  onSave,
  isDirty,
}: ProfileFormProps) {
  const summary = resume?.personalInfo?.summary ?? ''
  const summaryLength = summary.length

  const handlePersonalInfoChange = useCallback(
    (field: keyof PersonalInfo, value: string) => {
      if (!resume) return
      onChange({
        personalInfo: {
          ...resume.personalInfo,
          [field]: value || undefined,
        },
      })
    },
    [resume, onChange]
  )

  const handleExperienceChange = useCallback(
    (experiences: WorkExperience[]) => {
      onChange({ workExperience: experiences })
    },
    [onChange]
  )

  const handleEducationChange = useCallback(
    (education: Education[]) => {
      onChange({ education })
    },
    [onChange]
  )

  const handleSkillsChange = useCallback(
    (skills: Skill[]) => {
      onChange({ skills })
    },
    [onChange]
  )

  const handleAiRescan = useCallback(() => {
    // TODO: Implement AI re-scan functionality
    console.log('AI Re-scan triggered')
  }, [])

  if (!resume) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No resume loaded. Please load a resume file to edit your profile.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="standard" className="w-full">
      {/* Header with tabs toggle and action buttons */}
      <div className="flex items-center justify-between mb-4">
        <TabsList>
          <TabsTrigger value="standard">Standard</TabsTrigger>
          <TabsTrigger value="json">
            <FileJson className="mr-1.5 h-4 w-4" />
            JSON
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAiRescan}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            AI Re-scan
          </Button>
          <Button size="sm" onClick={onSave} disabled={!isDirty}>
            <Save className="mr-1.5 h-4 w-4" />
            Save Profile
            {isDirty && (
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                Unsaved
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Standard View */}
      <TabsContent value="standard" className="mt-0">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-6 pr-4">
            {/* Summary Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="summary">Professional Summary</Label>
                    <span
                      className={`text-xs ${
                        summaryLength > SUMMARY_MAX_LENGTH
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {summaryLength}/{SUMMARY_MAX_LENGTH}
                    </span>
                  </div>
                  <Textarea
                    id="summary"
                    value={summary}
                    onChange={(e) => handlePersonalInfoChange('summary', e.target.value)}
                    placeholder="Write a brief professional summary highlighting your key qualifications and career objectives..."
                    className="min-h-[120px] resize-none"
                    maxLength={SUMMARY_MAX_LENGTH}
                  />
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Personal Info Section */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={resume.personalInfo.name}
                      onChange={(e) => handlePersonalInfoChange('name', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={resume.personalInfo.email}
                      onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={resume.personalInfo.phone ?? ''}
                      onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={resume.personalInfo.location ?? ''}
                      onChange={(e) => handlePersonalInfoChange('location', e.target.value)}
                      placeholder="San Francisco, CA"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      type="url"
                      value={resume.personalInfo.linkedin ?? ''}
                      onChange={(e) => handlePersonalInfoChange('linkedin', e.target.value)}
                      placeholder="https://linkedin.com/in/johndoe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={resume.personalInfo.website ?? ''}
                      onChange={(e) => handlePersonalInfoChange('website', e.target.value)}
                      placeholder="https://johndoe.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Experience Section */}
            <ExperienceSection
              experiences={resume.workExperience}
              onChange={handleExperienceChange}
            />

            <Separator />

            {/* Education Section */}
            <EducationSection
              education={resume.education}
              onChange={handleEducationChange}
            />

            <Separator />

            {/* Skills Section */}
            <SkillsSection skills={resume.skills} onChange={handleSkillsChange} />
          </div>
        </ScrollArea>
      </TabsContent>

      {/* JSON View */}
      <TabsContent value="json" className="mt-0">
        <Card>
          <CardContent className="pt-6">
            <Textarea
              value={jsonText}
              onChange={(e) => onJsonChange(e.target.value)}
              className="min-h-[calc(100vh-340px)] font-mono text-sm resize-none"
              placeholder="Paste or edit your resume JSON here..."
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

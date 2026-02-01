import { useCallback } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WorkExperience } from '@schemas/resume.schema'

interface ExperienceSectionProps {
  experiences: WorkExperience[]
  onChange: (experiences: WorkExperience[]) => void
}

function createEmptyExperience(): WorkExperience {
  return {
    company: '',
    title: '',
    startDate: '',
    endDate: undefined,
    location: undefined,
    highlights: [],
  }
}

export function ExperienceSection({ experiences, onChange }: ExperienceSectionProps) {
  const handleAddEntry = useCallback(() => {
    onChange([...experiences, createEmptyExperience()])
  }, [experiences, onChange])

  const handleDeleteEntry = useCallback(
    (index: number) => {
      const updated = experiences.filter((_, i) => i !== index)
      onChange(updated)
    },
    [experiences, onChange]
  )

  const handleUpdateEntry = useCallback(
    (index: number, field: keyof WorkExperience, value: string | string[] | undefined) => {
      const updated = experiences.map((exp, i) => {
        if (i !== index) return exp
        return { ...exp, [field]: value }
      })
      onChange(updated)
    },
    [experiences, onChange]
  )

  const handleAddHighlight = useCallback(
    (index: number) => {
      const updated = experiences.map((exp, i) => {
        if (i !== index) return exp
        return { ...exp, highlights: [...exp.highlights, ''] }
      })
      onChange(updated)
    },
    [experiences, onChange]
  )

  const handleUpdateHighlight = useCallback(
    (expIndex: number, highlightIndex: number, value: string) => {
      const updated = experiences.map((exp, i) => {
        if (i !== expIndex) return exp
        const newHighlights = exp.highlights.map((h, hi) => (hi === highlightIndex ? value : h))
        return { ...exp, highlights: newHighlights }
      })
      onChange(updated)
    },
    [experiences, onChange]
  )

  const handleRemoveHighlight = useCallback(
    (expIndex: number, highlightIndex: number) => {
      const updated = experiences.map((exp, i) => {
        if (i !== expIndex) return exp
        const newHighlights = exp.highlights.filter((_, hi) => hi !== highlightIndex)
        return { ...exp, highlights: newHighlights }
      })
      onChange(updated)
    },
    [experiences, onChange]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Experience</h3>
        <Button variant="outline" size="sm" onClick={handleAddEntry}>
          <Plus className="mr-1 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {experiences.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center">
            No work experience added yet. Click "Add Entry" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {experiences.map((experience, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  {/* Drag handle */}
                  <div className="flex items-start pt-2">
                    <GripVertical
                      className="text-muted-foreground h-5 w-5 cursor-grab"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Form fields */}
                  <div className="flex-1 space-y-4">
                    {/* Row 1: Job Title and Period */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-1">
                        <Label htmlFor={`title-${index}`}>Job Title</Label>
                        <Input
                          id={`title-${index}`}
                          value={experience.title}
                          onChange={e => handleUpdateEntry(index, 'title', e.target.value)}
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`startDate-${index}`}>Start Date</Label>
                        <Input
                          id={`startDate-${index}`}
                          value={experience.startDate}
                          onChange={e => handleUpdateEntry(index, 'startDate', e.target.value)}
                          placeholder="Jan 2020"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`endDate-${index}`}>End Date</Label>
                        <Input
                          id={`endDate-${index}`}
                          value={experience.endDate ?? ''}
                          onChange={e =>
                            handleUpdateEntry(index, 'endDate', e.target.value || undefined)
                          }
                          placeholder="Present"
                        />
                      </div>
                    </div>

                    {/* Row 2: Company and Location */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`company-${index}`}>Company</Label>
                        <Input
                          id={`company-${index}`}
                          value={experience.company}
                          onChange={e => handleUpdateEntry(index, 'company', e.target.value)}
                          placeholder="Acme Corp"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`location-${index}`}>Location</Label>
                        <Input
                          id={`location-${index}`}
                          value={experience.location ?? ''}
                          onChange={e =>
                            handleUpdateEntry(index, 'location', e.target.value || undefined)
                          }
                          placeholder="San Francisco, CA"
                        />
                      </div>
                    </div>

                    {/* Highlights / Bullet Points */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Highlights</Label>
                        <Button variant="ghost" size="sm" onClick={() => handleAddHighlight(index)}>
                          <Plus className="mr-1 h-3 w-3" />
                          Add
                        </Button>
                      </div>
                      {experience.highlights.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No highlights yet. Add bullet points to describe your achievements.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {experience.highlights.map((highlight, hIndex) => (
                            <div key={hIndex} className="flex gap-2">
                              <Input
                                value={highlight}
                                onChange={e => handleUpdateHighlight(index, hIndex, e.target.value)}
                                placeholder="Describe an achievement or responsibility"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveHighlight(index, hIndex)}
                                aria-label="Remove highlight"
                              >
                                <Trash2 className="text-muted-foreground h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delete entry button */}
                  <div className="flex items-start">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteEntry(index)}
                      aria-label="Delete experience entry"
                    >
                      <Trash2 className="text-destructive h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

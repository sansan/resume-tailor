import { useCallback } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Education } from '@schemas/resume.schema'

interface EducationSectionProps {
  education: Education[]
  onChange: (education: Education[]) => void
}

function createEmptyEducation(): Education {
  return {
    institution: '',
    degree: '',
    field: undefined,
    graduationDate: undefined,
    gpa: undefined,
    highlights: [],
  }
}

export function EducationSection({ education, onChange }: EducationSectionProps) {
  const handleAddEntry = useCallback(() => {
    onChange([...education, createEmptyEducation()])
  }, [education, onChange])

  const handleDeleteEntry = useCallback(
    (index: number) => {
      const updated = education.filter((_, i) => i !== index)
      onChange(updated)
    },
    [education, onChange]
  )

  const handleUpdateEntry = useCallback(
    (index: number, field: keyof Education, value: string | string[] | undefined) => {
      const updated = education.map((edu, i) => {
        if (i !== index) return edu
        return { ...edu, [field]: value }
      })
      onChange(updated)
    },
    [education, onChange]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Education</h3>
        <Button variant="outline" size="sm" onClick={handleAddEntry}>
          <Plus className="mr-1 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {education.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No education entries added yet. Click "Add Entry" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {education.map((edu, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  {/* Drag handle */}
                  <div className="flex items-start pt-2">
                    <GripVertical
                      className="h-5 w-5 text-muted-foreground cursor-grab"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Form fields */}
                  <div className="flex-1 space-y-4">
                    {/* Row 1: Degree and Field */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`degree-${index}`}>Degree</Label>
                        <Input
                          id={`degree-${index}`}
                          value={edu.degree}
                          onChange={(e) => handleUpdateEntry(index, 'degree', e.target.value)}
                          placeholder="Bachelor of Science"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`field-${index}`}>Field of Study</Label>
                        <Input
                          id={`field-${index}`}
                          value={edu.field ?? ''}
                          onChange={(e) =>
                            handleUpdateEntry(index, 'field', e.target.value || undefined)
                          }
                          placeholder="Computer Science"
                        />
                      </div>
                    </div>

                    {/* Row 2: Institution, Graduation Date, GPA */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <Label htmlFor={`institution-${index}`}>Institution</Label>
                        <Input
                          id={`institution-${index}`}
                          value={edu.institution}
                          onChange={(e) => handleUpdateEntry(index, 'institution', e.target.value)}
                          placeholder="Stanford University"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`graduationDate-${index}`}>Graduation Date</Label>
                        <Input
                          id={`graduationDate-${index}`}
                          value={edu.graduationDate ?? ''}
                          onChange={(e) =>
                            handleUpdateEntry(
                              index,
                              'graduationDate',
                              e.target.value || undefined
                            )
                          }
                          placeholder="May 2020"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`gpa-${index}`}>GPA</Label>
                        <Input
                          id={`gpa-${index}`}
                          value={edu.gpa ?? ''}
                          onChange={(e) =>
                            handleUpdateEntry(index, 'gpa', e.target.value || undefined)
                          }
                          placeholder="3.8"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delete entry button */}
                  <div className="flex items-start">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteEntry(index)}
                      aria-label="Delete education entry"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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

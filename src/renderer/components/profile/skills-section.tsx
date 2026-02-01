import { useCallback, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Skill } from '@schemas/resume.schema'

interface SkillsSectionProps {
  skills: Skill[]
  onChange: (skills: Skill[]) => void
}

export function SkillsSection({ skills, onChange }: SkillsSectionProps) {
  const [newSkill, setNewSkill] = useState('')

  const handleAddSkill = useCallback(() => {
    const trimmed = newSkill.trim()
    if (!trimmed) return

    // Check for duplicates (case-insensitive)
    const exists = skills.some(s => s.name.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      setNewSkill('')
      return
    }

    const skill: Skill = {
      name: trimmed,
      level: undefined,
      category: undefined,
    }
    onChange([...skills, skill])
    setNewSkill('')
  }, [newSkill, skills, onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddSkill()
      }
    },
    [handleAddSkill]
  )

  const handleRemoveSkill = useCallback(
    (index: number) => {
      const updated = skills.filter((_, i) => i !== index)
      onChange(updated)
    },
    [skills, onChange]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Skills</h3>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Add skill input */}
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a skill (e.g., JavaScript, Project Management)"
              className="flex-1"
            />
            <Button onClick={handleAddSkill} disabled={!newSkill.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Skills badges */}
          {skills.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No skills added yet. Start typing above to add skills.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="py-1.5 pr-1.5 pl-3 text-sm">
                  {skill.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(index)}
                    className="hover:bg-muted-foreground/20 ml-1.5 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${skill.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

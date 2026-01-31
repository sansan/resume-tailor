import { useCallback } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Contact, ContactType } from '@schemas/resume.schema'
import {
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_PLACEHOLDERS,
} from '@schemas/resume.schema'

interface ContactsSectionProps {
  contacts: Contact[]
  onChange: (contacts: Contact[]) => void
}

const CONTACT_TYPES: ContactType[] = [
  'email',
  'phone',
  'linkedin',
  'github',
  'twitter',
  'instagram',
  'website',
  'portfolio',
  'other',
]

export function ContactsSection({ contacts, onChange }: ContactsSectionProps) {
  const handleAdd = useCallback(() => {
    // Find a type that's not yet used, default to 'other' if all are used
    const usedTypes = new Set(contacts.map((c) => c.type))
    const availableType = CONTACT_TYPES.find((t) => !usedTypes.has(t)) ?? 'other'

    onChange([
      ...contacts,
      { type: availableType, value: '' },
    ])
  }, [contacts, onChange])

  const handleRemove = useCallback(
    (index: number) => {
      onChange(contacts.filter((_, i) => i !== index))
    },
    [contacts, onChange]
  )

  const handleTypeChange = useCallback(
    (index: number, type: ContactType) => {
      const updated = [...contacts]
      const current = updated[index]
      if (current) {
        updated[index] = { type, value: current.value, label: current.label }
        onChange(updated)
      }
    },
    [contacts, onChange]
  )

  const handleValueChange = useCallback(
    (index: number, value: string) => {
      const updated = [...contacts]
      const current = updated[index]
      if (current) {
        updated[index] = { type: current.type, value, label: current.label }
        onChange(updated)
      }
    },
    [contacts, onChange]
  )

  const handleLabelChange = useCallback(
    (index: number, label: string) => {
      const updated = [...contacts]
      const current = updated[index]
      if (current) {
        updated[index] = { type: current.type, value: current.value, label: label || undefined }
        onChange(updated)
      }
    },
    [contacts, onChange]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Contact Information</h3>
        <Button variant="outline" size="sm" onClick={handleAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No contact information added. Click "Add" to add your first contact.
        </p>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center justify-center h-9 text-muted-foreground cursor-grab">
                <GripVertical className="h-4 w-4" />
              </div>

              <div className="flex-1 grid gap-3 sm:grid-cols-[180px_1fr]">
                <div>
                  <Label className="sr-only">Type</Label>
                  <Select
                    value={contact.type}
                    onValueChange={(value) => handleTypeChange(index, value as ContactType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {CONTACT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Label className="sr-only">Value</Label>
                  <Input
                    value={contact.value}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                    placeholder={CONTACT_TYPE_PLACEHOLDERS[contact.type]}
                  />
                </div>

                {contact.type === 'other' && (
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Custom Label (optional)
                    </Label>
                    <Input
                      value={contact.label ?? ''}
                      onChange={(e) => handleLabelChange(index, e.target.value)}
                      placeholder="e.g., Discord, Telegram..."
                    />
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

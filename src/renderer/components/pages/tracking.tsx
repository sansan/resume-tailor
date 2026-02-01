import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  FolderOpen,
  FileText,
  Mail,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Clock,
  ClipboardList,
  ArrowUpDown,
  Plus,
  Loader2,
} from 'lucide-react'
import { useApplications } from '@/hooks/useApplications'
import type { JobApplication, ApplicationStatus } from '@schemas/applications.schema'
import { createJobApplication } from '@schemas/applications.schema'
import { toast } from 'sonner'

/**
 * Format date for display.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format relative time for display.
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return formatDate(dateString)
}

/**
 * Application row component.
 */
interface ApplicationRowProps {
  application: JobApplication
  statuses: ApplicationStatus[]
  onStatusChange: (statusId: string) => void
  onSelect: () => void
  onDelete: () => void
}

function ApplicationRow({
  application,
  statuses,
  onStatusChange,
  onSelect,
  onDelete,
}: ApplicationRowProps) {
  const currentStatus = statuses.find(s => s.id === application.currentStatusId)

  return (
    <div
      className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 border-b px-3 py-1.5 transition-colors last:border-0"
      onClick={onSelect}
    >
      {/* Status Circle Dropdown */}
      <div onClick={e => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="hover:ring-offset-background focus:ring-offset-background h-3 w-3 shrink-0 rounded-full transition-shadow hover:ring-2 hover:ring-offset-2 focus:ring-2 focus:ring-offset-2 focus:outline-none"
              style={{ backgroundColor: currentStatus?.color || '#6B7280' }}
              title={currentStatus?.label || 'Status'}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {statuses.map(status => (
              <DropdownMenuItem
                key={status.id}
                onClick={() => onStatusChange(status.id)}
                className={application.currentStatusId === status.id ? 'bg-muted' : ''}
              >
                <div
                  className="mr-2 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                {status.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Company and Job Title */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{application.companyName}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground truncate text-sm">{application.jobTitle}</span>
        </div>
      </div>

      {/* Date Applied */}
      <div className="text-muted-foreground shrink-0 text-xs">
        {formatRelativeTime(application.createdAt)}
      </div>

      {/* Location (optional) */}
      {application.location && (
        <div className="text-muted-foreground hidden shrink-0 items-center gap-1 text-xs lg:flex">
          <MapPin className="h-3 w-3" />
          <span className="max-w-[100px] truncate">{application.location}</span>
        </div>
      )}

      {/* Actions */}
      <div onClick={e => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSelect}>
              <FileText className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {application.folderPath && (
              <DropdownMenuItem
                onClick={() => window.electronAPI.openFolder(application.folderPath!)}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Open Folder
              </DropdownMenuItem>
            )}
            {application.jobUrl && (
              <DropdownMenuItem onClick={() => window.open(application.jobUrl, '_blank')}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Job Posting
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/**
 * Application detail sheet component.
 */
interface ApplicationDetailSheetProps {
  application: JobApplication | null
  statuses: ApplicationStatus[]
  isOpen: boolean
  onClose: () => void
  onStatusChange: (statusId: string, note?: string) => void
  onNotesUpdate: (notes: string) => void
  onOpenFile: (path: string) => void
  onOpenFolder: (path: string) => void
}

function ApplicationDetailSheet({
  application,
  statuses,
  isOpen,
  onClose,
  onStatusChange,
  onNotesUpdate,
  onOpenFile,
  onOpenFolder,
}: ApplicationDetailSheetProps) {
  const [notes, setNotes] = useState(application?.notes || '')
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false)

  // Reset notes when application changes
  useEffect(() => {
    if (application && !hasUnsavedNotes) {
      setNotes(application.notes || '')
    }
  }, [application?.id, application?.notes, hasUnsavedNotes])

  // Reset hasUnsavedNotes when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setHasUnsavedNotes(false)
    }
  }, [isOpen])

  const handleNotesChange = (value: string) => {
    setNotes(value)
    setHasUnsavedNotes(true)
  }

  const handleSaveNotes = () => {
    if (application) {
      onNotesUpdate(notes)
      setHasUnsavedNotes(false)
    }
  }

  if (!application) return null

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full px-4 py-4 sm:max-w-lg">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {application.companyName}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            {application.jobTitle}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] pr-4">
          <div className="space-y-3">
            {/* Status Section */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={application.currentStatusId}
                onValueChange={statusId => onStatusChange(statusId)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span>{status.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info Badges */}
            <div className="flex flex-wrap gap-2">
              {application.location && (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {application.location}
                </Badge>
              )}
              {application.employmentType && (
                <Badge variant="secondary" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  {application.employmentType}
                </Badge>
              )}
              {application.salaryRange && (
                <Badge variant="secondary" className="gap-1">
                  ${application.salaryRange}
                </Badge>
              )}
            </div>

            {/* Dates */}
            <div className="space-y-2 text-sm">
              <div className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Applied: {formatDate(application.createdAt)}
              </div>
              {application.updatedAt !== application.createdAt && (
                <div className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Updated: {formatDate(application.updatedAt)}
                </div>
              )}
            </div>

            <Separator />

            {/* Files Section */}
            {(application.resumePath || application.coverLetterPath || application.folderPath) && (
              <div className="space-y-2">
                <Label>Files</Label>
                <div className="flex flex-col gap-2">
                  {application.resumePath && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2"
                      onClick={() => onOpenFile(application.resumePath!)}
                    >
                      <FileText className="h-4 w-4" />
                      Open Resume
                    </Button>
                  )}
                  {application.coverLetterPath && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2"
                      onClick={() => onOpenFile(application.coverLetterPath!)}
                    >
                      <Mail className="h-4 w-4" />
                      Open Cover Letter
                    </Button>
                  )}
                  {application.folderPath && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2"
                      onClick={() => onOpenFolder(application.folderPath!)}
                    >
                      <FolderOpen className="h-4 w-4" />
                      Open Folder
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Job URL */}
            {application.jobUrl && (
              <div className="space-y-2">
                <Label>Job Posting</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => window.open(application.jobUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="truncate">{application.jobUrl}</span>
                </Button>
              </div>
            )}

            <Separator />

            {/* Status History */}
            <div className="space-y-2">
              <Label>Status History</Label>
              <div className="space-y-2">
                {application.statusHistory.map((entry, index) => {
                  const status = statuses.find(s => s.id === entry.statusId)
                  return (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <div
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: status?.color || '#6B7280' }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{status?.label || entry.statusId}</div>
                        <div className="text-muted-foreground text-xs">
                          {formatDate(entry.changedAt)}
                        </div>
                        {entry.note && (
                          <div className="text-muted-foreground mt-1">{entry.note}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Notes Section */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add notes about this application..."
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                rows={4}
              />
              {hasUnsavedNotes && (
                <Button size="sm" onClick={handleSaveNotes}>
                  Save Notes
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Stats row component.
 */
interface StatsRowProps {
  total: number
  thisMonth: number
  byStatus: Record<string, number>
  statuses: ApplicationStatus[]
}

function StatsRow({ total, thisMonth, byStatus, statuses }: StatsRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">{total}</span>
        <span className="text-muted-foreground">total</span>
      </div>
      <Separator orientation="vertical" className="h-6" />
      <div className="flex items-center gap-2">
        <span className="font-medium">{thisMonth}</span>
        <span className="text-muted-foreground">this month</span>
      </div>
      <Separator orientation="vertical" className="h-6" />
      <div className="flex flex-wrap items-center gap-2">
        {statuses.map(status => {
          const count = byStatus[status.id] || 0
          if (count === 0) return null
          return (
            <Badge
              key={status.id}
              variant="secondary"
              className="gap-1"
              style={{
                backgroundColor: `${status.color}20`,
                color: status.color,
                borderColor: status.color,
              }}
            >
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
              {status.label}: {count}
            </Badge>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Add Application Dialog component.
 */
interface AddApplicationDialogProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (application: JobApplication) => Promise<boolean>
  statuses: ApplicationStatus[]
}

interface AddApplicationFormData {
  companyName: string
  jobTitle: string
  jobUrl: string
  location: string
  employmentType: string
  salaryRange: string
  notes: string
  statusId: string
}

const DEFAULT_FORM_DATA: AddApplicationFormData = {
  companyName: '',
  jobTitle: '',
  jobUrl: '',
  location: '',
  employmentType: '',
  salaryRange: '',
  notes: '',
  statusId: 'applied',
}

function AddApplicationDialog({ isOpen, onClose, onAdd, statuses }: AddApplicationDialogProps) {
  const [formData, setFormData] = useState<AddApplicationFormData>(DEFAULT_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof AddApplicationFormData, string>>>({})

  const handleClose = () => {
    setFormData(DEFAULT_FORM_DATA)
    setErrors({})
    onClose()
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AddApplicationFormData, string>> = {}

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required'
    }
    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = 'Job title is required'
    }
    if (formData.jobUrl && !formData.jobUrl.match(/^https?:\/\/.+/)) {
      newErrors.jobUrl = 'Please enter a valid URL starting with http:// or https://'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const application = createJobApplication({
        companyName: formData.companyName.trim(),
        jobTitle: formData.jobTitle.trim(),
        jobUrl: formData.jobUrl.trim() || undefined,
        location: formData.location.trim() || undefined,
        employmentType: formData.employmentType.trim() || undefined,
        salaryRange: formData.salaryRange.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        currentStatusId: formData.statusId,
      })

      const success = await onAdd(application)
      if (success) {
        handleClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateField = (field: keyof AddApplicationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Application</DialogTitle>
          <DialogDescription>Manually track a job application you've submitted.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="companyName"
              placeholder="e.g., Acme Inc."
              value={formData.companyName}
              onChange={e => updateField('companyName', e.target.value)}
            />
            {errors.companyName && <p className="text-destructive text-xs">{errors.companyName}</p>}
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="jobTitle">
              Job Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="jobTitle"
              placeholder="e.g., Software Engineer"
              value={formData.jobTitle}
              onChange={e => updateField('jobTitle', e.target.value)}
            />
            {errors.jobTitle && <p className="text-destructive text-xs">{errors.jobTitle}</p>}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.statusId}
              onValueChange={value => updateField('statusId', value)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(status => (
                  <SelectItem key={status.id} value={status.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span>{status.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job URL */}
          <div className="space-y-2">
            <Label htmlFor="jobUrl">Job Posting URL</Label>
            <Input
              id="jobUrl"
              placeholder="https://..."
              value={formData.jobUrl}
              onChange={e => updateField('jobUrl', e.target.value)}
            />
            {errors.jobUrl && <p className="text-destructive text-xs">{errors.jobUrl}</p>}
          </div>

          {/* Location and Employment Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Remote, NYC"
                value={formData.location}
                onChange={e => updateField('location', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentType">Employment Type</Label>
              <Input
                id="employmentType"
                placeholder="e.g., Full-time"
                value={formData.employmentType}
                onChange={e => updateField('employmentType', e.target.value)}
              />
            </div>
          </div>

          {/* Salary Range */}
          <div className="space-y-2">
            <Label htmlFor="salaryRange">Salary Range</Label>
            <Input
              id="salaryRange"
              placeholder="e.g., $100k - $150k"
              value={formData.salaryRange}
              onChange={e => updateField('salaryRange', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about this application..."
              value={formData.notes}
              onChange={e => updateField('notes', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Application
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Empty state component.
 */
interface EmptyStateProps {
  onAddClick: () => void
}

function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="py-12 text-center">
          <div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <ClipboardList className="text-muted-foreground h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold">No Applications Yet</h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-sm">
            Track your job applications here. Applications are automatically added when you export
            from Job Tailoring, or you can add them manually.
          </p>
          <Button className="mt-4" onClick={onAddClick}>
            <Plus className="mr-2 h-4 w-4" />
            Add Application
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton component.
 */
function LoadingSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-0">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
            </div>
            <Skeleton className="h-8 w-[160px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * Tracking page component.
 */
export function TrackingPage() {
  const {
    filteredApplications,
    statistics,
    statuses,
    filter,
    isLoading,
    setFilter,
    addApplication,
    updateStatus,
    updateApplication,
    deleteApplication,
    openFile,
    openFolder,
  } = useApplications()

  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const handleSelectApplication = useCallback((application: JobApplication) => {
    setSelectedApplication(application)
    setIsDetailOpen(true)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false)
    setSelectedApplication(null)
  }, [])

  const handleStatusChange = useCallback(
    async (applicationId: string, statusId: string) => {
      const success = await updateStatus(applicationId, statusId)
      if (success) {
        toast.success('Status updated')
        // Update selected application if it's the one being changed
        if (selectedApplication?.id === applicationId) {
          const updated = filteredApplications.find(a => a.id === applicationId)
          if (updated) setSelectedApplication(updated)
        }
      } else {
        toast.error('Failed to update status')
      }
    },
    [updateStatus, selectedApplication, filteredApplications]
  )

  const handleNotesUpdate = useCallback(
    async (notes: string) => {
      if (!selectedApplication) return
      const success = await updateApplication(selectedApplication.id, { notes })
      if (success) {
        toast.success('Notes saved')
        setSelectedApplication(prev => (prev ? { ...prev, notes } : null))
      } else {
        toast.error('Failed to save notes')
      }
    },
    [selectedApplication, updateApplication]
  )

  const handleDelete = useCallback(
    async (applicationId: string) => {
      const success = await deleteApplication(applicationId)
      if (success) {
        toast.success('Application deleted')
        if (selectedApplication?.id === applicationId) {
          handleCloseDetail()
        }
      } else {
        toast.error('Failed to delete application')
      }
    },
    [deleteApplication, selectedApplication, handleCloseDetail]
  )

  const handleAddApplication = useCallback(
    async (application: JobApplication): Promise<boolean> => {
      const success = await addApplication(application)
      if (success) {
        toast.success('Application added')
      } else {
        toast.error('Failed to add application')
      }
      return success
    },
    [addApplication]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
          <p className="text-muted-foreground">Track your job applications and their status.</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Application
        </Button>
      </div>

      {/* Stats Row */}
      {statistics && (
        <StatsRow
          total={statistics.total}
          thisMonth={statistics.thisMonth}
          byStatus={statistics.byStatus}
          statuses={statuses}
        />
      )}

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 border-b pb-4">
        {/* Search */}
        <div className="relative max-w-sm min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search companies or jobs..."
            value={filter.searchQuery}
            onChange={e => setFilter({ searchQuery: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={filter.statusId || 'all'}
          onValueChange={value => setFilter({ statusId: value === 'all' ? null : value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map(status => (
              <SelectItem key={status.id} value={status.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span>{status.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setFilter({ sortOrder: filter.sortOrder === 'newest' ? 'oldest' : 'newest' })
          }
          className="gap-2"
        >
          <ArrowUpDown className="h-4 w-4" />
          {filter.sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
        </Button>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : filteredApplications.length === 0 ? (
        filter.searchQuery || filter.statusId ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No applications match your filters.</p>
            <Button variant="link" onClick={() => setFilter({ searchQuery: '', statusId: null })}>
              Clear filters
            </Button>
          </div>
        ) : (
          <EmptyState onAddClick={() => setIsAddDialogOpen(true)} />
        )
      ) : (
        <div>
          {filteredApplications.map(application => (
            <ApplicationRow
              key={application.id}
              application={application}
              statuses={statuses}
              onStatusChange={statusId => handleStatusChange(application.id, statusId)}
              onSelect={() => handleSelectApplication(application)}
              onDelete={() => handleDelete(application.id)}
            />
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <ApplicationDetailSheet
        application={selectedApplication}
        statuses={statuses}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onStatusChange={statusId =>
          selectedApplication && handleStatusChange(selectedApplication.id, statusId)
        }
        onNotesUpdate={handleNotesUpdate}
        onOpenFile={openFile}
        onOpenFolder={openFolder}
      />

      {/* Add Application Dialog */}
      <AddApplicationDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddApplication}
        statuses={statuses}
      />
    </div>
  )
}

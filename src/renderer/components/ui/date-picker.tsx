'use client'

import * as React from 'react'
import { format, parse } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerProps {
  value?: string | null | undefined
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * DatePicker component that displays a formatted date string.
 * Accepts and returns dates in "Month Day, Year" format (e.g., "January 15, 2025").
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse the string value into a Date object
  const date = React.useMemo(() => {
    if (!value) return undefined
    try {
      // Try to parse "Month Day, Year" format
      return parse(value, 'MMMM d, yyyy', new Date())
    } catch {
      // Fallback: try native Date parsing
      const parsed = new Date(value)
      return isNaN(parsed.getTime()) ? undefined : parsed
    }
  }, [value])

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Format as "Month Day, Year"
      onChange(format(selectedDate, 'MMMM d, yyyy'))
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'h-7 justify-start rounded-none border-0 border-b border-gray-300 px-2 py-0.5 text-left font-normal hover:bg-transparent focus:ring-0',
            !value && 'text-muted-foreground',
            className
          )}
          style={{ color: value ? '#374151' : '#9ca3af', backgroundColor: 'transparent' }}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? value : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={handleSelect} initialFocus />
      </PopoverContent>
    </Popover>
  )
}

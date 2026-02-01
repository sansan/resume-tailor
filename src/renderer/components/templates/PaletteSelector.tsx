import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ColorPalette } from '@/hooks/useTemplates'

interface PaletteSelectorProps {
  palettes: ColorPalette[]
  selectedId: string
  onSelect: (id: string) => void
}

/**
 * Horizontal row of palette cards for color scheme selection.
 * Each card displays 3 color swatches and the palette name.
 */
export function PaletteSelector({ palettes, selectedId, onSelect }: PaletteSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Color palette selection"
      className="flex flex-wrap justify-center gap-3"
    >
      {palettes.map(palette => {
        const isSelected = palette.id === selectedId

        return (
          <button
            key={palette.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${palette.name} color palette`}
            onClick={() => onSelect(palette.id)}
            className={cn(
              'group relative flex flex-col items-center gap-2 rounded-lg p-3',
              'border-2 transition-all duration-200',
              'focus-visible:ring-ring hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              isSelected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-card hover:border-primary/50'
            )}
          >
            {/* Color swatches container */}
            <div className="relative flex gap-1">
              {/* Primary color swatch */}
              <div
                className="h-8 w-8 rounded-md shadow-sm ring-1 ring-black/10"
                style={{ backgroundColor: palette.primary }}
                title="Primary color"
              />
              {/* Secondary color swatch */}
              <div
                className="h-8 w-8 rounded-md shadow-sm ring-1 ring-black/10"
                style={{ backgroundColor: palette.secondary }}
                title="Secondary color"
              />
              {/* Accent color swatch */}
              <div
                className="h-8 w-8 rounded-md shadow-sm ring-1 ring-black/10"
                style={{ backgroundColor: palette.accent }}
                title="Accent color"
              />

              {/* Selected checkmark overlay */}
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-primary rounded-full p-1 shadow-lg">
                    <Check className="text-primary-foreground h-3.5 w-3.5" />
                  </div>
                </div>
              )}
            </div>

            {/* Palette name */}
            <span
              className={cn(
                'text-xs font-medium transition-colors',
                isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )}
            >
              {palette.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

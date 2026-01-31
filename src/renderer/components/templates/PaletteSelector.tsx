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
export function PaletteSelector({
  palettes,
  selectedId,
  onSelect,
}: PaletteSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Color palette selection"
      className="flex flex-wrap gap-3 justify-center"
    >
      {palettes.map((palette) => {
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
              'group relative flex flex-col items-center gap-2 p-3 rounded-lg',
              'border-2 transition-all duration-200',
              'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSelected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-card hover:border-primary/50'
            )}
          >
            {/* Color swatches container */}
            <div className="flex gap-1 relative">
              {/* Primary color swatch */}
              <div
                className="w-8 h-8 rounded-md shadow-sm ring-1 ring-black/10"
                style={{ backgroundColor: palette.primary }}
                title="Primary color"
              />
              {/* Secondary color swatch */}
              <div
                className="w-8 h-8 rounded-md shadow-sm ring-1 ring-black/10"
                style={{ backgroundColor: palette.secondary }}
                title="Secondary color"
              />
              {/* Accent color swatch */}
              <div
                className="w-8 h-8 rounded-md shadow-sm ring-1 ring-black/10"
                style={{ backgroundColor: palette.accent }}
                title="Accent color"
              />

              {/* Selected checkmark overlay */}
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-primary rounded-full p-1 shadow-lg">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
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

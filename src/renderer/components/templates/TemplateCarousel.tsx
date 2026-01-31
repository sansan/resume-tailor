import { useRef, useCallback, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { cn } from '@/lib/utils'
import type { Template } from '@/hooks/useTemplates'

interface TemplateCarouselProps {
  templates: Template[]
  selectedId: string
  onSelect: (id: string) => void
}

/**
 * Horizontal scrolling carousel for template selection.
 * Features snap-to-center behavior and arrow navigation.
 */
export function TemplateCarousel({
  templates,
  selectedId,
  onSelect,
}: TemplateCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Check scroll availability
  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1)
  }, [])

  // Update scroll buttons on mount and when templates change
  useEffect(() => {
    updateScrollButtons()
    // Add resize observer to handle container size changes
    const container = scrollContainerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(updateScrollButtons)
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [updateScrollButtons, templates])

  // Scroll by one card width
  const scroll = useCallback((direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const cardWidth = 200 // Approximate card width + gap
    const scrollAmount = direction === 'left' ? -cardWidth : cardWidth

    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    })
  }, [])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = templates.findIndex((t) => t.id === selectedId)

      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault()
        const prevTemplate = templates[currentIndex - 1]
        if (prevTemplate) {
          onSelect(prevTemplate.id)
        }
      } else if (e.key === 'ArrowRight' && currentIndex < templates.length - 1) {
        e.preventDefault()
        const nextTemplate = templates[currentIndex + 1]
        if (nextTemplate) {
          onSelect(nextTemplate.id)
        }
      }
    },
    [templates, selectedId, onSelect]
  )

  return (
    <div className="relative group" role="listbox" aria-label="Template selection">
      {/* Left arrow */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-md',
          'transition-opacity duration-200',
          canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => scroll('left')}
        aria-label="Scroll left"
        tabIndex={-1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-8 py-2 scrollbar-hide"
        onScroll={updateScrollButtons}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="presentation"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {templates.map((template) => {
          const isSelected = template.id === selectedId

          return (
            <Card
              key={template.id}
              role="option"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className={cn(
                'flex-shrink-0 w-44 cursor-pointer transition-all duration-200 snap-center',
                'hover:ring-2 hover:ring-primary/50 hover:shadow-lg',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected && [
                  'ring-2 ring-primary shadow-lg',
                  'scale-105 transform',
                ]
              )}
              onClick={() => onSelect(template.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(template.id)
                }
              }}
            >
              <CardContent className="p-3">
                {/* Thumbnail area with 3:4 aspect ratio */}
                <div className="relative mb-2">
                  <AspectRatio ratio={3 / 4}>
                    <div
                      className={cn(
                        'h-full w-full rounded-md flex items-center justify-center',
                        'bg-gradient-to-br from-muted to-muted/50',
                        isSelected && 'from-primary/10 to-primary/5'
                      )}
                    >
                      <span
                        className={cn(
                          'text-3xl font-bold',
                          isSelected
                            ? 'text-primary/40'
                            : 'text-muted-foreground/30'
                        )}
                      >
                        CV
                      </span>
                    </div>
                  </AspectRatio>

                  {/* Selected checkmark overlay */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5">
                      <CheckCircle2 className="h-5 w-5 text-primary fill-background" />
                    </div>
                  )}
                </div>

                {/* Template info */}
                <div className="space-y-1">
                  <h3
                    className={cn(
                      'font-medium text-sm truncate',
                      isSelected && 'text-primary'
                    )}
                  >
                    {template.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Right arrow */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-md',
          'transition-opacity duration-200',
          canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => scroll('right')}
        aria-label="Scroll right"
        tabIndex={-1}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

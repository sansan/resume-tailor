import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { cn } from '@/lib/utils'

interface TemplateCardProps {
  id: string
  name: string
  description: string
  thumbnail: string
  tags?: string[]
  isSelected?: boolean
  onClick?: () => void
}

export function TemplateCard({
  id,
  name,
  description,
  thumbnail: _thumbnail,
  tags = [],
  isSelected = false,
  onClick,
}: TemplateCardProps) {
  // _thumbnail is reserved for future use when actual thumbnails are implemented
  return (
    <Card
      data-template-id={id}
      className={cn(
        'hover:ring-primary/50 cursor-pointer transition-all hover:ring-2',
        isSelected && 'ring-primary ring-2'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Thumbnail area with 3:4 aspect ratio */}
        <div className="relative mb-3">
          <AspectRatio ratio={3 / 4}>
            <div className="from-muted to-muted/50 flex h-full w-full items-center justify-center rounded-md bg-gradient-to-br">
              <span className="text-muted-foreground/30 text-4xl font-bold">CV</span>
            </div>
          </AspectRatio>

          {/* Selected checkmark overlay */}
          {isSelected && (
            <div className="absolute top-2 right-2">
              <CheckCircle2 className="text-primary fill-background h-6 w-6" />
            </div>
          )}
        </div>

        {/* Template name and tags */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">{name}</h3>
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Truncated description */}
          <p className="text-muted-foreground line-clamp-2 text-xs">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

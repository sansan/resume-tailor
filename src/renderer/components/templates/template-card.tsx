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
        'cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Thumbnail area with 3:4 aspect ratio */}
        <div className="relative mb-3">
          <AspectRatio ratio={3 / 4}>
            <div className="h-full w-full rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <span className="text-4xl font-bold text-muted-foreground/30">
                CV
              </span>
            </div>
          </AspectRatio>

          {/* Selected checkmark overlay */}
          {isSelected && (
            <div className="absolute top-2 right-2">
              <CheckCircle2 className="h-6 w-6 text-primary fill-background" />
            </div>
          )}
        </div>

        {/* Template name and tags */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-sm">{name}</h3>
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* Truncated description */}
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

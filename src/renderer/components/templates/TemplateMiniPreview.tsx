import type { ColorPalette } from '@/hooks/useTemplates'

/**
 * Mini template preview that visually represents each template style.
 */
export function TemplateMiniPreview({
  templateId,
  palette,
}: {
  templateId: string
  palette: ColorPalette | undefined
}): React.JSX.Element {
  const primaryColor = palette?.primary ?? '#374151'
  const accentColor = palette?.accent ?? '#9ca3af'

  // Different visual layouts for each template
  switch (templateId) {
    case 'classic':
      // Two-column layout with sidebar
      return (
        <div className="flex h-full w-full overflow-hidden rounded bg-white p-1.5">
          {/* Sidebar */}
          <div
            className="mr-1 w-[35%] rounded-sm"
            style={{ backgroundColor: `${accentColor}30` }}
          >
            <div
              className="mx-1 mt-1.5 h-1 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <div className="mx-1 mt-1 space-y-0.5">
              <div className="h-0.5 w-3/4 rounded-full bg-gray-300" />
              <div className="h-0.5 w-2/3 rounded-full bg-gray-300" />
            </div>
            <div className="mx-1 mt-2 space-y-0.5">
              <div className="h-0.5 w-full rounded-full bg-gray-300" />
              <div className="h-0.5 w-3/4 rounded-full bg-gray-300" />
            </div>
          </div>
          {/* Main content */}
          <div className="flex-1 pt-1">
            <div
              className="h-1.5 w-3/4 rounded-sm"
              style={{ backgroundColor: primaryColor }}
            />
            <div className="mt-2 space-y-0.5">
              <div className="h-0.5 w-full rounded-full bg-gray-200" />
              <div className="h-0.5 w-5/6 rounded-full bg-gray-200" />
              <div className="h-0.5 w-4/5 rounded-full bg-gray-200" />
            </div>
            <div className="mt-2 space-y-0.5">
              <div className="h-0.5 w-full rounded-full bg-gray-200" />
              <div className="h-0.5 w-3/4 rounded-full bg-gray-200" />
            </div>
          </div>
        </div>
      )

    case 'modern':
      // Single column, centered header
      return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded bg-white p-2">
          {/* Centered header */}
          <div className="flex flex-col items-center">
            <div
              className="h-1.5 w-1/2 rounded-sm"
              style={{ backgroundColor: primaryColor }}
            />
            <div className="mt-0.5 h-0.5 w-1/4 rounded-full bg-gray-300" />
            <div className="mt-1 h-px w-2/3 bg-gray-200" />
          </div>
          {/* Content */}
          <div className="mt-2 flex-1">
            <div className="space-y-0.5">
              <div className="h-0.5 w-full rounded-full bg-gray-200" />
              <div className="h-0.5 w-5/6 rounded-full bg-gray-200" />
            </div>
            <div className="mt-1.5 h-px w-1/4 bg-gray-300" />
            <div className="mt-1 space-y-0.5">
              <div className="h-0.5 w-full rounded-full bg-gray-200" />
              <div className="h-0.5 w-3/4 rounded-full bg-gray-200" />
            </div>
          </div>
          {/* Footer - two columns */}
          <div className="mt-auto flex gap-2">
            <div className="flex-1 space-y-0.5">
              <div
                className="mb-0.5 h-0.5 w-1/2 rounded-full"
                style={{ backgroundColor: `${accentColor}60` }}
              />
              <div className="h-0.5 w-full rounded-full bg-gray-200" />
            </div>
            <div className="flex-1 space-y-0.5">
              <div
                className="mb-0.5 h-0.5 w-1/2 rounded-full"
                style={{ backgroundColor: `${accentColor}60` }}
              />
              <div className="h-0.5 w-full rounded-full bg-gray-200" />
            </div>
          </div>
        </div>
      )

    case 'creative':
      // Bold header banner
      return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded bg-white">
          {/* Full-width header banner */}
          <div
            className="px-2 py-1.5"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="h-1.5 w-1/2 rounded-sm bg-white/90" />
            <div className="mt-0.5 h-0.5 w-1/3 rounded-full bg-white/60" />
          </div>
          {/* Content */}
          <div className="flex flex-1 gap-1.5 p-1.5">
            {/* Main */}
            <div className="flex-[2]">
              <div className="flex items-center gap-0.5">
                <div
                  className="h-2 w-0.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
                <div
                  className="h-0.5 w-1/2 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
              <div className="mt-1 space-y-0.5 pl-1">
                <div className="h-0.5 w-full rounded-full bg-gray-200" />
                <div className="h-0.5 w-4/5 rounded-full bg-gray-200" />
              </div>
            </div>
            {/* Side */}
            <div className="flex-1">
              <div className="flex items-center gap-0.5">
                <div
                  className="h-1.5 w-0.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
                <div
                  className="h-0.5 w-2/3 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
              <div className="mt-1 space-y-0.5">
                <div className="h-0.5 w-full rounded-full bg-gray-200" />
                <div className="h-0.5 w-3/4 rounded-full bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      )

    case 'executive':
      // Elegant centered with decorative elements
      return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded bg-white p-2">
          {/* Elegant centered header */}
          <div className="flex flex-col items-center">
            <div
              className="h-1 w-2/5 rounded-sm"
              style={{ backgroundColor: primaryColor }}
            />
            <div className="mt-0.5 h-0.5 w-1/4 rounded-full bg-gray-300 italic" />
            {/* Decorative line with diamond */}
            <div className="mt-1 flex w-3/4 items-center gap-0.5">
              <div
                className="h-px flex-1"
                style={{ backgroundColor: primaryColor }}
              />
              <div
                className="h-1 w-1 rotate-45"
                style={{ backgroundColor: primaryColor }}
              />
              <div
                className="h-px flex-1"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          </div>
          {/* Content */}
          <div className="mt-2 flex-1">
            <div className="flex items-center gap-1">
              <div
                className="h-0.5 w-1/4 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="mt-1 space-y-0.5">
              <div className="h-0.5 w-full rounded-full bg-gray-200" />
              <div className="h-0.5 w-5/6 rounded-full bg-gray-200" />
            </div>
          </div>
          {/* Footer */}
          <div className="mt-auto flex gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-0.5">
                <div
                  className="h-0.5 w-1/3 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
                <div className="h-px flex-1 bg-gray-200" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-0.5">
                <div
                  className="h-0.5 w-1/3 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
                <div className="h-px flex-1 bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      )

    default:
      return (
        <div className="flex h-full w-full items-center justify-center rounded bg-muted">
          <span className="text-lg font-bold text-muted-foreground/30">CV</span>
        </div>
      )
  }
}

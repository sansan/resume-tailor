import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TemplateCard } from '@/renderer/components/templates'

interface Template {
  id: string
  name: string
  description: string
  thumbnail: string
  tags?: string[]
  type: 'cv' | 'cover-letter'
}

const CV_TEMPLATES: Template[] = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean and contemporary design with plenty of white space. Perfect for tech and creative roles.',
    thumbnail: '',
    tags: ['ATS OPTIMIZED'],
    type: 'cv',
  },
  {
    id: 'classic-professional',
    name: 'Classic Professional',
    description: 'Traditional layout with a professional feel. Ideal for corporate and executive positions.',
    thumbnail: '',
    type: 'cv',
  },
  {
    id: 'tech-compact',
    name: 'Tech Compact',
    description: 'Dense layout optimized for technical roles. Maximizes content while maintaining readability.',
    thumbnail: '',
    tags: ['ATS OPTIMIZED'],
    type: 'cv',
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Elegant design for senior leadership roles. Emphasizes achievements and strategic impact.',
    thumbnail: '',
    type: 'cv',
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Bold and distinctive layout for creative professionals. Showcases personality and style.',
    thumbnail: '',
    type: 'cv',
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Structured format for academic and research positions. Highlights publications and education.',
    thumbnail: '',
    type: 'cv',
  },
]

const COVER_LETTER_TEMPLATES: Template[] = [
  {
    id: 'short-sweet',
    name: 'Short & Sweet',
    description: 'Concise and impactful. Gets straight to the point while highlighting key qualifications.',
    thumbnail: '',
    type: 'cover-letter',
  },
  {
    id: 'formal-standard',
    name: 'Formal Standard',
    description: 'Traditional business letter format. Professional tone suitable for most industries.',
    thumbnail: '',
    type: 'cover-letter',
  },
  {
    id: 'value-proposition',
    name: 'Value Proposition',
    description: 'Focuses on the value you bring. Structured around key achievements and contributions.',
    thumbnail: '',
    type: 'cover-letter',
  },
  {
    id: 'creative-pitch',
    name: 'Creative Pitch',
    description: 'Engaging and memorable approach. Perfect for creative roles and startups.',
    thumbnail: '',
    type: 'cover-letter',
  },
]

export function TemplatesPage() {
  const [selectedCV, setSelectedCV] = useState('modern-minimal')
  const [selectedCoverLetter, setSelectedCoverLetter] = useState('formal-standard')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const filteredCVTemplates = useMemo(() => {
    if (!searchQuery) return CV_TEMPLATES
    const query = searchQuery.toLowerCase()
    return CV_TEMPLATES.filter((template) =>
      template.name.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const filteredCoverLetterTemplates = useMemo(() => {
    if (!searchQuery) return COVER_LETTER_TEMPLATES
    const query = searchQuery.toLowerCase()
    return COVER_LETTER_TEMPLATES.filter((template) =>
      template.name.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const totalTemplates = CV_TEMPLATES.length + COVER_LETTER_TEMPLATES.length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <Badge variant="secondary">{totalTemplates}</Badge>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Templates</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Template Sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="all" className="mt-0 space-y-8">
          {/* CV Templates Section */}
          {filteredCVTemplates.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">CV Templates</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredCVTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    id={template.id}
                    name={template.name}
                    description={template.description}
                    thumbnail={template.thumbnail}
                    tags={template.tags ?? []}
                    isSelected={selectedCV === template.id}
                    onClick={() => setSelectedCV(template.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Cover Letter Templates Section */}
          {filteredCoverLetterTemplates.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Cover Letter Templates</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredCoverLetterTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    id={template.id}
                    name={template.name}
                    description={template.description}
                    thumbnail={template.thumbnail}
                    tags={template.tags ?? []}
                    isSelected={selectedCoverLetter === template.id}
                    onClick={() => setSelectedCoverLetter(template.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* No Results */}
          {filteredCVTemplates.length === 0 && filteredCoverLetterTemplates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No templates found matching "{searchQuery}"</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-0">
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No favorite templates yet. Click the heart icon on a template to add it to your favorites.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

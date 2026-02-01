import { describe, it, expect } from 'vitest'
import { ResumeSchema, type Resume } from './resume.schema'

describe('ResumeSchema', () => {
  const validResume: Resume = {
    personalInfo: {
      name: 'John Doe',
      location: 'New York, NY',
      summary: 'Experienced software engineer',
      contacts: [
        { type: 'email', value: 'john@example.com' },
        { type: 'phone', value: '+1 555-123-4567' },
      ],
    },
    workExperience: [
      {
        company: 'Tech Corp',
        title: 'Senior Developer',
        startDate: '2020-01',
        endDate: null,
        location: 'Remote',
        highlights: ['Led team of 5 engineers', 'Improved performance by 40%'],
      },
    ],
    education: [
      {
        institution: 'State University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        graduationDate: '2018',
        highlights: [],
      },
    ],
    skills: [
      { name: 'TypeScript', category: 'Programming' },
      { name: 'React', category: 'Frontend' },
      { name: 'Node.js', category: 'Backend' },
    ],
    projects: [],
    certifications: [],
  }

  it('validates a correct resume', () => {
    const result = ResumeSchema.safeParse(validResume)
    expect(result.success).toBe(true)
  })

  it('rejects resume without name', () => {
    const invalidResume = {
      ...validResume,
      personalInfo: {
        ...validResume.personalInfo,
        name: '',
      },
    }
    const result = ResumeSchema.safeParse(invalidResume)
    expect(result.success).toBe(false)
  })

  it('accepts resume with null location', () => {
    const resumeWithNullLocation = {
      ...validResume,
      personalInfo: {
        ...validResume.personalInfo,
        location: null,
      },
    }
    const result = ResumeSchema.safeParse(resumeWithNullLocation)
    expect(result.success).toBe(true)
  })

  it('accepts resume with optional fields missing', () => {
    const minimalResume = {
      personalInfo: {
        name: 'Jane Doe',
        contacts: [],
      },
      workExperience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    }
    const result = ResumeSchema.safeParse(minimalResume)
    expect(result.success).toBe(true)
  })

  it('validates work experience with end date', () => {
    const resumeWithEndDate = {
      ...validResume,
      workExperience: [
        {
          company: 'Old Corp',
          title: 'Junior Developer',
          startDate: '2018-01',
          endDate: '2020-01',
          location: 'Office',
          highlights: ['Learned a lot'],
        },
      ],
    }
    const result = ResumeSchema.safeParse(resumeWithEndDate)
    expect(result.success).toBe(true)
  })

  it('rejects work experience without company', () => {
    const invalidResume = {
      ...validResume,
      workExperience: [
        {
          company: '',
          title: 'Developer',
          startDate: '2020-01',
          highlights: [],
        },
      ],
    }
    const result = ResumeSchema.safeParse(invalidResume)
    expect(result.success).toBe(false)
  })

  it('rejects work experience without title', () => {
    const invalidResume = {
      ...validResume,
      workExperience: [
        {
          company: 'Tech Corp',
          title: '',
          startDate: '2020-01',
          highlights: [],
        },
      ],
    }
    const result = ResumeSchema.safeParse(invalidResume)
    expect(result.success).toBe(false)
  })

  it('validates education entry', () => {
    const resumeWithEducation = {
      ...validResume,
      education: [
        {
          institution: 'MIT',
          degree: 'PhD',
          field: 'Computer Science',
          graduationDate: '2020',
          gpa: '4.0',
          highlights: ['Summa Cum Laude'],
        },
      ],
    }
    const result = ResumeSchema.safeParse(resumeWithEducation)
    expect(result.success).toBe(true)
  })

  it('validates project with valid URL', () => {
    const resumeWithProject = {
      ...validResume,
      projects: [
        {
          name: 'Cool Project',
          description: 'A cool project',
          technologies: ['React', 'Node.js'],
          url: 'https://github.com/example/cool-project',
          highlights: ['Featured on HN'],
        },
      ],
    }
    const result = ResumeSchema.safeParse(resumeWithProject)
    expect(result.success).toBe(true)
  })

  it('rejects project with invalid URL', () => {
    const invalidResume = {
      ...validResume,
      projects: [
        {
          name: 'Cool Project',
          url: 'not-a-valid-url',
          technologies: [],
          highlights: [],
        },
      ],
    }
    const result = ResumeSchema.safeParse(invalidResume)
    expect(result.success).toBe(false)
  })
})

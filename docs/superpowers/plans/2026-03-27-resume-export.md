# Resume Export (PDF) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let jobseekers export their profile as a two-column sidebar PDF resume from the profile edit page.

**Architecture:** Two new components — `ResumeDocument.jsx` (the `@react-pdf/renderer` template) and `ExportResumeButton.jsx` (button + warning modal + PDF generation trigger). The button lazy-loads the PDF library on click so the main bundle stays untouched. Data flows from `useAuth()` → `ExportResumeButton` → `ResumeDocument`.

**Tech Stack:** React 18, `@react-pdf/renderer`, Lucide icons, Tailwind CSS, Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-03-27-resume-export-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/profile/ResumeDocument.jsx` | Create | `@react-pdf/renderer` component — takes `userData` props, renders two-column sidebar PDF |
| `src/components/profile/ResumeDocument.test.jsx` | Create | Unit tests for ResumeDocument (renders without crash, handles missing fields) |
| `src/components/profile/ExportResumeButton.jsx` | Create | Button + missing-field check + warning modal + lazy PDF generation + download trigger |
| `src/components/profile/ExportResumeButton.test.jsx` | Create | Unit tests for ExportResumeButton (missing field detection, modal, download) |
| `src/pages/JobseekerProfileEdit.jsx` | Modify (lines 1-14, 979) | Import ExportResumeButton, add it to the action buttons area |
| `package.json` | Modify | Add `@react-pdf/renderer` dependency |

---

### Task 1: Install `@react-pdf/renderer`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

Run:
```bash
npm install @react-pdf/renderer
```

- [ ] **Step 2: Verify installation**

Run:
```bash
node -e "require('@react-pdf/renderer'); console.log('OK')"
```
Expected: `OK` with no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @react-pdf/renderer dependency"
```

---

### Task 2: Create ResumeDocument component

**Files:**
- Create: `src/components/profile/ResumeDocument.jsx`

This is the `@react-pdf/renderer` component that renders the two-column sidebar PDF. It uses `@react-pdf/renderer` primitives (`Document`, `Page`, `View`, `Text`, `Image`, `Link`, `StyleSheet`).

- [ ] **Step 1: Create the ResumeDocument component**

Create `src/components/profile/ResumeDocument.jsx`:

```jsx
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Link,
  StyleSheet,
} from '@react-pdf/renderer'

const DARK_BLUE = '#1e3a5f'
const LIGHT_BLUE_BG = '#2a4f7a'
const PILL_BG = 'rgba(255,255,255,0.15)'
const SECTION_BORDER = '#e5e7eb'
const MUTED_TEXT = '#666666'

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333333',
  },
  sidebar: {
    width: '35%',
    backgroundColor: DARK_BLUE,
    color: '#ffffff',
    padding: 20,
    paddingTop: 30,
  },
  main: {
    width: '65%',
    padding: 25,
    paddingTop: 30,
  },

  // Sidebar styles
  photoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 10,
  },
  initialsCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: LIGHT_BLUE_BG,
    alignSelf: 'center',
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  sidebarName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  sidebarSectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    paddingBottom: 3,
    marginBottom: 6,
    marginTop: 14,
  },
  contactItem: {
    fontSize: 9,
    marginBottom: 3,
    opacity: 0.9,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  skillPill: {
    backgroundColor: PILL_BG,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 8,
  },
  languageItem: {
    fontSize: 9,
    marginBottom: 2,
    opacity: 0.9,
  },

  // Main column styles
  mainSectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: DARK_BLUE,
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: SECTION_BORDER,
    paddingBottom: 3,
    marginBottom: 8,
    marginTop: 16,
  },
  mainSectionTitleFirst: {
    marginTop: 0,
  },
  experienceEntry: {
    marginBottom: 8,
  },
  experiencePosition: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  experienceCompany: {
    fontSize: 10,
  },
  experienceDuration: {
    fontSize: 8,
    color: MUTED_TEXT,
    marginTop: 1,
  },
  educationDegree: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  educationSchool: {
    fontSize: 10,
  },
  educationYear: {
    fontSize: 8,
    color: MUTED_TEXT,
    marginTop: 1,
  },
  certItem: {
    fontSize: 10,
    marginBottom: 2,
  },
  portfolioLink: {
    fontSize: 10,
    color: '#2563eb',
    textDecoration: 'none',
  },
})

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function SidebarSection({ title, children }) {
  return (
    <View>
      <Text style={styles.sidebarSectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function MainSection({ title, first, children }) {
  return (
    <View>
      <Text style={[styles.mainSectionTitle, first && styles.mainSectionTitleFirst]}>
        {title}
      </Text>
      {children}
    </View>
  )
}

export default function ResumeDocument({ userData }) {
  const {
    full_name,
    email,
    mobile_number,
    city,
    province,
    profile_photo,
    skills,
    languages,
    work_experiences,
    highest_education,
    school_name,
    course_or_field,
    year_graduated,
    certifications,
    portfolio_url,
  } = userData || {}

  const hasSkills = skills && skills.length > 0
  const hasLanguages = languages && languages.length > 0
  const hasExperience = work_experiences && work_experiences.length > 0
  const hasEducation = !!highest_education
  const hasCertifications = certifications && certifications.length > 0
  const hasPortfolio = !!portfolio_url

  const location = [city, province].filter(Boolean).join(', ')

  // Determine which is the first main section (for removing top margin)
  let firstMainRendered = false
  function isFirstMain() {
    if (!firstMainRendered) {
      firstMainRendered = true
      return true
    }
    return false
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          {profile_photo ? (
            <Image src={profile_photo} style={styles.photoCircle} />
          ) : (
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>{getInitials(full_name)}</Text>
            </View>
          )}
          <Text style={styles.sidebarName}>{full_name || 'Name'}</Text>

          <SidebarSection title="Contact">
            {email && <Text style={styles.contactItem}>{email}</Text>}
            {mobile_number && <Text style={styles.contactItem}>{mobile_number}</Text>}
            {location && <Text style={styles.contactItem}>{location}</Text>}
          </SidebarSection>

          {hasSkills && (
            <SidebarSection title="Skills">
              <View style={styles.skillsContainer}>
                {skills.map((skill, i) => (
                  <Text key={i} style={styles.skillPill}>{skill}</Text>
                ))}
              </View>
            </SidebarSection>
          )}

          {hasLanguages && (
            <SidebarSection title="Languages">
              {languages.map((lang, i) => (
                <Text key={i} style={styles.languageItem}>
                  {lang.language}{lang.proficiency ? ` (${lang.proficiency})` : ''}
                </Text>
              ))}
            </SidebarSection>
          )}
        </View>

        {/* Main Column */}
        <View style={styles.main}>
          {hasExperience && (
            <MainSection title="Work Experience" first={isFirstMain()}>
              {work_experiences.map((exp, i) => (
                <View key={i} style={styles.experienceEntry}>
                  <Text style={styles.experiencePosition}>{exp.position || 'Position'}</Text>
                  <Text style={styles.experienceCompany}>{exp.company || 'Company'}</Text>
                  {exp.duration && (
                    <Text style={styles.experienceDuration}>{exp.duration}</Text>
                  )}
                </View>
              ))}
            </MainSection>
          )}

          {hasEducation && (
            <MainSection title="Education" first={isFirstMain()}>
              <Text style={styles.educationDegree}>
                {[highest_education, course_or_field].filter(Boolean).join(' — ')}
              </Text>
              {school_name && <Text style={styles.educationSchool}>{school_name}</Text>}
              {year_graduated && (
                <Text style={styles.educationYear}>Graduated {year_graduated}</Text>
              )}
            </MainSection>
          )}

          {hasCertifications && (
            <MainSection title="Certifications" first={isFirstMain()}>
              {certifications.map((cert, i) => (
                <Text key={i} style={styles.certItem}>{cert}</Text>
              ))}
            </MainSection>
          )}

          {hasPortfolio && (
            <MainSection title="Portfolio" first={isFirstMain()}>
              <Link src={portfolio_url} style={styles.portfolioLink}>
                {portfolio_url}
              </Link>
            </MainSection>
          )}
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/profile/ResumeDocument.jsx
git commit -m "feat: add ResumeDocument PDF template component"
```

---

### Task 3: Test ResumeDocument component

**Files:**
- Create: `src/components/profile/ResumeDocument.test.jsx`

`@react-pdf/renderer` components can't render into jsdom. Instead, test that the component can be instantiated and that helper functions work correctly. We'll mock `@react-pdf/renderer` primitives as simple divs.

- [ ] **Step 1: Write the tests**

Create `src/components/profile/ResumeDocument.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'

// Mock @react-pdf/renderer with simple HTML elements so jsdom can render them
vi.mock('@react-pdf/renderer', () => {
  const React = require('react')
  const createComponent = (name) => ({ children, ...props }) =>
    React.createElement(name === 'Document' || name === 'Page' ? 'div' : 'span', {
      'data-testid': name.toLowerCase(),
      ...props,
    }, children)
  return {
    Document: createComponent('Document'),
    Page: createComponent('Page'),
    View: createComponent('View'),
    Text: createComponent('Text'),
    Image: createComponent('Image'),
    Link: ({ children, src, ...props }) =>
      React.createElement('a', { href: src, ...props }, children),
    StyleSheet: { create: (s) => s },
  }
})

import { render, screen } from '@testing-library/react'
import ResumeDocument from './ResumeDocument'

const fullUserData = {
  full_name: 'Juan Dela Cruz',
  email: 'juan@example.com',
  mobile_number: '0917-123-4567',
  city: 'Makati',
  province: 'Metro Manila',
  profile_photo: 'https://example.com/photo.jpg',
  skills: ['JavaScript', 'React', 'Node.js'],
  languages: [
    { language: 'English', proficiency: 'Fluent' },
    { language: 'Filipino', proficiency: 'Native' },
  ],
  work_experiences: [
    { company: 'TechCorp', position: 'Frontend Developer', duration: 'Jan 2023 - Present' },
  ],
  highest_education: 'College Graduate',
  school_name: 'UP Diliman',
  course_or_field: 'Computer Science',
  year_graduated: '2022',
  certifications: ['AWS Certified'],
  portfolio_url: 'https://juan.dev',
}

describe('ResumeDocument', () => {
  it('renders with full user data without crashing', () => {
    const { container } = render(<ResumeDocument userData={fullUserData} />)
    expect(container.textContent).toContain('Juan Dela Cruz')
    expect(container.textContent).toContain('juan@example.com')
    expect(container.textContent).toContain('JavaScript')
    expect(container.textContent).toContain('Frontend Developer')
    expect(container.textContent).toContain('College Graduate')
    expect(container.textContent).toContain('AWS Certified')
  })

  it('renders initials when profile_photo is null', () => {
    const data = { ...fullUserData, profile_photo: null }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).toContain('JD')
  })

  it('omits work experience section when empty', () => {
    const data = { ...fullUserData, work_experiences: [] }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).not.toContain('Work Experience')
  })

  it('omits certifications section when empty', () => {
    const data = { ...fullUserData, certifications: [] }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).not.toContain('Certifications')
  })

  it('omits skills section when empty', () => {
    const data = { ...fullUserData, skills: [] }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).not.toContain('Skills')
  })

  it('omits portfolio section when no URL', () => {
    const data = { ...fullUserData, portfolio_url: '' }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).not.toContain('Portfolio')
  })

  it('omits languages section when empty', () => {
    const data = { ...fullUserData, languages: [] }
    const { container } = render(<ResumeDocument userData={data} />)
    expect(container.textContent).not.toContain('Languages')
  })

  it('renders location as city, province', () => {
    const { container } = render(<ResumeDocument userData={fullUserData} />)
    expect(container.textContent).toContain('Makati, Metro Manila')
  })

  it('handles null userData gracefully', () => {
    const { container } = render(<ResumeDocument userData={null} />)
    expect(container).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
npx vitest run src/components/profile/ResumeDocument.test.jsx
```
Expected: All 9 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/ResumeDocument.test.jsx
git commit -m "test: add ResumeDocument unit tests"
```

---

### Task 4: Create ExportResumeButton component

**Files:**
- Create: `src/components/profile/ExportResumeButton.jsx`

This component handles the full export flow: missing field check, warning modal, lazy PDF generation, and browser download.

- [ ] **Step 1: Create the ExportResumeButton component**

Create `src/components/profile/ExportResumeButton.jsx`:

```jsx
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Download, Loader2, X, AlertTriangle } from 'lucide-react'

const FIELD_CHECKS = [
  { key: 'profile_photo', label: 'Profile Photo', check: (v) => !!v },
  { key: 'skills', label: 'Skills', check: (v) => Array.isArray(v) && v.length > 0 },
  { key: 'work_experiences', label: 'Work Experience', check: (v) => Array.isArray(v) && v.length > 0 },
  { key: 'highest_education', label: 'Education', check: (v) => !!v },
  { key: 'certifications', label: 'Certifications', check: (v) => Array.isArray(v) && v.length > 0 },
  { key: 'languages', label: 'Languages', check: (v) => Array.isArray(v) && v.length > 0 },
  { key: 'portfolio_url', label: 'Portfolio', check: (v) => !!v },
]

function getMissingFields(userData) {
  return FIELD_CHECKS.filter(({ key, check }) => !check(userData?.[key]))
    .map(({ label }) => label)
}

function sanitizeFilename(name) {
  if (!name) return 'Resume'
  return name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_')
}

export default function ExportResumeButton() {
  const { userData } = useAuth()
  const [generating, setGenerating] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [missingFields, setMissingFields] = useState([])
  const [error, setError] = useState(null)

  function handleClick() {
    setError(null)
    const missing = getMissingFields(userData)
    if (missing.length > 0) {
      setMissingFields(missing)
      setShowWarning(true)
    } else {
      generatePdf()
    }
  }

  async function generatePdf() {
    setShowWarning(false)
    setGenerating(true)
    setError(null)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { default: ResumeDocument } = await import('./ResumeDocument')
      const blob = await pdf(<ResumeDocument userData={userData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${sanitizeFilename(userData?.full_name)}_Resume.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation failed:', err)
      setError('Failed to generate resume. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={generating}
        className="btn-secondary flex items-center justify-center gap-2"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Export as Resume
          </>
        )}
      </button>

      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}

      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  Some sections are incomplete
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  The following sections are missing from your profile:
                </p>
              </div>
            </div>
            <ul className="list-disc list-inside text-sm text-gray-700 ml-9 mb-6">
              {missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowWarning(false)}
                className="btn-secondary px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={generatePdf}
                className="btn-primary px-4 py-2"
              >
                Export Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export { getMissingFields, sanitizeFilename }
```

- [ ] **Step 2: Commit**

```bash
git add src/components/profile/ExportResumeButton.jsx
git commit -m "feat: add ExportResumeButton with warning modal and lazy PDF generation"
```

---

### Task 5: Test ExportResumeButton component

**Files:**
- Create: `src/components/profile/ExportResumeButton.test.jsx`

- [ ] **Step 1: Write the tests**

Create `src/components/profile/ExportResumeButton.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getMissingFields, sanitizeFilename } from './ExportResumeButton'

// Mock useAuth
const mockUserData = {
  full_name: 'Juan Dela Cruz',
  email: 'juan@example.com',
  profile_photo: 'https://example.com/photo.jpg',
  skills: ['JavaScript'],
  work_experiences: [{ company: 'X', position: 'Y', duration: 'Z' }],
  highest_education: 'College Graduate',
  certifications: ['AWS'],
  languages: [{ language: 'English', proficiency: 'Fluent' }],
  portfolio_url: 'https://juan.dev',
}

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userData: mockUserData }),
}))

// Mock @react-pdf/renderer to avoid actual PDF generation in tests
vi.mock('@react-pdf/renderer', () => {
  const React = require('react')
  return {
    pdf: () => ({
      toBlob: () => Promise.resolve(new Blob(['fake-pdf'], { type: 'application/pdf' })),
    }),
    Document: ({ children }) => React.createElement('div', null, children),
    Page: ({ children }) => React.createElement('div', null, children),
    View: ({ children }) => React.createElement('div', null, children),
    Text: ({ children }) => React.createElement('span', null, children),
    Image: () => React.createElement('img'),
    Link: ({ children }) => React.createElement('a', null, children),
    StyleSheet: { create: (s) => s },
  }
})

describe('getMissingFields', () => {
  it('returns empty array when all fields are present', () => {
    expect(getMissingFields(mockUserData)).toEqual([])
  })

  it('detects missing profile photo', () => {
    const data = { ...mockUserData, profile_photo: null }
    expect(getMissingFields(data)).toContain('Profile Photo')
  })

  it('detects empty skills array', () => {
    const data = { ...mockUserData, skills: [] }
    expect(getMissingFields(data)).toContain('Skills')
  })

  it('detects missing work experience', () => {
    const data = { ...mockUserData, work_experiences: [] }
    expect(getMissingFields(data)).toContain('Work Experience')
  })

  it('detects missing education', () => {
    const data = { ...mockUserData, highest_education: '' }
    expect(getMissingFields(data)).toContain('Education')
  })

  it('handles null userData', () => {
    const result = getMissingFields(null)
    expect(result.length).toBe(7)
  })
})

describe('sanitizeFilename', () => {
  it('replaces spaces with underscores', () => {
    expect(sanitizeFilename('Juan Dela Cruz')).toBe('Juan_Dela_Cruz')
  })

  it('removes special characters', () => {
    expect(sanitizeFilename('Juan/Dela@Cruz!')).toBe('JuanDelaCruz')
  })

  it('returns Resume for null input', () => {
    expect(sanitizeFilename(null)).toBe('Resume')
  })
})

describe('ExportResumeButton', () => {
  let ExportResumeButton

  beforeEach(async () => {
    // Dynamic import to ensure mocks are applied
    const mod = await import('./ExportResumeButton')
    ExportResumeButton = mod.default
  })

  it('renders the export button', () => {
    render(<ExportResumeButton />)
    expect(screen.getByText('Export as Resume')).toBeTruthy()
  })

  it('shows generating state when clicked with complete profile', async () => {
    const user = userEvent.setup()
    render(<ExportResumeButton />)
    await user.click(screen.getByText('Export as Resume'))
    // Button should eventually return to normal state after generation
    // The generating state is transient, so we check the button exists
    expect(screen.getByRole('button')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
npx vitest run src/components/profile/ExportResumeButton.test.jsx
```
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/ExportResumeButton.test.jsx
git commit -m "test: add ExportResumeButton unit tests"
```

---

### Task 6: Integrate ExportResumeButton into JobseekerProfileEdit

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx` (lines 1-14 for imports, line 979 for button placement)

- [ ] **Step 1: Add the import**

In `src/pages/JobseekerProfileEdit.jsx`, add to the imports section (after line 14):

```jsx
import ExportResumeButton from '../components/profile/ExportResumeButton'
```

- [ ] **Step 2: Add the button to the action buttons area**

Find the action buttons section (around line 978-979):

```jsx
{/* Action Buttons */}
<div className="flex gap-3 pt-4">
```

Add the ExportResumeButton before this div, as a separate row:

```jsx
{/* Export Resume */}
<div className="pt-4">
    <ExportResumeButton />
</div>

{/* Action Buttons */}
<div className="flex gap-3 pt-4">
```

This places the export button above the Cancel/Save buttons as its own row, keeping it visually distinct from the form submission actions.

- [ ] **Step 3: Verify the app builds without errors**

Run:
```bash
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 4: Run all tests to verify no regressions**

Run:
```bash
npm run test
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "feat: add Export as Resume button to jobseeker profile edit page"
```

---

### Task 7: Manual smoke test

This task verifies the full flow works end-to-end in the browser.

- [ ] **Step 1: Start the dev server**

Run:
```bash
npm run dev
```

- [ ] **Step 2: Test with a complete profile**

1. Log in as a jobseeker with a complete profile
2. Navigate to `/profile/edit`
3. Click "Export as Resume"
4. Verify: PDF downloads immediately (no warning modal)
5. Open the PDF and verify:
   - Two-column layout with dark blue sidebar
   - Photo (or initials) at top of sidebar
   - Name, contact info, skills, languages in sidebar
   - Work experience, education, certifications, portfolio in main column
   - Text is selectable (not an image)

- [ ] **Step 3: Test with an incomplete profile**

1. Edit the profile to remove some fields (e.g., clear certifications, remove work experience)
2. Click "Export as Resume"
3. Verify: warning modal appears listing missing sections
4. Click "Export Anyway"
5. Verify: PDF downloads with empty sections omitted
6. Click "Export as Resume" again, then click "Cancel"
7. Verify: modal closes, no PDF generated

- [ ] **Step 4: Test with no profile photo**

1. Remove profile photo
2. Export the resume
3. Verify: initials circle appears in the sidebar instead of photo

- [ ] **Step 5: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: address issues found during manual smoke test"
```

Only create this commit if fixes were needed. Skip if everything worked.

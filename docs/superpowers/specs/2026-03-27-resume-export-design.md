# Resume Export (PDF) — Design Spec

## Overview

Jobseekers can export their profile as a clean, formatted PDF resume from the profile edit page. The PDF uses a two-column sidebar layout with selectable text for ATS compatibility.

## Included Fields

| Section | Fields | Location in PDF |
|---------|--------|-----------------|
| Photo | `profile_photo` | Sidebar (top) |
| Name | `full_name` | Sidebar (below photo) |
| Contact | `email`, `mobile_number`, city/province | Sidebar |
| Skills | `skills` array | Sidebar |
| Languages | `languages` array (language + proficiency) | Sidebar |
| Work Experience | `work_experiences` JSON array (company, position, duration) | Main column |
| Education | `highest_education`, `school_name`, `course_or_field`, `year_graduated` | Main column |
| Certifications | `certifications` array | Main column |
| Portfolio | `portfolio_url` | Main column |

**Excluded:** date of birth, gender, civil status, salary range, employment preferences, willing to relocate, PWD status, preferred contact method, barangay.

## Section Order (Skills-First)

Chosen for the PESO context where many jobseekers are fresh graduates or have limited work history.

**Sidebar (top to bottom):** Photo, Name, Contact, Skills, Languages

**Main column (top to bottom):** Work Experience, Education, Certifications, Portfolio

## PDF Layout

Two-column sidebar layout:

```
+------------------+----------------------------+
|    SIDEBAR 35%   |      MAIN COLUMN 65%       |
|                  |                            |
|  [Photo circle]  |  WORK EXPERIENCE           |
|  Full Name       |  Position — Company         |
|                  |  Duration                   |
|  CONTACT         |                            |
|  email           |  EDUCATION                  |
|  mobile          |  Degree — School            |
|  city, province  |  Year Graduated             |
|                  |                            |
|  SKILLS          |  CERTIFICATIONS             |
|  [pill] [pill]   |  - Cert name               |
|                  |                            |
|  LANGUAGES       |  PORTFOLIO                  |
|  Lang (prof.)    |  URL (linked)              |
+------------------+----------------------------+
```

**Styling:**
- Page size: A4
- Font: Helvetica (built into @react-pdf/renderer)
- Sidebar: dark blue background (`#1e3a5f`), white text
- Main column: white background, dark text
- Section headings: uppercase, small font, subtle bottom border
- Skills: rendered as light-background pill/tag elements
- Portfolio URL: blue text with PDF link annotation
- Empty sections are omitted entirely (no heading, no placeholder)

## Technical Approach

**Library:** `@react-pdf/renderer`

Chosen because:
- Produces real selectable/searchable text (important for ATS systems)
- Flexbox layout engine — natural fit for the two-column sidebar
- React component model matches the existing codebase
- Can be lazy-loaded to avoid bloating the main bundle

### New Files

| File | Purpose |
|------|---------|
| `src/components/profile/ResumeDocument.jsx` | `@react-pdf/renderer` component. Takes `userData` as props, renders the two-column PDF. |
| `src/components/profile/ExportResumeButton.jsx` | Button + pre-export logic: missing field check, warning modal, PDF generation trigger. |

### Data Flow

1. User clicks "Export as Resume" on JobseekerProfileEdit page
2. `ExportResumeButton` reads `userData` from `useAuth()` context
3. Checks which resume-relevant fields are empty
4. If any are empty: shows warning modal listing missing sections
5. On confirm (or if all fields present): lazy-imports `ResumeDocument` + `@react-pdf/renderer`
6. Generates PDF blob via `pdf(<ResumeDocument userData={userData} />).toBlob()`
7. Triggers browser download as `{Full_Name}_Resume.pdf`

### Lazy Loading

`ResumeDocument` and `@react-pdf/renderer` are only dynamically imported when the user clicks export. The main application bundle is unaffected.

```js
const { pdf } = await import('@react-pdf/renderer');
const { default: ResumeDocument } = await import('./ResumeDocument');
```

## ExportResumeButton Behavior

### Button
- Placement: top of JobseekerProfileEdit page, near existing action buttons
- Style: secondary/outline button with Lucide `Download` or `FileDown` icon
- Label: "Export as Resume"
- Loading state: "Generating..." while PDF is being created

### Pre-Export Warning

Checks these fields and warns if any are missing:

| Field | Display Name |
|-------|-------------|
| `profile_photo` | Profile Photo |
| `skills` (length > 0) | Skills |
| `work_experiences` (length > 0) | Work Experience |
| `highest_education` | Education |
| `certifications` (length > 0) | Certifications |
| `languages` (length > 0) | Languages |
| `portfolio_url` | Portfolio |

**Warning modal:**
- Title: "Some sections are incomplete"
- Body: bulleted list of missing section names
- Buttons: "Export Anyway" (proceeds with export) / "Cancel" (closes modal)
- If all fields present: skips modal, exports immediately

**Future refinement:** Consider removing `certifications`, `languages`, and `portfolio_url` from the warning trigger list since these are optional/nice-to-have fields, not essential resume sections.

### Error Handling

If PDF generation fails, show a brief alert: "Failed to generate resume. Please try again."

### Modal Implementation

Simple inline component within ExportResumeButton — fixed-position overlay with backdrop, using existing Tailwind styling patterns. No shared modal system needed.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@react-pdf/renderer` | PDF generation with React components |

No other new dependencies required. Lucide icons (already installed) provide the button icon.

## Out of Scope

- Multiple resume templates or themes
- Custom font selection
- Resume export from PublicProfile page
- Export history tracking
- Server-side PDF generation

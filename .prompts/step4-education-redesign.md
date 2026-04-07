Redesign src/components/registration/Step4Education.jsx and fix related data persistence bugs in src/pages/JobseekerRegistration.jsx. The goal is to make the educational background step more specific, intuitive, and contextually adaptive — showing/hiding fields based on the selected education level, with better visual hierarchy and clearer guidance. Do NOT touch any other steps or pages. The dev server is already running on localhost:5173.

## BUG FIX (do this first)

did_not_graduate, education_level_reached, and year_last_attended exist in the Step4Education UI but are never persisted. Fix this in src/pages/JobseekerRegistration.jsx:

1. Add to formData initial state (~line 100, inside the Step 4 comment block): did_not_graduate: false,
2. Add to getStepData() case 4 (~line 423): did_not_graduate: formData.did_not_graduate,
3. Add to the restore logic (~line 207, inside the if (userData) block): did_not_graduate: userData.did_not_graduate || false,

## REDESIGN Step4Education.jsx

Rewrite src/components/registration/Step4Education.jsx with these specific improvements. Keep all existing imports/exports and maintain the same component signature: Step4Education({ formData, handleChange, setFormData, errors = {} }).

### 0. Update EDUCATION_LEVELS labels

Replace the current EDUCATION_LEVELS array with clearer labels aligned to the Philippine K-12 system:

const EDUCATION_LEVELS = [
  'Elementary (Grades 1-6)',
  'High School (Old Curriculum)',
  'Junior High School (Grades 7-10)',
  'Senior High School (Grades 11-12)',
  'Tertiary',
  'Graduate Studies / Post-graduate'
]

Key changes:
- 'Secondary (Non-K12)' becomes 'High School (Old Curriculum)' — clearer for pre-K12 graduates
- 'Secondary (K-12)' becomes 'Junior High School (Grades 7-10)' — makes it clear this is only the JHS portion of K-12 secondary
- 'Senior High School' becomes 'Senior High School (Grades 11-12)' — explicitly shows grade range
- 'Elementary' becomes 'Elementary (Grades 1-6)' — adds grade range for clarity

Also update the getCourseOptions() function and showCourseField logic to match the new label strings. The course data mapping stays the same:
- 'Senior High School (Grades 11-12)' maps to coursesData.seniorHigh
- 'Tertiary' maps to coursesData.tertiary
- 'Graduate Studies / Post-graduate' maps to coursesData.graduate

### 1. Contextual field visibility based on education level

Show/hide fields dynamically based on formData.highest_education:

- Elementary (Grades 1-6): HIDE course field, SHOW year graduated, SHOW did not graduate checkbox
- High School (Old Curriculum): HIDE course field, SHOW year graduated, SHOW did not graduate checkbox
- Junior High School (Grades 7-10): HIDE course field, SHOW year graduated, SHOW did not graduate checkbox
- Senior High School (Grades 11-12): SHOW course field (SHS tracks from courses.json), SHOW year graduated, SHOW did not graduate checkbox
- Tertiary: SHOW course field (degree programs from courses.json), SHOW year graduated, SHOW did not graduate checkbox
- Graduate Studies / Post-graduate: SHOW course field (grad programs from courses.json), SHOW year graduated, SHOW did not graduate checkbox

Use the existing AnimatedSection component for show/hide transitions (already imported).

### 2. Education level selector — use card-based buttons instead of SearchableSelect

Replace the SearchableSelect dropdown for education level with a vertical stack of selectable cards (2-column grid on desktop, 1-column on mobile), similar to how employment status works in Step3. Each card should show:
- An emoji icon on the left
- The education level name in medium weight
- A brief one-line description in smaller gray text

Card content:
- Elementary (Grades 1-6): emoji 🏫, description "Primary education"
- High School (Old Curriculum): emoji 📚, description "Pre-K12 secondary (4-year)"
- Junior High School (Grades 7-10): emoji 📖, description "K-12 lower secondary"
- Senior High School (Grades 11-12): emoji 🎓, description "K-12 upper secondary with tracks"
- Tertiary: emoji 🏛️, description "College / University degree"
- Graduate Studies / Post-graduate: emoji 📜, description "Master's or Doctoral program"

Selected state: border-primary-500 bg-primary-50 text-primary-700 font-medium shadow-sm
Default state: border-gray-200 hover:border-gray-300 text-gray-600

When the education level changes, reset course_or_field to '' (already done in existing code).

### 3. Smarter "Currently in School" + "Did not graduate" logic

- When "Currently in School" = Yes:
  - Auto-set did_not_graduate: true
  - Change the year field label from "Year Graduated" to "Expected Graduation Year"
  - Hide the "I did not graduate" checkbox (it's implied)

- When "Currently in School" = No:
  - Show the "I did not graduate" checkbox normally
  - Show "Year Graduated" label

- When "Did not graduate" is checked (and not currently in school):
  - HIDE "Year Graduated" (contradictory)
  - SHOW "Level Reached" field with a contextual placeholder based on education level:
    - Elementary: "e.g., Grade 4"
    - High School (Old Curriculum): "e.g., 3rd Year"
    - Junior High School: "e.g., Grade 9"
    - Senior High School: "e.g., Grade 11"
    - Tertiary: "e.g., 3rd Year"
    - Graduate: "e.g., Completed coursework"
  - SHOW "Year Last Attended" (number input, min 1950, max current year)
  - Wrap these fields in a light blue info-styled container (bg-blue-50 border border-blue-200 rounded-xl p-4) instead of the current yellow warning box

### 4. Visual hierarchy improvements

Structure the component with clear sections:

FORMAL EDUCATION (card container with subtle border):
- Section header: "Formal Education" with GraduationCap icon + subtitle "Tell us about your highest educational attainment"
- Currently in School (Yes/No toggle buttons — keep existing style)
- Education Level cards (2-col grid)
- School/Institution name (FloatingLabelInput — add placeholder "e.g., University of the Philippines")
- Course/Field (SearchableSelect — only when applicable, keep existing grouped logic)
- Year Graduated / Expected Graduation Year (conditional)
- "I did not graduate" checkbox (conditional)
- Level Reached + Year Last Attended (conditional)

Then a visual divider (border-t border-gray-200 pt-4)

TECHNICAL/VOCATIONAL TRAINING (keep existing implementation mostly as-is):
- Section header with Tooltip (keep existing)
- Training entries (keep existing card layout)
- "Add Training" button (keep existing)

### 5. Small polish items

- Add error prop support to the "Currently in School" toggle (show error message below if errors.currently_in_school)
- Add a green checkmark icon next to the education level section header when highest_education has a value
- Keep the existing EDUCATION_LEVELS and CERTIFICATE_LEVELS exports for backward compatibility — but update the VALUES inside the array as described in section 0
- Keep all existing vocational training logic (add/update/remove) unchanged

### 6. Do NOT change

- The courses.json data file
- The SearchableSelect, FloatingLabelInput, AnimatedSection, or Tooltip components
- The CERTIFICATE_LEVELS constant values
- The Step5SkillsExperience, Step3ContactEmployment, or any other step components
- The JobseekerProfileEdit.jsx page (leave for a separate task)
- Any validation logic in JobseekerRegistration.jsx beyond the bug fix above

## Verification

After making changes:
1. Confirm the dev server has no compilation errors
2. The component should render without React errors
3. Test mentally that each education level shows/hides the correct fields per the table above

# Course → Skill Suggestions: Coverage & Accuracy Fix

## Problem

AI skill suggestions in jobseeker registration are inconsistent:
- **Missing** for ~40+ courses in `src/data/courses.json` (graduate programs, many engineering tracks, natural sciences, humanities, several health sciences and other strands).
- **Inaccurate** for some matched courses (e.g. `medic(?:al|ine)` over-matches "Medical Technology"; generic `management` swallows "Tourism Management"; STEM strand returns generic filler).

Suggestions are produced by `src/utils/skillRecommender.js`, consumed by `Step4Education.jsx` (inline chips under course field and training field) and `Step5SkillsExperience.jsx` (aggregate suggestions).

## Approach

Keep the deterministic, zero-API-cost architecture. Add an explicit exact-match lookup and keep the existing regex patterns as a fallback for free-text input.

### Two-layer lookup

`getSkillsForCourse(course)`:

1. Normalize input (trim, collapse whitespace).
2. Look up against `COURSE_SKILL_MAP` — a new object keyed by the exact course strings in `src/data/courses.json`. Case-insensitive via a lowercase-keyed map built at module load.
3. If no exact hit, run `COURSE_PATTERNS` regex matching (existing behaviour).
4. Merge `primary`/`secondary`/`predefined` into the same ordered list the existing `suggestFor` helper already produces. Downstream consumers are unchanged.

`generateSuggestedSkills(formData)` — the Step 5 aggregate — uses the same upgraded course lookup (extract an internal helper so both paths share it).

### Entry shape

Each table entry reuses the existing shape so downstream code is untouched:

```js
'Bachelor of Science in Chemical Engineering': {
  primary: ['Chemical Process Control', 'Laboratory Testing', 'Quality Assurance', 'AutoCAD'],
  secondary: ['MS Excel', 'Problem Solving'],
  predefined: ['Computer Literate'],
}
```

### Coverage

Every entry in `courses.json` gets a mapping:
- **Senior High** — ABM, HUMSS, STEM, GAS, Home Economics, ICT, Industrial Arts, Agri-Fishery Arts, Sports Track, Arts and Design Track.
- **Tertiary** — all 11 categories (Humanities, Social Sciences, Natural Sciences, Formal Sciences, Agriculture, Architecture/Design, Business, Health Sciences, Education, Engineering, Media/Communication, Public Admin, Transportation, Family & Consumer Science, Criminal Justice).
- **Graduate** — MA, MS, MBA, MPA, MEd, MEng, PhD, EdD, MD, JSD, mapped to research/communication/leadership skills rather than guessed domain skills.

### Accuracy fixes in regex fallback

- Split `medic(?:al|ine)` so "Medical Technology" routes to lab/medtech skills, not generic clinical.
- Narrow `business\s*admin|management|entrepreneur` so it doesn't swallow "Tourism Management", "Real Estate Management", "Hotel and Restaurant Management" (those get their own exact entries).
- Reorder engineering patterns from most-specific to least-specific (Industrial before Mechanical before generic).
- STEM strand gets richer skills (Scientific Method, Research Methods, Data Analysis, Laboratory Safety, MS Excel).

## Testing

Extend `src/utils/skillRecommender.test.js`:

- **Coverage regression test** — iterate every course in `courses.json` (senior high + tertiary + graduate) and assert `getSkillsForCourse(course).length > 0`. Any future addition without a mapping fails CI.
- **Accuracy spot-checks** for previously broken cases: Medical Technology, Industrial Engineering, Chemical Engineering, MBA, Tourism Management, STEM strand, Philosophy, Geology, Occupational Therapy, Interior Design.
- **Stability** — existing tests continue to pass unchanged.

## Scope

Touches only:
- `src/utils/skillRecommender.js`
- `src/utils/skillRecommender.test.js`

Does not touch: `jobSkillRecommender.js`, the `suggest-job-skills` edge function, Gemini service, or the UI components (chip rows in Step 4/5 pick up improved results automatically).

# Hierarchical Skill Matching Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hierarchical parent-child skill matching to the deterministic scoring function so child skills (and their aliases) satisfy parent skill requirements.

**Architecture:** A static `SKILL_HIERARCHY` map and a `hierarchyCoversRequirement` helper are added to `geminiService.js`. The existing `calculateDeterministicScore` loop gains a third fallback (Layers 3-4) after the existing exact (Layer 1) and alias (Layer 2) checks. No database, API, or UI changes.

**Tech Stack:** JavaScript (Vite/React), Vitest for tests

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/services/geminiService.js` | Modify | Add `SKILL_HIERARCHY` constant, `hierarchyCoversRequirement` helper, update `calculateDeterministicScore` |
| `src/services/geminiService.test.js` | Modify | Add 8 hierarchy-specific test cases |

---

## Chunk 1: Implementation

### Task 1: Add SKILL_HIERARCHY constant and hierarchyCoversRequirement helper

**Files:**
- Modify: `src/services/geminiService.js:191` (insert before `skillMatches`)

- [ ] **Step 1: Write failing tests for Layer 3 (direct child match) and Layer 4 (alias match)**

Add a new `describe('hierarchy matching')` block inside the existing `describe('calculateDeterministicScore')` in `src/services/geminiService.test.js`, after the existing tests (after line 371):

```js
    describe('hierarchy matching', () => {
      it('Layer 3 — child skill satisfies parent requirement', () => {
        const job = { requirements: ['Communication Skills'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'Customer Service' }],
          skill_aliases: {},
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('Communication Skills')
        expect(result.missingSkills).not.toContain('Communication Skills')
      })

      it('Layer 4 — child matched via alias bridges to parent', () => {
        const job = { requirements: ['Communication Skills'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'Client Support' }],
          skill_aliases: { 'Client Support': ['Customer Service', 'Help Desk'] },
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('Communication Skills')
      })

      it('parent does NOT satisfy child requirement (upward only)', () => {
        const job = { requirements: ['Customer Service'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'Communication Skills' }],
          skill_aliases: {},
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).not.toContain('Customer Service')
        expect(result.missingSkills).toContain('Customer Service')
      })

      it('non-hierarchy requirement falls through to Layer 1/2 only', () => {
        const job = { requirements: ['Gardening'], category: 'agriculture', education_level: null }
        const userData = {
          skills: [{ name: 'Plumbing' }],
          skill_aliases: {},
          experience_categories: ['agriculture'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.missingSkills).toContain('Gardening')
      })

      it('non-transitive — grandchild does NOT satisfy grandparent', () => {
        const job = { requirements: ['Communication Skills'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'Cashiering' }],
          skill_aliases: {},
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.missingSkills).toContain('Communication Skills')
      })

      it('case-insensitive hierarchy lookup', () => {
        const job = { requirements: ['COMMUNICATION SKILLS'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'customer service' }],
          skill_aliases: {},
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('COMMUNICATION SKILLS')
      })

      it('exact match takes precedence over hierarchy (Layer 1 first)', () => {
        const job = { requirements: ['Communication Skills'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'Communication Skills' }],
          skill_aliases: {},
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('Communication Skills')
      })

      it('Layer 4 works with null skill_aliases (pre-migration user)', () => {
        const job = { requirements: ['Communication Skills'], category: 'retail', education_level: null }
        const userData = {
          skills: [{ name: 'Customer Service' }],
          skill_aliases: null,
          experience_categories: ['retail'],
          highest_education: 'High School Graduate',
        }
        const result = calculateDeterministicScore(job, userData)
        expect(result.matchingSkills).toContain('Communication Skills')
      })
    })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/geminiService.test.js`
Expected: 8 new tests FAIL (hierarchy matching not implemented yet). Existing 28 tests still PASS.

- [ ] **Step 3: Add SKILL_HIERARCHY constant**

In `src/services/geminiService.js`, insert the following constant **after** the `USER_EDUCATION_ORDINAL` block (after line 189) and **before** the `skillMatches` function (line 191):

```js
// --- Skill hierarchy for parent-child matching ---
// Children satisfy parent requirements (upward only, no recursion)
const SKILL_HIERARCHY = {
    'communication skills': ['customer service', 'active listening', 'public speaking', 'interpersonal skills'],
    'basic computer skills': ['ms office', 'typing skills', 'data entry', 'email management'],
    'electrical work': ['electrical installation', 'wiring', 'electrical troubleshooting'],
    'food preparation': ['cooking', 'baking', 'food safety', 'kitchen management'],
    'vehicle operation': ['driving', 'motorcycle operation', 'forklift operation'],
    'construction': ['masonry', 'carpentry', 'painting', 'scaffolding'],
    'welding': ['arc welding', 'mig welding', 'tig welding', 'smaw'],
    'customer service': ['cashiering', 'sales', 'complaint handling'],
    'farm equipment operation': ['tractor operation', 'harvesting equipment', 'irrigation systems'],
    'plumbing': ['pipe fitting', 'pipe installation', 'drain cleaning'],
}
```

- [ ] **Step 4: Add hierarchyCoversRequirement helper**

In `src/services/geminiService.js`, insert the following function **after** the `skillMatches` function (after line ~210 with the new constant above):

```js
const hierarchyCoversRequirement = (requirement, userSkills, aliases) => {
    const children = SKILL_HIERARCHY[requirement.toLowerCase()]
    if (!children) return false
    for (const child of children) {
        for (const userSkill of userSkills) {
            if (skillMatches(child, userSkill)) return true
            const userAliases = aliases[userSkill] || []
            for (const alias of userAliases) {
                if (skillMatches(child, alias)) return true
            }
        }
    }
    return false
}
```

- [ ] **Step 5: Update calculateDeterministicScore to call hierarchyCoversRequirement**

In `src/services/geminiService.js`, modify the requirement matching loop inside `calculateDeterministicScore`. Replace the existing loop body (the `for (const req of requirements)` block, approximately lines 221-230 after the insertions):

**Current code:**
```js
        for (const req of requirements) {
            let matched = false
            for (const skill of skills) {
                if (skillMatches(req, skill)) { matched = true; break }
                const skillAliases = aliases[skill] || []
                for (const alias of skillAliases) {
                    if (skillMatches(req, alias)) { matched = true; break }
                }
                if (matched) break
            }
            if (matched) matchingSkills.push(req)
            else missingSkills.push(req)
        }
```

**Replace with:**
```js
        for (const req of requirements) {
            let matched = false
            // Layer 1: exact/word-boundary match
            for (const skill of skills) {
                if (skillMatches(req, skill)) { matched = true; break }
            }
            // Layer 2: alias match
            if (!matched) {
                for (const skill of skills) {
                    const skillAliases = aliases[skill] || []
                    for (const alias of skillAliases) {
                        if (skillMatches(req, alias)) { matched = true; break }
                    }
                    if (matched) break
                }
            }
            // Layers 3-4: hierarchy (child + child-alias)
            if (!matched) {
                matched = hierarchyCoversRequirement(req, skills, aliases)
            }
            if (matched) matchingSkills.push(req)
            else missingSkills.push(req)
        }
```

- [ ] **Step 6: Run all tests to verify they pass**

Run: `npx vitest run src/services/geminiService.test.js`
Expected: All 36 tests PASS (28 existing + 8 new hierarchy tests).

- [ ] **Step 7: Commit**

```bash
git add src/services/geminiService.js src/services/geminiService.test.js
git commit -m "feat: add hierarchical skill matching with 4-layer logic"
```

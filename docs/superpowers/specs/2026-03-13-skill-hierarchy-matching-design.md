# Hierarchical Skill Matching

**Date:** 2026-03-13
**Status:** Draft
**Problem:** The deterministic scoring system treats skills as isolated keywords. When a job requires "Communication Skills" and the user has "Customer Service" (a child of communication), it incorrectly appears as a skill gap. The system needs to understand parent-child skill relationships.

## Skill Hierarchy Map

A static `SKILL_HIERARCHY` constant mapping parent skills to their children. All keys and values are stored in **lowercase** for direct case-insensitive lookup:

```js
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

This map covers common PESO job categories. It is static and deterministic — no API calls needed.

## Matching Direction

**Upward only (children satisfy parents):**
- Job requires "Communication Skills" (parent), user has "Customer Service" (child) → **Match**
- Job requires "Customer Service" (child), user has "Communication Skills" (parent) → **Not a match**

Rationale: Having a specific child skill proves competence in the broader parent category. But having a broad parent skill doesn't prove competence in a specific child area.

## Integration with Existing Scoring

The hierarchy check is added as a third layer in the existing match logic inside `calculateDeterministicScore`. For each job requirement:

1. **Exact/word-boundary match** against user skills (existing)
2. **Alias match** against user's `skill_aliases` (existing)
3. **NEW: Hierarchy match** — if the requirement (lowercased) is a key in `SKILL_HIERARCHY`, check if the user has any of that key's direct children

**Hierarchy child matching algorithm:**
- For each child in `SKILL_HIERARCHY[requirement.toLowerCase()]`:
  - Check if any user skill name matches the child via `skillMatches`
  - Check if any user skill's aliases match the child via `skillMatches`
- This mirrors the existing two-layer pattern (direct + alias) applied to each child
- **No recursion:** Only check the direct children listed under the requirement key. Do NOT recurse into children that are themselves parents in the hierarchy. E.g., if "Communication Skills" lists "Customer Service" as a child, and "Customer Service" lists "Cashiering" as its own child, having "Cashiering" does NOT satisfy "Communication Skills".

If any layer matches, the requirement counts as matched. The scoring formula (Skills 50%, Experience 30%, Education 20%) is unchanged.

## Helper Function

```
hierarchyCoversRequirement(requirement, userSkills, aliases):
  children = SKILL_HIERARCHY[requirement.toLowerCase()]
  if no children, return false
  for each child in children:
    for each userSkill in userSkills:
      if skillMatches(child, userSkill) → return true
      for each alias in aliases[userSkill]:
        if skillMatches(child, alias) → return true
  return false
```

## What Changes

- `matchingSkills` array becomes more accurate — parent skills are included when children are present
- `missingSkills` array shrinks — parents with present children are no longer gaps
- The `skillScore` component may increase for candidates who have child skills matching parent requirements
- The overall `matchScore` may increase slightly for affected candidates

## Files to Modify

1. **`src/services/geminiService.js`** — Add `SKILL_HIERARCHY` constant (lowercase keys/values), add `hierarchyCoversRequirement` helper, update `calculateDeterministicScore` to call it as a third matching layer
2. **`src/services/geminiService.test.js`** — Add test cases for hierarchy matching

## No Changes Needed

- No database changes
- No API changes
- No UI changes
- No changes to `expandProfileAliases`
- No changes to JobListings or JobDetail pages (they consume the same `calculateDeterministicScore` output)

## Test Cases

1. **Child satisfies parent** — user has "Customer Service", job requires "Communication Skills" → match
2. **Parent does NOT satisfy child** — user has "Communication Skills", job requires "Customer Service" → not a match (direction check)
3. **Not in hierarchy** — user has "Plumbing", job requires "Gardening" → falls through to existing matching
4. **Non-transitive** — user has "Cashiering" (child of Customer Service), job requires "Communication Skills" (parent of Customer Service) → NOT a match (no recursion)
5. **Case-insensitive** — user has "customer service", job requires "COMMUNICATION SKILLS" → match
6. **Child matched via alias** — user has "Welding" with alias "Arc Welding", job requires "Welding" (parent) → match via alias matching a child
7. **User has parent skill directly** — user has "Communication Skills", job requires "Communication Skills" → match (exact match, not hierarchy)

## Edge Cases

- **Requirement is not in hierarchy:** Falls through to existing exact/alias matching — no change in behavior
- **User has multiple children of the same parent:** Still counts as one match for the parent requirement (no double counting)
- **Nested hierarchies (e.g., "Customer Service" is both a parent and a child):** Only direct children are checked. No recursion. "Cashiering" does NOT satisfy "Communication Skills" — only direct children of "Communication Skills" are checked.
- **Case handling:** `SKILL_HIERARCHY` keys and values are stored lowercase. Requirements are lowercased before lookup. `skillMatches` already handles case-insensitive comparison.

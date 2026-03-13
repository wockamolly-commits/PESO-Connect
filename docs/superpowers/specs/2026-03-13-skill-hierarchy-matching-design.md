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

This map covers common PESO job categories. It is static, manually-curated, and deterministic — no API calls needed. When new job categories are added to the system, the hierarchy should be reviewed and updated as needed by developers.

## Matching Direction

**Upward only (children satisfy parents):**
- Job requires "Communication Skills" (parent), user has "Customer Service" (child) → **Match**
- Job requires "Customer Service" (child), user has "Communication Skills" (parent) → **Not a match**

Rationale: Having a specific child skill proves competence in the broader parent category. But having a broad parent skill doesn't prove competence in a specific child area.

## 4-Layer Matching Logic

The matching inside `calculateDeterministicScore` now has 4 layers, checked in order. If any layer matches, the requirement is satisfied:

### Layer 1: Exact/word-boundary match (existing)
Check if any user skill name matches the requirement via `skillMatches`.

### Layer 2: Alias match (existing)
Check if any of the user's AI-generated `skill_aliases` match the requirement via `skillMatches`.

### Layer 3: Hierarchy direct child match (NEW)
If the requirement is a parent in `SKILL_HIERARCHY`, check if any user skill name directly matches one of its children via `skillMatches`.

Example: Job requires "Communication Skills" → hierarchy children include "customer service" → user has "Customer Service" → match.

### Layer 4: Hierarchy alias match (NEW)
If the requirement is a parent in `SKILL_HIERARCHY`, check if any of the user's skill aliases match one of its children via `skillMatches`. This allows the hierarchy to recognize skill variations without requiring every term in the static map.

Example chain: Job requires "Communication Skills" → hierarchy child "customer service" → user has "Client Support" with alias "Customer Service" → "Customer Service" matches hierarchy child → match.

```
Client Support → (alias of) → Customer Service → (child of) → Communication Skills
```

This layer reuses the existing `skill_aliases` from `expandProfileAliases` — no additional AI calls or database changes needed.

### Why 4 layers matter

Without Layer 4, the hierarchy only works when users have skills named exactly as the hierarchy children. With Layer 4, the AI-generated aliases bridge naming variations automatically. A user with "Client Relations" (alias: "Customer Service") gets credit for "Communication Skills" without needing "Client Relations" hardcoded anywhere.

## Constraints

- **No recursion:** Only check direct children listed under the requirement key. Do NOT recurse into children that are themselves parents. E.g., "Cashiering" (child of Customer Service) does NOT satisfy "Communication Skills" (parent of Customer Service).
- **No database changes:** Reuses existing `skill_aliases` column.
- **No API changes:** Reuses existing `expandProfileAliases` output.
- **Scoring formula unchanged:** Skills 50%, Experience 30%, Education 20%.
- **Performance:** The hierarchy map has ~10 entries with ~3-5 children each. Iteration cost is negligible.

## Integration with calculateDeterministicScore

The scoring loop checks layers in order for each requirement. If any layer matches, the requirement is satisfied and counted once (no double-counting):

```
for each requirement in job.requirements:
  matched = false

  // Layer 1: exact/word-boundary match
  for each userSkill in userSkills:
    if skillMatches(req, userSkill) → matched = true; break

  // Layer 2: alias match
  if not matched:
    for each userSkill in userSkills:
      for each alias in aliases[userSkill]:
        if skillMatches(req, alias) → matched = true; break

  // Layers 3-4: hierarchy
  if not matched:
    matched = hierarchyCoversRequirement(req, userSkills, aliases)

  if matched → matchingSkills.push(req)
  else → missingSkills.push(req)
```

## Helper Function

```
hierarchyCoversRequirement(requirement, userSkills, aliases):
  children = SKILL_HIERARCHY[requirement.toLowerCase()]
  if no children, return false
  for each child in children:
    for each userSkill in userSkills:
      // Layer 3: user skill directly matches hierarchy child
      if skillMatches(child, userSkill) → return true
      // Layer 4: user skill's aliases match hierarchy child
      userAliases = aliases[userSkill] || []   // handles null/missing aliases
      for each alias in userAliases:
        if skillMatches(child, alias) → return true
  return false
```

Note: `skillMatches` uses word-boundary matching with a 3-character minimum for partial matches. Exact matches (e.g., "AWS" === "AWS") bypass this minimum. All hierarchy children and aliases are checked through the same `skillMatches` function with no modifications.

## What Changes

- `matchingSkills` array becomes more accurate — parent skills are included when children are present (directly or via aliases)
- `missingSkills` array shrinks — parents with present children are no longer gaps
- The `skillScore` component may increase for candidates who have child skills matching parent requirements
- The overall `matchScore` may increase slightly for affected candidates

## Files to Modify

1. **`src/services/geminiService.js`** — Add `SKILL_HIERARCHY` constant (lowercase keys/values), add `hierarchyCoversRequirement` helper, update `calculateDeterministicScore` to call it after the existing alias check
2. **`src/services/geminiService.test.js`** — Add test cases covering all 4 layers and edge cases

## No Changes Needed

- No database changes
- No API changes
- No UI changes
- No changes to `expandProfileAliases`
- No changes to JobListings or JobDetail pages (they consume the same `calculateDeterministicScore` output)

## Test Cases

1. **Layer 3 — Child satisfies parent:** user has "Customer Service", job requires "Communication Skills" → match
2. **Layer 4 — Child matched via alias:** user has "Client Support" with alias "Customer Service", job requires "Communication Skills" → match (alias bridges to hierarchy child)
3. **Direction check — Parent does NOT satisfy child:** user has "Communication Skills", job requires "Customer Service" → not a match
4. **Not in hierarchy:** user has "Plumbing", job requires "Gardening" → falls through to Layer 1/2 matching only
5. **Non-transitive (two-level gap):** user has "Cashiering" (child of Customer Service), job requires "Communication Skills" (parent of Customer Service) → NOT a match (no recursion — only direct children checked)
6. **Case-insensitive:** user has "customer service", job requires "COMMUNICATION SKILLS" → match
7. **Exact match takes precedence:** user has "Communication Skills", job requires "Communication Skills" → match via Layer 1 (not hierarchy)
8. **Alias match without hierarchy:** user has "Welding" with alias "Metal Fabrication", job requires "Metal Fabrication" → match via Layer 2 (existing behavior preserved)

## Edge Cases

- **Requirement is not in hierarchy:** Falls through to existing Layer 1/2 matching — no change in behavior
- **User has multiple children of the same parent:** Still counts as one match for the parent requirement (no double counting)
- **Nested hierarchies (e.g., "Customer Service" is both a parent and a child):** Only direct children are checked per key. No recursion. "Cashiering" does NOT satisfy "Communication Skills".
- **Case handling:** `SKILL_HIERARCHY` keys and values are stored lowercase. Requirements are lowercased before lookup. `skillMatches` already handles case-insensitive comparison.
- **Empty aliases:** If a user has no `skill_aliases` (pre-migration), Layer 4 is skipped. Layers 1-3 still work.

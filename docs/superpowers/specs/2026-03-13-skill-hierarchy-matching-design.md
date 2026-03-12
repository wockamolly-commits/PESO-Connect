# Hierarchical Skill Matching

**Date:** 2026-03-13
**Status:** Draft
**Problem:** The deterministic scoring system treats skills as isolated keywords. When a job requires "Communication Skills" and the user has "Customer Service" (a child of communication), it incorrectly appears as a skill gap. The system needs to understand parent-child skill relationships.

## Skill Hierarchy Map

A static `SKILL_HIERARCHY` constant mapping parent skills to their children:

```js
const SKILL_HIERARCHY = {
    'Communication Skills': ['Customer Service', 'Active Listening', 'Problem Solving', 'Public Speaking'],
    'Basic Computer Skills': ['MS Office', 'Typing Skills', 'Data Entry', 'Email Management'],
    'Electrical Work': ['Electrical Installation', 'Wiring', 'Electrical Troubleshooting'],
    'Food Preparation': ['Cooking', 'Baking', 'Food Safety', 'Kitchen Management'],
    'Vehicle Operation': ['Driving', 'Motorcycle Operation', 'Forklift Operation'],
    'Construction': ['Masonry', 'Carpentry', 'Painting', 'Scaffolding'],
    'Welding': ['Arc Welding', 'MIG Welding', 'TIG Welding', 'SMAW'],
    'Customer Service': ['Cashiering', 'Sales', 'Complaint Handling'],
    'Farm Equipment Operation': ['Tractor Operation', 'Harvesting Equipment', 'Irrigation Systems'],
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
3. **NEW: Hierarchy match** — if the requirement is a parent in `SKILL_HIERARCHY`, check if the user has any of its children (directly or via aliases)

If any layer matches, the requirement counts as matched. The scoring formula (Skills 50%, Experience 30%, Education 20%) is unchanged.

## What Changes

- `matchingSkills` array becomes more accurate — parent skills are included when children are present
- `missingSkills` array shrinks — parents with present children are no longer gaps
- The `skillScore` component may increase for candidates who have child skills matching parent requirements
- The overall `matchScore` may increase slightly for affected candidates

## Files to Modify

1. **`src/services/geminiService.js`** — Add `SKILL_HIERARCHY` constant, add `hierarchyCoversRequirement(requirement, userSkills, aliases)` helper, update `calculateDeterministicScore` to call it
2. **`src/services/geminiService.test.js`** — Add test cases for hierarchy matching

## No Changes Needed

- No database changes
- No API changes
- No UI changes
- No changes to `expandProfileAliases`
- No changes to JobListings or JobDetail pages (they consume the same `calculateDeterministicScore` output)

## Edge Cases

- **Requirement is not in hierarchy:** Falls through to existing exact/alias matching — no change in behavior
- **User has multiple children of the same parent:** Still counts as one match for the parent requirement (no double counting)
- **Nested hierarchies (e.g., "Customer Service" is both a parent and a child):** Both roles are checked. If "Cashiering" (child of Customer Service) is a user skill and "Communication Skills" (parent of Customer Service) is a requirement, the match is NOT transitive — only direct parent-child relationships are checked
- **Case sensitivity:** All matching is case-insensitive (consistent with existing `skillMatches` function)

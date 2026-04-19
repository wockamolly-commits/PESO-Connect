Please implement the following fixes to our AI job matching system in supabase/functions based on the recent assessment:

1. match-jobs/index.ts: Combine scoring
- Update `finalScore` to blend all three scores: `Math.round(deterministicScore * 0.5 + hybridSkillScore * 0.3 + semanticScore * 0.2)`. Make sure to use the new `finalScore` in the matchLevel logic and the returned object.

2. match-jobs/index.ts: Fix Cohere `inputType`
- When calling `embedTexts` for `requirementTextsToEmbed`, change the `inputType` parameter to `'search_query'`. (Leave `userSkillTexts` as `'search_document'`).

3. _shared/similarity.ts & match-jobs/index.ts: Align cosine normalization
- Update `normalizeCosineScore` in `similarity.ts` to use `const min = 0.50` instead of `0.45`.
- Update `normalizeRequirementCosine` in `match-jobs/index.ts` to use `const min = 0.50` instead of `0.55`.

4. _shared/deterministicScore.ts: Fix Overqualification Credit
- Find the section where `highPrecisionCandidate` grants full credit (`requirementCredit = 1`) for OVERQUALIFICATION_TRANSFER_PATTERNS. Change `requirementCredit` to `0.6` instead of `1` so they get partial credit, preventing unfair score inflation.

5. _shared/deterministicScore.ts: Separate Language Bucket
- In `classifyRequirements`, stop adding `languageSatisfied` to the `technicalPossible` and `technicalEarned` buckets. 
- Create new `languagePossible` and `languageEarned` variables, update them for language requirements, and factor them into the final bucket scoring (e.g. tracking it alongside or inside baselineRequirementScore or creating a separate languageRequirementScore).

6. _shared/deterministicScore.ts: Fix Education Ordinal Fallback
- In `getJobEducationOrdinal`, remove the unreachable `raw in JOB_EDUCATION_ORDINAL` key check or fix the mapping. Ensure that if an education requirement can't be parsed, it doesn't silently return `-1` (which currently treats it as "no requirement" and artificially grants 100 points).

7. _shared/matchingText.ts & match-jobs/index.ts: Salary Filtering
- In `matchingText.ts`, comment out or remove the expected salary line from `buildProfileText` so it stops polluting the embedding.
- In `match-jobs/index.ts`, ensure `expected_salary_min` and `expected_salary_max` are properly handled as hard pre-filters in the Supabase query if needed, rather than pure semantic signals.

After making these changes, please run type checks or linting to verify no syntax errors were introduced.

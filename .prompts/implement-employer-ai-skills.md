# Implement AI-Assisted Skill Recommendations for Employer Job Postings

Please implement the AI-assisted skill recommendation system for the Employer Job Posting wizard (`src/pages/employer/PostJob.jsx`) by following the exact architecture and code provided in the implementation plan.

## Setup
Before writing code, please read the full implementation plan to understand the two-layer architecture (Deterministic + Edge Function) and the new UX for the AI suggestions panel.
Since you cannot browse my local outside directories, I have pasted the core requirements from the plan below:

## Phase 1: Instant Deterministic Suggestions (Frontend Only)
1. **Create `src/utils/jobSkillRecommender.js`:**
   - Implement `getSuggestedSkillsFromTitle(title, category)`: Uses regex on the job title to extract skills based on predefined `titleKeywords` per category.
   - Implement `getSuggestedSkillsFromDescription(description)`: Uses regex on the job description to extract common skills.
2. **Update `src/pages/employer/PostJob.jsx`:**
   - Expand the `SKILL_CATEGORIES` object to include 50-80 skills per category and `titleKeywords` regex pattern mappings. Ensure the vocabulary matches your `deterministicScore.ts` standards.
   - Add state: `aiSkillSuggestions`, `aiSuggestionsLoading`, `aiSuggestionsShown`, and `aiSuggestionsSource`.
   - Add a `useEffect` that triggers when `currentStep === 3`. It should call the recommender utility functions using `jobData.title`, `jobData.category`, and `jobData.jobSummary + keyResponsibilities`, deduplicate them, and set the `aiSkillSuggestions` state.
   - Replace the existing "Quick add from [Category]" UI block (around lines 1097-1117) with the new ✨ **AI-Suggested Skills panel** as designed in the plan.
   - Ensure the new AI panel has a button to add all suggestions, and clickable chips to add individual skills to `jobData.requiredSkills`.

## Phase 2: Edge Function for Description Analysis
1. **Create `supabase/functions/suggest-job-skills/index.ts`:**
   - Implement a new Deno edge function that accepts `title`, `category`, `jobSummary`, `keyResponsibilities`, and `existingSkills`.
   - It should use pure regex scoring (no external API calls needed right now, to keep it fast) to extract skills from the full description text and return ranked suggestions with confidence scores.
   - Use the standard `cors.ts` shared utility for responses.
2. **Connect the UI:**
   - Add a `handleAnalyzeDescription` function in `PostJob.jsx` that invokes this new edge function.
   - Add the "✨ Suggest skills from your description" / "Re-analyze description" CTA to the step 3 UI that triggers this function and updates the suggestions panel.

Please work step-by-step. Start by creating the `jobSkillRecommender.js` utility and modifying `PostJob.jsx` to implement Phase 1. Once that is working, proceed to create the Edge Function for Phase 2.

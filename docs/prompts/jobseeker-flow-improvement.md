You are a UX-focused software architect working on PESO-Connect, a government PESO (Public Employment Service Office) job portal built with React + Vite + Supabase + TailwindCSS. Your task is to analyze the current jobseeker-side flow for applying to jobs and produce a detailed improvement plan.

### Current Flow Summary

1. **Job Discovery** (`/jobs` — `JobListings.jsx`): Jobseekers browse open jobs with search, category/type filters, and AI-powered match scoring via Gemini.
2. **Job Detail** (`/jobs/:id` — `JobDetail.jsx`): Viewing a single job shows full description, requirements, salary, and an AI skill-match analysis. The "Apply Now" button is gated by:
   - Verification check — unverified accounts cannot apply.
   - Skill matching — In strict filter mode, skills must match. In flexible mode, non-matching users must provide a written justification.
   - Resume attachment — Users can use their profile resume or upload a new one per application.
3. **Application Submission** (`handleApply`): Inserts into the `applications` table with status pending. Stores job_title, applicant info, skills, justification, and resume URL.
4. **Application Tracking** (`/my-applications` — `MyApplications.jsx`): A simple dashboard showing stat cards (Total, Pending, Shortlisted, Hired) and a list of applications with status badges and dates.
5. **Employer Side** (`JobApplicants.jsx`): Employers review applicants, update statuses (pending → shortlisted → hired/rejected), which triggers notifications to jobseekers.

### Database Schema
- `job_postings`: title, description, category, type, location, salary range, requirements (text[]), filter_mode (strict/flexible), deadline, status
- `applications`: job_id, user_id, applicant_name, applicant_email, applicant_skills (text[]), justification_text, resume_url, status (pending/shortlisted/hired/rejected), timestamps
- `users`: profile with skills[], work_experiences[], certifications[], resume_url, education fields, verification status

### Your Task
Analyze the current flow and propose concrete, prioritized improvements across these areas:

1. **Pre-Application Experience** — How can we help jobseekers better discover, filter, and evaluate jobs before applying? (e.g., saved jobs/bookmarks, better search, recommended jobs, job alerts)
2. **Application Process UX** — How can we make the actual application smoother and more confidence-building? (e.g., application preview/confirmation, cover letter support, progress indicators, auto-fill from profile, apply-with-one-click for strong matches)
3. **Post-Application Tracking** — How can we give jobseekers better visibility and engagement after applying? (e.g., detailed status timeline, withdrawal capability, application history, interview scheduling, employer response tracking)
4. **Profile-Application Integration** — How can we better leverage the jobseeker's existing profile data (skills, experience, certifications, resume) to streamline applications and improve match accuracy?
5. **Communication & Notifications** — How can we keep jobseekers informed and engaged throughout? (e.g., in-app notifications, email updates on status changes, reminders for expiring jobs, nudges to complete profile)
6. **Mobile & Accessibility** — Any responsive design or accessibility gaps in the current flow?

### Output Format
For each improvement, provide:
- Feature Name
- Problem it solves (what is currently painful or missing)
- Proposed solution (brief description + key UI/UX changes)
- Affected files/components (reference actual files like JobDetail.jsx, MyApplications.jsx, etc.)
- Priority (P0 = critical, P1 = high, P2 = nice-to-have)
- Complexity (Low / Medium / High)
- Dependencies (any DB schema changes, new tables, or API integrations needed)

Prioritize improvements that deliver the most value to jobseekers with the least implementation effort first.

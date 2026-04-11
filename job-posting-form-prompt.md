# Job Posting Form Redesign

Based on the [VACANCY DETAILS] reference form and your existing `PostJob.jsx` implementation, I have redesigned the job posting form. This redesign maximizes data structure to power your AI matching algorithms while maintaining an intuitive experience for the employer.

## 1. Comparison & Analysis

| Field from Reference | Status in Current Form | Recommended Action |
| :--- | :--- | :--- |
| **Position Title** | Exists (`title`) | Keep as REQUIRED |
| **Job Description** | Exists (`description`) | Expand into Summary + Responsibilities |
| **Nature of Work** | Partial (`type`) | Add missing types (Project-based, Internship, OJT) |
| **Place of Work** | Partial (`location`) | Separate Work Arrangement (Remote/On-site) from Location |
| **Salary** | Exists (`salaryMin/Max`) | Keep, but add validation |
| **Vacancy Count** | Exists (`vacancies`) | Keep as REQUIRED |
| **Work Experience** | Partial (`experienceLevel`)| Convert to specific timeframes + Entry/Mid/Senior |
| **Accepts PWD?** | Missing | Add Yes/No + specific disability types |
| **Accepts OFWs?** | Missing | Add Yes/No checkbox |
| **Educational Level**| Exists (`educationLevel`)| Keep as REQUIRED |
| **Course/SHS Strand**| Missing | Add as OPTIONAL text or autocomplete |
| **License / Certs** | Missing | Add 'Licenses & Certifications' field |
| **Languages Spoken** | Missing | Add 'Required Languages/Dialects' |
| **Valid Until** | Exists (`deadline`) | Keep as OPTIONAL |
| **Posting Date** | Missing | Handled automatically by the system (`created_at`) |

---

## 2. Redesigned Form Structure

### Step 1: Job Overview
*Captures the core identity and arrangement of the role.*

* **Job / Position Title** `[REQUIRED]`
  * *UI Suggestion:* Text input.
* **Job Category** `[REQUIRED]`
  * *UI Suggestion:* Select dropdown (e.g., IT, Agriculture, Trades).
* **Nature of Work (Employment Type)** `[REQUIRED]`
  * *UI Suggestion:* Chips/Radio buttons. Options: `Permanent / Full-time`, `Part-time`, `Contractual`, `Project-based`, `Internship / OJT`.
* **Work Arrangement** `[REQUIRED]`
  * *UI Suggestion:* Chips/Radio buttons. Options: `On-site`, `Work from home / Remote`, `Hybrid`.
* **Place of Work (Location)** `[REQUIRED]`
  * *UI Suggestion:* Text input with Map/City autocomplete (e.g., San Carlos City).
* **Number of Vacancies** `[REQUIRED]`
  * *UI Suggestion:* Number input (min 1).

### Step 2: Role Details & Compensation
*Breaks down the job description into structured segments to improve readability and AI matching context.*

* **Job Summary** `[REQUIRED]`
  * *Details:* A short overview of the role and its impact.
* **Key Responsibilities** `[REQUIRED]`
  * *Details:* Bullet points are encouraged for readability. *UI Suggestion:* Text area with basic rich-text (bullet lists) or a dynamic list of inputs.
* **Salary Range (Monthly)** `[REQUIRED]`
  * *Details:* Minimum and Maximum Salary inputs.
* **Benefits & Perks** `[OPTIONAL]`
  * *Details:* Autocomplete chips or text area (e.g., Health Insurance, Allowances).

### Step 3: Qualifications & Skills
*Separates hard requirements from nice-to-haves and introduces new reference fields.*

* **Minimum Education Level** `[REQUIRED]`
  * *Options:* `None`, `Elementary Graduate`, `High School Graduate`, `Vocational/TESDA`, `College Graduate`, `Postgraduate`.
* **Course / SHS Strand** `[OPTIONAL]`
  * *Details:* Highly relevant if Education Level is High School, Vocational, or College.
* **Work Experience Minimum Timeframe** `[REQUIRED]`
  * *Options:* `Entry Level (No exp)`, `1-3 Years`, `3-5 Years`, `5+ Years`.
* **Required Skills** `[REQUIRED]`
  * *Details:* Must have skills. *UI Suggestion:* Autocomplete tag input.
* **Preferred Skills** `[OPTIONAL]`
  * *Details:* Nice-to-have skills for AI bonus scoring.
* **Required Languages / Dialects** `[REQUIRED]`
  * *Details:* Ensures candidates speak the necessary language (e.g., English, Tagalog, Ilocano).
* **Licenses, Certifications & Eligibility** `[OPTIONAL]`
  * *Details:* Professional requirements (e.g., Driver's License, CPA, Civil Service Eligibility).

### Step 4: Inclusive Hiring & Special Qualifications
*New section dedicated directly to the reference form's inclusivity fields.*

* **Accepts Persons with Disabilities (PWD)** `[REQUIRED]`
  * *Options:* `Yes` / `No`
  * **If Yes, accommodated disabilities:** `[REQUIRED]`
    * *Checkboxes:* Visual, Hearing, Speech, Physical, Mental, Others (specify).
* **Accepts Returning OFWs** `[REQUIRED]`
  * *Options:* `Yes` / `No`
* **Other Qualifications** `[OPTIONAL]`
  * *Details:* Any other physical or geographical requirements not covered above.

### Step 5: Posting Settings
*System configuration for the posting life cycle and matching algorithm.*

* **Application Deadline / Valid Until** `[OPTIONAL]`
  * *Details:* Date picker. If empty, runs until manually closed.
* **Applicant Matching Mode** `[REQUIRED]`
  * *Options:* `Strict` (rejects unqualified) vs. `Flexible` (allows justifications).
* **Enable AI Matching** `[OPTIONAL]`
  * *Details:* Toggle to auto-notify qualified candidates on the platform.

---

## 3. Recommended Validation Rules

1. **Job Title:** Minimum 5 characters, maximum 100 characters.
2. **Vacancies:** Must be a positive integer `≥ 1`.
3. **Location:** Required if "Work Arrangement" is `On-site` or `Hybrid`.
4. **Salary Range:**
   * Both `Min Salary` and `Max Salary` must be numeric and `>= 0`.
   * `Max Salary` must be `>= Min Salary`.
   * *(Optional)* Warn if `Min Salary` is below Region 1 minimum wage (e.g., ₱400/day equivalent).
5. **Job Summary & Responsibilities:**
   * Summary: Minimum 50 characters.
   * Responsibilities: Ensure at least one responsibility is defined or description text > 50 characters.
6. **Skills:**
   * `Required Skills` array must have at least `1` valid skill.
7. **Application Deadline:**
   * Must be a future date (cannot be in the past relative to the posting date).
8. **PWD Sub-fields:**
   * If "Accepts PWD" is `Yes`, the user *must* select at least one disability category.

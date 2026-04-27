# PESO-Connect: Intelligent Job Matching Platform
## Study Paper for Pre-Oral Defense Review

---

## I. Executive Summary

PESO-Connect is an intelligent job matching platform that bridges the employment gap by automatically matching jobseekers with suitable job opportunities using a hybrid approach combining deterministic rule-based scoring and AI-powered semantic matching. The platform serves three primary user roles: jobseekers, employers, and homeowners (individuals seeking service providers), with a comprehensive matching algorithm that considers skills, education, experience, age, language proficiency, and field alignment.

---

## II. System Introduction

### 2.1 Purpose and Vision

PESO-Connect addresses the employment challenge in developing markets by automating job-candidate matching through intelligent algorithms. The system reduces manual screening effort for employers while helping jobseekers discover relevant opportunities without requiring explicit job applications in every case.

### 2.2 User Roles

The platform supports four distinct user roles:

1. **Jobseeker**: Individual seeking employment, with detailed profile including skills, education, work experience
2. **Employer**: Company posting jobs and managing applications
3. **Individual/Homeowner**: Person seeking to hire service providers for specific tasks
4. **Admin**: System administrator with oversight and management capabilities

### 2.3 Technology Stack

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Supabase (PostgreSQL) for data storage and authentication
- **Server Functions**: Supabase Edge Functions (Deno/TypeScript) for compute-intensive matching
- **AI/ML Integration**: 
  - Google Gemini for explanation generation
  - Cohere for semantic embeddings
  - Deterministic algorithm for rule-based scoring

---

## III. Core Features

### 3.1 Multi-Role Authentication & Authorization

**Feature Description:**
The system implements role-based access control where users register as one of three roles. Each role has a dedicated profile table with role-specific fields.

**Key Components:**
- `AuthContext.jsx` - Central authentication context managing user state
- Three profile tables:
  - `jobseeker_profiles` - Skills, work experience, education
  - `employer_profiles` - Company information, posted jobs
  - `individual_profiles` - Service seeker details

**Data Flow Example:**
```
User Registration → Supabase Auth → Role Selection → 
Create users record → Auto-trigger handle_new_user() → 
Populate role-specific profile table → Merge in AuthContext
```

**How It Works:**
When a user logs in, the system fetches both the base `users` table and the corresponding role profile table. These are merged into a unified `userData` object. This merged object is cached in localStorage (`peso-profile-${userId}`) for instant UI rendering on page reload.

---

### 3.2 Intelligent Job Matching Algorithm

**Feature Description:**
PESO-Connect uses a **two-layer hybrid matching system** that combines deterministic scoring (rule-based) with semantic matching (embedding-based) to provide accurate job-candidate matches.

#### **Layer 1: Deterministic Scoring** (`deterministicScore.js`)

This layer evaluates candidates against job requirements using explicit rule matching.

**Matching Categories:**

1. **Skill Matching** (Most Important)
   - **Exact Match**: Skill name matches perfectly → 1.0 credit
   - **Partial Match**: Skill phrase overlaps significantly → 0.75 credit
   - **Related Match**: Synonyms or semantic families → 0.4 credit
   - **Gap**: No match found → 0 credit

   **Example:**
   ```
   Job Requirement: "Advanced Microsoft Excel"
   Candidate Skills: ["Excel", "Spreadsheet", "Data Analysis"]
   
   Result: 
   - "Excel" → Exact match (1.0 credit)
   - "Data Analysis" → Related match (0.4 credit)
   Score: (1.0 + 0.4) / 2 = 70%
   ```

2. **Education Level Matching**
   - Job requirement: "College Graduate"
   - Candidate: "College Undergraduate"
   - Score: 80% (insufficient but close)
   
   Education levels are hierarchical:
   ```
   Elementary (0) → High School (1) → Senior High (1.5) → 
   Vocational (2) → College Undergrad (2.5) → College Grad (3) → 
   Masters (4) → Doctoral (5)
   ```

3. **Experience Category Alignment**
   - Direct match: 100 points
   - Adjacent category: 50 points
   - Unrelated: 20 points

4. **Age & Language Requirements**
   - Age extracted from birthdate and validated against requirement
   - Language proficiency matched from candidate's language list

#### **Scoring Algorithm Details:**

```
Final Score Calculation:
├─ Required Skill Score (80% weight)
├─ Support Score (20% weight)
│  ├─ Education Score (60% of support)
│  └─ Experience Score (40% of support)
├─ Preferred Skill Bonus (up to 5 points)
├─ Course/Field Alignment Bonus (up to 3 points)
└─ Coverage Cap (35-100 points based on required skill density)
```

**Match Quality Levels:**
- **Excellent**: 80-100 points
- **Good**: 60-79 points
- **Fair**: 40-59 points
- **Low**: Below 40 points

#### **Layer 2: Semantic Matching** (Server-side)

The server-side `match-jobs` function enhances deterministic scoring with:
- **Cohere Embeddings**: Converts skill descriptions to semantic vectors
- **Similarity Search**: Finds semantically similar but not lexically identical skills
- **Reranking**: Combines semantic scores with deterministic scores

---

### 3.3 Skill Normalization & Synonym Recognition

**Feature Description:**
The system normalizes skill names and recognizes synonym groups to handle variations in how skills are described.

**Implementation:**

```javascript
// Canonical Skill Groups (Bidirectional)
['Microsoft Excel', ['excel', 'ms excel', 'microsoft excel']]
['Customer Service', ['customer service', 'customer relations', 'customer care']]
['Electrical Wiring', ['electrical wiring', 'electrical installation', 'wiring']]
```

**Normalization Process:**
1. Convert to lowercase
2. Remove special characters: `(`, `)`, `+`, `/`, `&`
3. Remove noise prefixes: "knowledge of", "experience with", "can do"
4. Tokenize and remove stop words
5. Look up canonical form

**Example:**
```
Input: "Can do Customer Relations and Service"
↓
Normalized: "customer relations service"
↓
Lookup: "customer service" (canonical form)
↓
Recognition: Matches job requirement "Customer Service"
```

**Skill Hierarchy:**
Some skills imply knowledge of related skills:
```
Communication Skills (parent)
├─ Customer Service
├─ Active Listening
├─ Public Speaking
└─ Interpersonal Skills

If job requires "Communication Skills" and candidate has 
"Customer Service", it counts as a partial match.
```

---

### 3.4 Field Alignment & Academic Compatibility

**Feature Description:**
For academic-track positions, the system evaluates whether the candidate's field of study aligns with job requirements.

**Alignment Categories:**

1. **Direct Alignment** (100 points)
   - Candidate: "Information Technology" ↔ Job: "Software Developer"

2. **Adjacent Alignment** (65 points)
   - Candidate: "Graphic Design" ↔ Job: "Web Developer" (both design-tech adjacent)

3. **Unrelated** (20 points)
   - Candidate: "Nursing" ↔ Job: "Software Engineer"

**Example:**
```
Job: Course Strand = "Science, Technology, Engineering & Mathematics (STEM)"
Candidate: Course Field = "Information & Communication Technology"

Result: Direct alignment (both recognized as tech-aligned)
Bonus: +3 to final score
```

---

### 3.5 Job Posting & Management

**Feature Description:**
Employers can create, edit, and manage job postings with comprehensive details.

**Key Fields:**
- Job title, category, description
- Required and preferred skills
- Education level requirement
- Experience level (entry, mid, senior)
- Number of vacancies
- Application status (open, closed)

**Features:**

1. **Edit Job Functionality**
   - Route: `/edit-job/:id`
   - Reuses PostJob component
   - Detects `:id` param to switch between insert and update modes

2. **Application Tracking**
   - Track applicants per job
   - View, accept, reject applications
   - Auto-close jobs when vacancies reach zero

3. **Automatic Vacancy Management**
   - DB trigger: `trg_sync_job_status_with_vacancies`
   - When vacancies ≤ 0 → status auto-set to 'closed'
   - MyListings disables "Open" option when vacancies = 0

---

### 3.6 Messaging & Communication System

**Feature Description:**
Real-time messaging between users (employers, jobseekers, individuals) using Supabase Realtime subscriptions.

**Database Schema:**
```
conversations:
├─ id (text PK: sorted uid1_uid2)
├─ participants (text[])
└─ created_at

messages:
├─ id (UUID)
├─ conversation_id (FK)
├─ sender_id
├─ body
└─ created_at
```

**Key Components:**
- `messagingService.js` - Wraps Supabase Realtime subscriptions
- Real-time message delivery
- Unread message tracking
- Participant information

**Implementation Notes:**
- Components use **snake_case** field names (`participant_info`, `unread_count`)
- This mirrors the database schema at the component boundary
- Do NOT camelCase at the component level

**Example Usage:**
```javascript
// Subscribe to new messages in real-time
subscribeToConversationMessages(conversationId, (newMessage) => {
  setMessages(prev => [...prev, newMessage])
})

// Send a message
sendMessage(conversationId, userId, messageBody)
```

---

### 3.7 AI-Powered Explanations

**Feature Description:**
The system generates human-readable explanations for why a specific jobseeker matches (or doesn't match) a job.

**Explanation Generation Process:**

1. **Deterministic Analysis**: 
   - Evaluates all matching criteria
   - Identifies matching, partial, and missing skills
   - Calculates confidence scores

2. **LLM-Based Reasoning** (Gemini):
   - Uses deterministic analysis as context
   - Generates conversational explanation
   - Highlights key strengths and gaps
   - Provides actionable improvement suggestions

**Example Output:**
```
"You're a strong match for this Data Entry role with a 78% match score.

Your Strengths:
- You have Excel skills (exact match)
- Your typing and data entry background (related match)
- High school education meets requirement

Areas to Develop:
- The job prefers basic accounting knowledge which isn't in your profile

Next Steps:
Consider adding any accounting exposure you may have, and you'd be 
an excellent candidate for this role."
```

---

### 3.8 Preferred Skills & Soft Skill Inference

**Feature Description:**
The system distinguishes between required and preferred skills, with intelligent inference of soft skills based on technical background.

**Soft Skill Inference Rules:**

```javascript
Rule: Attention to Detail
├─ Triggered by: Programming, Web Development, Graphic Design, UI/UX
├─ Inference: "Your software/design background signals strong accuracy"
└─ Bonus: 0.4 credits if not explicitly in profile

Rule: Analytical Thinking
├─ Triggered by: Programming, Debugging, Web Development, Design
├─ Inference: "Technical workflow relies on structured analysis"
└─ Bonus: 0.4 credits if not explicitly in profile
```

**Preferred Skill Scoring:**
- Average credit from all preferred skills
- Capped at 5 bonus points
- Never reduces overall score

---

### 3.9 Dashboard & Job Discovery

**Feature Description:**
Jobseekers discover matched jobs through an intelligent dashboard that ranks opportunities by match quality.

**Dashboard Features:**

1. **Personalized Job Listings**
   - Ranked by match score (descending)
   - Shows match quality: Excellent, Good, Fair, Low
   - Displays confidence score and top matching skills

2. **Quick Application**
   - One-click application if already matched
   - View full match explanation before deciding

3. **Saved Matches**
   - Save interesting jobs for later review
   - Track application status

---

## IV. How Features Work Together

### 4.1 End-to-End Matching Flow

```
JOBSEEKER PROFILE CREATION
├─ User inputs: skills, education, work experience, languages, age
├─ System normalizes skills and validates education level
└─ AuthContext caches merged profile

EMPLOYER POSTS JOB
├─ Employer fills: title, requirements, preferred skills, education
├─ System parses requirements (skills, education, age, language)
└─ Server triggers refresh-job-embedding (builds semantic embedding)

MATCHING TRIGGERED
├─ match-jobs function:
│  ├─ Retrieves all jobseekers
│  ├─ For each candidate:
│  │  ├─ Runs deterministic scoring
│  │  ├─ Compares embeddings
│  │  ├─ Reranks by hybrid score
│  │  └─ Stores match result
│  └─ Returns top 20 matches
├─ Client displays matches on jobseeker dashboard
└─ Jobseeker clicks "View Match Explanation"

EXPLANATION GENERATION
├─ determine-match-explanation calls Gemini
├─ Provides context: deterministic scores, gaps, strengths
├─ Generates conversational explanation
└─ Returns improvement tips
```

### 4.2 Real-World Scenario: Data Entry Job

**Scenario:**
Maria is a jobseeker with:
- Skills: Excel, Data Entry, Basic Computer Literacy, Customer Service
- Education: High School Graduate
- Age: 28
- Languages: English (Fluent), Tagalog (Native)

Employer posts a Data Entry role requiring:
- Data Entry (required)
- Excel (required)
- Customer Service (preferred)
- High School education minimum
- Age 18+
- English language requirement

**Matching Process:**

1. **Skill Matching:**
   - "Data Entry" (required) ✓ Exact match (1.0)
   - "Excel" (required) ✓ Exact match (1.0)
   - "Customer Service" (preferred) ✓ Exact match (1.0)
   - Required Skill Score: 100%

2. **Education Matching:**
   - Requirement: High School
   - Maria: High School Graduate
   - Match: 100%

3. **Age & Language:**
   - Age: 28 ≥ 18 ✓
   - Language: English (Fluent) ✓

4. **Field Alignment:**
   - No specific field requirement
   - Not applicable

5. **Final Score Calculation:**
   - Required Skills: 100%
   - Support Score: 100% (education)
   - Preferred Bonus: +5 (customer service match)
   - Confidence: 100%
   - **Final Match Score: 85% (Excellent)**

6. **Explanation Generated:**
   > "You're an excellent match for this Data Entry role. You have all required skills (Data Entry and Excel), meet the education requirement, and have relevant customer service experience. Your English language proficiency also aligns perfectly with the job. Confidence: 100%"

---

## V. Key Technical Concepts

### 5.1 Deterministic vs. Semantic Matching

| Aspect | Deterministic | Semantic |
|--------|--------------|----------|
| **Method** | Rule-based, explicit matching | Vector-based similarity |
| **Approach** | Exact/partial/related/gap | Embedding distance |
| **Speed** | Very fast (milliseconds) | Slower (requires embeddings) |
| **Flexibility** | Limited to known synonyms | Discovers unexpected relevance |
| **Example** | "Excel" matches "Microsoft Excel" | "Spreadsheet expert" matches "Data analyst" |
| **Use Case** | Primary scoring | Reranking, semantic discovery |

### 5.2 Hybrid Scoring Strategy

The system combines both approaches:

```
FINAL_SCORE = (Deterministic Score × 0.7) + (Semantic Score × 0.3)

This ensures:
- Explicit matches are weighted more heavily
- Semantic relevance can boost marginal candidates
- Reduces false positives from purely semantic matching
```

### 5.3 Confidence Scoring

Confidence represents how certain the system is about the match quality:

```
Confidence = (Evidence Weight / Total Possible Weight)

Evidence Components:
- Skill evidence (80% weight)
- Education evidence (12% weight)
- Experience evidence (8% weight)

Example:
- Job has 5 required skills → Skill weight = 0.8
- Job specifies education level → Education weight = 0.12
- Job specifies experience level → Experience weight = 0.08
- Total = 1.0

If candidate has 4/5 skills, education, but no experience info:
- Confidence = (0.64 + 0.12 + 0.0) / 1.0 = 76%

This means: "76% of the scoreable criteria are met. The 24% gap is 
the experience level data which wasn't available in the profile."
```

### 5.4 Caching & Performance

**Profile Caching:**
- Merged profile cached in localStorage: `peso-profile-${userId}`
- Prevents navbar "User" flash on reload
- Cache refreshed after any profile mutation

**Embedding Caching:**
- Job embeddings stored in DB with hash
- Hash detects when job text changes
- Avoids unnecessary re-embedding

**State Management:**
- AuthContext: Central source of truth for user data
- Local component state: UI-specific (form inputs, modals)
- No global Redux-like state needed (kept simple)

---

## VI. Examples & Use Cases

### 6.1 Case Study 1: Skill Gap Analysis

**Scenario:** Junior Developer Seeking Senior Role

Jobseeker Profile:
```
Skills: JavaScript, React, HTML/CSS, Git
Experience: 2 years in entry-level role
Education: College Graduate in BS Computer Science
```

Job Posting:
```
Title: Senior Full-Stack Developer
Required Skills: 
  - JavaScript (5+ years experience)
  - React (3+ years)
  - Node.js
  - Database Design
  - System Architecture
Experience Level: Senior (5+ years)
```

**Matching Result:**

| Requirement | Status | Match Type | Credit |
|-------------|--------|-----------|--------|
| JavaScript | ✓ | Exact | 1.0 |
| React | ✓ | Exact | 1.0 |
| Node.js | ✗ | Gap | 0 |
| Database Design | ✗ | Gap | 0 |
| System Architecture | ✗ | Gap | 0 |

Required Skill Score: 40% (2/5 required skills)
Experience Gap: Significant (2 years vs 5+ required)

**Final Score: 25% (Low Match)**

**Generated Explanation:**
> "You have foundational skills in JavaScript and React, but this senior role requires deeper expertise in backend systems (Node.js), database design, and system architecture. Consider: building experience with Node.js, studying database optimization, and learning system design principles before pursuing senior roles."

---

### 6.2 Case Study 2: Field Alignment Bonus

**Scenario:** Tech Graduate with Non-Tech Job Search

Jobseeker:
```
Course Field: Information & Communication Technology
Skills: Customer Service, Communication, Basic Computer Skills
```

Job: Customer Service Representative
```
Category: Retail & Service
Requirements: Customer Service, Communication
Preferred: Tech-savvy, basic IT support
```

**Matching Analysis:**

1. **Skills**: Both required skills match exactly → 100%
2. **Education**: BS ICT meets general requirement → 95%
3. **Field Alignment**: 
   - Candidate: Tech-aligned
   - Job: Retail-aligned
   - Adjacent match (60 points)
4. **Soft Skill Inference**:
   - Tech background suggests analytical thinking → +0.4 credit

**Final Score: 72% (Good Match)**

**Key Insight:** Field alignment bonus doesn't penalize the candidate for over-qualification—it actually helps because tech skills are valuable even in service roles.

---

### 6.3 Case Study 3: Overqualification Detection

**Scenario:** Software Engineer Applying for Data Entry

Jobseeker:
```
Skills: Python, JavaScript, React, Full-Stack Web Development
Education: BS Computer Science
```

Job: Data Entry Operator
```
Required: Data Entry, Microsoft Excel, Typing (40 WPM)
Education: High School
```

**System Response:**

1. **Matching**: All requirements met (overqualified)
2. **Signal Detection**: 
   - Candidate has "High-Tier Skills" (programming, web dev)
   - Job is "Low-Tier Role" (data entry)
   - System flags: **"High-Precision Candidate"**

3. **Inference**:
   - Software engineering implies attention to detail → Transfer partial credit
   - Critical thinking → Transfer analytical thinking credit
   - Expected: Strong accuracy in data entry

**Final Score: 65% (Good Match, with caveat)**

**Explanation:**
> "While your programming background exceeds this role's technical requirements, it signals strong attention to detail and accuracy—exactly what data entry demands. You'd likely excel here, but consider whether this role matches your career goals long-term."

---

## VII. System Architecture

### 7.1 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ AuthContext: Central User State Management               │ │
│  │ ├─ currentUser (Supabase Auth session)                   │ │
│  │ ├─ userData (merged users + role profile)               │ │
│  │ └─ adminAccess (admin-specific permissions)             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                          ↓                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Pages & Components                                       │ │
│  │ ├─ JobListings (Displays matched jobs)                  │ │
│  │ ├─ JobDetail (Shows match explanation)                  │ │
│  │ ├─ PostJob (Create/edit jobs)                           │ │
│  │ └─ Messaging (Real-time conversations)                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
          ↓                              ↓
   ┌──────────────────────┐    ┌──────────────────────┐
   │ Supabase Client      │    │ Edge Functions       │
   │ (JavaScript SDK)     │    │ (Deno/TypeScript)    │
   └──────────────────────┘    └──────────────────────┘
          ↓                              ↓
   ┌──────────────────────────────────────────────────┐
   │           SUPABASE BACKEND                       │
   │ ┌────────────────────────────────────────────┐  │
   │ │ PostgreSQL Database                        │  │
   │ │ ├─ public.users                           │  │
   │ │ ├─ jobseeker_profiles                     │  │
   │ │ ├─ employer_profiles                      │  │
   │ │ ├─ job_postings                           │  │
   │ │ ├─ applications                           │  │
   │ │ ├─ conversations & messages               │  │
   │ │ ├─ skill_embeddings                       │  │
   │ │ └─ match_results                          │  │
   │ └────────────────────────────────────────────┘  │
   │                                                 │
   │ ┌────────────────────────────────────────────┐  │
   │ │ Edge Functions                             │  │
   │ │ ├─ match-jobs                             │  │
   │ │ ├─ refresh-job-embedding                  │  │
   │ │ ├─ refresh-profile-embedding              │  │
   │ │ ├─ generate-match-explanation             │  │
   │ │ └─ send-notification-email                │  │
   │ └────────────────────────────────────────────┘  │
   │                                                 │
   │ ┌────────────────────────────────────────────┐  │
   │ │ Realtime Subscriptions                     │  │
   │ │ └─ postgres_changes (messages, convs)     │  │
   │ └────────────────────────────────────────────┘  │
   └──────────────────────────────────────────────────┘
          ↓                   ↓                   ↓
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │ Google       │  │ Cohere       │  │ Auth Service │
   │ Gemini API   │  │ Embeddings   │  │ (Email/OTP)  │
   │ (LLM for     │  │ (Vector DB   │  │              │
   │ explanations)│  │  matching)   │  │              │
   └──────────────┘  └──────────────┘  └──────────────┘
```

### 7.2 Key Data Models

**User Profile (Merged):**
```javascript
{
  // Base fields (public.users)
  id: string,
  email: string,
  role: 'jobseeker' | 'employer' | 'individual' | 'admin',
  is_verified: boolean,
  registration_complete: boolean,
  
  // Role-specific fields (from corresponding table)
  // If jobseeker:
  skills: string[],
  predefined_skills: string[],
  skill_aliases: { [skill]: string[] },
  work_experiences: WorkExperience[],
  highest_education: string,
  languages: Language[],
  experience_categories: string[],
  
  // Display name (derived)
  display_name: string,
}
```

**Job Posting:**
```javascript
{
  id: string,
  employer_id: string,
  title: string,
  category: string,
  description: string,
  requirements: string[],          // Required skills
  required_skills: string[],
  preferred_skills: string[],
  education_level: string,
  experience_level: 'entry' | 'mid' | 'senior',
  course_strand: string,
  vacancies: number,
  status: 'open' | 'closed',
  created_at: timestamp,
  embedding_hash: string,           // For change detection
}
```

**Match Result:**
```javascript
{
  job_id: string,
  jobseeker_id: string,
  matchScore: number,               // 0-100
  matchLevel: 'Excellent' | 'Good' | 'Fair' | 'Low',
  confidenceScore: number,          // 0-100
  
  matchingSkills: string[],
  relatedSkills: string[],
  missingSkills: string[],
  
  skillBreakdown: SkillMatch[],
  evidence: Evidence[],
  gaps: Gap[],
  
  explanation: string,              // Generated by LLM
  actionItems: string[],
}
```

---

## VIII. Benefits & Advantages

### 8.1 For Jobseekers
- **Automatic Discovery**: Jobs matched without manual application
- **Clear Feedback**: Transparent match explanations showing why they're suitable
- **Improvement Guidance**: Actionable tips to improve match scores
- **Time Savings**: No need to scroll through irrelevant listings

### 8.2 For Employers
- **Efficient Screening**: Automated ranking of candidates by match quality
- **Reduced Time-to-Hire**: Pre-screened candidates with detailed match analysis
- **Better Fit**: Skill alignment ensures culturally and capability-matched hires

### 8.3 For Individuals/Homeowners
- **Service Provider Matching**: Find suitable contractors (plumbers, electricians, etc.)
- **Skill Verification**: Confidence in provider's relevant experience

---

## IX. Technical Innovation Highlights

### 9.1 Hybrid Matching (Deterministic + Semantic)
Rather than choosing one approach, PESO-Connect combines both:
- **Deterministic** ensures explicit matches aren't missed
- **Semantic** captures related skills and context
- **Reranking** lets both algorithms inform final ranking

### 9.2 Field Alignment System
Unique to PESO, the system recognizes:
- Academic field compatibility (tech student → tech job)
- Adjacent field transitions (design ↔ web development)
- Career path adjacency (retail → hospitality)

### 9.3 Soft Skill Inference
Automatically infers soft skills from technical background:
- Programming → Attention to Detail, Analytical Thinking
- Design → Precision, Creativity, User-Centric Thinking
- This captures implicit competencies not always listed

### 9.4 Overqualification Handling
Instead of penalizing over-qualified candidates:
- Flags high-precision candidates
- Transfers advanced skills to entry-level roles
- Encourages informed decisions from both parties

---

## X. Future Enhancements

### 10.1 Short Term
1. **Skill Endorsements**: Peer verification of skills
2. **Job Alerts**: Personalized notifications for new matches
3. **Candidate Ranking**: Employers see candidates sorted by match quality

### 10.2 Medium Term
1. **Real-time Match Updates**: Refresh matches when profiles change
2. **Interview Scheduling**: Integrated booking system
3. **Feedback Loop**: Track hire success to improve algorithm
4. **Multi-language Support**: Full localization for Southeast Asian markets

### 10.3 Long Term
1. **Career Pathing**: Recommend skill acquisitions for career advancement
2. **Salary Intelligence**: Market-rate suggestions based on profile
3. **Skill Gap Analysis**: Personalized training recommendations
4. **Outcome Tracking**: Measure job placement success and retention

---

## XI. Conclusion

PESO-Connect represents a sophisticated approach to employment matching by combining multiple AI and rule-based techniques. The system's strength lies not in any single algorithm, but in the thoughtful integration of:

- **Transparent Rule-Based Matching** for trustworthy primary scoring
- **Semantic Intelligence** for discovering non-obvious relevant matches  
- **Field Alignment** for academic pathway consideration
- **Soft Skill Inference** for capturing implicit competencies
- **Multi-Role Design** supporting diverse employment scenarios

The platform addresses real employment challenges in developing markets by automating what would otherwise be hours of manual screening, while maintaining transparency through AI-generated explanations that help both jobseekers and employers make informed decisions.

---

## XII. Appendices

### A. Glossary of Terms

| Term | Definition |
|------|-----------|
| **Deterministic Scoring** | Rule-based matching using explicit criteria (skills, education, age) |
| **Semantic Matching** | Vector-based similarity using embeddings from Cohere |
| **Match Credit** | Score value assigned for different match types (exact: 1.0, partial: 0.75, etc.) |
| **Confidence Score** | Percentage of scoreable criteria met (0-100) |
| **Skill Normalization** | Process of converting skill names to canonical forms |
| **Embedding** | Vector representation of text generated by AI model |
| **Edge Function** | Serverless function running on Supabase (Deno runtime) |
| **Realtime Subscription** | Live database change notifications pushed to client |

### B. Key File Structure

```
src/
├─ contexts/
│  └─ AuthContext.jsx              # Central auth & user state
├─ services/
│  ├─ matchingService.js           # Client-side matching orchestration
│  ├─ geminiService.js             # Gemini LLM integration
│  ├─ messagingService.js          # Realtime messaging
│  └─ matching/
│     ├─ deterministicScore.js     # Deterministic algorithm (shared)
│     ├─ technicalRole.js          # Tech job detection
│     └─ *.test.js                 # Algorithm tests
├─ pages/
│  ├─ JobListings.jsx              # Jobseeker dashboard
│  ├─ JobDetail.jsx                # Job & match explanation
│  ├─ PostJob.jsx                  # Employer job posting
│  └─ Messaging.jsx                # Conversations
├─ components/
│  ├─ registration/                # Registration flow components
│  ├─ messaging/                   # Messaging UI components
│  └─ MatchExplanation.jsx         # Match detail display
└─ config/
   └─ supabase.js                  # Supabase client initialization

supabase/functions/
├─ match-jobs/index.ts            # Main matching engine
├─ refresh-job-embedding/         # Job embedding refresher
├─ refresh-profile-embedding/     # Profile embedding refresher
├─ generate-match-explanation/    # LLM explanation generator
└─ _shared/
   ├─ deterministicScore.ts       # Shared scoring (backend version)
   ├─ embeddingStore.ts           # Embedding management
   ├─ cohere.ts                   # Cohere API integration
   ├─ matchingText.ts             # Text canonicalization for embeddings
   └─ similarity.ts               # Embedding similarity calculation
```

### C. Database Schema Overview

```sql
-- Core Tables
public.users (id, email, role, is_verified, registration_complete)
public.jobseeker_profiles (id, user_id, skills[], predefined_skills[])
public.employer_profiles (id, user_id, company_name, company_info)
public.individual_profiles (id, user_id, service_type, availability)

-- Jobs & Applications
public.job_postings (id, employer_id, title, requirements[], required_skills[])
public.applications (id, job_id, jobseeker_id, status, created_at)

-- Matching Results
public.match_results (id, job_id, jobseeker_id, match_score, evidence_json)

-- Messaging
public.conversations (id, participants[], created_at)
public.messages (id, conversation_id, sender_id, body, created_at)

-- Embeddings & Analytics
public.job_embeddings (job_id, embedding_vector, embedding_hash)
public.profile_embeddings (jobseeker_id, embedding_vector, embedding_hash)
```

---

**Document Version:** 1.0  
**Created:** 2026-04-27  
**Last Updated:** 2026-04-27  
**For:** Oral Defense Preparation

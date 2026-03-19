# Chapter 3: Methodology

## 3.1 Design Method

This study employed the **Agile Development Methodology** in designing and developing PESO Connect, a web-based employment platform for the Public Employment Service Office (PESO) of San Carlos City, Negros Occidental. Agile was selected due to its iterative and incremental approach, which allowed the researchers to continuously refine the system based on user feedback and evolving requirements.

The development process followed iterative sprint cycles, each focusing on a specific module of the system. The first sprint addressed the core authentication and multi-role registration system, supporting four distinct user roles: jobseeker, employer, individual (homeowner), and administrator. Subsequent sprints focused on job posting and management, AI-powered job matching, real-time messaging, diagnostic worker search, and the administrative verification dashboard.

The system was built as a **Single Page Application (SPA)** using the following technology stack:

- **Frontend:** React 18 with Vite as the build tool, styled using Tailwind CSS for a responsive and mobile-friendly interface.
- **Authentication and User Database:** Supabase (PostgreSQL) for user authentication, base user records, and role-specific profile tables (`jobseeker_profiles`, `employer_profiles`, `individual_profiles`) secured with Row-Level Security (RLS) policies.
- **Real-Time Data:** Firebase Firestore for job postings, applications, conversations, and messages, leveraging its real-time listener capabilities for live updates.
- **AI Services:** Groq API (Llama 3.3 70B) for intelligent resume analysis, semantic skill matching, and natural language worker search.
- **Email Notifications:** EmailJS for client-side transactional emails including registration confirmations and verification status updates.

Each iteration produced a working increment of the system that was tested and validated before proceeding to the next feature. This approach enabled the researchers to address issues early, adapt to changing requirements, and ensure that the final product aligned with the operational needs of PESO San Carlos City.

---

## 3.2 Flow of the Study

The development of PESO Connect followed a structured sequence of phases, from initial analysis through deployment and evaluation.

**Phase 1: Needs Analysis and Requirements Gathering**
The researchers coordinated with PESO San Carlos City to understand the existing manual processes for employment services. Through interviews with PESO personnel and a review of current workflows, the team identified pain points such as the lack of a centralized digital platform for jobseeker-employer matching, manual verification of applicant documents, and the absence of an efficient communication channel between stakeholders.

**Phase 2: System Design**
Based on the gathered requirements, the researchers designed the system architecture, database schema, user interface wireframes, and data flow diagrams. The multi-role user system was planned to accommodate jobseekers (6-step registration), employers (4-step registration), individuals/homeowners (2-step registration), and administrators. The hybrid database architecture was designed with Supabase PostgreSQL for authentication and user profiles, and Firebase Firestore for job-related and messaging data.

**Phase 3: Iterative Development**
The system was developed in incremental sprints:
- **Sprint 1:** Authentication system, multi-role registration, and user profile management.
- **Sprint 2:** Employer job posting module with categorized listings, salary ranges, and skill requirements.
- **Sprint 3:** Jobseeker application system with AI-powered match scoring.
- **Sprint 4:** Real-time messaging system for communication between all user roles.
- **Sprint 5:** AI diagnostic search enabling individuals to find skilled workers through natural language queries.
- **Sprint 6:** Administrative dashboard for user verification, document review, and platform management.
- **Sprint 7:** Email notification system, profile editing, settings, and system refinements.

**Phase 4: Testing and Quality Assurance**
Unit testing was conducted using Vitest and React Testing Library. Each module was tested individually for functional correctness, including authentication flows, form validation, protected route access, and profile data persistence. User acceptance testing (UAT) was performed with selected respondents representing each user role.

**Phase 5: Deployment and Evaluation**
The finalized system was deployed and evaluated by end-users through a structured survey instrument. Feedback was collected, analyzed, and used to validate whether the system met its intended objectives.

---

## 3.3 Functional and Non-Functional Requirements

### Functional Requirements

| ID | Requirement | Description |
|----|------------|-------------|
| FR-01 | Multi-Role Registration | The system shall support registration for jobseekers (6 steps), employers (4 steps), and individuals (2 steps), with role-specific data collection and step-by-step progress saving. |
| FR-02 | User Authentication | The system shall provide secure login, logout, password reset, and account deletion using Supabase Auth. |
| FR-03 | Admin Verification | The system shall allow PESO administrators to review, approve, or reject jobseeker and employer registrations with document viewing and rejection reason entry. |
| FR-04 | Job Posting Management | Verified employers shall be able to create, edit, and manage job postings with details including title, category, type, salary range, required skills, and application deadline. |
| FR-05 | Job Application | Verified jobseekers shall be able to browse job listings, view match scores, and submit applications with justification text. |
| FR-06 | AI Job Matching | The system shall calculate match percentages between jobseeker profiles and job postings using semantic skill analysis via the Groq API (Llama 3.3 70B). |
| FR-07 | Real-Time Messaging | The system shall provide peer-to-peer messaging between all user roles with conversation tracking, unread counts, and job context attachment. |
| FR-08 | AI Diagnostic Search | Individuals shall be able to describe their service needs in natural language, and the system shall match them with qualified skilled workers. |
| FR-09 | Profile Management | All users shall be able to view and edit their profile information, upload documents (resume, certificates, government ID, business permits), and update profile photos. |
| FR-10 | Email Notifications | The system shall send automated email notifications for registration confirmations, verification approvals, and rejection notices. |
| FR-11 | Role-Based Access Control | The system shall restrict feature access based on user role and verification status (e.g., unverified jobseekers cannot apply to jobs). |
| FR-12 | Document Upload and Review | The system shall support file uploads (PDF, DOC, JPG, PNG) with image compression and Base64 encoding, and provide administrators with a document viewer for verification. |

### Non-Functional Requirements

| ID | Requirement | Description |
|----|------------|-------------|
| NFR-01 | Usability | The system shall provide an intuitive, responsive interface accessible on desktop and mobile devices using Tailwind CSS. |
| NFR-02 | Performance | Pages shall load within 3 seconds under normal network conditions. AI matching requests shall include a 10-minute cache to reduce redundant API calls. Database queries shall implement an 8-second timeout to handle slow connections gracefully. |
| NFR-03 | Security | The system shall enforce Row-Level Security (RLS) on all Supabase tables, use environment variables for all sensitive credentials, validate all user inputs on the client side, and restrict API access through authentication tokens. |
| NFR-04 | Reliability | The system shall handle database timeouts by falling back to cached profile data, display user-friendly error messages, and preserve form data across browser tab switches. |
| NFR-05 | Scalability | The system shall use a modular architecture with separate profile tables per role and a hybrid database design that allows independent scaling of authentication, user data, and real-time features. |
| NFR-06 | Maintainability | The codebase shall follow component-based architecture with reusable UI components, centralized authentication context, and clearly separated service layers. |
| NFR-07 | Data Privacy | The system shall comply with the Data Privacy Act of 2012 (Republic Act No. 10173) by requiring user consent for data processing during registration and restricting profile data access to authorized users. |

---

## 3.4 Respondents of the Study

The respondents of this study were selected through **purposive sampling**, targeting individuals who are directly involved in or would directly benefit from the services of the Public Employment Service Office (PESO) of San Carlos City, Negros Occidental. The following groups of respondents were identified:

1. **Jobseekers** — Individuals actively seeking employment within San Carlos City and neighboring areas. These respondents evaluated the registration process, job browsing and application features, AI-powered match scoring, profile management, and messaging functionality.

2. **Employers** — Business owners, HR personnel, and authorized company representatives operating within San Carlos City. These respondents evaluated the employer registration process, job posting and applicant management features, messaging, and profile management.

3. **Individuals/Homeowners** — Residents of San Carlos City seeking skilled workers for household or personal service needs (e.g., plumbing, electrical work, house cleaning). These respondents evaluated the simplified registration process, AI diagnostic worker search, and messaging features.

4. **PESO Personnel/Administrators** — Staff members of the PESO office responsible for facilitating employment services and verifying registered users. These respondents evaluated the administrative dashboard, verification workflow, document review, and user management features.

The total number of respondents was determined based on the availability and willingness of participants from each user group within the locality of San Carlos City.

---

## 3.5 Research Environment

The study was conducted within the jurisdiction of the **Public Employment Service Office (PESO) of San Carlos City, Negros Occidental, Philippines**. The platform was designed to serve the local employment ecosystem of the city, connecting local jobseekers with employers and individuals in need of skilled services.

**Development Environment:**
- The system was developed on a local workstation running Windows 11, using Node.js as the runtime environment and Visual Studio Code as the primary code editor.
- The development server was powered by Vite, running locally on port 5173 during the development phase.
- Version control was managed using Git with a remote repository for collaborative development.

**Production Environment:**
- The application was deployed as a web-based platform accessible through modern web browsers (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari) on both desktop and mobile devices.
- Backend services were hosted on cloud platforms: Supabase (authentication and PostgreSQL database) and Firebase (Firestore real-time database).
- AI processing was handled externally through the Groq API, and email notifications were dispatched through the EmailJS service.

**Testing Environment:**
- Respondents accessed the system through their personal devices (smartphones, laptops, or desktop computers) with internet connectivity.
- Evaluation sessions were conducted either on-site at the PESO office for administrator respondents, or remotely for jobseeker, employer, and individual respondents via a shared deployment link.

---

## 3.6 Research Instrument

The primary research instrument used in this study was a **structured survey questionnaire** designed to evaluate the usability, functionality, and overall effectiveness of the PESO Connect platform. The questionnaire was developed based on the **ISO 25010 Software Quality Model**, which provides a standardized framework for evaluating software product quality.

The survey instrument was divided into the following sections:

**Section 1: Respondent Profile**
This section collected demographic information including the respondent's user role (jobseeker, employer, individual, or PESO administrator), age, gender, and level of familiarity with online employment platforms.

**Section 2: Functional Suitability**
This section assessed whether the system performs its intended functions correctly. Questions covered the registration process, job posting and application, AI job matching accuracy, messaging, diagnostic search, and admin verification workflow.

**Section 3: Usability**
This section evaluated the ease of use, learnability, and user interface design of the platform. Questions addressed navigation clarity, form layout, visual design, responsiveness across devices, and overall user experience.

**Section 4: Performance Efficiency**
This section measured the system's responsiveness, including page load times, registration step transitions, AI matching speed, and real-time messaging delivery.

**Section 5: Security and Data Privacy**
This section assessed the respondents' perception of data protection, authentication security, and compliance with data privacy standards.

**Section 6: Reliability**
This section evaluated the system's consistency, error handling, and ability to maintain data integrity (e.g., form data preservation during tab switches, graceful handling of network issues).

**Section 7: Overall Satisfaction**
This section captured the respondents' general assessment of the system and their willingness to use it as a replacement for or supplement to the existing manual PESO processes.

Each item in Sections 2 through 6 was rated using a **5-point Likert scale**:

| Scale | Verbal Interpretation |
|-------|----------------------|
| 5 | Strongly Agree |
| 4 | Agree |
| 3 | Neutral |
| 2 | Disagree |
| 1 | Strongly Disagree |

The questionnaire was validated by subject matter experts for content validity and pilot-tested with a small group of respondents prior to full deployment.

---

## 3.7 Data Gathering Procedures

The data gathering process for this study followed a systematic sequence to ensure the collection of reliable and relevant feedback from all respondent groups.

**Step 1: Coordination and Approval**
The researchers coordinated with the PESO office of San Carlos City to secure approval for conducting the study. A formal letter of request was submitted to the PESO manager, outlining the objectives of the research, the scope of respondent participation, and the data collection timeline.

**Step 2: System Orientation and Deployment**
Prior to evaluation, the researchers provided a brief orientation to each respondent group explaining the purpose of the PESO Connect platform, its key features, and how to navigate the system. The platform was made accessible via a web deployment link that respondents could access on their personal devices.

**Step 3: Hands-On System Usage**
Each respondent was given time to use the system according to their assigned role:
- **Jobseekers** completed the 6-step registration, browsed job listings, applied to jobs, and used the messaging feature.
- **Employers** completed the 4-step registration, posted sample job listings, reviewed applicants, and communicated via the messaging system.
- **Individuals** completed the 2-step registration, used the AI diagnostic search to find skilled workers, and initiated messaging.
- **PESO Administrators** accessed the admin dashboard, reviewed pending registrations, verified or rejected applicants, and managed user records.

**Step 4: Survey Administration**
After completing the hands-on evaluation, each respondent was provided with the structured survey questionnaire (see Section 3.6). The survey was administered either as a printed form (for on-site respondents) or as a digital form (for remote respondents). Respondents were given adequate time to complete the questionnaire and were encouraged to provide honest and candid responses.

**Step 5: Data Collection and Consolidation**
All completed survey forms were collected, reviewed for completeness, and consolidated into a master dataset for statistical analysis. Incomplete or invalid responses were excluded from the final dataset.

---

## 3.8 Statistical Treatment of Data

The following statistical tools were used to analyze and interpret the data gathered from the survey questionnaires:

### 1. Weighted Mean

The **weighted mean** was used to determine the average rating for each survey item and to compute the overall assessment of the system across the evaluation criteria (functional suitability, usability, performance efficiency, security, and reliability).

**Formula:**

$$\bar{x}_w = \frac{\sum_{i=1}^{n} (f_i \times w_i)}{N}$$

Where:
- $\bar{x}_w$ = weighted mean
- $f_i$ = frequency of responses for each scale point
- $w_i$ = weight assigned to each scale point (1 to 5)
- $N$ = total number of respondents

The computed weighted mean was interpreted using the following scale:

| Range | Verbal Interpretation |
|-------|----------------------|
| 4.21 – 5.00 | Strongly Agree / Highly Acceptable |
| 3.41 – 4.20 | Agree / Acceptable |
| 2.61 – 3.40 | Neutral / Moderately Acceptable |
| 1.81 – 2.60 | Disagree / Slightly Acceptable |
| 1.00 – 1.80 | Strongly Disagree / Not Acceptable |

### 2. Frequency and Percentage Distribution

**Frequency and percentage distribution** were used to summarize the demographic profile of the respondents and to present the distribution of responses for each survey item.

**Formula:**

$$P = \frac{f}{N} \times 100$$

Where:
- $P$ = percentage
- $f$ = frequency of a specific response
- $N$ = total number of respondents

### 3. Standard Deviation

The **standard deviation** was computed to measure the degree of variability or dispersion in the respondents' ratings. A lower standard deviation indicates greater consensus among respondents, while a higher value suggests varied opinions.

**Formula:**

$$SD = \sqrt{\frac{\sum_{i=1}^{n} (x_i - \bar{x})^2}{N - 1}}$$

Where:
- $SD$ = standard deviation
- $x_i$ = individual response value
- $\bar{x}$ = mean of all responses
- $N$ = total number of respondents

### 4. Composite Mean

The **composite mean** was used to determine the overall rating for each evaluation criterion by averaging the weighted means of all items within that section. This provided a summary measure for functional suitability, usability, performance efficiency, security, reliability, and overall satisfaction.

These statistical treatments enabled the researchers to quantify user perceptions, identify strengths and areas for improvement, and draw evidence-based conclusions regarding the acceptability and effectiveness of the PESO Connect platform.

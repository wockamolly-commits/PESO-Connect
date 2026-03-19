# CHAPTER III
# METHODOLOGY

This chapter presents the research design, development methodology, and procedures employed by the researchers in the development and evaluation of PESO-Connect: A Web-Based Employment Platform for the Public Employment Service Office of San Carlos City, Negros Occidental. The discussion covers the activities from pre-proposal to final document writing, including the software development life cycle (SDLC) model adopted, the flow of the study, functional and non-functional requirements, respondent selection, research environment, instrumentation, data gathering procedures, and statistical treatment of data.

---

## a. Design Method

The researchers employed the **Agile Development Methodology** as the software development life cycle (SDLC) model for the iterative design, development, and deployment of PESO-Connect. The Agile model was selected due to its flexibility, iterative nature, and emphasis on continuous user feedback, which were essential given the multi-stakeholder nature of the platform involving jobseekers, employers, individuals (homeowners), and PESO administrators.

The Agile methodology follows a cyclical process consisting of six (6) core phases: (1) Requirements, (2) Design, (3) Development, (4) Testing, (5) Deployment, and (6) Review. Each cycle, or sprint, produces a working increment of the system that is tested, evaluated, and refined before proceeding to the next iteration.

> **[Figure 1. Agile Development Model]**
> *(Insert the Agile SDLC cycle diagram showing the six phases: Requirements, Design, Development, Testing, Deployment, and Review arranged in a circular/iterative flow.)*

The development of PESO-Connect was organized into seven (7) incremental sprints, each targeting a specific module of the system:

- **Sprint 1: Authentication and Multi-Role Registration.** This sprint focused on implementing user authentication via Supabase Auth and developing the multi-step registration workflows for jobseekers (6 steps), employers (4 steps), and individuals (2 steps). Each registration flow collected role-specific data and supported step-by-step progress saving.

- **Sprint 2: Employer Job Posting Module.** The second sprint addressed the job posting creation wizard, allowing verified employers to publish categorized job listings with details such as job title, type, salary range, required skills, experience level, education requirements, number of vacancies, and application deadlines.

- **Sprint 3: Jobseeker Application System with AI Matching.** This sprint introduced the job browsing and application module for jobseekers. It integrated the Groq API (Llama 3.3 70B large language model) to perform semantic skill matching between jobseeker profiles and job postings, generating match scores from 0 to 100 percent.

- **Sprint 4: Real-Time Messaging System.** The fourth sprint implemented a peer-to-peer messaging module powered by Supabase Realtime, enabling real-time communication between all user roles with features such as conversation tracking, unread message counts, and job context attachment.

- **Sprint 5: AI Diagnostic Worker Search.** This sprint developed the natural language worker search feature, allowing individuals (homeowners) to describe their service needs in plain English (e.g., "I need a plumber for a leaky pipe"). The system categorizes the request into trade categories and returns a list of matched skilled workers.

- **Sprint 6: Administrative Verification Dashboard.** The sixth sprint created the admin module for PESO personnel, enabling them to review pending registrations, examine uploaded documents (resume, certificates, government ID, business permits), approve or reject applicants with feedback, and manage user records.

- **Sprint 7: Email Notifications and System Refinements.** The final sprint integrated the Resend service for automated email notifications (registration confirmations, verification approvals, and rejection notices) and addressed profile editing, account settings, and overall system polish.

Each sprint followed the complete Agile cycle of requirements gathering, design, development, testing, deployment, and review. This iterative approach enabled the researchers to identify and address issues early, adapt to evolving requirements from PESO stakeholders, and ensure that each increment of the system was functional and validated before proceeding to the next module.

---

## b. Flow of the Study

The flow of this study was structured based on the **Input-Process-Output (IPO) Model**, which provided a systematic framework for organizing the research activities from problem identification through system evaluation.

> **[Figure 2. Flow of the Study (IPO Model)]**
> *(Insert an IPO diagram with the following content:)*
>
> | **INPUT** | **PROCESS** | **OUTPUT** |
> |-----------|-------------|------------|
> | 1. Identified limitations of the existing manual employment service processes of PESO San Carlos City | 1. Letter to PESO San Carlos City requesting permission to conduct the study | **PESO-Connect:** |
> | 2. Needs and requirements of jobseekers, employers, individuals, and PESO administrators | 2. Agile Development Methodology (iterative sprints) | A Web-Based Employment Platform for the Public Employment Service Office of San Carlos City |
> | 3. Review of related literature and existing employment platforms | 3. System design, development, and testing | |
> | 4. ISO/IEC 25010 software quality evaluation criteria | 4. Evaluation using ISO/IEC 25010-based survey instrument | |
> | | 5. Statistical analysis of survey data using weighted mean, frequency and percentage distribution, standard deviation, and composite mean | |

The **input** components of this study consisted of the following: (1) the identified limitations of the current manual processes employed by PESO San Carlos City in facilitating employment services, such as the lack of a centralized digital platform for jobseeker-employer matching, manual verification of applicant documents, and the absence of an efficient communication channel between stakeholders; (2) the needs and requirements gathered from jobseekers, employers, individuals seeking skilled workers, and PESO administrative personnel; (3) a review of related literature and existing web-based employment platforms to identify best practices and technological approaches; and (4) the ISO/IEC 25010 software quality model criteria, which served as the basis for evaluating the developed system.

The **process** phase encompassed the following activities: (1) securing approval from the PESO office of San Carlos City through a formal letter of request; (2) applying the Agile Development Methodology through iterative sprints to design, develop, and refine the platform; (3) designing the system architecture, database schema, and user interface based on gathered requirements; (4) conducting system testing and user acceptance evaluation using a structured survey instrument based on the ISO/IEC 25010 standard; and (5) performing statistical analysis of the collected data using weighted mean, frequency and percentage distribution, standard deviation, and composite mean.

The **output** of this study was **PESO-Connect: A Web-Based Employment Platform for the Public Employment Service Office of San Carlos City**, a fully functional web application that serves as a centralized digital platform for connecting jobseekers, employers, and individuals seeking skilled workers under the facilitation of the PESO office.

---

## c. Functional and Non-Functional Requirements

### c.1. Software Requirements

Table 1 presents the software requirements used in the development and deployment of the PESO-Connect platform. It specifies the minimum version of each software tool utilized during the development process.

> **Table 1. Software Requirements (Minimum)**
>
> | **Software** | **Version** |
> |---|---|
> | Node.js (Runtime Environment) | v18.0.0 |
> | npm (Package Manager) | v9.0.0 |
> | React (Frontend Framework) | v18.2.0 |
> | Vite (Build Tool) | v5.0.8 |
> | Tailwind CSS (Styling Framework) | v3.4.1 |
> | React Router DOM (Client-Side Routing) | v6.21.3 |
> | Supabase JS Client (Auth & Database) | v2.x |
> | Supabase Realtime (Real-Time Subscriptions) | Included in Supabase JS v2.x |
> | Groq SDK (AI/LLM Integration) | Latest |
> | Resend (Email Service) | Latest |
> | Vitest (Unit Testing Framework) | v4.0.18 |
> | Visual Studio Code (Code Editor) | Latest |
> | Git (Version Control) | Latest |
> | Google Chrome or Any Modern Browser | Latest |
> | Windows 10/11 (Operating System) | v10 or later |

### c.2. Hardware Requirements

Table 2 presents the recommended hardware specifications for developing, deploying, and accessing the PESO-Connect platform.

> **Table 2. Hardware Requirements (Recommended)**
>
> | **Device** | **Specifications** |
> |---|---|
> | Central Processing Unit (CPU) | Intel Core i5 or equivalent (minimum dual-core) |
> | Random Access Memory (RAM) | 8 GB |
> | Hard Disk Drive / Solid State Drive | 256 GB (SSD recommended) |
> | Monitor | 15" with 1366x768 resolution or higher |
> | Keyboard | Standard Keyboard |
> | Mouse | Standard Mouse |
> | Network Connection | Stable internet connection (minimum 5 Mbps) |
> | Mobile Device (for end-user testing) | Smartphone or tablet with a modern web browser |

### c.3. System/Application Flowchart

A system flowchart is a graphical representation of the flow of information and data through the PESO-Connect platform. It visually depicts the various components, decision points, and processes of the system from the perspective of each user role.

The flowchart illustrates the general process flow of the system: users begin at the landing page, choose to log in or register, and are routed to role-specific workflows depending on their account type. Jobseekers proceed through a 6-step registration, browse job listings with AI-powered match scores, and submit applications. Employers complete a 4-step registration, create and manage job postings, and review applicants. Individuals register in 2 steps and use the AI diagnostic search to find skilled workers. Administrators access a dedicated dashboard to verify pending registrations and manage users. All authenticated users can access the real-time messaging system and manage their profiles.

> **[Figure 3. System/Application Flowchart]**
> *(Insert a system flowchart diagram showing the general flow:)*
> - **START** -> Landing Page -> Login / Register
> - Register -> Select Role -> Jobseeker Registration (6 steps) / Employer Registration (4 steps) / Individual Registration (2 steps)
> - Login -> Dashboard (role-specific)
> - Jobseeker: Browse Jobs -> View Match Score -> Apply -> Track Applications -> Messages
> - Employer: Post Job -> Manage Listings -> Review Applicants -> Accept/Reject -> Messages
> - Individual: Diagnostic Search -> View Workers -> Messages
> - Admin: Verification Dashboard -> Review Documents -> Approve/Reject Users
> - All Roles: Profile Management -> Settings -> Logout
> - **END**

### c.4. System Architecture

The system architecture of PESO-Connect follows a **client-server model** implemented as a Single Page Application (SPA). The architecture comprises a React-based frontend that communicates with the Supabase cloud platform for all backend services.

The **presentation layer** consists of the React 18 frontend built with Vite and styled using Tailwind CSS. It provides a responsive, mobile-friendly user interface accessible through modern web browsers on both desktop and mobile devices. The frontend handles client-side routing using React Router DOM and manages global authentication state through a centralized AuthContext provider.

The **data layer** is built entirely on **Supabase (PostgreSQL)**. Supabase serves as the unified database for user authentication, base user records, role-specific profile tables (`jobseeker_profiles`, `employer_profiles`, `individual_profiles`), job postings, applications, and messaging data, all secured with Row-Level Security (RLS) policies. Supabase Realtime is leveraged for live updates such as new messages and application status changes.

The **service layer** integrates external APIs to extend the platform's capabilities. The Groq API (Llama 3.3 70B) powers the AI job matching and diagnostic worker search features. Resend handles transactional email delivery for registration confirmations and verification notifications.

> **[Figure 4. System Architecture Diagram]**
> *(Insert a system architecture diagram showing:)*
> - **Users** (Jobseeker, Employer, Individual, Admin) accessing via Web Browser
> - **Frontend** (React 18 + Vite + Tailwind CSS) - Single Page Application
> - **Supabase** (Authentication + PostgreSQL Database with RLS + Realtime Subscriptions for Jobs, Applications, Messages)
> - **Groq API** (AI/LLM Service for Job Matching and Diagnostic Search)
> - **Resend** (Email Notification Service)
> - Arrows showing data flow between each component

### c.5. Context Diagram

The context diagram defines the scope and boundaries of the PESO-Connect system. It illustrates the external entities (actors) that interact with the system and the data flows between them, without showing the internal workings of the platform.

The context diagram identifies four (4) primary external entities:

1. **Jobseeker** — Registers an account (6 steps), submits personal and employment profile data, browses job listings, receives AI match scores, submits job applications, and communicates with employers via real-time messaging.

2. **Employer** — Registers a business account (4 steps), submits company and representative information, creates and manages job postings, reviews applicants with match scores, accepts or rejects applications, and communicates with jobseekers via messaging.

3. **Individual (Homeowner)** — Registers a simplified account (2 steps), submits service requests through the AI diagnostic search, receives a list of matched skilled workers, and contacts workers via messaging.

4. **PESO Administrator** — Accesses the admin dashboard, reviews pending registrations, examines uploaded documents, approves or rejects user accounts with feedback, and manages the overall verification workflow.

> **[Figure 5. Context Diagram]**
> *(Insert a context diagram showing the PESO-Connect system at the center with the four external entities and their respective data flows.)*

### c.6. Data Flow Diagram (DFD Level 1)

The Data Flow Diagram (DFD) at Level 1 decomposes the PESO-Connect system into its major processes and illustrates the data flows between them. The DFD identifies the following core processes:

- **Process 1.0: User Registration and Authentication** — Handles account creation, multi-step registration data collection, login, password reset, and session management via Supabase Auth.
- **Process 2.0: Profile Management** — Manages the storage and retrieval of role-specific profile data, including document uploads (resume, certificates, government ID, business permits) with image compression and Base64 encoding.
- **Process 3.0: Job Posting Management** — Allows employers to create, edit, and manage job listings stored in Supabase, including job details, required skills, salary ranges, and application deadlines.
- **Process 4.0: Job Application and AI Matching** — Enables jobseekers to browse job listings, receive AI-generated match scores via the Groq API, and submit applications with justification text.
- **Process 5.0: AI Diagnostic Worker Search** — Processes natural language service requests from individuals, categorizes them into trade categories, and returns matched skilled workers from the database.
- **Process 6.0: Real-Time Messaging** — Facilitates peer-to-peer communication between all user roles via Supabase Realtime with conversation tracking and unread message indicators.
- **Process 7.0: Admin Verification** — Enables PESO administrators to review pending registrations, examine uploaded documents, and approve or reject user accounts with automated email notifications.

> **[Figure 6. Data Flow Diagram (DFD Level 1)]**
> *(Insert a DFD Level 1 diagram showing the seven processes, external entities, and data stores with labeled data flows.)*

### c.7. Entity Relationship Diagram (ERD)

The Entity Relationship Diagram (ERD) visualizes the database entities, their attributes, and the relationships between them in the PESO-Connect system. The system utilizes Supabase PostgreSQL as the unified database for all user, job, and messaging data.

The ERD for the Supabase PostgreSQL database consists of four (4) primary entities:

**Entity 1: users** (Base User Table)
- `id` (UUID, Primary Key)
- `email` (Text, Unique)
- `role` (Text: jobseeker, employer, individual, admin)
- `name` (Text)
- `is_verified` (Boolean)
- `registration_complete` (Boolean)
- `registration_step` (Integer)
- `profile_photo` (Text)
- `created_at` (Timestamptz)
- `updated_at` (Timestamptz)

**Entity 2: jobseeker_profiles** (One-to-One with users)
- `id` (UUID, Foreign Key referencing users.id, Primary Key)
- `full_name`, `date_of_birth`, `barangay`, `city`, `province` (Text)
- `mobile_number`, `preferred_contact_method` (Text)
- `preferred_job_type` (Text Array), `preferred_job_location` (Text)
- `expected_salary_min`, `expected_salary_max` (Text)
- `highest_education`, `school_name`, `course_or_field`, `year_graduated` (Text)
- `skills` (Text Array), `work_experiences` (JSONB), `certifications` (Text Array)
- `portfolio_url`, `resume_url` (Text), `certificate_urls` (JSONB)
- `jobseeker_status` (Text: pending, verified, rejected)
- `created_at`, `updated_at` (Timestamptz)

**Entity 3: employer_profiles** (One-to-One with users)
- `id` (UUID, Foreign Key referencing users.id, Primary Key)
- `company_name`, `employer_type`, `business_reg_number` (Text)
- `business_address`, `nature_of_business` (Text)
- `representative_name`, `representative_position` (Text)
- `contact_email`, `contact_number` (Text)
- `gov_id_url`, `business_permit_url`, `company_logo` (Text)
- `company_description`, `company_size`, `company_website` (Text)
- `social_media_links` (JSONB)
- `employer_status` (Text: pending, approved, rejected)
- `created_at`, `updated_at` (Timestamptz)

**Entity 4: individual_profiles** (One-to-One with users)
- `id` (UUID, Foreign Key referencing users.id, Primary Key)
- `full_name`, `contact_number` (Text)
- `barangay`, `city`, `province` (Text)
- `bio` (Text), `service_preferences` (Text Array)
- `individual_status` (Text: active)
- `created_at`, `updated_at` (Timestamptz)

The relationships between entities follow a one-to-one cardinality: each record in the `users` table has at most one corresponding record in a role-specific profile table (`jobseeker_profiles`, `employer_profiles`, or `individual_profiles`), determined by the user's assigned role.

> **[Figure 7. Entity Relationship Diagram (ERD)]**
> *(Insert an ERD showing the four entities with their attributes, primary keys, foreign keys, and one-to-one relationships using standard notation.)*

### c.8. Use Case Diagram

The use case diagram visually represents the interactions between the four (4) actors (user roles) and the PESO-Connect system. The diagram identifies the key use cases for each actor:

**Jobseeker:**
- Register Account (6-step process)
- Login / Logout
- Browse Job Listings
- View AI Match Score
- Apply for Job
- Track Application Status
- Edit Profile
- Send / Receive Messages
- Use Diagnostic Search
- Manage Account Settings

**Employer:**
- Register Business Account (4-step process)
- Login / Logout
- Create Job Posting
- Manage Job Listings
- Review Applicants
- Accept / Reject Applications
- Edit Company Profile
- Send / Receive Messages
- Use Diagnostic Search
- Manage Account Settings

**Individual (Homeowner):**
- Register Account (2-step process)
- Login / Logout
- Use AI Diagnostic Search
- Browse Skilled Workers
- Send / Receive Messages
- Edit Profile
- Manage Account Settings

**PESO Administrator:**
- Login / Logout (Admin Portal)
- View Verification Dashboard
- Review Pending Registrations
- Examine Uploaded Documents
- Approve User Registration
- Reject User Registration (with reason)
- Manage User Records
- View Platform Statistics

Shared use cases among all roles include Login, Logout, View Profile, Edit Profile, Send Messages, Receive Messages, and Manage Account Settings.

> **[Figure 8. Use Case Diagram]**
> *(Insert a UML use case diagram showing the four actors, their respective use cases, and any shared/included/extended relationships.)*

### c.9. Functional Requirements Summary

Table 3 presents the functional requirements of the PESO-Connect platform.

> **Table 3. Functional Requirements**
>
> | **ID** | **Requirement** | **Description** |
> |---|---|---|
> | FR-01 | Multi-Role Registration | The system shall support registration for jobseekers (6 steps), employers (4 steps), and individuals (2 steps), with role-specific data collection and step-by-step progress saving. |
> | FR-02 | User Authentication | The system shall provide secure login, logout, password reset, and account deletion using Supabase Auth. |
> | FR-03 | Admin Verification | The system shall allow PESO administrators to review, approve, or reject jobseeker and employer registrations with document viewing and rejection reason feedback. |
> | FR-04 | Job Posting Management | Verified employers shall be able to create, edit, and manage job postings with details including title, category, type, salary range, required skills, and application deadline. |
> | FR-05 | Job Application | Verified jobseekers shall be able to browse job listings, view AI-generated match scores, and submit applications with justification text. |
> | FR-06 | AI Job Matching | The system shall calculate match percentages between jobseeker profiles and job postings using semantic skill analysis via the Groq API (Llama 3.3 70B). |
> | FR-07 | Real-Time Messaging | The system shall provide peer-to-peer messaging between all user roles with conversation tracking, unread counts, and job context attachment. |
> | FR-08 | AI Diagnostic Search | Individuals shall be able to describe service needs in natural language, and the system shall match them with qualified skilled workers based on trade categories. |
> | FR-09 | Profile Management | All users shall be able to view and edit their profile information, upload documents (resume, certificates, government ID, business permits), and update profile photos with image compression. |
> | FR-10 | Email Notifications | The system shall send automated email notifications for registration confirmations, verification approvals, and rejection notices via Resend. |
> | FR-11 | Role-Based Access Control | The system shall restrict feature access based on user role and verification status (e.g., unverified employers cannot post jobs; unverified jobseekers cannot apply). |
> | FR-12 | Document Upload and Review | The system shall support file uploads (PDF, DOC, JPG, PNG) with image compression and Base64 encoding, and provide administrators with a document viewer for verification review. |

### c.10. Non-Functional Requirements Summary

Table 4 presents the non-functional requirements based on the ISO/IEC 25010 software quality model.

> **Table 4. Non-Functional Requirements (Based on ISO/IEC 25010)**
>
> | **ID** | **Quality Characteristic** | **Description** |
> |---|---|---|
> | NFR-01 | Functional Suitability | The system shall perform all specified functions correctly, including registration, job matching, messaging, and admin verification, as defined in the functional requirements. |
> | NFR-02 | Usability | The system shall provide an intuitive, responsive interface accessible on desktop and mobile devices, with clear navigation, consistent layout, and visual feedback using Tailwind CSS. |
> | NFR-03 | Performance Efficiency | Pages shall load within 3 seconds under normal network conditions. AI matching requests shall utilize a 10-minute cache to reduce redundant API calls. Database queries shall implement an 8-second timeout with graceful fallback to cached data. |
> | NFR-04 | Security | The system shall enforce Row-Level Security (RLS) on all Supabase profile tables, use environment variables for all sensitive credentials, validate user inputs on the client side, and restrict API access through authentication tokens. |
> | NFR-05 | Reliability | The system shall handle database timeouts gracefully by falling back to cached profile data, display user-friendly error messages for all failure states, and preserve form data across browser tab switches and interruptions. |
> | NFR-06 | Maintainability | The codebase shall follow a component-based architecture with reusable UI components, a centralized authentication context, and clearly separated service layers for database, messaging, AI, and email operations. |
> | NFR-07 | Portability | The system shall be accessible on any device with a modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari) without requiring additional software installation. |
> | NFR-08 | Data Privacy Compliance | The system shall comply with the Data Privacy Act of 2012 (Republic Act No. 10173) by requiring explicit user consent for data processing during registration and restricting profile data access to authorized users through RLS policies. |

---

## d. Respondents of the Study

The respondents of this study were selected through **purposive sampling**, targeting individuals who are directly involved in or would directly benefit from the services of the Public Employment Service Office (PESO) of San Carlos City, Negros Occidental. Purposive sampling was deemed appropriate because the evaluation of the system required respondents who possess firsthand experience with employment services and can meaningfully assess the platform's features relevant to their respective roles.

The following groups of respondents were identified:

1. **Jobseekers** — Individuals actively seeking employment within San Carlos City and neighboring areas. These respondents evaluated the 6-step registration process, job browsing and application features, AI-powered match scoring, profile management, and messaging functionality.

2. **Employers** — Business owners, HR personnel, and authorized company representatives operating within San Carlos City. These respondents evaluated the 4-step employer registration process, job posting and applicant management features, messaging, and company profile management.

3. **Individuals/Homeowners** — Residents of San Carlos City seeking skilled workers for household or personal service needs (e.g., plumbing, electrical work, carpentry, house cleaning). These respondents evaluated the simplified 2-step registration process, AI diagnostic worker search, and messaging features.

4. **PESO Personnel/Administrators** — Staff members of the PESO office responsible for facilitating employment services and verifying registered users. These respondents evaluated the administrative dashboard, verification workflow, document review, and user management features.

5. **IT Experts** — Information technology professionals and academics with expertise in software development and evaluation. These respondents assessed the technical quality of the system based on the ISO/IEC 25010 software quality criteria, including functional suitability, usability, performance efficiency, security, reliability, and maintainability.

The total sample size was determined based on the availability and willingness of participants from each user group within the locality of San Carlos City.

> **Table 5. Distribution of Respondents**
>
> | **Respondents** | **Frequency** | **Percentage** |
> |---|---|---|
> | Jobseekers | __ | __% |
> | Employers | __ | __% |
> | Individuals/Homeowners | __ | __% |
> | PESO Personnel/Administrators | __ | __% |
> | IT Experts | __ | __% |
> | **Total** | **__** | **100.00%** |

*(Note: Fill in the actual frequency and percentage values based on the final number of respondents secured for the evaluation.)*

---

## e. Respondents' Environment

### Locale of the Study

The study was conducted within the jurisdiction of the **Public Employment Service Office (PESO) of San Carlos City, Negros Occidental, Philippines**. San Carlos City is a component city in the Province of Negros Occidental in the Western Visayas region. The PESO office serves as the primary government agency responsible for facilitating employment services, job matching, and labor market information within the city. The platform was designed to serve the local employment ecosystem, connecting jobseekers with employers and individuals in need of skilled services within San Carlos City and its neighboring areas.

> **[Figure 9. Map of San Carlos City, Negros Occidental]**
> *(Insert a map showing the location of San Carlos City within Negros Occidental, Philippines, with a pin or marker indicating the PESO office or city center.)*

### Development Environment

The system was developed on a local workstation with the following specifications:

- **Operating System:** Windows 10/11
- **Runtime Environment:** Node.js v18+
- **Code Editor:** Visual Studio Code
- **Development Server:** Vite (running locally on port 5173 during development)
- **Version Control:** Git with a remote repository for collaborative development
- **Package Manager:** npm v9+

### Production/Deployment Environment

The application was deployed as a web-based platform accessible through modern web browsers (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari) on both desktop and mobile devices. The backend services were hosted on the following cloud platforms:

- **Supabase** — For user authentication, PostgreSQL database hosting (user profiles, role-specific data, job postings, applications, and messaging), and Realtime subscriptions for live updates.
- **Groq API** — For AI/LLM processing of job matching and diagnostic worker search requests.
- **Resend** — For transactional email delivery.

### Testing/Evaluation Environment

Respondents accessed the system through their personal devices (smartphones, laptops, or desktop computers) with internet connectivity. Evaluation sessions were conducted either on-site at the PESO office for administrator respondents, or remotely for jobseeker, employer, and individual respondents via a shared web deployment link.

---

## f. Instruments

The primary research instrument used in this study was a **structured survey questionnaire** designed to evaluate the quality and acceptability of the PESO-Connect platform. The questionnaire was developed based on the **ISO/IEC 25010 Software Quality Model**, which provides a standardized, internationally recognized framework for assessing software product quality across multiple characteristics.

Two (2) sets of instruments were used in the evaluation:

1. **End-User Evaluation Questionnaire** — This instrument was intended for the jobseekers, employers, individuals (homeowners), and PESO administrators who served as respondents. It was used to assess the system's usability, functionality, and overall user satisfaction from the perspective of the end-users.

2. **IT Expert Evaluation Questionnaire** — This instrument was administered to IT experts and was designed to assess the technical quality of the system, including its functional suitability, usability, performance efficiency, security, reliability, and maintainability.

Each instrument was divided into the following sections:

**Section 1: Respondent Profile**
This section collected demographic information including the respondent's name (optional), user role, age, gender, employment status, and level of familiarity with online employment platforms or web-based information systems.

**Section 2: Functional Suitability**
This section assessed whether the system correctly and completely performs its intended functions. Questions covered the multi-step registration process, job posting and application workflow, AI-powered job matching accuracy, real-time messaging, diagnostic worker search, and administrative verification workflow.

**Section 3: Usability**
This section evaluated the ease of use, learnability, and user interface design of the platform. Questions addressed navigation clarity, form layout and step indicators, visual design consistency, responsiveness across devices, and overall user experience.

**Section 4: Performance Efficiency**
This section measured the system's responsiveness and resource utilization, including page load times, registration step transitions, AI matching response speed, and real-time messaging delivery speed.

**Section 5: Security**
This section assessed the respondents' perception of data protection mechanisms, authentication security, role-based access control, and compliance with data privacy standards.

**Section 6: Reliability**
This section evaluated the system's consistency, error handling, and ability to maintain data integrity, such as form data preservation during interruptions, graceful handling of network issues, and consistent system behavior across sessions.

**Section 7: Overall Satisfaction**
This section captured the respondents' general assessment of the PESO-Connect platform and their willingness to recommend or use it as a supplement to or replacement for the existing manual PESO employment service processes.

Each item in Sections 2 through 6 was rated using a **5-point Likert scale** as shown in Table 6.

> **Table 6. Five-Point Likert Scale**
>
> | **Scale** | **Range** | **Verbal Interpretation** |
> |---|---|---|
> | 5 | 4.21 - 5.00 | Strongly Agree / Highly Acceptable |
> | 4 | 3.41 - 4.20 | Agree / Acceptable |
> | 3 | 2.61 - 3.40 | Neutral / Moderately Acceptable |
> | 2 | 1.81 - 2.60 | Disagree / Slightly Acceptable |
> | 1 | 1.00 - 1.80 | Strongly Disagree / Not Acceptable |

The questionnaire was validated for content validity by subject matter experts (IT faculty members and PESO personnel) and pilot-tested with a small group of respondents prior to full deployment to ensure clarity, relevance, and reliability of the instrument items.

---

## g. Data Gathering Procedures

The data gathering process for this study followed a systematic sequence of steps to ensure the ethical collection of reliable and valid feedback from all respondent groups.

**Step 1: Coordination and Approval**
The researchers coordinated with the PESO office of San Carlos City to secure approval for conducting the study. A formal letter of request was submitted to the PESO Manager, outlining the objectives of the research, the scope of respondent participation, the data collection timeline, and the measures taken to protect respondent privacy. Approval was also sought from the college research ethics committee to ensure compliance with ethical research standards.

**Step 2: Preparation of Instruments and System Deployment**
The survey questionnaires were finalized after content validation by subject matter experts and pilot testing. The PESO-Connect platform was deployed to a web-accessible environment, and unique access links were prepared for distribution to respondents.

**Step 3: System Orientation and Demonstration**
Prior to evaluation, the researchers conducted a brief orientation session for each respondent group. The orientation explained the purpose of the PESO-Connect platform, demonstrated its key features, and provided instructions on how to navigate the system according to each user's assigned role. Orientation was conducted on-site for PESO administrators and through guided sessions (in-person or remote) for other respondent groups.

**Step 4: Hands-On System Usage**
Each respondent was given sufficient time to interact with the system according to their assigned role:
- **Jobseekers** completed the 6-step registration process, browsed job listings with AI match scores, submitted sample job applications, and used the messaging feature.
- **Employers** completed the 4-step registration process, posted sample job listings, reviewed applicants with match scores, and communicated via the messaging system.
- **Individuals (Homeowners)** completed the 2-step registration, used the AI diagnostic search to describe service needs and find skilled workers, and initiated messaging with matched workers.
- **PESO Administrators** accessed the administrative dashboard, reviewed pending registrations, examined uploaded documents, and processed verification decisions (approve/reject).
- **IT Experts** explored all modules of the system and evaluated its technical quality across all ISO/IEC 25010 criteria.

**Step 5: Survey Administration**
After completing the hands-on evaluation, each respondent was provided with the appropriate structured survey questionnaire (end-user or IT expert version). The survey was administered either as a printed form for on-site respondents or as a digital form for remote respondents. Respondents were given adequate time to complete the questionnaire and were encouraged to provide honest and candid responses. The researchers were available to clarify any questions about the survey items.

**Step 6: Data Collection and Consolidation**
All completed survey forms were collected, reviewed for completeness, and consolidated into a master dataset for statistical analysis. Responses that were incomplete or did not follow the instructions were excluded from the final dataset to ensure data quality.

---

## h. Statistical Treatment of Data

The following statistical tools were used to analyze and interpret the data gathered from the survey questionnaires administered to the respondents:

### 1. Frequency and Percentage Distribution

**Frequency and percentage distribution** were used to summarize the demographic profile of the respondents and to present the distribution of responses for each survey item across the Likert scale categories.

**Formula:**

$$P = \frac{f}{N} \times 100$$

Where:
- *P* = percentage
- *f* = frequency of a specific response or category
- *N* = total number of respondents

### 2. Weighted Mean

The **weighted mean** was used to determine the average rating for each survey item and to compute the overall assessment of the system across the evaluation criteria (functional suitability, usability, performance efficiency, security, and reliability).

**Formula:**

$$WM = \frac{(f_5 \times 5) + (f_4 \times 4) + (f_3 \times 3) + (f_2 \times 2) + (f_1 \times 1)}{N}$$

Where:
- *WM* = weighted mean
- *f_5* = frequency of respondents who answered "Strongly Agree" (5)
- *f_4* = frequency of respondents who answered "Agree" (4)
- *f_3* = frequency of respondents who answered "Neutral" (3)
- *f_2* = frequency of respondents who answered "Disagree" (2)
- *f_1* = frequency of respondents who answered "Strongly Disagree" (1)
- *N* = total number of respondents

The computed weighted mean values were interpreted using the scale presented in Table 7.

> **Table 7. Weighted Mean Interpretation Scale**
>
> | **Range** | **Verbal Interpretation** |
> |---|---|
> | 4.21 - 5.00 | Strongly Agree / Highly Acceptable |
> | 3.41 - 4.20 | Agree / Acceptable |
> | 2.61 - 3.40 | Neutral / Moderately Acceptable |
> | 1.81 - 2.60 | Disagree / Slightly Acceptable |
> | 1.00 - 1.80 | Strongly Disagree / Not Acceptable |

### 3. Standard Deviation

The **standard deviation** was computed to measure the degree of variability or dispersion in the respondents' ratings for each survey item. A lower standard deviation indicates greater consensus among respondents, while a higher value suggests varied opinions.

**Formula:**

$$SD = \sqrt{\frac{\sum_{i=1}^{N}(x_i - \bar{x})^2}{N - 1}}$$

Where:
- *SD* = standard deviation
- *x_i* = individual response value
- *x&#772;* = mean of all responses for the item
- *N* = total number of respondents

### 4. Composite Mean

The **composite mean** was used to determine the overall rating for each evaluation criterion by averaging the weighted means of all items within that section. This provided a summary measure for each ISO/IEC 25010 quality characteristic: functional suitability, usability, performance efficiency, security, reliability, and overall satisfaction.

**Formula:**

$$CM = \frac{\sum_{j=1}^{k} WM_j}{k}$$

Where:
- *CM* = composite mean
- *WM_j* = weighted mean of the *j*-th item in the section
- *k* = total number of items in the section

These statistical treatments enabled the researchers to quantify user perceptions, identify the strengths and areas for improvement of the PESO-Connect platform, and draw evidence-based conclusions regarding the acceptability and effectiveness of the system as evaluated against the ISO/IEC 25010 software quality model.

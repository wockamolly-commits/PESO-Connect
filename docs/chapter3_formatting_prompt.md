# Formatting and Diagram Generation Prompt for Chapter 3: Methodology

Copy and paste the prompt below into your AI tool (e.g., ChatGPT with DALL·E, Google Gemini) along with the content from `Chapter_3_Methodology.md`.

---

## PROMPT:

```
You are an expert academic document formatter and technical diagram designer. I need you to do TWO things:

═══════════════════════════════════════════════════
PART 1: FORMAT THE DOCUMENT
═══════════════════════════════════════════════════

Format the following Chapter 3: Methodology text into a professional academic document that strictly follows the formatting standards of a Philippine BSIT/IT Capstone Research Paper from Central Philippines State University (CPSU).

Apply the following formatting rules EXACTLY:

─── PAGE SETUP ───
• Paper Size: A4 (8.27" × 11.69") or Short Bond Paper (8.5" × 11")
• Margins: 1.5 inches LEFT, 1 inch TOP, RIGHT, and BOTTOM
• Orientation: Portrait
• No header
• Page number at bottom center, Times New Roman 11pt

─── CHAPTER TITLE ───
• "CHAPTER III" — centered, bold, ALL CAPS, Times New Roman 14pt
• "METHODOLOGY" — centered, bold, ALL CAPS, Times New Roman 14pt, directly below
• One blank line after the title before the introductory paragraph

─── INTRODUCTORY PARAGRAPH ───
• Normal text, Times New Roman 12pt, justified alignment
• 0.5-inch first-line indent
• 1.5 line spacing

─── MAIN SECTION HEADINGS (a., b., c., d., e., f., g., h.) ───
• Lowercase letter followed by a period and the section title
  (e.g., "a. Design Method", "b. Flow of the Study")
• Bold, Times New Roman 12pt
• Left-aligned (NO indent)
• One blank line BEFORE and AFTER the heading
• Do NOT use numbers like 3.1, 3.2 — use ONLY lowercase letters: a, b, c, d, e, f, g, h

─── SUB-SECTION HEADINGS (c.1., c.2., etc.) ───
• Bold, Times New Roman 12pt
• Left-aligned
• One blank line before the sub-heading

─── BODY TEXT ───
• Times New Roman 12pt
• Justified alignment
• 1.5 line spacing
• 0.5-inch first-line indent for each NEW paragraph
• No extra spacing between paragraphs within the same section

─── BULLET POINTS / NUMBERED LISTS ───
• Hanging indent: 0.5-inch left indent, 0.25-inch hanging
• Times New Roman 12pt, 1.5 line spacing
• Bold the item labels (e.g., "Sprint 1: Authentication and Multi-Role Registration.")
• After the bold label, continue with normal weight text for the description

─── TABLES ───
• Table label ABOVE the table: bold, left-aligned or centered, Times New Roman 12pt
  (Format: "Table 1. Software Requirements (Minimum)")
• Table borders: All borders visible, 1pt black solid lines
• Header row: Bold, centered, Times New Roman 11pt, light gray background (#D9D9D9)
• Data cells: Times New Roman 11pt, left-aligned, with cell padding
• Table width: 100% of the text area
• Single spacing within table cells
• One blank line before the table label and after the table

─── FIGURES / DIAGRAMS ───
• Figure caption BELOW the figure: centered, bold, Times New Roman 11pt
  (Format: "Figure 1. Agile Development Model")
• One blank line before the figure and after the caption
• Figures should be centered on the page
• Bold the word "Figure" and the number; the title after the period can be normal weight or bold

─── FORMULAS / EQUATIONS ───
• Centered on the page
• Use equation editor (or formatted text) for variables and subscripts
• Variable definitions listed below using "Where:" followed by an indented definition list
• One blank line before and after the formula block

─── LIKERT SCALE TABLE ───
• Include columns: Scale | Range | Verbal Interpretation
• Header row: Bold, centered, gray background (#D9D9D9)
• Data: Centered in all cells
• Present as a formal numbered table (e.g., "Table 6. Five-Point Likert Scale")

─── SECTION SEPARATORS ───
• Do NOT use horizontal lines or rules between sections
• Use only blank line spacing to separate sections

─── SPECIAL FORMATTING RULES ───
• Where the text says "[Figure X. ...]" — leave a FULL-PAGE-WIDTH placeholder box (light gray, with the caption text centered inside) so the user knows where to insert the diagram
• Where the text says "[Table X. ...]" — format as a proper table with borders
• References to Philippine laws (e.g., "Data Privacy Act of 2012 (Republic Act No. 10173)") should be italicized
• The system name "PESO-Connect" should be bold-italicized on first mention in each section, then bold on subsequent mentions
• All technical terms (e.g., "Supabase", "Groq API", "Resend") should appear in regular weight — do NOT bold them unless they are part of a heading or label

─── EXACT SECTION ORDER ───
a. Design Method
b. Flow of the Study
c. Functional and Non-Functional Requirements
   c.1. Software Requirements
   c.2. Hardware Requirements
   c.3. System/Application Flowchart
   c.4. System Architecture
   c.5. Context Diagram
   c.6. Data Flow Diagram (DFD Level 1)
   c.7. Entity Relationship Diagram (ERD)
   c.8. Use Case Diagram
   c.9. Functional Requirements Summary
   c.10. Non-Functional Requirements Summary
d. Respondents of the Study
e. Respondents' Environment
f. Instruments
g. Data Gathering Procedures
h. Statistical Treatment of Data


═══════════════════════════════════════════════════
PART 2: GENERATE ALL DIAGRAMS AND FIGURES
═══════════════════════════════════════════════════

After formatting the document, generate the following diagrams as clean, professional, academic-quality images. Each diagram should use a white background, black/dark gray lines and text, and a clean sans-serif font (Arial or similar). Do NOT use 3D effects or excessive colors. Use a minimal, professional color palette (white, light gray, dark blue #2C3E50, and accent blue #3498DB).

Generate the following figures:

─── Figure 1. Agile Development Model ───
Create a circular/cyclical diagram showing the six (6) Agile phases arranged in a clockwise loop:
1. Requirements (icon: checklist)
2. Design (icon: pencil/ruler)
3. Development (icon: code brackets)
4. Testing (icon: bug/checkmark)
5. Deployment (icon: rocket/cloud)
6. Review (icon: magnifying glass)
• Place arrows connecting each phase in sequence, with the last phase (Review) looping back to the first (Requirements).
• In the center of the circle, place the text "AGILE SDLC" or "Iterative Sprint Cycle".
• Style: Clean, flat design. Each phase in a rounded rectangle or circle with a subtle color fill.
• Size: Landscape orientation, approximately 6 inches wide × 4 inches tall.

─── Figure 2. Flow of the Study (IPO Model) ───
Create a three-column diagram showing the Input-Process-Output model:
• LEFT column (labeled "INPUT"):
  1. Identified limitations of the existing manual employment service processes of PESO San Carlos City
  2. Needs and requirements of jobseekers, employers, individuals, and PESO administrators
  3. Review of related literature and existing employment platforms
  4. ISO/IEC 25010 software quality evaluation criteria
• CENTER column (labeled "PROCESS"):
  1. Letter to PESO San Carlos City requesting permission to conduct the study
  2. Agile Development Methodology (iterative sprints)
  3. System design, development, and testing
  4. Evaluation using ISO/IEC 25010-based survey instrument
  5. Statistical analysis of survey data using weighted mean, frequency and percentage distribution, standard deviation, and composite mean
• RIGHT column (labeled "OUTPUT"):
  – PESO-Connect: A Web-Based Employment Platform for the Public Employment Service Office of San Carlos City
• Use arrows flowing from INPUT → PROCESS → OUTPUT.
• Each column should be a rounded rectangle with a different subtle shade.
• Size: Landscape, approximately 7 inches wide × 5 inches tall.

─── Figure 3. System/Application Flowchart ───
Create a standard flowchart using proper flowchart symbols:
• Oval (START) → Landing Page → Decision: "Has Account?" 
  – Yes → Login → Decision: "What Role?"
    ○ Jobseeker → Dashboard → Browse Jobs → View AI Match Score → Apply → Track Applications → Messages
    ○ Employer → Dashboard → Post Job → Manage Listings → Review Applicants → Accept/Reject → Messages
    ○ Individual → Dashboard → AI Diagnostic Search → View Workers → Messages
    ○ Admin → Admin Dashboard → Review Registrations → Examine Documents → Approve/Reject
  – No → Register → Decision: "Select Role"
    ○ Jobseeker → 6-Step Registration
    ○ Employer → 4-Step Registration
    ○ Individual → 2-Step Registration
• All roles → Profile Management → Settings → Logout → Oval (END)
• Use standard symbols: Oval (terminals), Rectangle (process), Diamond (decision), Parallelogram (I/O).
• Size: Portrait orientation, approximately 6 inches wide × 8 inches tall.

─── Figure 4. System Architecture Diagram ───
Create a layered architecture diagram showing:
• TOP LAYER: "Users" — four icons representing Jobseeker, Employer, Individual, Admin, each labeled, accessing via "Web Browser (Chrome, Firefox, Edge, Safari)"
• MIDDLE LAYER: "Presentation Layer" — box labeled "React 18 + Vite + Tailwind CSS (Single Page Application)" with "React Router DOM" and "AuthContext Provider" sub-components
• BOTTOM LAYER: "Backend Services" — three separate boxes:
  1. "Supabase" — sub-labels: "Auth", "PostgreSQL Database (RLS)", "Realtime Subscriptions"
  2. "Groq API" — sub-label: "Llama 3.3 70B (AI Job Matching & Diagnostic Search)"
  3. "Resend" — sub-label: "Transactional Email Service"
• Draw arrows showing data flow between layers.
• Size: Landscape, approximately 7 inches wide × 5 inches tall.

─── Figure 5. Context Diagram ───
Create a standard DFD Level 0 (context diagram):
• CENTER: Large circle or rounded rectangle labeled "PESO-Connect System"
• FOUR external entities (rectangles) positioned around the center:
  1. Jobseeker (top-left)
  2. Employer (top-right)
  3. Individual/Homeowner (bottom-left)
  4. PESO Administrator (bottom-right)
• Draw labeled arrows (data flows) between each entity and the system:
  – Jobseeker → System: Registration data, Profile data, Job applications
  – System → Jobseeker: AI match scores, Application status, Messages
  – Employer → System: Registration data, Job postings, Applicant decisions
  – System → Employer: Applicant list, Match scores, Messages
  – Individual → System: Registration data, Service requests
  – System → Individual: Matched workers list, Messages
  – Admin → System: Verification decisions
  – System → Admin: Pending registrations, User data, Documents
• Size: Landscape, approximately 7 inches wide × 5 inches tall.

─── Figure 6. Data Flow Diagram (DFD Level 1) ───
Create a DFD Level 1 with circles for processes, rectangles for external entities, and open-ended rectangles for data stores:
• Processes (circles):
  1.0 User Registration & Authentication
  2.0 Profile Management
  3.0 Job Posting Management
  4.0 Job Application & AI Matching
  5.0 AI Diagnostic Worker Search
  6.0 Real-Time Messaging
  7.0 Admin Verification
• Data Stores (open rectangles):
  D1: Users Database
  D2: Jobseeker Profiles
  D3: Employer Profiles
  D4: Individual Profiles
  D5: Job Postings
  D6: Applications
  D7: Messages/Conversations
• External Entities: Jobseeker, Employer, Individual, Admin, Groq API, Resend
• Draw labeled data flow arrows connecting entities → processes → data stores.
• Size: Landscape, approximately 8 inches wide × 6 inches tall.

─── Figure 7. Entity Relationship Diagram (ERD) ───
Create an ERD using standard notation (Chen or Crow's Foot) showing:
• Entity: users (id PK, email, role, name, is_verified, registration_complete, registration_step, profile_photo, created_at, updated_at)
• Entity: jobseeker_profiles (id PK/FK, full_name, date_of_birth, barangay, city, province, mobile_number, skills[], work_experiences, certifications[], highest_education, resume_url, jobseeker_status, created_at, updated_at)
• Entity: employer_profiles (id PK/FK, company_name, employer_type, business_reg_number, business_address, representative_name, contact_email, gov_id_url, business_permit_url, employer_status, created_at, updated_at)
• Entity: individual_profiles (id PK/FK, full_name, contact_number, barangay, city, province, bio, service_preferences[], individual_status, created_at, updated_at)
• Relationships: users ──(1:1)── jobseeker_profiles, users ──(1:1)── employer_profiles, users ──(1:1)── individual_profiles
• Size: Landscape, approximately 8 inches wide × 5 inches tall.

─── Figure 8. Use Case Diagram ───
Create a UML Use Case Diagram:
• System boundary: Large rectangle labeled "PESO-Connect"
• Actors (stick figures) outside the boundary:
  – Jobseeker (left)
  – Employer (left, below Jobseeker)
  – Individual (right)
  – PESO Administrator (right, below Individual)
• Use Cases (ovals) inside the boundary:
  – Register Account, Login, Logout, Edit Profile, Manage Settings (shared by all)
  – Browse Jobs, View AI Match Score, Apply for Job, Track Applications (Jobseeker)
  – Create Job, Manage Listings, Review Applicants, Accept/Reject (Employer)
  – AI Diagnostic Search, Browse Workers (Individual)
  – View Dashboard, Review Registrations, Examine Documents, Approve/Reject Users (Admin)
  – Send/Receive Messages (shared by all)
• Draw association lines from each actor to their use cases.
• Use <<include>> and <<extend>> relationships where appropriate.
• Size: Portrait or Landscape, approximately 7 inches wide × 8 inches tall.

─── Figure 9. Map of San Carlos City, Negros Occidental ───
Generate a clean, minimal map showing:
• The island of Negros in the Philippines
• Negros Occidental province highlighted
• San Carlos City marked with a pin/marker
• Label: "San Carlos City" with a subtitle "Negros Occidental, Philippines"
• Inset: Small Philippine map in the corner showing Negros island location
• Style: Clean cartographic style, light blue ocean, light green/beige land, dark outlines
• Size: Portrait, approximately 5 inches wide × 5 inches tall.


═══════════════════════════════════════════════════
OUTPUT INSTRUCTIONS
═══════════════════════════════════════════════════

1. First, output the FULLY FORMATTED document as a downloadable .docx file (Microsoft Word format).
2. Then, generate EACH of the 9 figures as separate, high-resolution images.
3. Name each image file clearly: "Figure_1_Agile_Model.png", "Figure_2_IPO_Model.png", etc.
4. All diagrams should be:
   – Clean, professional, academic quality
   – White background with dark text
   – Minimal color palette (white, light gray, dark blue, accent blue)
   – No 3D effects, drop shadows, or decorative elements
   – Legible at print size (300 DPI minimum)
   – Text should be readable even when printed on standard paper

Here is the content to format:

[PASTE YOUR CHAPTER 3 CONTENT FROM Chapter_3_Methodology.md HERE]
```

---

## HOW TO USE THIS PROMPT:

### Step 1: Copy the Prompt
Copy the entire prompt above (everything inside the triple-backtick code block).

### Step 2: Paste into Your AI Tool
Open ChatGPT (GPT-4 with DALL·E) or Google Gemini and paste the prompt.

### Step 3: Attach Your Content
Replace `[PASTE YOUR CHAPTER 3 CONTENT HERE]` with the full text from your `Chapter_3_Methodology.md` file.

### Step 4: Generate
- The AI will first output a formatted `.docx` file.
- Then it will generate each diagram one by one.

### Step 5: Assemble
1. Download the `.docx` file.
2. Download each generated diagram image.
3. Open the Word document and insert each diagram into its corresponding placeholder.
4. Resize each diagram to fit the page width (approximately 5–7 inches).
5. Ensure the figure caption is directly below each diagram.

---

## TIPS FOR BEST RESULTS:

> **ChatGPT (Recommended)**
> - Use GPT-4 with DALL·E enabled.
> - Ask it to "generate the document as a downloadable .docx file" first.
> - Then ask it to generate each figure one at a time: "Now generate Figure 1: Agile Development Model".
> - If a diagram has too much text, ask it to simplify or split into sub-diagrams.

> **Google Gemini**
> - Gemini can generate the formatted text but may not produce downloadable .docx files directly.
> - Copy the output into Google Docs and apply formatting manually.
> - For diagrams, use Gemini's image generation or switch to a diagramming tool like draw.io.

> **Alternative Diagram Tools (if AI-generated images aren't clean enough)**
> - **draw.io / diagrams.net** (free) — Best for Flowcharts, DFDs, ERDs, Context Diagrams, Use Case Diagrams
> - **Lucidchart** — Professional UML and system architecture diagrams
> - **Canva** — Good for the IPO model and Agile cycle diagram
> - **dbdiagram.io** — Specialized for ERD generation
> - Use the detailed specifications in Part 2 of the prompt as your guide for content and labels.

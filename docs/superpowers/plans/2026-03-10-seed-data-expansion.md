# Seed Data Expansion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `scripts/seed-users.js` with more users, 10 job postings, ~10 applications, and 4 conversations with messages.

**Architecture:** Single-file update to the existing seed script. New data arrays for job postings, applications, conversations, and messages. Extended `seed()` function creates resources in FK-dependency order: users → jobs → applications → conversations → messages. User IDs tracked by email at runtime for FK wiring.

**Tech Stack:** Node.js, Supabase Admin API, ES modules

---

## Chunk 1: Expand Users and Add Job/Application/Conversation Data

### Task 1: Add New Users to Existing Arrays

**Files:**
- Modify: `scripts/seed-users.js`

- [ ] **Step 1: Add 2 diagnostic jobseekers to `diagnosticJobseekers` array**

Append after the `abandoned.reg@test.com` entry:

```js
{
    // Overqualified — post-grad, 10+ years experience, applying for entry-level
    email: 'overqualified.worker@test.com',
    base: { name: 'Fernando Castillo', is_verified: true, registration_complete: true },
    profile: {
        full_name: 'Fernando Miguel Castillo',
        date_of_birth: '1982-03-22',
        barangay: 'Guadalupe',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171113006',
        preferred_contact_method: 'email',
        preferred_job_type: ['full-time', 'part-time'],
        preferred_job_location: 'San Carlos City',
        expected_salary_min: '12000',
        expected_salary_max: '18000',
        willing_to_relocate: 'no',
        highest_education: 'post-graduate',
        school_name: 'Ateneo de Manila University',
        course_or_field: 'MBA - Business Administration',
        year_graduated: '2010',
        skills: ['Project Management', 'Financial Analysis', 'Strategic Planning', 'Team Leadership', 'MS Office', 'Data Analysis'],
        work_experiences: [
            { company: 'Ayala Corporation', position: 'Senior Project Manager', duration: '2010-2018', description: 'Managed large-scale infrastructure projects' },
            { company: 'San Carlos LGU', position: 'Planning Officer', duration: '2018-2023', description: 'Local development planning and project oversight' },
            { company: 'Currently unemployed', position: '', duration: '2024-present', description: 'Relocated back to San Carlos, seeking any available work' }
        ],
        certifications: ['PMP Certified', 'Six Sigma Green Belt'],
        terms_accepted: true,
        data_processing_consent: true,
        peso_verification_consent: true,
        info_accuracy_confirmation: true,
        gender: 'male',
        civil_status: 'married',
        is_pwd: false,
        languages: [{ language: 'Filipino', proficiency: 'native' }, { language: 'English', proficiency: 'fluent' }],
    }
},
{
    // Career changer — stopped at step 4, has personal info and preferences but no education/skills
    email: 'midreg.changer@test.com',
    base: { name: 'Diane Flores', is_verified: false, registration_complete: false, registration_step: 4 },
    profile: {
        full_name: 'Diane Marie Flores',
        date_of_birth: '1993-11-08',
        barangay: 'Punao',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171113007',
        preferred_contact_method: 'email',
        preferred_job_type: ['full-time', 'contract'],
        preferred_job_location: 'San Carlos City',
        expected_salary_min: '15000',
        expected_salary_max: '22000',
        willing_to_relocate: 'yes',
        // Stopped at step 4 — no education, skills, or work experience filled in yet
        gender: 'female',
        civil_status: 'single',
        is_pwd: false,
    }
},
```

- [ ] **Step 2: Add 1 employer to `employers` array**

Append after Crystal Sugar:

```js
{
    email: 'orders@golden-grain-bakery.test.com',
    base: { name: 'Golden Grain Bakery', is_verified: false, registration_complete: true },
    profile: {
        company_name: 'Golden Grain Bakery & Food Products',
        employer_type: 'small_business',
        business_reg_number: 'DTI-NOC-2020-05678',
        business_address: 'Brgy. Rizal, San Carlos City, Negros Occidental',
        nature_of_business: 'Food Manufacturing / Bakery',
        representative_name: 'Carmen Diaz',
        representative_position: 'Owner',
        contact_email: 'orders@golden-grain-bakery.test.com',
        contact_number: '09171111005',
        preferred_contact_method: 'phone',
        terms_accepted: true,
        peso_consent: true,
        labor_compliance: true,
        employer_status: 'pending',
        company_description: 'Local bakery producing bread, pastries, and kakanin for San Carlos City and nearby towns.',
        company_size: '11-50',
        year_established: '2020',
    }
},
```

- [ ] **Step 3: Add 2 individuals to `individuals` array**

Append after Cynthia Ramos:

```js
{
    email: 'kevin.bautista@test.com',
    base: { name: 'Kevin Bautista', is_verified: true, registration_complete: true },
    profile: {
        full_name: 'Kevin Jay Bautista',
        contact_number: '09171112004',
        individual_status: 'active',
        barangay: 'Buluangan',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        bio: 'College student exploring career options before graduation. Interested in IT and business fields.',
        service_preferences: ['career_counseling', 'skills_training'],
    }
},
{
    email: 'marilyn.delos-reyes@test.com',
    base: { name: 'Marilyn Delos Reyes', is_verified: true, registration_complete: true },
    profile: {
        full_name: 'Marilyn Cruz Delos Reyes',
        contact_number: '09171112005',
        individual_status: 'active',
        barangay: 'Codcod',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        bio: 'OFW returnee from Saudi Arabia. Looking for PESO reintegration programs and livelihood assistance.',
        service_preferences: ['livelihood_programs', 'career_counseling', 'skills_training'],
    }
},
```

- [ ] **Step 4: Commit expanded users**

```bash
git add scripts/seed-users.js
git commit -m "feat: add more seed users — 2 diagnostic jobseekers, 1 employer, 2 individuals"
```

---

### Task 2: Add Job Postings Data

**Files:**
- Modify: `scripts/seed-users.js`

- [ ] **Step 1: Add `jobPostings` array after the `diagnosticJobseekers` array**

Each posting references an employer by email. The seed function will resolve to actual UUIDs at runtime.

```js
const jobPostings = [
    // San Carlos Cooperative (2)
    {
        employer_email: 'hr@sancarloscoop.test.com',
        title: 'Loan Officer',
        description: 'Process loan applications, assess borrower creditworthiness, and manage member accounts. Must have strong interpersonal skills and attention to detail.',
        category: 'Financial Services',
        type: 'full-time',
        location: 'San Carlos City, Negros Occidental',
        salary_min: 18000,
        salary_max: 25000,
        experience_level: '1-3 years',
        vacancies: 2,
        requirements: ['BS Accountancy or Business Administration', 'Customer service experience', 'Computer literate'],
        education_level: 'college',
        status: 'open',
    },
    {
        employer_email: 'hr@sancarloscoop.test.com',
        title: 'Bookkeeper',
        description: 'Maintain financial records, process transactions, and prepare monthly reports. Knowledge of cooperative accounting standards preferred.',
        category: 'Financial Services',
        type: 'full-time',
        location: 'San Carlos City, Negros Occidental',
        salary_min: 15000,
        salary_max: 20000,
        experience_level: '0-1 years',
        vacancies: 1,
        requirements: ['BS Accountancy or related course', 'MS Office proficiency', 'Attention to detail'],
        education_level: 'college',
        status: 'open',
    },
    // PESO San Carlos (2)
    {
        employer_email: 'recruitment@peso-sancarlos.test.com',
        title: 'Administrative Aide',
        description: 'Provide administrative support to the PESO office including document management, client assistance, and data encoding.',
        category: 'Government',
        type: 'full-time',
        location: 'San Carlos City, Negros Occidental',
        salary_min: 12000,
        salary_max: 16000,
        experience_level: '0-1 years',
        vacancies: 1,
        requirements: ['High school graduate or higher', 'Computer literate', 'Good communication skills'],
        education_level: 'high-school',
        status: 'open',
    },
    {
        employer_email: 'recruitment@peso-sancarlos.test.com',
        title: 'Community Facilitator',
        description: 'Facilitate livelihood and skills training programs in barangays. Conduct outreach activities and coordinate with partner agencies.',
        category: 'Government',
        type: 'contract',
        location: 'San Carlos City, Negros Occidental',
        salary_min: 15000,
        salary_max: 20000,
        experience_level: '1-3 years',
        vacancies: 3,
        requirements: ['College graduate', 'Community development experience', 'Willing to travel to barangays'],
        education_level: 'college',
        status: 'open',
    },
    // Greenfields BPO (3)
    {
        employer_email: 'hiring@greenfields-bpo.test.com',
        title: 'Customer Service Representative',
        description: 'Handle inbound customer calls for international healthcare account. Provide accurate information and resolve customer concerns.',
        category: 'BPO',
        type: 'full-time',
        location: 'San Carlos City, Negros Occidental',
        salary_min: 18000,
        salary_max: 25000,
        experience_level: '0-1 years',
        vacancies: 15,
        requirements: ['College level or graduate', 'Good English communication', 'Willing to work shifting schedules'],
        education_level: 'college',
        status: 'open',
    },
    {
        employer_email: 'hiring@greenfields-bpo.test.com',
        title: 'Data Entry Specialist',
        description: 'Encode and verify data from medical records and insurance documents. High accuracy and typing speed required.',
        category: 'BPO',
        type: 'full-time',
        location: 'San Carlos City, Negros Occidental',
        salary_min: 15000,
        salary_max: 20000,
        experience_level: '0-1 years',
        vacancies: 10,
        requirements: ['High school graduate or higher', 'Typing speed 40+ WPM', 'Attention to detail'],
        education_level: 'high-school',
        status: 'open',
    },
    {
        employer_email: 'hiring@greenfields-bpo.test.com',
        title: 'Team Leader',
        description: 'Supervise a team of 15-20 CSRs. Monitor performance metrics, conduct coaching sessions, and ensure SLA compliance.',
        category: 'BPO',
        type: 'full-time',
        location: 'San Carlos City, Negros Occidental',
        salary_min: 30000,
        salary_max: 45000,
        experience_level: '3-5 years',
        vacancies: 2,
        requirements: ['College graduate', '3+ years BPO experience', 'Leadership experience', 'Excellent English'],
        education_level: 'college',
        status: 'open',
    },
    // Crystal Sugar Milling (3)
    {
        employer_email: 'jobs@crystal-sugar.test.com',
        title: 'Heavy Equipment Operator',
        description: 'Operate bulldozers, loaders, and trucks for sugar milling operations. Must have valid operator license.',
        category: 'Skilled Trades',
        type: 'full-time',
        location: 'Brgy. Punao, San Carlos City, Negros Occidental',
        salary_min: 15000,
        salary_max: 22000,
        experience_level: '1-3 years',
        vacancies: 3,
        requirements: ['TESDA NC II Heavy Equipment Operation', 'Valid driver license', 'Physically fit'],
        education_level: 'vocational',
        status: 'open',
    },
    {
        employer_email: 'jobs@crystal-sugar.test.com',
        title: 'Electrician',
        description: 'Maintain and repair electrical systems in the milling plant. Troubleshoot equipment failures and perform preventive maintenance.',
        category: 'Skilled Trades',
        type: 'full-time',
        location: 'Brgy. Punao, San Carlos City, Negros Occidental',
        salary_min: 14000,
        salary_max: 20000,
        experience_level: '1-3 years',
        vacancies: 2,
        requirements: ['TESDA NC II Electrical Installation', 'Industrial electrical experience preferred'],
        education_level: 'vocational',
        status: 'filled',
    },
    {
        employer_email: 'jobs@crystal-sugar.test.com',
        title: 'Seasonal Farm Worker',
        description: 'Assist with sugarcane harvesting and processing during milling season (October-April). Physical work in field conditions.',
        category: 'Agriculture',
        type: 'temporary',
        location: 'Brgy. Punao, San Carlos City, Negros Occidental',
        salary_min: 8000,
        salary_max: 12000,
        experience_level: '0-1 years',
        vacancies: 50,
        requirements: ['Physically fit', '18 years or older', 'Willing to work outdoors'],
        education_level: 'high-school',
        deadline: '2026-04-30',
        status: 'open',
    },
]
```

- [ ] **Step 2: Commit job postings data**

```bash
git add scripts/seed-users.js
git commit -m "feat: add 10 job postings to seed script"
```

---

### Task 3: Add Applications Data

**Files:**
- Modify: `scripts/seed-users.js`

- [ ] **Step 1: Add `applications` array after `jobPostings`**

References use email + job title. Resolved to UUIDs at runtime.

```js
const applications = [
    { applicant_email: 'maria.santos@test.com', job_title: 'Customer Service Representative', status: 'pending' },
    { applicant_email: 'anna.reyes@test.com', job_title: 'Bookkeeper', status: 'shortlisted' },
    { applicant_email: 'pedro.mendoza@test.com', job_title: 'Heavy Equipment Operator', status: 'pending' },
    { applicant_email: 'mark.aquino@test.com', job_title: 'Electrician', status: 'hired' },
    { applicant_email: 'grace.villanueva@test.com', job_title: 'Team Leader', status: 'rejected' },
    { applicant_email: 'rosa.lim@test.com', job_title: 'Loan Officer', status: 'shortlisted' },
    { applicant_email: 'fresh.grad@test.com', job_title: 'Customer Service Representative', status: 'pending' },
    { applicant_email: 'mismatch.nurse@test.com', job_title: 'Customer Service Representative', status: 'pending' },
    { applicant_email: 'mismatch.itfarm@test.com', job_title: 'Seasonal Farm Worker', status: 'pending' },
    { applicant_email: 'juan.delacruz@test.com', job_title: 'Electrician', status: 'shortlisted' },
]
```

- [ ] **Step 2: Commit applications data**

```bash
git add scripts/seed-users.js
git commit -m "feat: add 10 applications to seed script"
```

---

### Task 4: Add Conversations and Messages Data

**Files:**
- Modify: `scripts/seed-users.js`

- [ ] **Step 1: Add `seedConversations` array after `applications`**

Each conversation references two user emails. Messages are nested.

```js
const seedConversations = [
    {
        participants: ['mark.aquino@test.com', 'jobs@crystal-sugar.test.com'],
        job_title: 'Electrician',
        messages: [
            { sender: 'jobs@crystal-sugar.test.com', text: 'Good day! We reviewed your application for the Electrician position and would like to inform you that you have been hired. Congratulations!' },
            { sender: 'mark.aquino@test.com', text: 'Thank you so much! When do I start? Do I need to bring any documents?' },
            { sender: 'jobs@crystal-sugar.test.com', text: 'You can start on Monday. Please bring your TESDA certificate, valid ID, and 2x2 photos. Report to the HR office at 8:00 AM.' },
            { sender: 'mark.aquino@test.com', text: 'Noted po. I will be there. Thank you!' },
        ]
    },
    {
        participants: ['anna.reyes@test.com', 'hr@sancarloscoop.test.com'],
        job_title: 'Bookkeeper',
        messages: [
            { sender: 'hr@sancarloscoop.test.com', text: 'Hi Anna, your application for Bookkeeper has been shortlisted. Are you available for an interview this week?' },
            { sender: 'anna.reyes@test.com', text: 'Yes po, I am available any day this week. What time works best?' },
            { sender: 'hr@sancarloscoop.test.com', text: 'How about Wednesday at 2:00 PM at our main office in Brgy. Rizal? Please bring your resume and transcript of records.' },
        ]
    },
    {
        participants: ['rosa.lim@test.com', 'hr@sancarloscoop.test.com'],
        job_title: 'Loan Officer',
        messages: [
            { sender: 'hr@sancarloscoop.test.com', text: 'Good day Ms. Lim! You have been shortlisted for the Loan Officer position. Can we schedule an interview?' },
            { sender: 'rosa.lim@test.com', text: 'Good day! Yes, I would love to. I am available on weekdays after 5 PM since I still have my current job.' },
        ]
    },
    {
        participants: ['maria.santos@test.com', 'hiring@greenfields-bpo.test.com'],
        job_title: 'Customer Service Representative',
        messages: [
            { sender: 'hiring@greenfields-bpo.test.com', text: 'Hi Maria! We received your application for CSR. Just want to confirm — are you comfortable with night shift schedules?' },
            { sender: 'maria.santos@test.com', text: 'Hi! Yes, I am willing to work night shifts. I have flexible schedule since I am freelancing right now.' },
            { sender: 'hiring@greenfields-bpo.test.com', text: 'Great! We will review your application further and get back to you soon. Thank you!' },
        ]
    },
]
```

- [ ] **Step 2: Commit conversations/messages data**

```bash
git add scripts/seed-users.js
git commit -m "feat: add 4 conversations with messages to seed script"
```

---

### Task 5: Extend seed() Function

**Files:**
- Modify: `scripts/seed-users.js`

- [ ] **Step 1: Add ID tracking map**

After `let skipped = 0`, add:

```js
const userIdByEmail = {} // track created user IDs for FK wiring
```

Update every user creation loop to store the ID:

```js
const id = await createUser(...)
if (id) {
    console.log(`  OK ${email} (${id})`)
    userIdByEmail[email] = id
    created++
}
```

- [ ] **Step 2: Add job posting seeding after users**

```js
// Seed job postings
console.log('\n--- Job Postings ---')
const jobIdByTitle = {}
for (const job of jobPostings) {
    const employerId = userIdByEmail[job.employer_email]
    if (!employerId) {
        console.log(`  SKIP job "${job.title}" — employer ${job.employer_email} not found`)
        continue
    }

    // Look up employer name from base data
    const employer = [...employers].find(e => e.email === job.employer_email)
    const employerName = employer?.base?.name || ''

    const { data, error } = await supabase
        .from('job_postings')
        .insert({
            employer_id: employerId,
            employer_name: employerName,
            title: job.title,
            description: job.description,
            category: job.category,
            type: job.type,
            location: job.location,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            salary_range: `${job.salary_min}-${job.salary_max}`,
            experience_level: job.experience_level,
            vacancies: job.vacancies,
            requirements: job.requirements,
            education_level: job.education_level,
            deadline: job.deadline || null,
            status: job.status,
        })
        .select('id')
        .single()

    if (error) {
        console.warn(`  WARN job "${job.title}": ${error.message}`)
    } else {
        jobIdByTitle[job.title] = data.id
        console.log(`  OK "${job.title}" (${data.id})`)
    }
}
```

- [ ] **Step 3: Add application seeding after jobs**

```js
// Seed applications
console.log('\n--- Applications ---')
for (const app of applications) {
    const userId = userIdByEmail[app.applicant_email]
    const jobId = jobIdByTitle[app.job_title]
    if (!userId || !jobId) {
        console.log(`  SKIP app ${app.applicant_email} → "${app.job_title}" — missing user or job`)
        continue
    }

    // Look up applicant data
    const allJobseekers = [...jobseekers, ...diagnosticJobseekers]
    const applicant = allJobseekers.find(js => js.email === app.applicant_email)

    const { error } = await supabase
        .from('applications')
        .upsert({
            job_id: jobId,
            job_title: app.job_title,
            user_id: userId,
            applicant_name: applicant?.profile?.full_name || applicant?.base?.name || '',
            applicant_email: app.applicant_email,
            applicant_skills: applicant?.profile?.skills || [],
            status: app.status,
        }, { onConflict: 'job_id,user_id' })

    if (error) {
        console.warn(`  WARN app ${app.applicant_email} → "${app.job_title}": ${error.message}`)
    } else {
        console.log(`  OK ${app.applicant_email} → "${app.job_title}" (${app.status})`)
    }
}
```

- [ ] **Step 4: Add conversation and message seeding after applications**

```js
// Seed conversations & messages
console.log('\n--- Conversations ---')
for (const convo of seedConversations) {
    const [email1, email2] = convo.participants
    const uid1 = userIdByEmail[email1]
    const uid2 = userIdByEmail[email2]
    if (!uid1 || !uid2) {
        console.log(`  SKIP convo ${email1} ↔ ${email2} — missing user(s)`)
        continue
    }

    // Conversation ID: sorted UIDs
    const sortedUids = [uid1, uid2].sort()
    const convoId = `${sortedUids[0]}_${sortedUids[1]}`

    // Build participant_info
    const getName = (email) => {
        const all = [...jobseekers, ...diagnosticJobseekers, ...individuals]
        const found = all.find(u => u.email === email)
        if (found) return found.profile?.full_name || found.base?.name || ''
        const emp = employers.find(e => e.email === email)
        return emp?.profile?.company_name || emp?.base?.name || ''
    }

    const participantInfo = {
        [uid1]: { name: getName(email1), email: email1 },
        [uid2]: { name: getName(email2), email: email2 },
    }

    // Find job_id if conversation is about a specific job
    const jobId = convo.job_title ? jobIdByTitle[convo.job_title] || null : null

    const lastMsg = convo.messages[convo.messages.length - 1]
    const lastSenderId = userIdByEmail[lastMsg.sender]

    const { error: convoError } = await supabase
        .from('conversations')
        .upsert({
            id: convoId,
            participants: sortedUids,
            participant_info: participantInfo,
            last_message: {
                text: lastMsg.text,
                sender_id: lastSenderId,
                created_at: new Date().toISOString(),
            },
            unread_count: {
                [uid1]: lastMsg.sender === email1 ? 0 : 1,
                [uid2]: lastMsg.sender === email2 ? 0 : 1,
            },
            job_id: jobId,
            job_title: convo.job_title || null,
        }, { onConflict: 'id' })

    if (convoError) {
        console.warn(`  WARN convo ${email1} ↔ ${email2}: ${convoError.message}`)
        continue
    }
    console.log(`  OK convo ${email1} ↔ ${email2} (${convoId})`)

    // Seed messages with staggered timestamps
    const baseTime = Date.now() - convo.messages.length * 60000
    for (let i = 0; i < convo.messages.length; i++) {
        const msg = convo.messages[i]
        const senderId = userIdByEmail[msg.sender]
        const { error: msgError } = await supabase
            .from('messages')
            .insert({
                conversation_id: convoId,
                text: msg.text,
                sender_id: senderId,
                sender_name: getName(msg.sender),
                read_by: [senderId, userIdByEmail[convo.participants.find(p => p !== msg.sender)]],
                created_at: new Date(baseTime + i * 60000).toISOString(),
            })
        if (msgError) console.warn(`    WARN msg #${i + 1}: ${msgError.message}`)
    }
}
```

- [ ] **Step 5: Update summary line**

```js
console.log(`\n=== Done: ${created} created, ${skipped} skipped ===`)
console.log(`Jobs: ${Object.keys(jobIdByTitle).length}`)
console.log(`\nAll users can log in with password: ${PASSWORD}`)
```

- [ ] **Step 6: Commit extended seed function**

```bash
git add scripts/seed-users.js
git commit -m "feat: extend seed() to create jobs, applications, conversations, and messages"
```

---

### Task 6: Final Review and Squash into Single Commit

- [ ] **Step 1: Review the full file for consistency**

Run: `node --check scripts/seed-users.js` to verify syntax.

- [ ] **Step 2: Squash commits into one**

```bash
git reset --soft HEAD~4
git commit -m "feat: expand seed script with jobs, applications, conversations, and more users"
```

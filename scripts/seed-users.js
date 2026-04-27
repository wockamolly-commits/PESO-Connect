/**
 * Reset and rebuild managed system test data for PESO-Connect.
 *
 * What it does:
 * 1. Removes managed dummy employers and jobseekers from auth + public tables
 * 2. Deletes orphaned conversations tied to those dummy users
 * 3. Re-seeds employers, jobseekers, job postings, applications, and messages
 * 4. Populates current schema fields used by registration, profile edit, and AI matching
 *
 * Usage:
 *   node scripts/seed-users.js
 *
 * Requires:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'Test1234!'
const MANAGED_EMAIL_SUFFIXES = ['@test.com', '.test.com', '@seed.peso-connect.test', '.seed.peso-connect.test']

const CURRENT_YEAR = Number(new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
}))
const VERIFICATION_EXPIRES_AT = `${CURRENT_YEAR + 1}-01-01T00:00:00+08:00`
const NOW_ISO = () => new Date().toISOString()

const workforceLabelByValue = {
    micro: 'Micro (1-9)',
    small: 'Small (10-99)',
    medium: 'Medium (100-199)',
    large: 'Large (200 and up)',
}

const verificationState = {
    is_verified: true,
    registration_complete: true,
    registration_step: null,
    verified_for_year: CURRENT_YEAR,
    verification_expires_at: VERIFICATION_EXPIRES_AT,
    verification_expired_at: null,
}

const pendingVerificationState = {
    is_verified: false,
    registration_complete: true,
    registration_step: null,
    verified_for_year: null,
    verification_expires_at: null,
    verification_expired_at: null,
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function daysFromNow(days) {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
}

function isoOffsetFromNow({ days = 0, minutes = 0 }) {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() + days)
    date.setUTCMinutes(date.getUTCMinutes() + minutes)
    return date.toISOString()
}

function isManagedDummyEmail(email = '') {
    const lower = String(email || '').toLowerCase()
    return MANAGED_EMAIL_SUFFIXES.some((suffix) => lower.endsWith(suffix))
}

function buildFullName({ first_name, middle_name, surname, suffix }) {
    return [first_name, middle_name, surname, suffix].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

function buildBusinessAddress({ street = '', barangay = '', city = '', province = '' }) {
    return [street, barangay && `Brgy. ${barangay}`, city, province].filter(Boolean).join(', ')
}

function makeStoragePath(kind, slug, filename) {
    return `${kind}/${slug}/${filename}`
}

function combineDescription(jobSummary, keyResponsibilities) {
    return `Summary:\n${jobSummary}\n\nKey Responsibilities:\n${keyResponsibilities}`
}

function buildEmployerRecord({
    email,
    company_name,
    trade_name = '',
    acronym = '',
    office_type,
    employer_sector,
    employer_type_specific,
    nature_of_business,
    total_work_force,
    tin,
    business_reg_number,
    province,
    city,
    barangay,
    street,
    owner_name,
    same_as_owner = false,
    representative_name,
    representative_position,
    contact_number,
    telephone_number = '',
    preferred_contact_method = 'email',
    company_description,
    year_established,
    company_website,
    company_logo = '',
    facebook_url = '',
    linkedin_url = '',
    employer_status = 'approved',
    approved = true,
}) {
    const baseState = approved ? verificationState : pendingVerificationState
    const business_address = buildBusinessAddress({ street, barangay, city, province })
    return {
        email,
        base: {
            name: company_name,
            role: 'employer',
            ...baseState,
        },
        profile: {
            company_name,
            trade_name,
            acronym,
            office_type,
            employer_sector,
            employer_type_specific,
            nature_of_business,
            total_work_force,
            tin,
            business_reg_number,
            province,
            city,
            barangay,
            street,
            business_address,
            owner_name,
            same_as_owner,
            representative_name,
            representative_position,
            contact_email: email,
            contact_number,
            telephone_number,
            preferred_contact_method,
            gov_id_url: makeStoragePath('seed-docs', company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), 'government-id.pdf'),
            business_permit_url: makeStoragePath('seed-docs', company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), 'business-permit.pdf'),
            terms_accepted: true,
            peso_consent: true,
            labor_compliance: true,
            employer_status,
            rejection_reason: '',
            company_description,
            company_size: workforceLabelByValue[total_work_force] || '',
            year_established,
            company_website,
            company_logo,
            social_media_links: {
                facebook: facebook_url,
                linkedin: linkedin_url,
            },
            facebook_url,
            linkedin_url,
            ...baseState,
            updated_at: NOW_ISO(),
        },
    }
}

function buildJobseekerRecord({
    email,
    surname,
    first_name,
    middle_name = '',
    suffix = '',
    date_of_birth,
    sex,
    civil_status,
    religion,
    height_cm,
    is_pwd = false,
    disability_type = [],
    disability_type_specify = '',
    pwd_id_number = '',
    street_address,
    barangay,
    city,
    province,
    mobile_number,
    employment_status,
    employment_type = '',
    self_employment_type = '',
    unemployment_reason = '',
    months_looking_for_work = null,
    currently_in_school = false,
    highest_education,
    school_name,
    course_or_field,
    year_graduated = '',
    did_not_graduate = false,
    education_level_reached = '',
    year_last_attended = '',
    vocational_training = [],
    predefined_skills = [],
    skills = [],
    professional_licenses = [],
    civil_service_eligibility = '',
    civil_service_date = null,
    civil_service_cert_path = '',
    work_experiences = [],
    portfolio_url = '',
    resume_slug,
    certificate_urls = [],
    preferred_job_type,
    preferred_occupations,
    preferred_local_locations,
    preferred_overseas_locations,
    expected_salary_min,
    expected_salary_max,
    willing_to_relocate,
    languages,
    approved = true,
}) {
    const full_name = buildFullName({ first_name, middle_name, surname, suffix })
    const baseState = approved ? verificationState : pendingVerificationState
    const resume_url = makeStoragePath('seed-resumes', resume_slug, 'resume.pdf')
    const certifications = vocational_training.map((item) => item.course).filter(Boolean)
    return {
        email,
        base: {
            name: full_name,
            role: 'user',
            subtype: 'jobseeker',
            surname,
            first_name,
            middle_name,
            suffix,
            ...baseState,
        },
        profile: {
            surname,
            first_name,
            middle_name,
            suffix,
            full_name,
            date_of_birth,
            sex,
            civil_status,
            religion,
            height_cm,
            is_pwd,
            disability_type,
            disability_type_specify,
            pwd_id_number,
            street_address,
            barangay,
            city,
            province,
            mobile_number,
            preferred_contact_method: 'email',
            employment_status,
            employment_type,
            self_employment_type,
            unemployment_reason,
            months_looking_for_work,
            currently_in_school,
            highest_education,
            school_name,
            course_or_field,
            year_graduated,
            did_not_graduate,
            education_level_reached,
            year_last_attended,
            vocational_training,
            predefined_skills,
            skills,
            certifications,
            professional_licenses,
            civil_service_eligibility,
            civil_service_date,
            civil_service_cert_path,
            work_experiences,
            portfolio_url,
            resume_url,
            certificate_urls,
            preferred_job_type,
            preferred_occupations,
            preferred_local_locations,
            preferred_overseas_locations,
            preferred_job_location: preferred_local_locations[0] || '',
            expected_salary_min: String(expected_salary_min),
            expected_salary_max: String(expected_salary_max),
            willing_to_relocate,
            languages,
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            dole_authorization: true,
            jobseeker_status: approved ? 'verified' : 'pending',
            rejection_reason: '',
            ...baseState,
            updated_at: NOW_ISO(),
        },
    }
}

const employers = [
    buildEmployerRecord({
        email: 'talent@northpoint-digital.seed.peso-connect.test',
        company_name: 'NorthPoint Digital Solutions Inc.',
        trade_name: 'NorthPoint Digital',
        acronym: 'NPDSI',
        office_type: 'main_office',
        employer_sector: 'private',
        employer_type_specific: 'direct_hire',
        nature_of_business: 'Software development, managed IT services, and digital operations support',
        total_work_force: 'medium',
        tin: '412-778-921-000',
        business_reg_number: 'SEC-2021-084512',
        province: 'Negros Occidental',
        city: 'San Carlos City',
        barangay: 'Rizal',
        street: '3F NorthPoint Hub, F. Palma St.',
        owner_name: 'Daniel G. Rivera',
        representative_name: 'Marianne C. Lee',
        representative_position: 'People Operations Lead',
        contact_number: '09171120001',
        telephone_number: '(034) 445-2101',
        company_description: 'A regional technology services firm supporting e-commerce, logistics, and public-sector digitalization projects across Western Visayas.',
        year_established: '2021',
        company_website: 'https://northpoint-digital.example.test',
        facebook_url: 'https://facebook.example.test/northpointdigital',
        linkedin_url: 'https://linkedin.example.test/company/northpoint-digital',
    }),
    buildEmployerRecord({
        email: 'careers@sunridge-energy.seed.peso-connect.test',
        company_name: 'Sunridge Renewable Energy Services Corp.',
        trade_name: 'Sunridge Energy',
        acronym: 'SRESC',
        office_type: 'main_office',
        employer_sector: 'private',
        employer_type_specific: 'direct_hire',
        nature_of_business: 'Solar installation, preventive maintenance, and energy efficiency services',
        total_work_force: 'small',
        tin: '185-447-633-000',
        business_reg_number: 'DTI-NOC-2022-11894',
        province: 'Negros Occidental',
        city: 'San Carlos City',
        barangay: 'Codcod',
        street: 'Sunridge Service Yard, Don Emilio St.',
        owner_name: 'Francis O. Yusay',
        representative_name: 'Liza P. Consing',
        representative_position: 'HR and Compliance Officer',
        contact_number: '09171120002',
        telephone_number: '(034) 445-2102',
        company_description: 'A field-heavy renewable energy contractor handling rooftop solar, genset backup systems, and preventive electrical maintenance for commercial clients.',
        year_established: '2022',
        company_website: 'https://sunridge-energy.example.test',
    }),
    buildEmployerRecord({
        email: 'recruitment@greenharvest-agri.seed.peso-connect.test',
        company_name: 'GreenHarvest Agri Ventures Cooperative',
        trade_name: 'GreenHarvest Agri',
        acronym: 'GHAVC',
        office_type: 'main_office',
        employer_sector: 'private',
        employer_type_specific: 'direct_hire',
        nature_of_business: 'Integrated crop production, post-harvest trading, and farm advisory services',
        total_work_force: 'medium',
        tin: '624-190-552-000',
        business_reg_number: 'CDA-2019-06124',
        province: 'Negros Occidental',
        city: 'San Carlos City',
        barangay: 'Palampas',
        street: 'GreenHarvest Compound, National Highway',
        owner_name: 'Arturo V. Salcedo',
        representative_name: 'Mila T. Veloso',
        representative_position: 'HR Supervisor',
        contact_number: '09171120003',
        telephone_number: '(034) 445-2103',
        company_description: 'A farmer-owned cooperative focused on sugarcane diversification, vegetables, corn, and post-harvest quality systems.',
        year_established: '2019',
        company_website: 'https://greenharvest-agri.example.test',
    }),
    buildEmployerRecord({
        email: 'jobs@harborview-hospitality.seed.peso-connect.test',
        company_name: 'HarborView Suites and Events',
        trade_name: 'HarborView Suites',
        acronym: 'HVSE',
        office_type: 'main_office',
        employer_sector: 'private',
        employer_type_specific: 'direct_hire',
        nature_of_business: 'Hotel operations, events, dining, and pastry production',
        total_work_force: 'small',
        tin: '558-002-384-000',
        business_reg_number: 'DTI-NOC-2018-24590',
        province: 'Negros Occidental',
        city: 'San Carlos City',
        barangay: 'Buluangan',
        street: 'Seaside Drive, Purok Baywalk',
        owner_name: 'Helena R. Ocampo',
        representative_name: 'Jasper M. Dy',
        representative_position: 'HR Generalist',
        contact_number: '09171120004',
        telephone_number: '(034) 445-2104',
        company_description: 'A 46-room boutique hotel with an in-house pastry kitchen, banquet operations, and corporate events clientele.',
        year_established: '2018',
        company_website: 'https://harborview-suites.example.test',
    }),
    buildEmployerRecord({
        email: 'hiring@marketbridge-retail.seed.peso-connect.test',
        company_name: 'MarketBridge Retail and Logistics Corp.',
        trade_name: 'MarketBridge Retail',
        acronym: 'MBRL',
        office_type: 'main_office',
        employer_sector: 'private',
        employer_type_specific: 'direct_hire',
        nature_of_business: 'Retail operations, warehouse fulfillment, and e-commerce catalog management',
        total_work_force: 'medium',
        tin: '309-772-604-000',
        business_reg_number: 'SEC-2020-117833',
        province: 'Negros Occidental',
        city: 'San Carlos City',
        barangay: 'Guadalupe',
        street: 'MarketBridge Center, Mabini Ave.',
        owner_name: 'Cynthia B. Locsin',
        representative_name: 'Paolo V. Mariano',
        representative_position: 'Talent Acquisition Specialist',
        contact_number: '09171120005',
        telephone_number: '(034) 445-2105',
        company_description: 'A multi-site retailer operating convenience formats, warehouse dispatch, and a growing online marketplace catalog team.',
        year_established: '2020',
        company_website: 'https://marketbridge-retail.example.test',
    }),
]

const jobseekers = [
    buildJobseekerRecord({
        email: 'arianne.villareal@seed.peso-connect.test',
        surname: 'Villareal',
        first_name: 'Arianne',
        middle_name: 'Lopez',
        date_of_birth: '1999-06-14',
        sex: 'Female',
        civil_status: 'Single',
        religion: 'Roman Catholic',
        height_cm: 163,
        street_address: 'Block 7 Lot 12, Mabini Homes',
        barangay: 'Rizal',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171230001',
        employment_status: 'Employed',
        employment_type: 'Full-time',
        highest_education: 'Tertiary',
        school_name: 'University of St. La Salle',
        course_or_field: 'BS Information Technology',
        year_graduated: '2023',
        vocational_training: [
            {
                course: 'Responsive Web Development Bootcamp',
                institution: 'DICT Region VI',
                hours: '160',
                skills_acquired: 'React, JavaScript, Git Version Control, API Development',
                certificate_level: 'None',
                certificate_path: makeStoragePath('seed-certificates', 'arianne-villareal', 'web-bootcamp.pdf'),
            },
        ],
        predefined_skills: ['Computer Literate'],
        skills: ['React', 'JavaScript', 'HTML/CSS', 'API Development', 'Git Version Control', 'SQL', 'Technical Documentation'],
        work_experiences: [
            { company: 'PixelPier Studio', address: 'Bacolod City', position: 'Frontend Developer', year_started: '2023', year_ended: '2024', employment_status: 'Contractual' },
            { company: 'North Coast Commerce', address: 'San Carlos City', position: 'Junior Web Developer', year_started: '2024', year_ended: '', employment_status: 'Permanent' },
        ],
        portfolio_url: 'https://portfolio.example.test/arianne-villareal',
        resume_slug: 'arianne-villareal',
        certificate_urls: [makeStoragePath('seed-certificates', 'arianne-villareal', 'web-bootcamp.pdf')],
        preferred_job_type: ['full-time', 'contractual'],
        preferred_occupations: ['Junior Full Stack Developer', 'Frontend Developer', 'Web Application Support'],
        preferred_local_locations: ['San Carlos City', 'Bacolod City', 'Talisay City'],
        preferred_overseas_locations: [],
        expected_salary_min: 24000,
        expected_salary_max: 36000,
        willing_to_relocate: 'yes',
        languages: [
            { language: 'English', proficiency: 'Fluent' },
            { language: 'Tagalog', proficiency: 'Native' },
            { language: 'Hiligaynon', proficiency: 'Proficient' },
        ],
    }),
    buildJobseekerRecord({
        email: 'joel.espina@seed.peso-connect.test',
        surname: 'Espina',
        first_name: 'Joel',
        middle_name: 'Mercado',
        date_of_birth: '1997-02-08',
        sex: 'Male',
        civil_status: 'Single',
        religion: 'Born Again Christian',
        height_cm: 171,
        street_address: 'Purok Santan, Quezon Extension',
        barangay: 'Quezon',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171230002',
        employment_status: 'Unemployed',
        unemployment_reason: 'Finished Contract',
        months_looking_for_work: 4,
        highest_education: 'Tertiary',
        school_name: 'Colegio de Sta. Rita',
        course_or_field: 'BS Information Systems',
        did_not_graduate: true,
        education_level_reached: '3rd Year',
        year_last_attended: '2021',
        vocational_training: [
            {
                course: 'Computer Systems Servicing NC II',
                institution: 'TESDA San Carlos',
                hours: '320',
                skills_acquired: 'Technical Support, Network Setup, Computer Repair, Hardware Troubleshooting',
                certificate_level: 'NC II',
                certificate_path: makeStoragePath('seed-certificates', 'joel-espina', 'css-nc2.pdf'),
            },
        ],
        predefined_skills: ['Computer Literate'],
        skills: ['Technical Support', 'Network Setup', 'Computer Repair', 'Hardware Troubleshooting', 'IT Helpdesk', 'MS Office'],
        professional_licenses: [
            {
                name: 'Computer Systems Servicing NC II',
                number: 'TESDA-CSS-24019',
                valid_until: '2028-03-31',
                license_copy_path: makeStoragePath('seed-certificates', 'joel-espina', 'css-nc2-license.pdf'),
            },
        ],
        work_experiences: [
            { company: 'ServNet Outsourcing', address: 'Bacolod City', position: 'IT Support Staff', year_started: '2021', year_ended: '2023', employment_status: 'Contractual' },
            { company: 'Mercury Drug - San Carlos', address: 'San Carlos City', position: 'Desktop Support Technician', year_started: '2023', year_ended: '2025', employment_status: 'Contractual' },
        ],
        resume_slug: 'joel-espina',
        certificate_urls: [makeStoragePath('seed-certificates', 'joel-espina', 'css-nc2.pdf')],
        preferred_job_type: ['full-time'],
        preferred_occupations: ['IT Service Desk Analyst', 'Technical Support Specialist', 'Network Support Assistant'],
        preferred_local_locations: ['San Carlos City', 'Bacolod City', 'Silay City'],
        preferred_overseas_locations: [],
        expected_salary_min: 18000,
        expected_salary_max: 26000,
        willing_to_relocate: 'yes',
        languages: [
            { language: 'English', proficiency: 'Proficient' },
            { language: 'Tagalog', proficiency: 'Native' },
        ],
    }),
    buildJobseekerRecord({
        email: 'melissa.catalan@seed.peso-connect.test',
        surname: 'Catalan',
        first_name: 'Melissa',
        middle_name: 'Rivera',
        date_of_birth: '1995-09-20',
        sex: 'Female',
        civil_status: 'Married',
        religion: 'Roman Catholic',
        height_cm: 158,
        street_address: 'Mabini St., near Public Market',
        barangay: 'Guadalupe',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171230003',
        employment_status: 'Employed',
        employment_type: 'Full-time',
        highest_education: 'Senior High School (Grades 11-12)',
        school_name: 'San Carlos National High School',
        course_or_field: 'Accountancy, Business and Management (ABM)',
        year_graduated: '2013',
        vocational_training: [
            {
                course: 'Retail Operations and Cash Handling',
                institution: 'PESO Skills Center',
                hours: '80',
                skills_acquired: 'Cashiering, POS Operation, Inventory Management',
                certificate_level: 'None',
                certificate_path: makeStoragePath('seed-certificates', 'melissa-catalan', 'retail-ops.pdf'),
            },
        ],
        predefined_skills: [],
        skills: ['Customer Service', 'Sales', 'Inventory Management', 'POS Operation', 'Cashiering', 'Team Supervision', 'Sales Reporting'],
        work_experiences: [
            { company: 'BudgetMart Express', address: 'San Carlos City', position: 'Senior Cashier', year_started: '2016', year_ended: '2021', employment_status: 'Permanent' },
            { company: 'MarketBridge Mini', address: 'Escalante City', position: 'Store Team Lead', year_started: '2021', year_ended: '', employment_status: 'Permanent' },
        ],
        resume_slug: 'melissa-catalan',
        certificate_urls: [makeStoragePath('seed-certificates', 'melissa-catalan', 'retail-ops.pdf')],
        preferred_job_type: ['full-time'],
        preferred_occupations: ['Retail Operations Supervisor', 'Store Team Leader', 'Inventory Control Associate'],
        preferred_local_locations: ['San Carlos City', 'Escalante City', 'Cadiz City'],
        preferred_overseas_locations: [],
        expected_salary_min: 19000,
        expected_salary_max: 28000,
        willing_to_relocate: 'no',
        languages: [
            { language: 'Hiligaynon', proficiency: 'Native' },
            { language: 'Tagalog', proficiency: 'Fluent' },
            { language: 'English', proficiency: 'Conversational' },
        ],
    }),
    buildJobseekerRecord({
        email: 'rogelio.paderanga@seed.peso-connect.test',
        surname: 'Paderanga',
        first_name: 'Rogelio',
        middle_name: 'Mendoza',
        date_of_birth: '1991-11-03',
        sex: 'Male',
        civil_status: 'Married',
        religion: 'Roman Catholic',
        height_cm: 174,
        street_address: 'Sitio Upper Codcod',
        barangay: 'Codcod',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171230004',
        employment_status: 'Unemployed',
        unemployment_reason: 'Resigned',
        months_looking_for_work: 2,
        highest_education: 'Senior High School (Grades 11-12)',
        school_name: 'Codcod National High School',
        course_or_field: 'TVL - Electrical Installation and Maintenance',
        year_graduated: '2009',
        vocational_training: [
            {
                course: 'Electrical Installation and Maintenance NC II',
                institution: 'TESDA San Carlos',
                hours: '320',
                skills_acquired: 'Electrical Installation, Electrical Wiring, Electrical Safety',
                certificate_level: 'NC II',
                certificate_path: makeStoragePath('seed-certificates', 'rogelio-paderanga', 'eim-nc2.pdf'),
            },
            {
                course: 'Solar PV Systems Installation',
                institution: 'Sunridge Training Center',
                hours: '120',
                skills_acquired: 'Solar Panel Installation, Renewable Energy Systems, Net Metering',
                certificate_level: 'None',
                certificate_path: makeStoragePath('seed-certificates', 'rogelio-paderanga', 'solar-pv.pdf'),
            },
        ],
        predefined_skills: ['Electrician'],
        skills: ['Electrical Installation', 'Electrical Wiring', 'Electrical Safety', 'Solar Panel Installation', 'Generator Operation', 'Low Voltage Systems'],
        professional_licenses: [
            {
                name: 'Electrical Installation and Maintenance NC II',
                number: 'TESDA-EIM-88412',
                valid_until: '2028-08-30',
                license_copy_path: makeStoragePath('seed-certificates', 'rogelio-paderanga', 'eim-license.pdf'),
            },
        ],
        work_experiences: [
            { company: 'VoltPro Services', address: 'Bacolod City', position: 'Electrical Technician', year_started: '2013', year_ended: '2019', employment_status: 'Permanent' },
            { company: 'SolarReach Installations', address: 'San Carlos City', position: 'Solar Installation Technician', year_started: '2019', year_ended: '2025', employment_status: 'Permanent' },
        ],
        resume_slug: 'rogelio-paderanga',
        certificate_urls: [
            makeStoragePath('seed-certificates', 'rogelio-paderanga', 'eim-nc2.pdf'),
            makeStoragePath('seed-certificates', 'rogelio-paderanga', 'solar-pv.pdf'),
        ],
        preferred_job_type: ['full-time', 'contractual'],
        preferred_occupations: ['Solar Installation Technician', 'Distribution Line Technician', 'Electrical Technician'],
        preferred_local_locations: ['San Carlos City', 'Bacolod City', 'Victorias City'],
        preferred_overseas_locations: ['Qatar'],
        expected_salary_min: 22000,
        expected_salary_max: 34000,
        willing_to_relocate: 'yes',
        languages: [
            { language: 'Tagalog', proficiency: 'Native' },
            { language: 'English', proficiency: 'Conversational' },
        ],
    }),
    buildJobseekerRecord({
        email: 'leah.monterde@seed.peso-connect.test',
        surname: 'Monterde',
        first_name: 'Leah',
        middle_name: 'Santos',
        date_of_birth: '1998-04-17',
        sex: 'Female',
        civil_status: 'Single',
        religion: 'Roman Catholic',
        height_cm: 160,
        street_address: 'Purok Seaside',
        barangay: 'Buluangan',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171230005',
        employment_status: 'Employed',
        employment_type: 'Full-time',
        highest_education: 'Tertiary',
        school_name: 'University of Negros Occidental - Recoletos',
        course_or_field: 'BS Hospitality Management',
        year_graduated: '2020',
        vocational_training: [
            {
                course: 'Front Office Services',
                institution: 'TESDA Bacolod',
                hours: '160',
                skills_acquired: 'Front Desk, Guest Relations, Reservation Management',
                certificate_level: 'NC II',
                certificate_path: makeStoragePath('seed-certificates', 'leah-monterde', 'front-office.pdf'),
            },
        ],
        skills: ['Front Desk', 'Guest Relations', 'Reservation Management', 'Check-in/Check-out Processing', 'Customer Service Excellence', 'POS for Restaurants'],
        work_experiences: [
            { company: 'Ocean Crest Hotel', address: 'Bacolod City', position: 'Guest Services Associate', year_started: '2020', year_ended: '2022', employment_status: 'Permanent' },
            { company: 'Harbor Lane Inn', address: 'San Carlos City', position: 'Front Desk Officer', year_started: '2022', year_ended: '', employment_status: 'Permanent' },
        ],
        resume_slug: 'leah-monterde',
        certificate_urls: [makeStoragePath('seed-certificates', 'leah-monterde', 'front-office.pdf')],
        preferred_job_type: ['full-time'],
        preferred_occupations: ['Front Desk Associate', 'Guest Services Officer', 'Reservations Coordinator'],
        preferred_local_locations: ['San Carlos City', 'Bacolod City', 'Dumaguete City'],
        preferred_overseas_locations: ['United Arab Emirates'],
        expected_salary_min: 18000,
        expected_salary_max: 26000,
        willing_to_relocate: 'yes',
        languages: [
            { language: 'English', proficiency: 'Fluent' },
            { language: 'Tagalog', proficiency: 'Native' },
            { language: 'Hiligaynon', proficiency: 'Proficient' },
        ],
    }),
    buildJobseekerRecord({
        email: 'noel.agbayani@seed.peso-connect.test',
        surname: 'Agbayani',
        first_name: 'Noel',
        middle_name: 'Ting',
        date_of_birth: '1988-01-29',
        sex: 'Male',
        civil_status: 'Married',
        religion: 'Iglesia ni Cristo',
        height_cm: 169,
        street_address: 'Sitio Riverside',
        barangay: 'Palampas',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171230006',
        employment_status: 'Self-Employed',
        self_employment_type: 'Vendor/Retailer',
        highest_education: 'Tertiary',
        school_name: 'Central Philippine State University',
        course_or_field: 'BS Agriculture',
        year_graduated: '2011',
        vocational_training: [
            {
                course: 'Good Agricultural Practices',
                institution: 'Department of Agriculture',
                hours: '40',
                skills_acquired: 'Crop Management, Farm Record Keeping, Irrigation',
                certificate_level: 'None',
                certificate_path: makeStoragePath('seed-certificates', 'noel-agbayani', 'gap-training.pdf'),
            },
        ],
        skills: ['Crop Management', 'Farm Record Keeping', 'Irrigation', 'Post-Harvest Handling', 'Quality Control', 'MS Office'],
        work_experiences: [
            { company: 'AgriBest Supply', address: 'Talisay City', position: 'Field Agronomist', year_started: '2011', year_ended: '2017', employment_status: 'Permanent' },
            { company: 'Agbayani Farm Inputs', address: 'San Carlos City', position: 'Farm Operations Supervisor', year_started: '2017', year_ended: '', employment_status: 'Permanent' },
        ],
        resume_slug: 'noel-agbayani',
        certificate_urls: [makeStoragePath('seed-certificates', 'noel-agbayani', 'gap-training.pdf')],
        preferred_job_type: ['full-time', 'contractual'],
        preferred_occupations: ['Farm Operations Coordinator', 'Post-Harvest Quality Inspector', 'Agricultural Extension Assistant'],
        preferred_local_locations: ['San Carlos City', 'Bago City', 'La Carlota City'],
        preferred_overseas_locations: [],
        expected_salary_min: 23000,
        expected_salary_max: 32000,
        willing_to_relocate: 'no',
        languages: [
            { language: 'Hiligaynon', proficiency: 'Native' },
            { language: 'Tagalog', proficiency: 'Fluent' },
            { language: 'English', proficiency: 'Conversational' },
        ],
    }),
    buildJobseekerRecord({
        email: 'karen.torres@seed.peso-connect.test',
        surname: 'Torres',
        first_name: 'Karen',
        middle_name: 'Velasco',
        date_of_birth: '1996-08-11',
        sex: 'Female',
        civil_status: 'Single',
        religion: 'Roman Catholic',
        height_cm: 157,
        is_pwd: true,
        disability_type: ['Physical'],
        pwd_id_number: 'PWD-NOC-11874',
        street_address: 'Villa Rosario Phase 1',
        barangay: 'Guadalupe',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171230007',
        employment_status: 'Unemployed',
        unemployment_reason: 'Finished Contract',
        months_looking_for_work: 3,
        highest_education: 'Senior High School (Grades 11-12)',
        school_name: 'San Carlos College',
        course_or_field: 'Information and Communications Technology (ICT)',
        year_graduated: '2014',
        vocational_training: [
            {
                course: 'Digital Catalog and Marketplace Operations',
                institution: 'DICT Region VI',
                hours: '96',
                skills_acquired: 'Data Entry, Product Knowledge, MS Office, E-commerce Management',
                certificate_level: 'None',
                certificate_path: makeStoragePath('seed-certificates', 'karen-torres', 'catalog-ops.pdf'),
            },
        ],
        predefined_skills: ['Computer Literate'],
        skills: ['Data Entry', 'MS Office', 'E-commerce Management', 'Product Knowledge', 'Customer Service', 'Social Media'],
        work_experiences: [
            { company: 'ShopLink Marketplace', address: 'Remote', position: 'Catalog Assistant', year_started: '2022', year_ended: '2024', employment_status: 'Contractual' },
            { company: 'HomeCart PH', address: 'Remote', position: 'Product Listing Associate', year_started: '2024', year_ended: '2025', employment_status: 'Contractual' },
        ],
        resume_slug: 'karen-torres',
        certificate_urls: [makeStoragePath('seed-certificates', 'karen-torres', 'catalog-ops.pdf')],
        preferred_job_type: ['full-time', 'part-time', 'on-demand'],
        preferred_occupations: ['E-commerce Catalog Specialist', 'Data Entry Associate', 'Content Listing Assistant'],
        preferred_local_locations: ['San Carlos City', 'Bacolod City', 'Remote'],
        preferred_overseas_locations: [],
        expected_salary_min: 17000,
        expected_salary_max: 24000,
        willing_to_relocate: 'no',
        languages: [
            { language: 'English', proficiency: 'Proficient' },
            { language: 'Tagalog', proficiency: 'Native' },
        ],
    }),
    buildJobseekerRecord({
        email: 'dante.villasis@seed.peso-connect.test',
        surname: 'Villasis',
        first_name: 'Dante',
        middle_name: 'Castro',
        date_of_birth: '1984-05-25',
        sex: 'Male',
        civil_status: 'Married',
        religion: 'Roman Catholic',
        height_cm: 172,
        street_address: 'Sunrise Subdivision',
        barangay: 'Rizal',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171230008',
        employment_status: 'Unemployed',
        unemployment_reason: 'Terminated/Laid Off',
        months_looking_for_work: 6,
        highest_education: 'Graduate Studies / Post-graduate',
        school_name: 'University of the Philippines Visayas',
        course_or_field: 'Master in Business Administration',
        year_graduated: '2015',
        vocational_training: [
            {
                course: 'Supply Chain Analytics Workshop',
                institution: 'Philippine Retailers Association',
                hours: '24',
                skills_acquired: 'Retail Analytics, KPI Tracking, Inventory Management',
                certificate_level: 'None',
                certificate_path: makeStoragePath('seed-certificates', 'dante-villasis', 'supply-chain.pdf'),
            },
        ],
        skills: ['Project Management', 'Retail Analytics', 'Inventory Management', 'KPI Tracking', 'Team Supervision', 'Sales Reporting'],
        work_experiences: [
            { company: 'Metro Hypermart', address: 'Iloilo City', position: 'Operations Manager', year_started: '2012', year_ended: '2020', employment_status: 'Permanent' },
            { company: 'ValueChain Retail', address: 'Cebu City', position: 'Area Operations Lead', year_started: '2020', year_ended: '2025', employment_status: 'Permanent' },
        ],
        resume_slug: 'dante-villasis',
        certificate_urls: [makeStoragePath('seed-certificates', 'dante-villasis', 'supply-chain.pdf')],
        preferred_job_type: ['full-time'],
        preferred_occupations: ['Retail Operations Supervisor', 'Store Compliance Manager', 'Inventory Planning Lead'],
        preferred_local_locations: ['San Carlos City', 'Bacolod City', 'Cebu City'],
        preferred_overseas_locations: [],
        expected_salary_min: 35000,
        expected_salary_max: 50000,
        willing_to_relocate: 'yes',
        languages: [
            { language: 'English', proficiency: 'Fluent' },
            { language: 'Tagalog', proficiency: 'Native' },
        ],
    }),
    buildJobseekerRecord({
        email: 'sofia.madamba@seed.peso-connect.test',
        surname: 'Madamba',
        first_name: 'Sofia',
        middle_name: 'Perez',
        date_of_birth: '1994-12-02',
        sex: 'Female',
        civil_status: 'Single',
        religion: 'Roman Catholic',
        height_cm: 159,
        street_address: 'Purok Magnolia',
        barangay: 'Sipaway',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171230009',
        employment_status: 'Unemployed',
        unemployment_reason: 'Resigned',
        months_looking_for_work: 5,
        highest_education: 'Tertiary',
        school_name: 'West Visayas State University',
        course_or_field: 'BS Secondary Education',
        year_graduated: '2016',
        vocational_training: [
            {
                course: 'Google Workspace and Spreadsheet Automation',
                institution: 'DICT Learning Hub',
                hours: '60',
                skills_acquired: 'Data Entry, MS Office, Report Writing, Product Knowledge',
                certificate_level: 'None',
                certificate_path: makeStoragePath('seed-certificates', 'sofia-madamba', 'workspace-automation.pdf'),
            },
        ],
        skills: ['Data Entry', 'MS Office', 'Report Writing', 'Product Knowledge', 'Customer Service', 'Social Media'],
        work_experiences: [
            { company: 'Sipaway National High School', address: 'San Carlos City', position: 'Teacher I', year_started: '2017', year_ended: '2024', employment_status: 'Permanent' },
            { company: 'Freelance', address: 'Remote', position: 'Virtual Catalog Assistant', year_started: '2024', year_ended: '2025', employment_status: 'Part-time' },
        ],
        resume_slug: 'sofia-madamba',
        certificate_urls: [makeStoragePath('seed-certificates', 'sofia-madamba', 'workspace-automation.pdf')],
        preferred_job_type: ['full-time', 'part-time'],
        preferred_occupations: ['E-commerce Catalog Specialist', 'Data Entry Associate', 'Operations Assistant'],
        preferred_local_locations: ['San Carlos City', 'Remote', 'Bacolod City'],
        preferred_overseas_locations: ['Singapore'],
        expected_salary_min: 18000,
        expected_salary_max: 26000,
        willing_to_relocate: 'yes',
        languages: [
            { language: 'English', proficiency: 'Fluent' },
            { language: 'Tagalog', proficiency: 'Native' },
            { language: 'Hiligaynon', proficiency: 'Conversational' },
        ],
    }),
    buildJobseekerRecord({
        email: 'miguel.soriano@seed.peso-connect.test',
        surname: 'Soriano',
        first_name: 'Miguel',
        middle_name: 'Bautista',
        date_of_birth: '2000-03-15',
        sex: 'Male',
        civil_status: 'Single',
        religion: 'Roman Catholic',
        height_cm: 176,
        street_address: 'Purok Narra',
        barangay: 'Punao',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171230010',
        employment_status: 'Unemployed',
        unemployment_reason: 'Finished Contract',
        months_looking_for_work: 1,
        highest_education: 'Junior High School (Grades 7-10)',
        school_name: 'Punao National High School',
        course_or_field: '',
        did_not_graduate: true,
        education_level_reached: 'Grade 10',
        year_last_attended: '2016',
        vocational_training: [
            {
                course: 'Shielded Metal Arc Welding',
                institution: 'TESDA San Carlos',
                hours: '240',
                skills_acquired: 'Welding, Steel Fabrication, Safety Compliance',
                certificate_level: 'NC I',
                certificate_path: makeStoragePath('seed-certificates', 'miguel-soriano', 'welding-nc1.pdf'),
            },
        ],
        predefined_skills: [],
        skills: ['Welding', 'Steel Fabrication', 'Driving', 'Safety Compliance'],
        work_experiences: [
            { company: 'Local Contractor Pool', address: 'San Carlos City', position: 'General Laborer', year_started: '2019', year_ended: '2022', employment_status: 'Contractual' },
            { company: 'Ridgeworks Fabrication', address: 'Escalante City', position: 'Welding Helper', year_started: '2023', year_ended: '2025', employment_status: 'Contractual' },
        ],
        resume_slug: 'miguel-soriano',
        certificate_urls: [makeStoragePath('seed-certificates', 'miguel-soriano', 'welding-nc1.pdf')],
        preferred_job_type: ['full-time', 'on-demand'],
        preferred_occupations: ['Welding Helper', 'Utility Installer', 'Warehouse Rider'],
        preferred_local_locations: ['San Carlos City', 'Escalante City', 'Cadiz City'],
        preferred_overseas_locations: [],
        expected_salary_min: 13000,
        expected_salary_max: 19000,
        willing_to_relocate: 'yes',
        languages: [
            { language: 'Hiligaynon', proficiency: 'Native' },
            { language: 'Tagalog', proficiency: 'Conversational' },
        ],
    }),
    buildJobseekerRecord({
        email: 'fatima.ramos@seed.peso-connect.test',
        surname: 'Ramos',
        first_name: 'Fatima',
        middle_name: 'Ali',
        date_of_birth: '1993-07-07',
        sex: 'Female',
        civil_status: 'Married',
        religion: 'Islam',
        height_cm: 162,
        street_address: 'Baywalk Residences',
        barangay: 'Buluangan',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171230011',
        employment_status: 'Unemployed',
        unemployment_reason: 'Resigned',
        months_looking_for_work: 2,
        highest_education: 'Tertiary',
        school_name: 'La Consolacion College - Bacolod',
        course_or_field: 'BS Tourism Management',
        year_graduated: '2014',
        vocational_training: [
            {
                course: 'Hospitality Guest Relations Excellence',
                institution: 'Department of Tourism',
                hours: '32',
                skills_acquired: 'Guest Relations, Front Desk, Complaint Resolution',
                certificate_level: 'None',
                certificate_path: makeStoragePath('seed-certificates', 'fatima-ramos', 'guest-relations.pdf'),
            },
        ],
        skills: ['Guest Relations', 'Front Desk', 'Reservation Management', 'Complaint Resolution', 'Travel Coordination'],
        work_experiences: [
            { company: 'Red Sand Resort', address: 'Dubai', position: 'Guest Relations Officer', year_started: '2018', year_ended: '2024', employment_status: 'Permanent' },
            { company: 'Home-based', address: 'San Carlos City', position: 'Travel Booking Assistant', year_started: '2024', year_ended: '2025', employment_status: 'Part-time' },
        ],
        resume_slug: 'fatima-ramos',
        certificate_urls: [makeStoragePath('seed-certificates', 'fatima-ramos', 'guest-relations.pdf')],
        preferred_job_type: ['full-time', 'part-time'],
        preferred_occupations: ['Front Desk Associate', 'Guest Services Officer', 'Travel Coordinator'],
        preferred_local_locations: ['San Carlos City', 'Bacolod City', 'Dumaguete City'],
        preferred_overseas_locations: ['United Arab Emirates', 'Qatar'],
        expected_salary_min: 20000,
        expected_salary_max: 30000,
        willing_to_relocate: 'yes',
        languages: [
            { language: 'English', proficiency: 'Fluent' },
            { language: 'Arabic', proficiency: 'Fluent' },
            { language: 'Tagalog', proficiency: 'Native' },
        ],
    }),
    buildJobseekerRecord({
        email: 'patricia.lloren@seed.peso-connect.test',
        surname: 'Lloren',
        first_name: 'Patricia',
        middle_name: 'Aurelio',
        date_of_birth: '1992-10-30',
        sex: 'Female',
        civil_status: 'Single',
        religion: 'Roman Catholic',
        height_cm: 155,
        street_address: 'Villa Aurora',
        barangay: 'Rizal',
        city: 'San Carlos City',
        province: 'Negros Occidental',
        mobile_number: '09171230012',
        employment_status: 'Employed',
        employment_type: 'Full-time',
        highest_education: 'Tertiary',
        school_name: 'St. Paul University Dumaguete',
        course_or_field: 'BS Hotel and Restaurant Management',
        year_graduated: '2013',
        vocational_training: [
            {
                course: 'Advanced Pastry and Baking',
                institution: 'TESDA Bacolod',
                hours: '180',
                skills_acquired: 'Baking, Pastry Making, Cake Decorating, Food Safety',
                certificate_level: 'NC II',
                certificate_path: makeStoragePath('seed-certificates', 'patricia-lloren', 'pastry-advanced.pdf'),
            },
        ],
        skills: ['Baking', 'Pastry Making', 'Cake Decorating', 'Food Safety', 'Food Cost Control', 'Kitchen Management'],
        work_experiences: [
            { company: 'Sweet Harbor Cafe', address: 'Dumaguete City', position: 'Pastry Cook', year_started: '2014', year_ended: '2019', employment_status: 'Permanent' },
            { company: 'Harbor Lane Kitchen', address: 'San Carlos City', position: 'Senior Pastry Chef', year_started: '2019', year_ended: '', employment_status: 'Permanent' },
        ],
        resume_slug: 'patricia-lloren',
        certificate_urls: [makeStoragePath('seed-certificates', 'patricia-lloren', 'pastry-advanced.pdf')],
        preferred_job_type: ['full-time'],
        preferred_occupations: ['Banquet Pastry Chef', 'Pastry Production Lead', 'Bakery Supervisor'],
        preferred_local_locations: ['San Carlos City', 'Bacolod City', 'Dumaguete City'],
        preferred_overseas_locations: [],
        expected_salary_min: 24000,
        expected_salary_max: 34000,
        willing_to_relocate: 'yes',
        languages: [
            { language: 'English', proficiency: 'Proficient' },
            { language: 'Tagalog', proficiency: 'Native' },
        ],
    }),
]

const jobPostings = [
    {
        slug: 'junior-full-stack-developer',
        employer_email: 'talent@northpoint-digital.seed.peso-connect.test',
        title: 'Junior Full Stack Developer',
        category: 'it',
        type: 'permanent',
        work_arrangement: 'hybrid',
        work_province: 'Negros Occidental',
        work_city: 'San Carlos City',
        vacancies: 2,
        job_summary: 'Build and maintain internal commerce tools, client dashboards, and workflow automations under senior engineer supervision.',
        key_responsibilities: 'Implement React features, connect API endpoints, write SQL-backed views, review bug reports, and document shipped changes for client handover.',
        salary_min: 26000,
        salary_max: 38000,
        benefits: ['Health Insurance', '13th Month Pay', 'Paid Leave', 'Training & Development'],
        education_level: 'college',
        course_strand: 'Information Technology, Computer Science, or Information Systems',
        experience_level: 'entry',
        required_skills: ['React', 'JavaScript', 'API Development', 'Git Version Control'],
        preferred_skills: ['TypeScript', 'SQL', 'Technical Documentation'],
        required_languages: ['English'],
        licenses_certifications: '',
        required_licenses: [],
        accepts_pwd: true,
        pwd_disabilities: ['physical'],
        accepts_ofw: false,
        other_qualifications: 'Portfolio or sample project required.',
        filter_mode: 'strict',
        status: 'open',
    },
    {
        slug: 'it-service-desk-analyst',
        employer_email: 'talent@northpoint-digital.seed.peso-connect.test',
        title: 'IT Service Desk Analyst',
        category: 'it',
        type: 'permanent',
        work_arrangement: 'on-site',
        work_province: 'Negros Occidental',
        work_city: 'San Carlos City',
        vacancies: 3,
        job_summary: 'Support endpoint users, triage incidents, and maintain workstation readiness for local and remote clients.',
        key_responsibilities: 'Handle service tickets, troubleshoot hardware and software issues, prepare user setups, update asset logs, and escalate server or network incidents.',
        salary_min: 20000,
        salary_max: 28000,
        benefits: ['SSS/PhilHealth/Pag-IBIG', 'Paid Leave', 'Training & Development'],
        education_level: 'college',
        course_strand: 'Information Technology or related field',
        experience_level: '1-3',
        required_skills: ['IT Helpdesk', 'Technical Support', 'Hardware Troubleshooting', 'Customer Service'],
        preferred_skills: ['Network Setup', 'Active Directory', 'MS Office'],
        required_languages: ['English'],
        licenses_certifications: '',
        required_licenses: [],
        accepts_pwd: false,
        pwd_disabilities: [],
        accepts_ofw: false,
        other_qualifications: 'Rotating weekend support may be assigned.',
        filter_mode: 'strict',
        status: 'open',
    },
    {
        slug: 'solar-installation-technician',
        employer_email: 'careers@sunridge-energy.seed.peso-connect.test',
        title: 'Solar Installation Technician',
        category: 'energy',
        type: 'permanent',
        work_arrangement: 'on-site',
        work_province: 'Negros Occidental',
        work_city: 'San Carlos City',
        vacancies: 4,
        job_summary: 'Install rooftop solar systems and perform electrical checks for residential and SME clients.',
        key_responsibilities: 'Interpret system layouts, mount rails and panels, route cabling, perform energization checks, and complete worksite safety documentation.',
        salary_min: 22000,
        salary_max: 32000,
        benefits: ['Health Insurance', 'Transportation Allowance', 'Training & Development'],
        education_level: 'vocational',
        course_strand: 'Electrical Installation and Maintenance',
        experience_level: '1-3',
        required_skills: ['Electrical Installation', 'Solar Panel Installation', 'Electrical Safety'],
        preferred_skills: ['Net Metering', 'Low Voltage Systems', 'Generator Operation'],
        required_languages: [],
        licenses_certifications: 'Electrical Installation and Maintenance NC II',
        required_licenses: ['Electrical Installation and Maintenance NC II'],
        accepts_pwd: false,
        pwd_disabilities: [],
        accepts_ofw: false,
        other_qualifications: 'Willing to work on rooftops and travel for field jobs.',
        filter_mode: 'strict',
        status: 'open',
    },
    {
        slug: 'distribution-line-technician',
        employer_email: 'careers@sunridge-energy.seed.peso-connect.test',
        title: 'Distribution Line Technician',
        category: 'energy',
        type: 'permanent',
        work_arrangement: 'on-site',
        work_province: 'Negros Occidental',
        work_city: 'San Carlos City',
        vacancies: 2,
        job_summary: 'Assist line crews with preventive maintenance and fault response work on distribution assets.',
        key_responsibilities: 'Support pole-top maintenance, string service drops, perform grounding checks, maintain field logs, and follow line safety procedures.',
        salary_min: 23000,
        salary_max: 31000,
        benefits: ['Health Insurance', 'Meal Allowance', '13th Month Pay'],
        education_level: 'vocational',
        course_strand: 'Electrical or lineman training',
        experience_level: '1-3',
        required_skills: ['Power Line Maintenance', 'Electrical Wiring', 'Electrical Safety'],
        preferred_skills: ['Lineman Work', 'Grounding Systems', 'Metering Systems'],
        required_languages: [],
        licenses_certifications: 'Valid driver license; Lineman safety training',
        required_licenses: ['Valid driver license'],
        accepts_pwd: false,
        pwd_disabilities: [],
        accepts_ofw: false,
        other_qualifications: 'Must be comfortable with field response during outages.',
        filter_mode: 'strict',
        status: 'open',
    },
    {
        slug: 'farm-operations-coordinator',
        employer_email: 'recruitment@greenharvest-agri.seed.peso-connect.test',
        title: 'Farm Operations Coordinator',
        category: 'agriculture',
        type: 'permanent',
        work_arrangement: 'on-site',
        work_province: 'Negros Occidental',
        work_city: 'San Carlos City',
        vacancies: 2,
        job_summary: 'Coordinate production schedules, irrigation plans, labor deployment, and field reporting across partner farms.',
        key_responsibilities: 'Monitor crop stages, validate field records, prepare input usage reports, track irrigation schedules, and coordinate with agronomy and hauling teams.',
        salary_min: 23000,
        salary_max: 33000,
        benefits: ['Meal Allowance', 'Transportation Allowance', 'Training & Development'],
        education_level: 'college',
        course_strand: 'Agriculture, Agribusiness, or related field',
        experience_level: '1-3',
        required_skills: ['Crop Management', 'Farm Record Keeping', 'Irrigation'],
        preferred_skills: ['Post-Harvest Handling', 'Quality Control', 'MS Office'],
        required_languages: [],
        licenses_certifications: '',
        required_licenses: [],
        accepts_pwd: false,
        pwd_disabilities: [],
        accepts_ofw: false,
        other_qualifications: 'Motorcycle travel between partner fields is common.',
        filter_mode: 'strict',
        status: 'open',
    },
    {
        slug: 'post-harvest-quality-inspector',
        employer_email: 'recruitment@greenharvest-agri.seed.peso-connect.test',
        title: 'Post-Harvest Quality Inspector',
        category: 'agriculture',
        type: 'contractual',
        work_arrangement: 'on-site',
        work_province: 'Negros Occidental',
        work_city: 'San Carlos City',
        vacancies: 3,
        job_summary: 'Inspect produce condition, moisture compliance, and lot traceability before dispatch to buyers.',
        key_responsibilities: 'Inspect receiving lots, tag non-conforming produce, prepare quality summaries, coordinate re-sorting, and maintain dispatch documentation.',
        salary_min: 18000,
        salary_max: 24000,
        benefits: ['Meal Allowance', 'SSS/PhilHealth/Pag-IBIG'],
        education_level: 'senior-high',
        course_strand: 'Agri-Fishery Arts, STEM, or related field',
        experience_level: 'entry',
        required_skills: ['Post-Harvest Handling', 'Quality Control', 'Farm Record Keeping'],
        preferred_skills: ['MS Office', 'Cold Storage Handling'],
        required_languages: [],
        licenses_certifications: '',
        required_licenses: [],
        accepts_pwd: true,
        pwd_disabilities: ['physical'],
        accepts_ofw: false,
        other_qualifications: 'Detail-oriented candidates with produce handling exposure are preferred.',
        filter_mode: 'flexible',
        status: 'open',
    },
    {
        slug: 'front-desk-associate',
        employer_email: 'jobs@harborview-hospitality.seed.peso-connect.test',
        title: 'Front Desk Associate',
        category: 'hospitality',
        type: 'permanent',
        work_arrangement: 'on-site',
        work_province: 'Negros Occidental',
        work_city: 'San Carlos City',
        vacancies: 2,
        job_summary: 'Serve as the primary guest-facing contact for check-in, reservations, and room coordination.',
        key_responsibilities: 'Handle arrivals and departures, answer reservation inquiries, coordinate housekeeping requests, log incidents, and maintain front office standards.',
        salary_min: 18000,
        salary_max: 25000,
        benefits: ['Health Insurance', 'Meal Allowance', 'Paid Leave'],
        education_level: 'college',
        course_strand: 'Hospitality, Tourism, or related field',
        experience_level: '1-3',
        required_skills: ['Front Desk', 'Guest Relations', 'Reservation Management'],
        preferred_skills: ['Check-in/Check-out Processing', 'Complaint Resolution'],
        required_languages: ['English'],
        licenses_certifications: '',
        required_licenses: [],
        accepts_pwd: false,
        pwd_disabilities: [],
        accepts_ofw: true,
        other_qualifications: 'Night shift and weekend rotation required.',
        filter_mode: 'strict',
        status: 'open',
    },
    {
        slug: 'banquet-pastry-chef',
        employer_email: 'jobs@harborview-hospitality.seed.peso-connect.test',
        title: 'Banquet Pastry Chef',
        category: 'hospitality',
        type: 'permanent',
        work_arrangement: 'on-site',
        work_province: 'Negros Occidental',
        work_city: 'San Carlos City',
        vacancies: 1,
        job_summary: 'Lead pastry production for hotel banquets, plated desserts, and special event orders.',
        key_responsibilities: 'Plan pastry prep, enforce portion and food safety standards, supervise decorators, cost recipes, and coordinate event delivery timing.',
        salary_min: 26000,
        salary_max: 36000,
        benefits: ['Health Insurance', 'Meal Allowance', 'Performance Bonus'],
        education_level: 'college',
        course_strand: 'Hospitality or culinary arts',
        experience_level: '3-5',
        required_skills: ['Baking', 'Pastry Making', 'Food Safety'],
        preferred_skills: ['Cake Decorating', 'Food Cost Control', 'Kitchen Management'],
        required_languages: [],
        licenses_certifications: '',
        required_licenses: [],
        accepts_pwd: false,
        pwd_disabilities: [],
        accepts_ofw: false,
        other_qualifications: 'Portfolio of recent plated dessert or event work required.',
        filter_mode: 'strict',
        status: 'open',
    },
    {
        slug: 'retail-operations-supervisor',
        employer_email: 'hiring@marketbridge-retail.seed.peso-connect.test',
        title: 'Retail Operations Supervisor',
        category: 'retail',
        type: 'permanent',
        work_arrangement: 'on-site',
        work_province: 'Negros Occidental',
        work_city: 'San Carlos City',
        vacancies: 2,
        job_summary: 'Supervise daily retail operations, shift performance, inventory control, and visual standards across assigned stores.',
        key_responsibilities: 'Lead shift teams, monitor stock accuracy, validate cash controls, coach frontline staff, and submit daily KPI and shrinkage reports.',
        salary_min: 22000,
        salary_max: 32000,
        benefits: ['Health Insurance', '13th Month Pay', 'Paid Leave'],
        education_level: 'senior-high',
        course_strand: 'Business-related strand preferred',
        experience_level: '3-5',
        required_skills: ['Inventory Management', 'Team Supervision', 'POS Operation'],
        preferred_skills: ['Sales Reporting', 'KPI Tracking', 'Cash Handling'],
        required_languages: [],
        licenses_certifications: '',
        required_licenses: [],
        accepts_pwd: false,
        pwd_disabilities: [],
        accepts_ofw: false,
        other_qualifications: 'Experience handling multi-shift retail operations is preferred.',
        filter_mode: 'strict',
        status: 'open',
    },
    {
        slug: 'ecommerce-catalog-specialist',
        employer_email: 'hiring@marketbridge-retail.seed.peso-connect.test',
        title: 'E-commerce Catalog Specialist',
        category: 'retail',
        type: 'permanent',
        work_arrangement: 'hybrid',
        work_province: 'Negros Occidental',
        work_city: 'San Carlos City',
        vacancies: 3,
        job_summary: 'Maintain product listings, item attributes, and online catalog quality across marketplace channels.',
        key_responsibilities: 'Create and update listings, standardize product data, review image and title quality, coordinate markdowns, and prepare weekly catalog audit reports.',
        salary_min: 18000,
        salary_max: 25000,
        benefits: ['Training & Development', 'Paid Leave', 'Performance Bonus'],
        education_level: 'senior-high',
        course_strand: 'ICT, ABM, or related track',
        experience_level: 'entry',
        required_skills: ['Data Entry', 'MS Office', 'Product Knowledge'],
        preferred_skills: ['E-commerce Management', 'Customer Service', 'Social Media'],
        required_languages: ['English'],
        licenses_certifications: '',
        required_licenses: [],
        accepts_pwd: true,
        pwd_disabilities: ['physical', 'hearing'],
        accepts_ofw: false,
        other_qualifications: 'Hybrid schedule after onboarding; detail accuracy is critical.',
        filter_mode: 'flexible',
        status: 'open',
    },
]

const seedApplications = [
    { applicant_email: 'arianne.villareal@seed.peso-connect.test', job_slug: 'junior-full-stack-developer', status: 'shortlisted' },
    { applicant_email: 'joel.espina@seed.peso-connect.test', job_slug: 'it-service-desk-analyst', status: 'pending' },
    { applicant_email: 'rogelio.paderanga@seed.peso-connect.test', job_slug: 'solar-installation-technician', status: 'shortlisted' },
    { applicant_email: 'noel.agbayani@seed.peso-connect.test', job_slug: 'farm-operations-coordinator', status: 'pending' },
    { applicant_email: 'leah.monterde@seed.peso-connect.test', job_slug: 'front-desk-associate', status: 'shortlisted' },
    { applicant_email: 'fatima.ramos@seed.peso-connect.test', job_slug: 'front-desk-associate', status: 'pending' },
    { applicant_email: 'patricia.lloren@seed.peso-connect.test', job_slug: 'banquet-pastry-chef', status: 'hired' },
    { applicant_email: 'melissa.catalan@seed.peso-connect.test', job_slug: 'retail-operations-supervisor', status: 'pending' },
    { applicant_email: 'dante.villasis@seed.peso-connect.test', job_slug: 'retail-operations-supervisor', status: 'rejected' },
    { applicant_email: 'karen.torres@seed.peso-connect.test', job_slug: 'ecommerce-catalog-specialist', status: 'pending' },
    { applicant_email: 'sofia.madamba@seed.peso-connect.test', job_slug: 'ecommerce-catalog-specialist', status: 'shortlisted' },
    { applicant_email: 'miguel.soriano@seed.peso-connect.test', job_slug: 'distribution-line-technician', status: 'rejected' },
]

const seedConversations = [
    {
        participants: ['arianne.villareal@seed.peso-connect.test', 'talent@northpoint-digital.seed.peso-connect.test'],
        job_slug: 'junior-full-stack-developer',
        messages: [
            { sender: 'talent@northpoint-digital.seed.peso-connect.test', text: 'Hi Arianne, your background is aligned with our Junior Full Stack Developer opening. Are you available for a coding assessment on Thursday?' },
            { sender: 'arianne.villareal@seed.peso-connect.test', text: 'Yes, Thursday works for me. Please send the assessment window and any stack requirements I should prepare for.' },
            { sender: 'talent@northpoint-digital.seed.peso-connect.test', text: 'Great. We will send the assessment link tomorrow. It covers React, API consumption, and SQL basics.' },
        ],
    },
    {
        participants: ['rogelio.paderanga@seed.peso-connect.test', 'careers@sunridge-energy.seed.peso-connect.test'],
        job_slug: 'solar-installation-technician',
        messages: [
            { sender: 'careers@sunridge-energy.seed.peso-connect.test', text: 'Good day, Rogelio. We reviewed your solar and electrical credentials. Can you attend a practical trade test this Friday at 8:00 AM?' },
            { sender: 'rogelio.paderanga@seed.peso-connect.test', text: 'Yes, I can attend on Friday. I will bring my TESDA and safety certificates.' },
            { sender: 'careers@sunridge-energy.seed.peso-connect.test', text: 'Please report to our Codcod service yard and wear field-safe clothing.' },
        ],
    },
    {
        participants: ['patricia.lloren@seed.peso-connect.test', 'jobs@harborview-hospitality.seed.peso-connect.test'],
        job_slug: 'banquet-pastry-chef',
        messages: [
            { sender: 'jobs@harborview-hospitality.seed.peso-connect.test', text: 'Patricia, we are pleased to confirm your selection for the Banquet Pastry Chef role. Your tasting panel scored highest this cycle.' },
            { sender: 'patricia.lloren@seed.peso-connect.test', text: 'Thank you. Please share the onboarding date and the documents I should bring on day one.' },
            { sender: 'jobs@harborview-hospitality.seed.peso-connect.test', text: 'Orientation is on Monday at 9:00 AM. Bring a valid ID, health certificate, and your latest employment records.' },
        ],
    },
    {
        participants: ['sofia.madamba@seed.peso-connect.test', 'hiring@marketbridge-retail.seed.peso-connect.test'],
        job_slug: 'ecommerce-catalog-specialist',
        messages: [
            { sender: 'hiring@marketbridge-retail.seed.peso-connect.test', text: 'Hi Sofia, we like your spreadsheet and virtual catalog experience. Are you comfortable with a hybrid setup after the first month of onsite onboarding?' },
            { sender: 'sofia.madamba@seed.peso-connect.test', text: 'Yes. I can complete onsite onboarding in San Carlos City and then transition to a hybrid schedule.' },
            { sender: 'hiring@marketbridge-retail.seed.peso-connect.test', text: 'Noted. We will schedule your next interview with the catalog operations lead this week.' },
        ],
    },
]

async function waitForPublicUser(userId) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .maybeSingle()

        if (error) throw error
        if (data?.id) return data.id
        await sleep(300)
    }
    throw new Error(`Timed out waiting for public.users row for ${userId}`)
}

async function createManagedUser(record, role, subtype = null) {
    const metadata = { role }
    if (subtype) metadata.subtype = subtype

    let userId = null
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: record.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: metadata,
    })

    if (authError) {
        if (authError.message?.includes('already been registered')) {
            const { data: existing } = await supabase
                .from('users')
                .select('id')
                .eq('email', record.email)
                .maybeSingle()
            if (existing?.id) {
                userId = existing.id
            } else {
                throw new Error(`Auth user already exists for ${record.email}, but no public.users row was found.`)
            }
        } else {
            throw authError
        }
    } else {
        userId = authData.user.id
    }

    await waitForPublicUser(userId)

    const baseUpdate = {
        ...record.base,
        role,
        subtype,
        updated_at: NOW_ISO(),
    }

    const { error: baseError } = await supabase
        .from('users')
        .update(baseUpdate)
        .eq('id', userId)

    if (baseError) throw baseError

    const profileTable = role === 'employer' ? 'employer_profiles' : 'jobseeker_profiles'
    const { error: profileError } = await supabase
        .from(profileTable)
        .upsert({
            id: userId,
            ...record.profile,
            updated_at: NOW_ISO(),
        }, { onConflict: 'id' })

    if (profileError) throw profileError

    return userId
}

function getDisplayNameByEmail(email) {
    const jobseeker = jobseekers.find((record) => record.email === email)
    if (jobseeker) return jobseeker.profile.full_name
    const employer = employers.find((record) => record.email === email)
    if (employer) return employer.profile.company_name
    return email
}

function buildJobInsertPayload(job, employerId) {
    return {
        employer_id: employerId,
        employer_name: getDisplayNameByEmail(job.employer_email),
        title: job.title,
        category: job.category,
        type: job.type,
        work_arrangement: job.work_arrangement,
        work_province: job.work_province,
        work_city: job.work_city,
        location: `${job.work_city}, ${job.work_province}`,
        vacancies: job.vacancies,
        job_summary: job.job_summary,
        key_responsibilities: job.key_responsibilities,
        description: combineDescription(job.job_summary, job.key_responsibilities),
        salary_range: `PHP ${job.salary_min.toLocaleString()} - PHP ${job.salary_max.toLocaleString()}`,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        benefits: job.benefits,
        education_level: job.education_level,
        course_strand: job.course_strand,
        experience_level: job.experience_level,
        requirements: job.required_skills,
        required_skills: job.required_skills,
        preferred_skills: job.preferred_skills,
        required_languages: job.required_languages,
        licenses_certifications: job.licenses_certifications || null,
        required_licenses: job.required_licenses,
        accepts_pwd: job.accepts_pwd,
        pwd_disabilities: job.accepts_pwd ? job.pwd_disabilities : [],
        accepts_ofw: job.accepts_ofw,
        other_qualifications: job.other_qualifications,
        education_is_required: job.filter_mode === 'strict' && job.education_level !== 'none',
        languages_are_required: job.filter_mode === 'strict' && job.required_languages.length > 0,
        licenses_are_required: job.filter_mode === 'strict' && job.required_licenses.length > 0,
        hard_filters_source: 'employer',
        hard_filters_updated_at: NOW_ISO(),
        filter_mode: job.filter_mode,
        ai_matching_enabled: true,
        deadline: daysFromNow(45),
        status: job.status,
    }
}

async function resetManagedDummyData() {
    const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, email, role, subtype')

    if (usersError) throw usersError

    const employerEmailSet = new Set(employers.map((record) => record.email))
    const jobseekerEmailSet = new Set(jobseekers.map((record) => record.email))
    const managedUsers = (allUsers || [])
        .filter((row) => isManagedDummyEmail(row.email))

    if (managedUsers.length === 0) {
        console.log('No managed dummy employers or jobseekers found.')
        return {
            removedUsers: 0,
            removedConversations: 0,
            removedMessages: 0,
            removedJobs: 0,
            removedApplications: 0,
        }
    }

    const employerIds = managedUsers
        .filter((row) => row.role === 'employer' || employerEmailSet.has(row.email))
        .map((row) => row.id)
    const jobseekerIds = managedUsers
        .filter((row) => (row.role === 'user' && row.subtype === 'jobseeker') || jobseekerEmailSet.has(row.email))
        .map((row) => row.id)
    const userIds = managedUsers.map((row) => row.id)
    const userIdSet = new Set(userIds)

    let jobIds = []
    if (employerIds.length > 0) {
        const { data: managedJobs, error: managedJobsError } = await supabase
            .from('job_postings')
            .select('id')
            .in('employer_id', employerIds)

        if (managedJobsError) throw managedJobsError
        jobIds = (managedJobs || []).map((row) => row.id)
    }

    const { data: conversations, error: conversationFetchError } = await supabase
        .from('conversations')
        .select('id, participants')

    if (conversationFetchError) throw conversationFetchError

    const conversationIds = (conversations || [])
        .filter((conversation) =>
            Array.isArray(conversation.participants)
            && conversation.participants.some((participantId) => userIdSet.has(participantId)))
        .map((conversation) => conversation.id)

    let removedMessages = 0
    if (conversationIds.length > 0) {
        const { data, error: messageDeleteError } = await supabase
            .from('messages')
            .delete()
            .in('conversation_id', conversationIds)
            .select('id')
        if (messageDeleteError) throw messageDeleteError
        if (data) {
            removedMessages = data.length
            console.log(`Removed managed messages: ${removedMessages}`)
        }
    }

    if (conversationIds.length > 0) {
        const { error: conversationDeleteError } = await supabase
            .from('conversations')
            .delete()
            .in('id', conversationIds)
        if (conversationDeleteError) throw conversationDeleteError
    }

    let removedApplications = 0
    if (jobIds.length > 0 || jobseekerIds.length > 0) {
        const applicationFilters = []

        if (jobIds.length > 0) {
            applicationFilters.push(supabase.from('applications').delete().in('job_id', jobIds).select('id'))
        }
        if (jobseekerIds.length > 0) {
            applicationFilters.push(supabase.from('applications').delete().in('user_id', jobseekerIds).select('id'))
        }

        for (const request of applicationFilters) {
            const { data, error } = await request
            if (error) throw error
            removedApplications += data?.length || 0
        }
    }

    if (jobIds.length > 0) {
        const cleanupTables = [
            { table: 'saved_jobs', column: 'job_id' },
            { table: 'match_scores_cache', column: 'job_id' },
            { table: 'job_embeddings', column: 'job_id' },
        ]

        for (const cleanup of cleanupTables) {
            const { error } = await supabase
                .from(cleanup.table)
                .delete()
                .in(cleanup.column, jobIds)
            if (error) throw error
        }

        const { error: jobDeleteError } = await supabase
            .from('job_postings')
            .delete()
            .in('id', jobIds)
        if (jobDeleteError) throw jobDeleteError
    }

    if (jobseekerIds.length > 0) {
        const seekerCleanupTables = [
            { table: 'saved_jobs', column: 'user_id' },
            { table: 'match_scores_cache', column: 'user_id' },
            { table: 'profile_embeddings', column: 'user_id' },
        ]

        for (const cleanup of seekerCleanupTables) {
            const { error } = await supabase
                .from(cleanup.table)
                .delete()
                .in(cleanup.column, jobseekerIds)
            if (error) throw error
        }
    }

    for (const row of managedUsers) {
        const { error } = await supabase.auth.admin.deleteUser(row.id)
        if (error && !error.message?.toLowerCase().includes('not found')) {
            throw error
        }
    }

    const { error: publicDeleteError } = await supabase
        .from('users')
        .delete()
        .in('id', userIds)

    if (publicDeleteError) throw publicDeleteError

    return {
        removedUsers: managedUsers.length,
        removedConversations: conversationIds.length,
        removedMessages,
        removedJobs: jobIds.length,
        removedApplications,
    }
}

async function seed() {
    console.log('=== PESO-Connect system test data rebuild ===')
    console.log(`Target: ${supabaseUrl}`)
    console.log(`Shared password: ${PASSWORD}\n`)

    console.log('--- Reset managed dummy data ---')
    const resetSummary = await resetManagedDummyData()
    console.log(`Removed users: ${resetSummary.removedUsers}`)
    console.log(`Removed conversations: ${resetSummary.removedConversations}`)
    console.log(`Removed messages: ${resetSummary.removedMessages}`)
    console.log(`Removed applications: ${resetSummary.removedApplications}`)
    console.log(`Removed jobs: ${resetSummary.removedJobs}\n`)

    const userIdByEmail = {}

    console.log('--- Seed employers ---')
    for (const employer of employers) {
        const id = await createManagedUser(employer, 'employer')
        userIdByEmail[employer.email] = id
        console.log(`OK employer ${employer.email} (${id})`)
    }

    console.log('\n--- Seed jobseekers ---')
    for (const jobseeker of jobseekers) {
        const id = await createManagedUser(jobseeker, 'user', 'jobseeker')
        userIdByEmail[jobseeker.email] = id
        console.log(`OK jobseeker ${jobseeker.email} (${id})`)
    }

    console.log('\n--- Seed job postings ---')
    const jobIdBySlug = {}
    for (const job of jobPostings) {
        const employerId = userIdByEmail[job.employer_email]
        if (!employerId) {
            throw new Error(`Employer not seeded for job ${job.slug}: ${job.employer_email}`)
        }

        const { data, error } = await supabase
            .from('job_postings')
            .insert(buildJobInsertPayload(job, employerId))
            .select('id')
            .single()

        if (error) throw error
        jobIdBySlug[job.slug] = data.id
        console.log(`OK job ${job.slug} (${data.id})`)
    }

    console.log('\n--- Seed applications ---')
    const applicationCountByJobId = new Map()
    for (const application of seedApplications) {
        const userId = userIdByEmail[application.applicant_email]
        const jobId = jobIdBySlug[application.job_slug]
        const applicantRecord = jobseekers.find((record) => record.email === application.applicant_email)
        const jobRecord = jobPostings.find((record) => record.slug === application.job_slug)

        if (!userId || !jobId || !applicantRecord || !jobRecord) {
            throw new Error(`Invalid application seed: ${JSON.stringify(application)}`)
        }

        const { error } = await supabase
            .from('applications')
            .insert({
                job_id: jobId,
                job_title: jobRecord.title,
                user_id: userId,
                applicant_name: applicantRecord.profile.full_name,
                applicant_email: application.applicant_email,
                applicant_skills: [...applicantRecord.profile.predefined_skills, ...applicantRecord.profile.skills],
                resume_url: applicantRecord.profile.resume_url,
                status: application.status,
                justification_text: jobRecord.filter_mode === 'flexible' ? 'Seeded for matching QA benchmark.' : null,
                created_at: isoOffsetFromNow({ days: -4, minutes: applicationCountByJobId.size * 18 }),
                updated_at: NOW_ISO(),
            })

        if (error) throw error
        applicationCountByJobId.set(jobId, (applicationCountByJobId.get(jobId) || 0) + 1)
        console.log(`OK application ${application.applicant_email} -> ${application.job_slug} (${application.status})`)
    }

    for (const [jobId, count] of applicationCountByJobId.entries()) {
        const { error } = await supabase
            .from('job_postings')
            .update({ applications_count: count, updated_at: NOW_ISO() })
            .eq('id', jobId)
        if (error) throw error
    }

    console.log('\n--- Seed conversations ---')
    for (let convoIndex = 0; convoIndex < seedConversations.length; convoIndex += 1) {
        const convo = seedConversations[convoIndex]
        const participantIds = convo.participants.map((email) => userIdByEmail[email])
        if (participantIds.some((id) => !id)) {
            throw new Error(`Missing participant in conversation ${convo.job_slug}`)
        }

        const sortedParticipantIds = [...participantIds].sort()
        const conversationId = `${sortedParticipantIds[0]}_${sortedParticipantIds[1]}`
        const participantInfo = Object.fromEntries(
            convo.participants.map((email) => [
                userIdByEmail[email],
                { name: getDisplayNameByEmail(email), email },
            ])
        )

        const lastMessage = convo.messages[convo.messages.length - 1]
        const lastSenderId = userIdByEmail[lastMessage.sender]
        const baseTimestamp = isoOffsetFromNow({ days: -2 + convoIndex, minutes: -10 * convo.messages.length })

        const { error: conversationError } = await supabase
            .from('conversations')
            .insert({
                id: conversationId,
                participants: sortedParticipantIds,
                participant_info: participantInfo,
                last_message: {
                    text: lastMessage.text,
                    sender_id: lastSenderId,
                    created_at: baseTimestamp,
                },
                unread_count: {
                    [sortedParticipantIds[0]]: lastSenderId === sortedParticipantIds[0] ? 0 : 1,
                    [sortedParticipantIds[1]]: lastSenderId === sortedParticipantIds[1] ? 0 : 1,
                },
                job_id: jobIdBySlug[convo.job_slug] || null,
                job_title: (jobPostings.find((job) => job.slug === convo.job_slug) || {}).title || null,
                created_at: baseTimestamp,
                updated_at: NOW_ISO(),
            })

        if (conversationError) throw conversationError

        for (let index = 0; index < convo.messages.length; index += 1) {
            const message = convo.messages[index]
            const senderId = userIdByEmail[message.sender]
            const createdAt = isoOffsetFromNow({ days: -2 + convoIndex, minutes: -(convo.messages.length - index) * 5 })
            const { error: messageError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    text: message.text,
                    sender_id: senderId,
                    sender_name: getDisplayNameByEmail(message.sender),
                    read_by: sortedParticipantIds,
                    created_at: createdAt,
                })
            if (messageError) throw messageError
        }

        console.log(`OK conversation ${convo.job_slug}`)
    }

    console.log('\n=== Rebuild complete ===')
    console.log(`Employers: ${employers.length}`)
    console.log(`Jobseekers: ${jobseekers.length}`)
    console.log(`Jobs: ${jobPostings.length}`)
    console.log(`Applications: ${seedApplications.length}`)
    console.log(`Conversations: ${seedConversations.length}`)
    console.log('\nBenchmark pairs to validate AI matching:')
    console.log('- Strong fit: Arianne Villareal <-> Junior Full Stack Developer')
    console.log('- Strong fit: Rogelio Paderanga <-> Solar Installation Technician')
    console.log('- Strong fit: Patricia Lloren <-> Banquet Pastry Chef')
    console.log('- Inclusive fit: Karen Torres <-> E-commerce Catalog Specialist')
    console.log('- Transferable skills: Sofia Madamba <-> E-commerce Catalog Specialist')
    console.log('- Overqualified edge: Dante Villasis <-> Retail Operations Supervisor')
    console.log('- Hard-filter rejection edge: Miguel Soriano <-> Distribution Line Technician')
    console.log(`\nAll seeded users use password: ${PASSWORD}`)
}

seed().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
})

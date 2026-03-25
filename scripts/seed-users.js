/**
 * Seed script for PESO-Connect platform.
 * Creates test users, job postings, applications, and conversations via Supabase Admin API.
 *
 * Usage:  node scripts/seed-users.js
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config() // load .env

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

const PASSWORD = 'Test1234!'

// ═══════════════════════════════════════════════════════════════
// SEED DATA — USERS
// ═══════════════════════════════════════════════════════════════

const jobseekers = [
    {
        email: 'maria.santos@test.com',
        base: { name: 'Maria Santos', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Maria Clara Santos',
            date_of_birth: '1998-05-14',
            barangay: 'Rizal',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: '09171234567',
            preferred_contact_method: 'email',
            preferred_job_type: ['full-time'],
            preferred_job_location: 'San Carlos City',
            expected_salary_min: '15000',
            expected_salary_max: '25000',
            willing_to_relocate: 'yes',
            highest_education: 'college',
            school_name: 'Carlos Hilado Memorial State University',
            course_or_field: 'BS Information Technology',
            year_graduated: '2020',
            skills: ['Web Development', 'MS Office', 'Data Entry', 'Customer Service', 'JavaScript', 'React'],
            work_experiences: [
                { company: 'TechStart Inc.', position: 'Junior Developer', duration: '2020-2022', description: 'Frontend web development' },
                { company: 'Freelance', position: 'Web Developer', duration: '2022-present', description: 'Building websites for local businesses' }
            ],
            certifications: ['TESDA NC II - Computer Programming', 'Google IT Support Certificate'],
            portfolio_url: 'https://mariasantos.dev',
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            gender: 'female',
            civil_status: 'single',
            is_pwd: false,
            languages: [{ language: 'Filipino', proficiency: 'native' }, { language: 'English', proficiency: 'fluent' }],
        }
    },
    {
        email: 'juan.delacruz@test.com',
        base: { name: 'Juan Dela Cruz', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Juan Miguel Dela Cruz',
            date_of_birth: '1995-11-22',
            barangay: 'Guadalupe',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: '09281234568',
            preferred_contact_method: 'phone',
            preferred_job_type: ['full-time', 'contract'],
            preferred_job_location: 'San Carlos City',
            expected_salary_min: '12000',
            expected_salary_max: '18000',
            willing_to_relocate: 'no',
            highest_education: 'vocational',
            school_name: 'TESDA Training Center - San Carlos',
            course_or_field: 'Electrical Installation and Maintenance',
            year_graduated: '2016',
            skills: ['Electrical Work', 'Electrical Installation', 'Plumbing', 'Carpentry', 'Auto Repair', 'Welding'],
            work_experiences: [
                { company: 'San Carlos Electric Cooperative', position: 'Electrician', duration: '2016-2019', description: 'Residential and commercial electrical work' },
                { company: 'Self-Employed', position: 'General Contractor', duration: '2019-present', description: 'Electrical, plumbing, and general repair services' }
            ],
            certifications: ['TESDA NC II - Electrical Installation and Maintenance', 'TESDA NC II - Plumbing'],
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            gender: 'male',
            civil_status: 'married',
            is_pwd: false,
            languages: [{ language: 'Filipino', proficiency: 'native' }, { language: 'Hiligaynon', proficiency: 'native' }],
        }
    },
    {
        email: 'anna.reyes@test.com',
        base: { name: 'Anna Reyes', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Anna Marie Reyes',
            date_of_birth: '2001-03-08',
            barangay: 'Buluangan',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: '09351234569',
            preferred_contact_method: 'email',
            preferred_job_type: ['full-time', 'part-time'],
            preferred_job_location: 'San Carlos City',
            expected_salary_min: '10000',
            expected_salary_max: '15000',
            willing_to_relocate: 'yes',
            highest_education: 'college',
            school_name: 'La Consolacion College - Bacolod',
            course_or_field: 'BS Accountancy',
            year_graduated: '2023',
            skills: ['Cashiering', 'Inventory Management', 'MS Office', 'Data Entry', 'Customer Service', 'Sales'],
            work_experiences: [
                { company: 'SM City Bacolod', position: 'Sales Associate (OJT)', duration: '2022-2023', description: 'Customer service and inventory management' }
            ],
            certifications: [],
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            gender: 'female',
            civil_status: 'single',
            is_pwd: false,
            languages: [{ language: 'Filipino', proficiency: 'native' }, { language: 'English', proficiency: 'intermediate' }],
        }
    },
    {
        email: 'ricardo.garcia@test.com',
        base: { name: 'Ricardo Garcia', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Ricardo Lopez Garcia',
            date_of_birth: '1985-08-30',
            barangay: 'Punao',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: '09171234570',
            preferred_contact_method: 'phone',
            preferred_job_type: ['full-time'],
            preferred_job_location: 'San Carlos City',
            expected_salary_min: '20000',
            expected_salary_max: '35000',
            willing_to_relocate: 'no',
            highest_education: 'college',
            school_name: 'University of St. La Salle - Bacolod',
            course_or_field: 'BS Agriculture',
            year_graduated: '2007',
            skills: ['Farming', 'Crop Management', 'Livestock Care', 'Irrigation', 'Organic Farming', 'Farm Equipment Operation', 'Pest Control'],
            work_experiences: [
                { company: 'Department of Agriculture', position: 'Agricultural Technician', duration: '2008-2013', description: 'Farm extension work and crop advisory' },
                { company: 'Garcia Family Farm', position: 'Farm Manager', duration: '2013-present', description: 'Managing 5-hectare sugarcane and vegetable farm' }
            ],
            certifications: ['Organic Agriculture Certificate', 'Farm Machinery Operator License'],
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            gender: 'male',
            civil_status: 'married',
            is_pwd: false,
            languages: [{ language: 'Filipino', proficiency: 'native' }, { language: 'Hiligaynon', proficiency: 'native' }, { language: 'English', proficiency: 'basic' }],
        }
    },
    {
        email: 'grace.villanueva@test.com',
        base: { name: 'Grace Villanueva', is_verified: false, registration_complete: true },
        profile: {
            full_name: 'Grace Anne Villanueva',
            date_of_birth: '1992-12-03',
            barangay: 'Palampas',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: '09191234571',
            preferred_contact_method: 'email',
            preferred_job_type: ['full-time', 'part-time'],
            preferred_job_location: 'San Carlos City',
            expected_salary_min: '18000',
            expected_salary_max: '30000',
            willing_to_relocate: 'yes',
            highest_education: 'post-graduate',
            school_name: 'University of the Philippines - Diliman',
            course_or_field: 'Master in Public Administration',
            year_graduated: '2018',
            skills: ['Technical Support', 'Network Setup', 'Database Management', 'MS Office', 'Web Development', 'Computer Repair'],
            work_experiences: [
                { company: 'DICT Region VI', position: 'IT Specialist', duration: '2018-2022', description: 'Government IT infrastructure and support' },
                { company: 'Currently unemployed', position: '', duration: '2023-present', description: 'Looking for IT management roles' }
            ],
            certifications: ['CompTIA A+', 'CCNA'],
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            gender: 'female',
            civil_status: 'single',
            is_pwd: false,
            languages: [{ language: 'Filipino', proficiency: 'native' }, { language: 'English', proficiency: 'fluent' }],
        }
    },
    {
        email: 'pedro.mendoza@test.com',
        base: { name: 'Pedro Mendoza', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Pedro Jose Mendoza',
            date_of_birth: '2000-07-19',
            barangay: 'Quezon',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: '09061234572',
            preferred_contact_method: 'phone',
            preferred_job_type: ['part-time', 'temporary'],
            preferred_job_location: 'San Carlos City',
            expected_salary_min: '8000',
            expected_salary_max: '12000',
            willing_to_relocate: 'no',
            highest_education: 'high-school',
            school_name: 'San Carlos National High School',
            course_or_field: '',
            year_graduated: '2018',
            skills: ['Carpentry', 'Painting', 'Masonry', 'Welding'],
            work_experiences: [
                { company: 'Various construction sites', position: 'Construction Worker', duration: '2018-present', description: 'Carpentry, painting, and general construction' }
            ],
            certifications: ['TESDA NC II - Masonry'],
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            gender: 'male',
            civil_status: 'single',
            is_pwd: false,
            languages: [{ language: 'Hiligaynon', proficiency: 'native' }, { language: 'Filipino', proficiency: 'fluent' }],
        }
    },
    {
        email: 'rosa.lim@test.com',
        base: { name: 'Rosa Lim', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Rosa Christina Lim',
            date_of_birth: '1990-01-25',
            barangay: 'Codcod',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: '09221234573',
            preferred_contact_method: 'email',
            preferred_job_type: ['full-time'],
            preferred_job_location: 'San Carlos City',
            expected_salary_min: '25000',
            expected_salary_max: '40000',
            willing_to_relocate: 'yes',
            highest_education: 'college',
            school_name: 'University of San Agustin - Iloilo',
            course_or_field: 'BS Nursing',
            year_graduated: '2012',
            skills: ['Customer Service', 'Sales', 'Visual Merchandising', 'Inventory Management', 'POS Operation', 'Stock Management'],
            work_experiences: [
                { company: 'Mercury Drug - San Carlos', position: 'Pharmacist Assistant', duration: '2012-2015', description: 'Customer service and pharmaceutical sales' },
                { company: 'Gaisano Grand - San Carlos', position: 'Store Supervisor', duration: '2015-present', description: 'Team management, inventory, and customer relations' }
            ],
            certifications: ['First Aid Training', 'Retail Management Certificate'],
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            gender: 'female',
            civil_status: 'married',
            is_pwd: false,
            languages: [{ language: 'Filipino', proficiency: 'native' }, { language: 'English', proficiency: 'fluent' }, { language: 'Mandarin', proficiency: 'basic' }],
        }
    },
    {
        email: 'mark.aquino@test.com',
        base: { name: 'Mark Aquino', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Mark Anthony Aquino',
            date_of_birth: '1997-09-11',
            barangay: 'Sipaway',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: '09431234574',
            preferred_contact_method: 'email',
            preferred_job_type: ['full-time', 'contract'],
            preferred_job_location: 'San Carlos City',
            expected_salary_min: '15000',
            expected_salary_max: '22000',
            willing_to_relocate: 'yes',
            highest_education: 'vocational',
            school_name: 'TESDA Training Center - San Carlos',
            course_or_field: 'Motorcycle/Small Engine Servicing',
            year_graduated: '2017',
            skills: ['Motorcycle Repair', 'Auto Repair', 'Welding', 'Generator Operation', 'Solar Panel Installation'],
            work_experiences: [
                { company: 'Honda 3S Shop - San Carlos', position: 'Motorcycle Technician', duration: '2017-2021', description: 'Motorcycle repair and maintenance' },
                { company: 'SunPower Energy Solutions', position: 'Solar Technician', duration: '2021-present', description: 'Solar panel installation and maintenance' }
            ],
            certifications: ['TESDA NC II - Motorcycle Servicing', 'Solar PV Installation Certificate'],
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            gender: 'male',
            civil_status: 'single',
            is_pwd: false,
            languages: [{ language: 'Filipino', proficiency: 'native' }, { language: 'English', proficiency: 'intermediate' }],
        }
    },
]

const employers = [
    {
        email: 'hr@sancarloscoop.test.com',
        base: { name: 'San Carlos Multi-Purpose Cooperative', is_verified: true, registration_complete: true },
        profile: {
            company_name: 'San Carlos Multi-Purpose Cooperative',
            employer_type: 'cooperative',
            business_reg_number: 'CDA-2015-0042',
            business_address: 'T. Ganzon St., Brgy. Rizal, San Carlos City, Negros Occidental',
            nature_of_business: 'Financial Services / Cooperative',
            representative_name: 'Elena Bautista',
            representative_position: 'HR Manager',
            contact_email: 'hr@sancarloscoop.test.com',
            contact_number: '09171111001',
            preferred_contact_method: 'email',
            terms_accepted: true,
            peso_consent: true,
            labor_compliance: true,
            employer_status: 'approved',
            company_description: 'Leading cooperative in San Carlos City serving over 15,000 members with savings, loans, and livelihood programs.',
            company_size: '51-200',
            year_established: '1995',
        }
    },
    {
        email: 'recruitment@peso-sancarlos.test.com',
        base: { name: 'PESO San Carlos City', is_verified: true, registration_complete: true },
        profile: {
            company_name: 'Public Employment Service Office - San Carlos City',
            employer_type: 'government',
            business_reg_number: 'LGU-SC-PESO-001',
            business_address: 'City Hall, San Carlos City, Negros Occidental',
            nature_of_business: 'Government / Public Employment Services',
            representative_name: 'Roberto Magno',
            representative_position: 'PESO Manager',
            contact_email: 'recruitment@peso-sancarlos.test.com',
            contact_number: '09171111002',
            preferred_contact_method: 'email',
            terms_accepted: true,
            peso_consent: true,
            labor_compliance: true,
            employer_status: 'approved',
            company_description: 'Government office providing free employment facilitation services, career guidance, and livelihood programs for San Carlos City residents.',
            company_size: '11-50',
            year_established: '2000',
        }
    },
    {
        email: 'hiring@greenfields-bpo.test.com',
        base: { name: 'Greenfields BPO Solutions', is_verified: true, registration_complete: true },
        profile: {
            company_name: 'Greenfields BPO Solutions Inc.',
            employer_type: 'private',
            business_reg_number: 'SEC-2019-00891',
            business_address: '2F Greenfields Bldg., National Highway, San Carlos City, Negros Occidental',
            nature_of_business: 'Business Process Outsourcing',
            representative_name: 'Michael Tan',
            representative_position: 'Operations Manager',
            contact_email: 'hiring@greenfields-bpo.test.com',
            contact_number: '09171111003',
            preferred_contact_method: 'email',
            terms_accepted: true,
            peso_consent: true,
            labor_compliance: true,
            employer_status: 'approved',
            company_description: 'BPO company specializing in customer support, data processing, and back-office operations for international clients.',
            company_size: '201-500',
            year_established: '2019',
        }
    },
    {
        email: 'jobs@crystal-sugar.test.com',
        base: { name: 'Crystal Sugar Milling Corp', is_verified: false, registration_complete: true },
        profile: {
            company_name: 'Crystal Sugar Milling Corporation',
            employer_type: 'private',
            business_reg_number: 'SEC-2005-01234',
            business_address: 'Hacienda Cristal, Brgy. Punao, San Carlos City, Negros Occidental',
            nature_of_business: 'Sugar Manufacturing / Agriculture',
            representative_name: 'Antonio Ledesma',
            representative_position: 'HR Director',
            contact_email: 'jobs@crystal-sugar.test.com',
            contact_number: '09171111004',
            preferred_contact_method: 'phone',
            terms_accepted: true,
            peso_consent: true,
            labor_compliance: true,
            employer_status: 'pending',
            company_description: 'Sugar milling company serving the planters of northern Negros Occidental since 2005.',
            company_size: '501-1000',
            year_established: '2005',
        }
    },
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
]

const homeowners = [
    {
        email: 'lucia.fernandez@test.com',
        base: { name: 'Lucia Fernandez', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Lucia Mae Fernandez',
            contact_number: '09171112001',
            homeowner_status: 'active',
            barangay: 'Palampas',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            bio: 'Retired teacher interested in livelihood programs and community skills training.',
            service_preferences: ['career_counseling', 'livelihood_programs'],
        }
    },
    {
        email: 'james.ong@test.com',
        base: { name: 'James Ong', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'James Patrick Ong',
            contact_number: '09171112002',
            homeowner_status: 'active',
            barangay: 'Rizal',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            bio: 'Small business owner looking for PESO assistance with hiring and labor compliance.',
            service_preferences: ['skills_training', 'career_counseling'],
        }
    },
    {
        email: 'cynthia.ramos@test.com',
        base: { name: 'Cynthia Ramos', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Cynthia Joy Ramos',
            contact_number: '09171112003',
            homeowner_status: 'active',
            barangay: 'Guadalupe',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            bio: 'Parent exploring skills training options for household members.',
            service_preferences: ['livelihood_programs', 'skills_training'],
        }
    },
    {
        email: 'kevin.bautista@test.com',
        base: { name: 'Kevin Bautista', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Kevin Jay Bautista',
            contact_number: '09171112004',
            homeowner_status: 'active',
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
            homeowner_status: 'active',
            barangay: 'Codcod',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            bio: 'OFW returnee from Saudi Arabia. Looking for PESO reintegration programs and livelihood assistance.',
            service_preferences: ['livelihood_programs', 'career_counseling', 'skills_training'],
        }
    },
]

// Diagnostic-test jobseekers: incomplete profiles, mismatched skills, varied states
const diagnosticJobseekers = [
    {
        // Incomplete profile — registration not finished (step 3)
        email: 'incomplete.user@test.com',
        base: { name: 'Carlo Reyes', is_verified: false, registration_complete: false, registration_step: 3 },
        profile: {
            full_name: 'Carlo Enrique Reyes',
            date_of_birth: '1999-04-10',
            barangay: 'Quezon',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: '09171113001',
            // No skills, no education, no work experience — stopped at step 3
        }
    },
    {
        // Mismatch: has IT skills but wants agriculture job
        email: 'mismatch.itfarm@test.com',
        base: { name: 'Dennis Roque', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Dennis Paul Roque',
            date_of_birth: '1996-06-15',
            barangay: 'Buluangan',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: '09171113002',
            preferred_contact_method: 'email',
            preferred_job_type: ['full-time'],
            preferred_job_location: 'San Carlos City',
            expected_salary_min: '15000',
            expected_salary_max: '20000',
            willing_to_relocate: 'no',
            highest_education: 'college',
            school_name: 'STI College - Bacolod',
            course_or_field: 'BS Computer Science',
            year_graduated: '2018',
            skills: ['Web Development', 'Database Management', 'Network Setup', 'Technical Support', 'MS Office'],
            work_experiences: [
                { company: 'NetPro Solutions', position: 'IT Support', duration: '2018-2021', description: 'Technical support and network administration' }
            ],
            certifications: ['CompTIA Network+'],
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            gender: 'male',
            civil_status: 'single',
            is_pwd: false,
            languages: [{ language: 'Filipino', proficiency: 'native' }],
        }
    },
    {
        // Mismatch: nursing degree but looking for call center work
        email: 'mismatch.nurse@test.com',
        base: { name: 'Patricia Soriano', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Patricia Ann Soriano',
            date_of_birth: '1994-02-28',
            barangay: 'Codcod',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: '09171113003',
            preferred_contact_method: 'email',
            preferred_job_type: ['full-time'],
            preferred_job_location: 'San Carlos City',
            expected_salary_min: '18000',
            expected_salary_max: '25000',
            willing_to_relocate: 'yes',
            highest_education: 'college',
            school_name: 'Central Philippine University',
            course_or_field: 'BS Nursing',
            year_graduated: '2016',
            skills: ['Customer Service', 'Data Entry', 'MS Office', 'English Proficiency'],
            work_experiences: [
                { company: 'Various clinics', position: 'Volunteer Nurse', duration: '2016-2018', description: 'Clinical volunteer work' },
                { company: 'Convergys (now Concentrix)', position: 'CSR', duration: '2018-2022', description: 'Customer service representative for US healthcare account' }
            ],
            certifications: ['Registered Nurse (PRC)', 'IELTS Band 7.5'],
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            gender: 'female',
            civil_status: 'single',
            is_pwd: false,
            languages: [{ language: 'Filipino', proficiency: 'native' }, { language: 'English', proficiency: 'fluent' }],
        }
    },
    {
        // PWD user with limited mobility
        email: 'pwd.user@test.com',
        base: { name: 'Roberto Navarro', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Roberto Santos Navarro',
            date_of_birth: '1988-10-05',
            barangay: 'Rizal',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: '09171113004',
            preferred_contact_method: 'phone',
            preferred_job_type: ['part-time', 'contract'],
            preferred_job_location: 'San Carlos City',
            expected_salary_min: '8000',
            expected_salary_max: '15000',
            willing_to_relocate: 'no',
            highest_education: 'vocational',
            school_name: 'TESDA Training Center - San Carlos',
            course_or_field: 'Computer Hardware Servicing',
            year_graduated: '2010',
            skills: ['Computer Repair', 'Data Entry', 'MS Office', 'Technical Support'],
            work_experiences: [
                { company: 'Home-based', position: 'Computer Technician', duration: '2010-present', description: 'Freelance computer repair and data entry services' }
            ],
            certifications: ['TESDA NC II - Computer Hardware Servicing'],
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            gender: 'male',
            civil_status: 'married',
            is_pwd: true,
            pwd_id_number: 'PWD-NOC-2015-00234',
            languages: [{ language: 'Filipino', proficiency: 'native' }, { language: 'Hiligaynon', proficiency: 'native' }],
        }
    },
    {
        // Fresh graduate, no work experience
        email: 'fresh.grad@test.com',
        base: { name: 'Angelica Torres', is_verified: true, registration_complete: true },
        profile: {
            full_name: 'Angelica Rose Torres',
            date_of_birth: '2002-08-17',
            barangay: 'Sipaway',
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: '09171113005',
            preferred_contact_method: 'email',
            preferred_job_type: ['full-time', 'part-time', 'temporary'],
            preferred_job_location: 'San Carlos City',
            expected_salary_min: '10000',
            expected_salary_max: '15000',
            willing_to_relocate: 'yes',
            highest_education: 'college',
            school_name: 'Carlos Hilado Memorial State University',
            course_or_field: 'BS Hospitality Management',
            year_graduated: '2024',
            skills: ['Customer Service', 'Sales', 'POS Operation'],
            work_experiences: [],
            certifications: [],
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            gender: 'female',
            civil_status: 'single',
            is_pwd: false,
            languages: [{ language: 'Filipino', proficiency: 'native' }, { language: 'English', proficiency: 'intermediate' }],
        }
    },
    {
        // Incomplete — stopped at step 1 (only email/role created)
        email: 'abandoned.reg@test.com',
        base: { name: '', is_verified: false, registration_complete: false, registration_step: 1 },
        profile: {} // No profile data at all
    },
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
]

// ═══════════════════════════════════════════════════════════════
// SEED DATA — JOB POSTINGS
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// SEED DATA — APPLICATIONS
// ═══════════════════════════════════════════════════════════════

const seedApplications = [
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

// ═══════════════════════════════════════════════════════════════
// SEED DATA — CONVERSATIONS & MESSAGES
// ═══════════════════════════════════════════════════════════════

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
            { sender: 'maria.santos@test.com', text: 'Hi! Yes, I am willing to work night shifts. I have a flexible schedule since I am freelancing right now.' },
            { sender: 'hiring@greenfields-bpo.test.com', text: 'Great! We will review your application further and get back to you soon. Thank you!' },
        ]
    },
]

// ═══════════════════════════════════════════════════════════════
// SEEDING LOGIC
// ═══════════════════════════════════════════════════════════════

const PROFILE_TABLE = {
    jobseeker: 'jobseeker_profiles',
    employer: 'employer_profiles',
    homeowner: 'homeowner_profiles',
}

// Map subtype to profile table for user role
const SUBTYPE_PROFILE_TABLE = {
    jobseeker: 'jobseeker_profiles',
    homeowner: 'homeowner_profiles',
}

async function createUser(email, role, subtype, baseData, profileData) {
    // 1. Create auth user (triggers handle_new_user which creates public.users row)
    const metadata = { role }
    if (subtype) metadata.subtype = subtype
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: metadata,
    })

    if (authError) {
        // If user already exists, look up their ID so we can still wire FKs
        if (authError.message?.includes('already been registered')) {
            const { data: existing } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .maybeSingle()
            return existing?.id || null
        }
        throw authError
    }

    const userId = authData.user.id

    // 2. Wait briefly for the trigger to create public.users row
    await new Promise(r => setTimeout(r, 500))

    // 3. Update public.users with base data
    const updateData = { ...baseData, role }
    if (subtype) updateData.subtype = subtype
    const { error: baseError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
    if (baseError) console.warn(`  WARN: base update failed for ${email}: ${baseError.message}`)

    // 4. Upsert role-specific profile
    const profileTable = role === 'user' ? SUBTYPE_PROFILE_TABLE[subtype] : PROFILE_TABLE[role]
    if (profileTable && Object.keys(profileData).length > 0) {
        const { error: profileError } = await supabase
            .from(profileTable)
            .upsert({
                id: userId,
                ...profileData,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })
        if (profileError) console.warn(`  WARN: profile upsert failed for ${email}: ${profileError.message}`)
    }

    return userId
}

function getNameByEmail(email) {
    const allUsers = [...jobseekers, ...diagnosticJobseekers, ...homeowners]
    const found = allUsers.find(u => u.email === email)
    if (found) return found.profile?.full_name || found.base?.name || ''
    const emp = employers.find(e => e.email === email)
    return emp?.profile?.company_name || emp?.base?.name || ''
}

async function seed() {
    console.log('=== PESO-Connect Seed Script ===\n')
    console.log(`Target: ${supabaseUrl}`)
    console.log(`Password for all users: ${PASSWORD}\n`)

    let created = 0
    let skipped = 0
    const userIdByEmail = {} // track user IDs for FK wiring

    // Helper to seed a group of users
    async function seedGroup(label, list, role, subtype = null) {
        console.log(`--- ${label} ---`)
        for (const u of list) {
            try {
                const id = await createUser(u.email, role, subtype, u.base, u.profile)
                if (id) {
                    userIdByEmail[u.email] = id
                    console.log(`  OK ${u.email} (${id})`)
                    created++
                } else {
                    skipped++
                }
            } catch (err) {
                console.error(`  FAIL ${u.email}: ${err.message}`)
            }
        }
    }

    // Seed users
    await seedGroup('Jobseekers', jobseekers, 'user', 'jobseeker')
    console.log()
    await seedGroup('Employers', employers, 'employer')
    console.log()
    await seedGroup('Homeowners', homeowners, 'user', 'homeowner')
    console.log()
    await seedGroup('Diagnostic Test Jobseekers', diagnosticJobseekers, 'user', 'jobseeker')

    // ─── Job Postings ───
    console.log('\n--- Job Postings ---')
    const jobIdByTitle = {}
    for (const job of jobPostings) {
        const employerId = userIdByEmail[job.employer_email]
        if (!employerId) {
            console.log(`  SKIP "${job.title}" — employer ${job.employer_email} not found`)
            continue
        }

        const employerName = getNameByEmail(job.employer_email)

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
            console.warn(`  WARN "${job.title}": ${error.message}`)
        } else {
            jobIdByTitle[job.title] = data.id
            console.log(`  OK "${job.title}" (${data.id})`)
        }
    }

    // ─── Applications ───
    console.log('\n--- Applications ---')
    for (const app of seedApplications) {
        const userId = userIdByEmail[app.applicant_email]
        const jobId = jobIdByTitle[app.job_title]
        if (!userId || !jobId) {
            console.log(`  SKIP ${app.applicant_email} -> "${app.job_title}" — missing user or job`)
            continue
        }

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
            console.warn(`  WARN ${app.applicant_email} -> "${app.job_title}": ${error.message}`)
        } else {
            console.log(`  OK ${app.applicant_email} -> "${app.job_title}" (${app.status})`)
        }
    }

    // ─── Conversations & Messages ───
    console.log('\n--- Conversations ---')
    for (const convo of seedConversations) {
        const [email1, email2] = convo.participants
        const uid1 = userIdByEmail[email1]
        const uid2 = userIdByEmail[email2]
        if (!uid1 || !uid2) {
            console.log(`  SKIP ${email1} <-> ${email2} — missing user(s)`)
            continue
        }

        // Conversation ID: sorted UIDs
        const sortedUids = [uid1, uid2].sort()
        const convoId = `${sortedUids[0]}_${sortedUids[1]}`

        const participantInfo = {
            [uid1]: { name: getNameByEmail(email1), email: email1 },
            [uid2]: { name: getNameByEmail(email2), email: email2 },
        }

        const jobId = convo.job_title ? (jobIdByTitle[convo.job_title] || null) : null
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
            console.warn(`  WARN convo ${email1} <-> ${email2}: ${convoError.message}`)
            continue
        }
        console.log(`  OK convo ${email1} <-> ${email2}`)

        // Seed messages with staggered timestamps
        const baseTime = Date.now() - convo.messages.length * 60000
        for (let i = 0; i < convo.messages.length; i++) {
            const msg = convo.messages[i]
            const senderId = userIdByEmail[msg.sender]
            const otherEmail = convo.participants.find(p => p !== msg.sender)
            const otherId = userIdByEmail[otherEmail]

            const { error: msgError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: convoId,
                    text: msg.text,
                    sender_id: senderId,
                    sender_name: getNameByEmail(msg.sender),
                    read_by: [senderId, otherId].filter(Boolean),
                    created_at: new Date(baseTime + i * 60000).toISOString(),
                })
            if (msgError) console.warn(`    WARN msg #${i + 1}: ${msgError.message}`)
        }
    }

    // ─── Summary ───
    console.log(`\n=== Done: ${created} users created, ${skipped} skipped ===`)
    console.log(`Jobs: ${Object.keys(jobIdByTitle).length}`)
    console.log(`\nAll users can log in with password: ${PASSWORD}`)
}

seed().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})

/**
 * Seed verified workers used by the public Diagnostic feature.
 *
 * Only accounts using @diagnostic.seed.peso-connect.test are reset.
 *
 * Usage:
 *   npm run seed:diagnostic-workers
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
const EMAIL_SUFFIX = '@diagnostic.seed.peso-connect.test'
const CURRENT_YEAR = Number(new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
}))
const VERIFICATION_EXPIRES_AT = `${CURRENT_YEAR + 1}-01-01T00:00:00+08:00`

const serviceProfiles = {
    plumbing: {
        occupation: 'Plumber',
        predefinedSkills: ['Plumbing'],
        skills: ['Pipe Fitting', 'Drainage', 'Water Systems', 'Faucet Repair', 'Toilet Repair'],
        training: 'Plumbing NC II',
    },
    electrical: {
        occupation: 'Electrician',
        predefinedSkills: ['Electrician'],
        skills: ['Electrical Wiring', 'Electrical Installation', 'Electrical Repair', 'Electrical Safety'],
        training: 'Electrical Installation and Maintenance NC II',
    },
    masonry: {
        occupation: 'Mason',
        predefinedSkills: ['Masonry'],
        skills: ['Concrete Work', 'Tile Setting', 'Plastering', 'Bricklaying'],
        training: 'Masonry NC II',
    },
    welding: {
        occupation: 'Welder',
        predefinedSkills: [],
        skills: ['Welding', 'Steel Work', 'Metal Fabrication', 'Gate Installation'],
        training: 'Shielded Metal Arc Welding NC II',
    },
    carpentry: {
        occupation: 'Carpenter',
        predefinedSkills: ['Carpentry Work'],
        skills: ['Carpentry', 'Woodworking', 'Cabinet Making', 'Furniture Repair'],
        training: 'Carpentry NC II',
    },
}

const firstNames = [
    'Andres', 'Benjie', 'Carlo', 'Dennis', 'Edwin',
    'Felix', 'Gilbert', 'Harold', 'Ismael', 'Jerome',
    'Kevin', 'Lando', 'Mario', 'Nestor', 'Orlando',
    'Paolo', 'Ramon', 'Samuel', 'Tomas', 'Victor',
    'Wilfredo', 'Xavier', 'Yolando', 'Zaldy', 'Arturo',
]

const surnames = [
    'Alvarez', 'Bautista', 'Castillo', 'Domingo', 'Escobar',
    'Fernandez', 'Garcia', 'Hernandez', 'Ignacio', 'Jimenez',
    'Lacson', 'Mendoza', 'Navarro', 'Ocampo', 'Pascual',
    'Quijano', 'Reyes', 'Santos', 'Tolentino', 'Valdez',
    'Villanueva', 'Yap', 'Zamora', 'Abad', 'Bernardo',
]

const barangays = ['Quezon', 'Palampas', 'Rizal', 'Prosperidad', 'Codcod']

const workers = Object.entries(serviceProfiles).flatMap(([tradeId, service], tradeIndex) =>
    Array.from({ length: 5 }, (_, workerIndex) => {
        const index = tradeIndex * 5 + workerIndex
        const firstName = firstNames[index]
        const surname = surnames[index]

        return {
            tradeId,
            email: `${tradeId}-${workerIndex + 1}${EMAIL_SUFFIX}`,
            firstName,
            surname,
            fullName: `${firstName} ${surname}`,
            barangay: barangays[workerIndex],
            service,
            yearsExperience: workerIndex + 2,
            sequence: index + 1,
        }
    })
)

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function listAllAuthUsers() {
    const users = []
    let page = 1

    while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
        if (error) throw error
        users.push(...data.users)
        if (data.users.length < 1000) return users
        page += 1
    }
}

async function resetDiagnosticWorkers() {
    const authUsers = await listAllAuthUsers()
    const managedUsers = authUsers.filter(user =>
        String(user.email || '').toLowerCase().endsWith(EMAIL_SUFFIX)
    )

    for (const user of managedUsers) {
        const { error } = await supabase.auth.admin.deleteUser(user.id)
        if (error) throw error
    }

    return managedUsers.length
}

async function waitForPublicUser(userId) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .maybeSingle()

        if (error) throw error
        if (data?.id) return
        await sleep(250)
    }

    throw new Error(`Timed out waiting for public.users row for ${userId}`)
}

async function seedWorker(worker) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: worker.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'user', subtype: 'jobseeker' },
    })

    if (authError) throw authError

    const userId = authData.user.id
    await waitForPublicUser(userId)

    const verification = {
        is_verified: true,
        registration_complete: true,
        registration_step: null,
        verified_for_year: CURRENT_YEAR,
        verification_expires_at: VERIFICATION_EXPIRES_AT,
        verification_expired_at: null,
    }
    const now = new Date().toISOString()

    const { error: userError } = await supabase
        .from('users')
        .update({
            name: worker.fullName,
            role: 'user',
            subtype: 'jobseeker',
            first_name: worker.firstName,
            surname: worker.surname,
            ...verification,
            updated_at: now,
        })
        .eq('id', userId)

    if (userError) throw userError

    const { error: profileError } = await supabase
        .from('jobseeker_profiles')
        .upsert({
            id: userId,
            first_name: worker.firstName,
            middle_name: '',
            surname: worker.surname,
            suffix: '',
            full_name: worker.fullName,
            date_of_birth: `19${80 + (worker.sequence % 10)}-06-15`,
            sex: 'Male',
            civil_status: 'Single',
            street_address: `${100 + worker.sequence} Service Road`,
            barangay: worker.barangay,
            city: 'San Carlos City',
            province: 'Negros Occidental',
            mobile_number: `0917${String(1000000 + worker.sequence).padStart(7, '0')}`,
            preferred_contact_method: 'email',
            employment_status: 'Employed',
            employment_type: 'Self-employed',
            currently_in_school: false,
            highest_education: 'High School Graduate',
            school_name: 'San Carlos City Technical School',
            course_or_field: worker.service.training,
            vocational_training: [{
                course: worker.service.training,
                institution: 'TESDA San Carlos Training Center',
                year_completed: String(CURRENT_YEAR - 1),
                skills_acquired: worker.service.skills.join(', '),
                certificate_path: `seed-certificates/diagnostic/${worker.tradeId}-${worker.sequence}.pdf`,
            }],
            predefined_skills: worker.service.predefinedSkills,
            skills: worker.service.skills,
            certifications: [worker.service.training],
            work_experiences: [{
                company: 'Independent Service Provider',
                address: 'San Carlos City, Negros Occidental',
                position: worker.service.occupation,
                year_started: String(CURRENT_YEAR - worker.yearsExperience),
                year_ended: '',
                employment_status: 'Self-employed',
            }],
            preferred_job_type: ['Part-time', 'Contractual'],
            preferred_occupations: [worker.service.occupation],
            preferred_local_locations: ['San Carlos City'],
            preferred_overseas_locations: [],
            preferred_job_location: 'San Carlos City',
            expected_salary_min: '500',
            expected_salary_max: '3000',
            willing_to_relocate: 'no',
            languages: ['English', 'Filipino'],
            terms_accepted: true,
            data_processing_consent: true,
            peso_verification_consent: true,
            info_accuracy_confirmation: true,
            dole_authorization: true,
            jobseeker_status: 'verified',
            rejection_reason: '',
            profile_modified_since_verification: false,
            verified_snapshot: {},
            ...verification,
            updated_at: now,
        }, { onConflict: 'id' })

    if (profileError) throw profileError
    return userId
}

async function seed() {
    console.log('=== PESO-Connect Diagnostic worker seed ===')
    console.log(`Target: ${supabaseUrl}`)
    console.log(`Shared password: ${PASSWORD}`)

    const removed = await resetDiagnosticWorkers()
    console.log(`Removed existing Diagnostic workers: ${removed}`)

    const counts = Object.fromEntries(Object.keys(serviceProfiles).map(tradeId => [tradeId, 0]))

    for (const worker of workers) {
        const id = await seedWorker(worker)
        counts[worker.tradeId] += 1
        console.log(`OK ${worker.tradeId}: ${worker.fullName} (${id})`)
    }

    console.log('\nSeeded workers by service:')
    for (const [tradeId, count] of Object.entries(counts)) {
        console.log(`${tradeId}: ${count}`)
    }
    console.log(`Total: ${workers.length}`)
}

seed().catch(error => {
    console.error('Diagnostic worker seed failed:', error)
    process.exit(1)
})

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const workspaceRoot = path.resolve(process.cwd())
const readSql = (relativePath) => fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')

describe('security SQL hardening artifacts', () => {
    it('locks public profile access behind an allowlisted RPC', () => {
        const sql = readSql('supabase/migrations/202605060001_public_profile_lockdown.sql')

        expect(sql).toContain('get_public_profile')
        expect(sql).toContain('drop policy if exists "Anyone can read user rows"')
        expect(sql).toContain('grant execute on function public.get_public_profile(uuid) to anon, authenticated')

        const returnsBlock = sql.match(/returns table\s*\(([\s\S]*?)\)\s*language\s+(?:plpgsql|sql)/i)?.[1] ?? ''
        const forbiddenPublicFields = [
            'email',
            'mobile_number',
            'date_of_birth',
            'street_address',
            'resume_url',
            'certificate_urls',
            'gov_id_url',
            'business_permit_url',
            'tin',
            'business_reg_number',
            'contact_number',
        ]

        for (const field of forbiddenPublicFields) {
            expect(returnsBlock).not.toMatch(new RegExp(`\\b${field}\\b`, 'i'))
        }
    })

    it('does not recreate broad public profile read policies in the new migration', () => {
        const sql = readSql('supabase/migrations/202605060001_public_profile_lockdown.sql')

        expect(sql).not.toMatch(/create\s+policy\s+"Anyone can read user rows"/i)
        expect(sql).not.toMatch(/create\s+policy\s+"Anyone can read jobseeker profiles"/i)
        expect(sql).not.toMatch(/create\s+policy\s+"Anyone can read employer profiles"/i)
        expect(sql).not.toMatch(/for\s+select\s+using\s*\(\s*true\s*\)/i)
    })

    it('makes resumes private and limits reads to authorized actors', () => {
        const sql = readSql('supabase/migrations/202605060002_private_resumes.sql')

        expect(sql).toContain("public = false")
        expect(sql).toContain('drop policy if exists "Anyone can read resumes"')
        expect(sql).toContain('Resume owners admins and application employers can read')
        expect(sql).toContain('public.get_admin_level(auth.uid()) is not null')
        expect(sql).toContain('j.employer_id = auth.uid()')
        expect(sql).toContain("allowed_mime_types = array['application/pdf']")
        expect(sql).toContain('file_size_limit = 5 * 1024 * 1024')
        expect(sql).not.toMatch(/to\s+public\s+using\s*\(\s*bucket_id\s*=\s*'resumes'\s*\)/i)
    })

    it('requires authenticated ownership checks before service-role matcher access', () => {
        const config = readSql('supabase/config.toml')
        const matcher = readSql('supabase/functions/match-jobs/index.ts')
        const refreshProfile = readSql('supabase/functions/refresh-profile-embedding/index.ts')
        const refreshJob = readSql('supabase/functions/refresh-job-embedding/index.ts')
        const explanation = readSql('supabase/functions/generate-match-explanation/index.ts')

        expect(config).toMatch(/\[functions\.match-jobs\]\s+verify_jwt = true/)
        expect(matcher).toContain('assertUserCanAccessUser')
        expect(refreshProfile).toContain('assertUserCanAccessUser')
        expect(refreshJob).toContain('assertUserCanAccessJob')
        expect(explanation).toContain('assertUserCanAccessUser')
    })

    it('locks notification inserts behind validated server paths', () => {
        const migration = readSql('supabase/migrations/202605060003_notifications_security.sql')
        const config = readSql('supabase/config.toml')
        const clientService = readSql('src/services/notificationService.js')
        const edgeFunction = readSql('supabase/functions/create-notification/index.ts')
        const emailFunction = readSql('supabase/functions/send-notification-email/index.ts')

        expect(migration).toMatch(/drop policy if exists "Authenticated users can insert notifications"/i)
        expect(migration).not.toMatch(/with check\s*\(\s*true\s*\)/i)
        expect(config).toMatch(/\[functions\.create-notification\]\s+verify_jwt\s*=\s*true/i)
        expect(clientService).toMatch(/functions\.invoke\('create-notification'/)
        expect(edgeFunction).toMatch(/getAuthenticatedUser/)
        expect(edgeFunction).toMatch(/validateNotification/)
        expect(edgeFunction).toMatch(/application_status_change/)
        expect(edgeFunction).toMatch(/account_status/)
        expect(emailFunction).toMatch(/Raw direct emails are disabled/)
        expect(emailFunction).toMatch(/escapeHtml/)
        expect(emailFunction).not.toMatch(/GENERIC_TEMPLATE/)
    })

    it('keeps Cohere secrets out of production client code', () => {
        const config = readSql('supabase/config.toml')
        const clientService = readSql('src/services/geminiService.js')
        const edgeFunction = readSql('supabase/functions/ai-json/index.ts')

        expect(config).toMatch(/\[functions\.ai-json\]\s+verify_jwt\s*=\s*true/i)
        expect(clientService).not.toContain('VITE_COHERE_API_KEY')
        expect(clientService).not.toContain('https://api.cohere.com')
        expect(clientService).toMatch(/functions\.invoke\('ai-json'/)
        expect(edgeFunction).toContain('COHERE_API_KEY')
        expect(edgeFunction).toContain('getAuthenticatedUser')
        expect(edgeFunction).toContain('https://api.cohere.com/v2/chat')
    })

    it('uses scoped admin dashboard aggregates instead of broad browser profile reads', () => {
        const migration = readSql('supabase/migrations/202605060004_admin_scoped_dashboard_counts.sql')
        const dashboard = readSql('src/pages/admin/Dashboard.jsx')

        expect(migration).toContain('admin_dashboard_counts')
        expect(migration).toContain('get_admin_level')
        expect(migration).toContain('has_admin_permission')
        expect(migration).toMatch(/grant execute on function public\.admin_dashboard_counts\(\) to authenticated/i)
        expect(dashboard).toMatch(/rpc\('admin_dashboard_counts'\)/)
        expect(dashboard).not.toMatch(/from\('users'\)\.select\('\*'\)/)
        expect(dashboard).not.toMatch(/from\('employer_profiles'\)\.select\('\*'\)/)
        expect(dashboard).not.toMatch(/from\('jobseeker_profiles'\)\.select\('\*'\)/)
        expect(dashboard).not.toMatch(/from\('homeowner_profiles'\)\.select\('\*'\)/)
    })

    it('enforces admin directory role scoping in the admin_search_users RPC', () => {
        const migration = readSql('supabase/migrations/202605060005_admin_search_users_scope.sql')
        const normalizedMigration = migration.replaceAll("''", "'")
        const directoryService = readSql('src/services/adminUserDirectoryService.js')

        expect(migration).toContain('admin_search_users')
        expect(migration).toContain('admin_access')
        expect(normalizedMigration).toContain("d.directory_role = 'employer'")
        expect(normalizedMigration).toContain("'view_employers' = any(c.permissions)")
        expect(normalizedMigration).toContain("d.directory_role = 'jobseeker'")
        expect(normalizedMigration).toContain("'view_jobseekers' = any(c.permissions)")
        expect(migration).toContain('preferred_job_type text[]')
        expect(migration).toContain('business_reg_number text')
        expect(migration).toContain('resume_url text')
        expect(migration).toContain("concat_ws('' '', nullif(js.first_name")
        expect(migration).toContain("concat_ws('' '', nullif(u.first_name")
        expect(migration).toMatch(/grant execute on function public\.admin_search_users\(text, text, text, text, integer, integer\) to authenticated/i)
        expect(directoryService).toMatch(/rpc\('admin_search_users'/)
    })

    it('guards completed jobseeker records against empty identity fields', () => {
        const migration = readSql('supabase/migrations/202605060006_jobseeker_identity_integrity.sql')

        expect(migration).toContain('users_completed_jobseeker_name_present')
        expect(migration).toContain('jobseeker_profiles_completed_name_present')
        expect(migration).toContain('not valid')
        expect(migration).toContain('update public.jobseeker_profiles')
        expect(migration).toContain('update public.users')
        expect(migration).not.toContain('js.display_name')
    })

    it('aligns password policy to an 8 character letters-plus-digits minimum', () => {
        const config = readSql('supabase/config.toml')
        const dashboard = readSql('src/pages/admin/Dashboard.jsx')
        const employerRegistration = readSql('src/pages/EmployerRegistration.jsx')
        const homeownerRegistration = readSql('src/pages/HomeownerRegistration.jsx')

        expect(config).toMatch(/minimum_password_length\s*=\s*8/)
        expect(config).toMatch(/password_requirements\s*=\s*"letters_digits"/)
        expect(config).toMatch(/secure_password_change\s*=\s*true/)
        expect(dashboard).toMatch(/password\.length < 8/)
        expect(employerRegistration).toMatch(/password\.length < 8/)
        expect(homeownerRegistration).toMatch(/password\.length < 8/)
    })
})

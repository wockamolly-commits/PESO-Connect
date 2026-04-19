import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Mirrors the client-side EXPORT_FIELDS definition.
const EXPORT_FIELDS = [
  { key: 'full_name',                    header: 'Full Name' },
  { key: 'email',                        header: 'Email' },
  { key: 'mobile_number',                header: 'Mobile Number' },
  { key: 'city',                         header: 'City' },
  { key: 'province',                     header: 'Province' },
  { key: 'highest_education',            header: 'Highest Education' },
  { key: 'school_name',                  header: 'School Name' },
  { key: 'course_or_field',              header: 'Course or Field' },
  { key: 'skills',                       header: 'Skills' },
  { key: 'certifications',               header: 'Certifications' },
  { key: 'work_experience_summary',      header: 'Work Experience Summary' },
  { key: 'preferred_job_type',           header: 'Preferred Job Type' },
  { key: 'preferred_occupations',        header: 'Preferred Occupations' },
  { key: 'preferred_local_locations',    header: 'Preferred Local Locations' },
  { key: 'preferred_overseas_locations', header: 'Preferred Overseas Locations' },
  { key: 'portfolio_url',                header: 'Portfolio URL' },
  { key: 'resume_url',                   header: 'Resume URL' },
  { key: 'verification_status',          header: 'Verification Status' },
]

// Mirror of src/utils/jobseekerCsvExport.js: neutralize CSV formula injection
// by prefixing with an apostrophe when a cell starts with =, +, -, @, tab, or CR
// before RFC 4180 quoting.
const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/

function escapeCsvCell(value: unknown): string {
  let str = value === null || value === undefined ? '' : String(value)
  if (CSV_FORMULA_PREFIX.test(str)) str = `'${str}`
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function joinArray(value: unknown, sep = '; '): string {
  if (!Array.isArray(value)) return ''
  return (value as unknown[]).filter(Boolean).map(String).join(sep)
}

// --- Filter predicates (mirror of src/components/admin/JobseekerExportSection.jsx) ---
// Keep this logic in sync with applyExportFilters there. Any divergence means
// the audit log's filter_state won't match the row_count we record.

type ExportFilters = {
  keyword?: string
  location?: string
  education?: string
  verificationStatus?: string
}

const textIncludes = (field: unknown, query: string) =>
  (typeof field === 'string' ? field.toLowerCase() : '').includes(query)

const filterDisplayName = (js: Record<string, unknown>): string => {
  const parts = [js.first_name, js.middle_name, js.surname]
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .join(' ')
  return parts
    || (typeof js.display_name === 'string' ? js.display_name : '')
    || (typeof js.full_name === 'string' ? js.full_name : '')
    || (typeof js.name === 'string' ? js.name : '')
}

function matchesKeyword(js: Record<string, unknown>, query?: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  if (textIncludes(filterDisplayName(js), q)) return true
  if (textIncludes(js.email, q)) return true
  const skills = [
    ...(Array.isArray(js.predefined_skills) ? js.predefined_skills : []),
    ...(Array.isArray(js.skills) ? js.skills : []),
  ]
  if (skills.some(s => textIncludes(s, q))) return true
  if (textIncludes(js.course_or_field, q)) return true
  if (Array.isArray(js.preferred_occupations)
      && js.preferred_occupations.some(o => textIncludes(o, q))) return true
  return false
}

function matchesLocation(js: Record<string, unknown>, location?: string): boolean {
  if (!location) return true
  const loc = location.toLowerCase()
  return textIncludes(js.city, loc)
      || textIncludes(js.province, loc)
      || textIncludes(js.barangay, loc)
}

function matchesEducation(js: Record<string, unknown>, education?: string): boolean {
  if (!education) return true
  return js.highest_education === education
}

function matchesVerification(js: Record<string, unknown>, status?: string): boolean {
  if (!status || status === 'all') return true
  const actual = (typeof js.jobseeker_status === 'string' && js.jobseeker_status)
    || (js.is_verified ? 'verified' : 'pending')
  return actual === status
}

function applyExportFilters(
  records: Record<string, unknown>[],
  filters: ExportFilters,
): Record<string, unknown>[] {
  return records.filter(js =>
    matchesKeyword(js, filters.keyword)
    && matchesLocation(js, filters.location)
    && matchesEducation(js, filters.education)
    && matchesVerification(js, filters.verificationStatus)
  )
}

// --- End filter predicates ---

function buildFullName(r: Record<string, unknown>): string {
  const parts = ([r.first_name, r.middle_name, r.surname] as unknown[])
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
  const suffix = typeof r.suffix === 'string' ? r.suffix.trim() : ''
  if (suffix && suffix.toLowerCase() !== 'none') parts.push(suffix)
  return parts.join(' ') || (r.display_name as string) || (r.full_name as string) || (r.name as string) || ''
}

function flattenSkills(r: Record<string, unknown>): string {
  const merged = [
    ...(Array.isArray(r.predefined_skills) ? r.predefined_skills : []),
    ...(Array.isArray(r.skills) ? r.skills : []),
  ]
  return [...new Set((merged as unknown[]).filter(Boolean).map(String))].join('; ')
}

function flattenCerts(r: Record<string, unknown>): string {
  const certs = r.certifications
  if (!Array.isArray(certs) || certs.length === 0) return ''
  return (certs as unknown[])
    .map(c => {
      if (!c) return ''
      if (typeof c === 'string') return c
      const o = c as Record<string, unknown>
      return (o.name || o.title || o.url || '') as string
    })
    .filter(Boolean)
    .join('; ')
}

function flattenWorkExps(r: Record<string, unknown>): string {
  const exps = r.work_experiences
  if (!Array.isArray(exps) || exps.length === 0) return ''
  return (exps as Record<string, unknown>[])
    .map(exp => {
      if (!exp) return ''
      const pos = (exp.position || '') as string
      const co = (exp.company || '') as string
      if (pos && co) return `${pos} at ${co}`
      return pos || co
    })
    .filter(Boolean)
    .join('; ')
}

function normalizeRow(r: Record<string, unknown>): Record<string, string> {
  const verificationStatus =
    (r.jobseeker_status as string) || (r.is_verified ? 'verified' : 'pending')
  return {
    full_name:                    buildFullName(r),
    email:                        (r.email as string) || '',
    mobile_number:                (r.mobile_number as string) || '',
    city:                         (r.city as string) || '',
    province:                     (r.province as string) || '',
    highest_education:            (r.highest_education as string) || '',
    school_name:                  (r.school_name as string) || '',
    course_or_field:              (r.course_or_field as string) || '',
    skills:                       flattenSkills(r),
    certifications:               flattenCerts(r),
    work_experience_summary:      flattenWorkExps(r),
    preferred_job_type:           joinArray(r.preferred_job_type),
    preferred_occupations:        joinArray(r.preferred_occupations),
    preferred_local_locations:    joinArray(r.preferred_local_locations),
    preferred_overseas_locations: joinArray(r.preferred_overseas_locations),
    portfolio_url:                (r.portfolio_url as string) || '',
    resume_url:                   (r.resume_url as string) || '',
    verification_status:          verificationStatus,
  }
}

function buildCsv(records: Record<string, unknown>[]): string {
  const CRLF = '\r\n'
  const BOM = '\uFEFF'
  const header = EXPORT_FIELDS.map(f => escapeCsvCell(f.header)).join(',')
  const rows = records.map(r => {
    const norm = normalizeRow(r)
    return EXPORT_FIELDS.map(f => escapeCsvCell(norm[f.key] ?? '')).join(',')
  })
  return BOM + [header, ...rows].join(CRLF)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // --- Auth ---
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // --- Permission check ---
  const { data: access } = await serviceClient
    .from('admin_access')
    .select('permissions')
    .eq('user_id', user.id)
    .single()

  if (!access || !Array.isArray(access.permissions) || !access.permissions.includes('export_jobseekers')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // --- Parse filter state from request body ---
  // Sanitize: only accept the known fields, cap string length, coerce to string.
  // This prevents the audit log from persisting arbitrary caller-supplied data.
  let rawFilterState: Record<string, unknown> = {}
  try {
    const body = await req.json()
    if (body && typeof body === 'object' && body.filter_state && typeof body.filter_state === 'object') {
      rawFilterState = body.filter_state as Record<string, unknown>
    }
  } catch {
    // No body or invalid JSON — proceed with no filters
  }

  const clampStr = (v: unknown, max = 200) =>
    typeof v === 'string' ? v.slice(0, max) : ''
  const filters: ExportFilters = {
    keyword: clampStr(rawFilterState.keyword),
    location: clampStr(rawFilterState.location),
    education: clampStr(rawFilterState.education, 100),
    verificationStatus: clampStr(rawFilterState.verificationStatus, 40),
  }

  // --- Query ---
  // Fetch all jobseeker users and their profiles, then merge server-side.
  const [usersRes, profilesRes] = await Promise.all([
    serviceClient.from('users').select('*').eq('role', 'user').eq('subtype', 'jobseeker'),
    serviceClient.from('jobseeker_profiles').select('*'),
  ])

  if (usersRes.error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const profileMap = new Map<string, Record<string, unknown>>()
  for (const p of (profilesRes.data ?? []) as Record<string, unknown>[]) {
    profileMap.set(p.id as string, p)
  }

  const merged: Record<string, unknown>[] = (usersRes.data ?? []).map((u: Record<string, unknown>) => {
    const profile = profileMap.get(u.id as string) ?? {}
    const out: Record<string, unknown> = { ...u }
    for (const [key, val] of Object.entries(profile)) {
      const isEmpty = val === null || val === '' || (Array.isArray(val) && val.length === 0)
      if (isEmpty) {
        if (out[key] === undefined) out[key] = val
      } else {
        out[key] = val
      }
    }
    return out
  })

  // --- Apply filters ---
  const filtered = applyExportFilters(merged, filters)

  // --- Build CSV from the filtered set ---
  const csv = buildCsv(filtered)

  // --- Audit log (fire-and-forget; log failure should not fail the export) ---
  // row_count reflects what the caller actually received. filter_state stores
  // the sanitized filters so the log cannot be polluted with arbitrary JSON.
  serviceClient.from('admin_export_logs').insert({
    admin_id: user.id,
    filter_state: filters,
    row_count: filtered.length,
  }).then(({ error }) => {
    if (error) console.error('[export-jobseekers-csv] audit log error:', error.message)
  })

  return new Response(csv, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv;charset=utf-8;',
      'Content-Disposition': `attachment; filename="jobseekers_export.csv"`,
    },
  })
})

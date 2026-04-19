// Utility module for exporting jobseeker records to CSV.
//
// Design rules:
// - Only fields already collected during registration or profile editing are exported.
// - Highly sensitive fields (date of birth, full street address, government IDs,
//   consent flags, internal admin notes) are intentionally excluded.
// - Array and JSON fields are flattened to semicolon-separated strings so every
//   cell stays on one row and imports cleanly into Excel/LibreOffice Calc.

// ---------------------------------------------------------------------------
// Field definitions — single source of truth for headers and mapping keys.
// ---------------------------------------------------------------------------

export const EXPORT_FIELDS = [
    { key: 'full_name',                   header: 'Full Name' },
    { key: 'email',                       header: 'Email' },
    { key: 'mobile_number',               header: 'Mobile Number' },
    { key: 'city',                        header: 'City' },
    { key: 'province',                    header: 'Province' },
    { key: 'highest_education',           header: 'Highest Education' },
    { key: 'school_name',                 header: 'School Name' },
    { key: 'course_or_field',             header: 'Course or Field' },
    { key: 'skills',                      header: 'Skills' },
    { key: 'certifications',              header: 'Certifications' },
    { key: 'work_experience_summary',     header: 'Work Experience Summary' },
    { key: 'preferred_job_type',          header: 'Preferred Job Type' },
    { key: 'preferred_occupations',       header: 'Preferred Occupations' },
    { key: 'preferred_local_locations',   header: 'Preferred Local Locations' },
    { key: 'preferred_overseas_locations',header: 'Preferred Overseas Locations' },
    { key: 'portfolio_url',               header: 'Portfolio URL' },
    { key: 'resume_url',                  header: 'Resume URL' },
    { key: 'verification_status',         header: 'Verification Status' },
]

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const joinArray = (value, separator = '; ') => {
    if (!Array.isArray(value)) return ''
    return value.filter(Boolean).join(separator)
}

const buildFullName = (record) => {
    const parts = [
        record.first_name,
        record.middle_name,
        record.surname,
    ].map(v => (typeof v === 'string' ? v.trim() : '')).filter(Boolean)

    const suffix = typeof record.suffix === 'string' ? record.suffix.trim() : ''
    if (suffix && suffix.toLowerCase() !== 'none') parts.push(suffix)

    return parts.join(' ') || record.display_name || record.full_name || record.name || ''
}

const flattenSkills = (record) => {
    const merged = [
        ...(Array.isArray(record.predefined_skills) ? record.predefined_skills : []),
        ...(Array.isArray(record.skills) ? record.skills : []),
    ]
    return [...new Set(merged.filter(Boolean))].join('; ')
}

const flattenCertifications = (record) => {
    const certs = record.certifications
    if (!Array.isArray(certs) || certs.length === 0) return ''
    return certs
        .map((c) => {
            if (!c) return ''
            if (typeof c === 'string') return c
            return c.name || c.title || c.url || ''
        })
        .filter(Boolean)
        .join('; ')
}

const flattenWorkExperiences = (record) => {
    const exps = record.work_experiences
    if (!Array.isArray(exps) || exps.length === 0) return ''
    return exps
        .map((exp) => {
            if (!exp) return ''
            const position = exp.position || ''
            const company = exp.company || ''
            if (position && company) return `${position} at ${company}`
            return position || company
        })
        .filter(Boolean)
        .join('; ')
}

// ---------------------------------------------------------------------------
// Public: row normalization
// ---------------------------------------------------------------------------

/**
 * Converts a raw merged jobseeker record (users + jobseeker_profiles) into a
 * flat object keyed by EXPORT_FIELDS[*].key.
 *
 * @param {object} record - Merged admin data row for a single jobseeker.
 * @returns {object} Flat export-safe record.
 */
export const normalizeJobseekerRow = (record) => {
    if (!record) return {}

    const verificationStatus =
        record.jobseeker_status ||
        (record.is_verified ? 'verified' : 'pending')

    return {
        full_name:                    buildFullName(record),
        email:                        record.email || '',
        mobile_number:                record.mobile_number || '',
        city:                         record.city || '',
        province:                     record.province || '',
        highest_education:            record.highest_education || '',
        school_name:                  record.school_name || '',
        // DB column: jobseeker_profiles.course_or_field — verified 2026-04-17.
        // Only populated for Senior High / Tertiary / Graduate Studies levels.
        course_or_field:              record.course_or_field || '',
        skills:                       flattenSkills(record),
        certifications:               flattenCertifications(record),
        work_experience_summary:      flattenWorkExperiences(record),
        preferred_job_type:           record.preferred_job_type || '',
        preferred_occupations:        joinArray(record.preferred_occupations),
        preferred_local_locations:    joinArray(record.preferred_local_locations),
        preferred_overseas_locations: joinArray(record.preferred_overseas_locations),
        portfolio_url:                record.portfolio_url || '',
        resume_url:                   record.resume_url || '',
        verification_status:          verificationStatus,
    }
}

// ---------------------------------------------------------------------------
// Public: CSV escaping and generation
// ---------------------------------------------------------------------------

// Leading characters that Excel / Google Sheets treat as formula prefixes.
// A value starting with any of these is prepended with a single apostrophe
// before RFC 4180 quoting so spreadsheet software renders it as literal text
// instead of evaluating it (CSV injection / "formula injection"). See OWASP
// "CSV Injection" for background.
const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/

/**
 * Escapes a single value for safe inclusion in a CSV cell.
 *
 * Applied rules:
 * - If the stringified value starts with =, +, -, @, tab, or CR, a single
 *   apostrophe is prepended so spreadsheet apps treat it as text.
 * - If the value contains a comma, double-quote, or line break it is wrapped
 *   in double quotes. Any double-quote inside is doubled ("").
 *
 * @param {*} value - Any scalar value.
 * @returns {string} CSV-safe string (not yet joined into a row).
 */
export const escapeCsvCell = (value) => {
    let str = value === null || value === undefined ? '' : String(value)
    if (CSV_FORMULA_PREFIX.test(str)) {
        str = `'${str}`
    }
    if (/[",\r\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

/**
 * Generates a complete CSV string from an array of merged jobseeker records.
 *
 * Includes a UTF-8 BOM so the file opens correctly in Microsoft Excel without
 * needing an explicit import wizard.
 *
 * @param {object[]} records - Array of raw merged jobseeker records.
 * @returns {string} Full CSV content including header row and BOM.
 */
export const generateCsv = (records) => {
    const CRLF = '\r\n'
    const BOM = '\uFEFF'

    const headerRow = EXPORT_FIELDS.map(f => escapeCsvCell(f.header)).join(',')

    const dataRows = records.map((record) => {
        const normalized = normalizeJobseekerRow(record)
        return EXPORT_FIELDS.map(f => escapeCsvCell(normalized[f.key] ?? '')).join(',')
    })

    return BOM + [headerRow, ...dataRows].join(CRLF)
}

// ---------------------------------------------------------------------------
// Public: filename builder
// ---------------------------------------------------------------------------

/**
 * Builds a consistent export filename from the active filters.
 *
 * Examples:
 *   jobseekers_2026-04-13.csv
 *   jobseekers_it_2026-04-13.csv
 *   jobseekers_manila_2026-04-13.csv
 *
 * @param {{ keyword?: string, location?: string }} filters - Active filter values.
 * @returns {string} Filename string ending in .csv.
 */
export const buildExportFilename = (filters = {}) => {
    const today = new Date().toISOString().slice(0, 10)
    const slug = [filters.keyword, filters.location]
        .map(v => (v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
        .filter(Boolean)
        .join('_')
    return slug ? `jobseekers_${slug}_${today}.csv` : `jobseekers_${today}.csv`
}

// ---------------------------------------------------------------------------
// Public: browser download trigger
// ---------------------------------------------------------------------------

/**
 * Triggers a browser file download for the given CSV string.
 *
 * @param {string} csvContent - Full CSV string (may include BOM).
 * @param {string} filename - The suggested filename for the download.
 */
export const downloadCsv = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

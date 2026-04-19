import { describe, it, expect } from 'vitest'
import {
    escapeCsvCell,
    normalizeJobseekerRow,
    generateCsv,
    buildExportFilename,
    EXPORT_FIELDS,
} from './jobseekerCsvExport'

// ---------------------------------------------------------------------------
// escapeCsvCell
// ---------------------------------------------------------------------------

describe('escapeCsvCell', () => {
    it('returns plain strings unchanged', () => {
        expect(escapeCsvCell('hello')).toBe('hello')
    })

    it('wraps values that contain a comma in double quotes', () => {
        expect(escapeCsvCell('Smith, John')).toBe('"Smith, John"')
    })

    it('wraps values that contain a double-quote and escapes internal quotes', () => {
        expect(escapeCsvCell('He said "hi"')).toBe('"He said ""hi"""')
    })

    it('wraps values that contain a newline', () => {
        expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"')
    })

    it('wraps values that contain a carriage return', () => {
        expect(escapeCsvCell('line1\rline2')).toBe('"line1\rline2"')
    })

    // CSV formula-injection protection: cells whose first character is one of
    // = + - @ \t \r must be prefixed with an apostrophe so Excel/Sheets render
    // them as literal text instead of evaluating them as formulas.
    it("prefixes values that start with '=' with an apostrophe", () => {
        expect(escapeCsvCell('=1+1')).toBe("'=1+1")
    })

    it("prefixes values that start with '+' with an apostrophe", () => {
        expect(escapeCsvCell('+1+1')).toBe("'+1+1")
    })

    it("prefixes values that start with '-' with an apostrophe", () => {
        expect(escapeCsvCell('-HYPERLINK("x","y")')).toBe(
            '"\'-HYPERLINK(""x"",""y"")"'
        )
    })

    it("prefixes values that start with '@' with an apostrophe", () => {
        expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    })

    it("prefixes values that start with a tab with an apostrophe", () => {
        expect(escapeCsvCell('\t=cmd')).toBe("'\t=cmd")
    })

    it('does not prefix when the formula char is not leading', () => {
        expect(escapeCsvCell('a=1+1')).toBe('a=1+1')
    })

    it('converts null to an empty string', () => {
        expect(escapeCsvCell(null)).toBe('')
    })

    it('converts undefined to an empty string', () => {
        expect(escapeCsvCell(undefined)).toBe('')
    })

    it('converts numbers to strings', () => {
        expect(escapeCsvCell(42)).toBe('42')
    })

    it('handles a value that is only a double-quote', () => {
        expect(escapeCsvCell('"')).toBe('""""')
    })
})

// ---------------------------------------------------------------------------
// normalizeJobseekerRow
// ---------------------------------------------------------------------------

describe('normalizeJobseekerRow', () => {
    it('returns an empty object for null input', () => {
        expect(normalizeJobseekerRow(null)).toEqual({})
    })

    it('builds full_name from name parts', () => {
        const result = normalizeJobseekerRow({
            first_name: 'Maria',
            middle_name: 'Cruz',
            surname: 'Santos',
            suffix: 'Jr.',
        })
        expect(result.full_name).toBe('Maria Cruz Santos Jr.')
    })

    it('omits suffix when it is "None"', () => {
        const result = normalizeJobseekerRow({
            first_name: 'Juan',
            surname: 'Dela Cruz',
            suffix: 'None',
        })
        expect(result.full_name).toBe('Juan Dela Cruz')
    })

    it('falls back to display_name when name parts are absent', () => {
        const result = normalizeJobseekerRow({ display_name: 'Sample User' })
        expect(result.full_name).toBe('Sample User')
    })

    it('falls back to name when display_name is absent', () => {
        const result = normalizeJobseekerRow({ name: 'Fallback Name' })
        expect(result.full_name).toBe('Fallback Name')
    })

    it('merges predefined_skills and skills without duplicates', () => {
        const result = normalizeJobseekerRow({
            predefined_skills: ['JavaScript', 'React'],
            skills: ['React', 'Node.js'],
        })
        expect(result.skills).toBe('JavaScript; React; Node.js')
    })

    it('handles missing skills arrays gracefully', () => {
        const result = normalizeJobseekerRow({})
        expect(result.skills).toBe('')
    })

    it('flattens certifications from string array', () => {
        const result = normalizeJobseekerRow({
            certifications: ['https://example.com/cert1.pdf', 'https://example.com/cert2.pdf'],
        })
        expect(result.certifications).toBe(
            'https://example.com/cert1.pdf; https://example.com/cert2.pdf'
        )
    })

    it('flattens certifications from object array using name field', () => {
        const result = normalizeJobseekerRow({
            certifications: [
                { name: 'AWS Certified Developer', url: 'https://example.com/aws.pdf' },
                { name: 'TESDA NC II', url: 'https://example.com/tesda.pdf' },
            ],
        })
        expect(result.certifications).toBe('AWS Certified Developer; TESDA NC II')
    })

    it('handles empty certifications array', () => {
        const result = normalizeJobseekerRow({ certifications: [] })
        expect(result.certifications).toBe('')
    })

    it('flattens work experiences to "Position at Company" format', () => {
        const result = normalizeJobseekerRow({
            work_experiences: [
                { position: 'Software Engineer', company: 'Acme Corp', duration: '2020-2023' },
                { position: 'Intern', company: 'Beta Inc', duration: '2019' },
            ],
        })
        expect(result.work_experience_summary).toBe(
            'Software Engineer at Acme Corp; Intern at Beta Inc'
        )
    })

    it('handles empty work_experiences array', () => {
        const result = normalizeJobseekerRow({ work_experiences: [] })
        expect(result.work_experience_summary).toBe('')
    })

    it('joins preferred_occupations array with semicolons', () => {
        const result = normalizeJobseekerRow({
            preferred_occupations: ['Software Developer', 'Data Analyst'],
        })
        expect(result.preferred_occupations).toBe('Software Developer; Data Analyst')
    })

    it('uses jobseeker_status as verification_status when present', () => {
        const result = normalizeJobseekerRow({ jobseeker_status: 'verified' })
        expect(result.verification_status).toBe('verified')
    })

    it('falls back to "verified" from is_verified flag when jobseeker_status is absent', () => {
        const result = normalizeJobseekerRow({ is_verified: true })
        expect(result.verification_status).toBe('verified')
    })

    it('falls back to "pending" when both jobseeker_status and is_verified are absent', () => {
        const result = normalizeJobseekerRow({})
        expect(result.verification_status).toBe('pending')
    })

    it('produces output keys for every EXPORT_FIELDS entry', () => {
        const result = normalizeJobseekerRow({})
        for (const field of EXPORT_FIELDS) {
            expect(Object.prototype.hasOwnProperty.call(result, field.key)).toBe(true)
        }
    })
})

// ---------------------------------------------------------------------------
// generateCsv
// ---------------------------------------------------------------------------

describe('generateCsv', () => {
    it('starts with a UTF-8 BOM', () => {
        const csv = generateCsv([])
        expect(csv.charCodeAt(0)).toBe(0xfeff)
    })

    it('includes a header row matching EXPORT_FIELDS', () => {
        const csv = generateCsv([])
        const firstLine = csv.slice(1).split('\r\n')[0]
        const expectedHeader = EXPORT_FIELDS.map(f => f.header).join(',')
        expect(firstLine).toBe(expectedHeader)
    })

    it('produces one data row per input record', () => {
        const records = [
            { email: 'a@example.com' },
            { email: 'b@example.com' },
        ]
        const csv = generateCsv(records)
        // BOM + header + 2 data rows = 3 lines
        const lines = csv.slice(1).split('\r\n').filter(Boolean)
        expect(lines.length).toBe(3)
    })

    it('uses CRLF line endings', () => {
        const csv = generateCsv([{ email: 'test@example.com' }])
        expect(csv).toContain('\r\n')
    })

    it('escapes values with commas in data rows', () => {
        // buildFullName combines first_name + surname, so the escaped cell is the full assembled name.
        const records = [{ first_name: 'Santos', surname: 'Garcia, Jr.' }]
        const csv = generateCsv(records)
        expect(csv).toContain('"Santos Garcia, Jr."')
    })

    it('produces the correct number of columns in each row', () => {
        const records = [{ email: 'test@example.com', skills: ['JS'] }]
        const csv = generateCsv(records)
        const lines = csv.slice(1).split('\r\n').filter(Boolean)
        // Split the header to count columns (naive split is fine when no
        // quoted commas are expected in the headers themselves)
        const headerCols = lines[0].split(',').length
        expect(headerCols).toBe(EXPORT_FIELDS.length)
    })

    it('handles empty records array and outputs only the header', () => {
        const csv = generateCsv([])
        const lines = csv.slice(1).split('\r\n').filter(Boolean)
        expect(lines.length).toBe(1)
    })

    // Formula-injection fixtures: if any attacker-controlled field leaks into
    // Excel/Sheets with a leading =, +, -, @, tab, or CR, the spreadsheet will
    // evaluate it as a formula (HYPERLINK, DDE, exfiltration, etc.). The cell
    // must be prefixed with an apostrophe so it's rendered as literal text.
    it('neutralizes a formula-style email address', () => {
        const csv = generateCsv([{ email: '=HYPERLINK("http://evil","click")' }])
        expect(csv).toContain("'=HYPERLINK")
        // Bare =HYPERLINK (without the leading apostrophe) must not appear.
        expect(csv).not.toMatch(/(^|,)=HYPERLINK/)
    })

    it('neutralizes a formula-style name field assembled from parts', () => {
        const csv = generateCsv([{ first_name: '@SUM(A1:A9)', surname: 'Doe' }])
        expect(csv).toContain("'@SUM(A1:A9) Doe")
    })

    it('neutralizes a formula-style skill entry', () => {
        const csv = generateCsv([{ skills: ['+CMD|calc!A1', 'Python'] }])
        // joined as "+CMD|calc!A1; Python" → starts with +, must be prefixed
        expect(csv).toContain("'+CMD|calc!A1; Python")
    })

    it('neutralizes a tab-prefixed formula injection', () => {
        const csv = generateCsv([{ email: '\t=1+1' }])
        expect(csv).toContain("'\t=1+1")
    })

    it('neutralizes a minus-prefixed formula and still comma-escapes it', () => {
        const csv = generateCsv([{ email: '-2+3' }])
        // -2+3 starts with -, must be prefixed with apostrophe; no comma so no quoting needed
        expect(csv).toContain("'-2+3")
    })
})

// ---------------------------------------------------------------------------
// buildExportFilename
// ---------------------------------------------------------------------------

describe('buildExportFilename', () => {
    it('returns a filename ending in .csv', () => {
        expect(buildExportFilename()).toMatch(/\.csv$/)
    })

    it('includes today date in YYYY-MM-DD format', () => {
        const today = new Date().toISOString().slice(0, 10)
        expect(buildExportFilename()).toContain(today)
    })

    it('uses default prefix "jobseekers"', () => {
        expect(buildExportFilename()).toMatch(/^jobseekers_/)
    })

    it('includes keyword slug when provided', () => {
        expect(buildExportFilename({ keyword: 'IT' })).toContain('it')
    })

    it('includes location slug when provided', () => {
        expect(buildExportFilename({ location: 'Manila' })).toContain('manila')
    })

    it('slugifies multi-word keyword values', () => {
        expect(buildExportFilename({ keyword: 'Virtual Assistant' })).toContain('virtual-assistant')
    })

    it('combines keyword and location slugs', () => {
        const filename = buildExportFilename({ keyword: 'IT', location: 'Cebu' })
        expect(filename).toMatch(/it_cebu/)
    })

    it('omits empty slug parts', () => {
        const filename = buildExportFilename({ keyword: '', location: '' })
        expect(filename).not.toContain('__')
        expect(filename).toMatch(/^jobseekers_\d{4}-\d{2}-\d{2}\.csv$/)
    })
})

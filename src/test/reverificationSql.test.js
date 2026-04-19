import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const workspaceRoot = path.resolve(process.cwd())
const readSql = (relativePath) => fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')

describe('reverification SQL artifacts', () => {
    it('enforces vocational certificate paths at the database level', () => {
        const sql = readSql('sql/add_vocational_cert_constraint.sql')
        expect(sql).toContain('chk_vocational_training_has_cert')
        expect(sql).toContain("elem->>'certificate_path'")
    })

    it('defines case-insensitive jobseeker and employer triggers', () => {
        const sql = readSql('sql/add_reverification_trigger.sql')
        expect(sql).toContain('fn_set_jobseeker_reverification_flag')
        expect(sql).toContain('fn_set_employer_reverification_flag')
        expect(sql).toContain('fn_norm_reverification_text')
        expect(sql).toContain('profile_modified_since_verification := true')
    })
})

# Profile Integrity & Re-verification System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce 1:1 certificate upload per vocational training entry and add a DB-backed re-verification audit trail for verified users who edit sensitive identity or credential fields, with an admin review queue.

**Architecture:** A Postgres CHECK constraint on the `vocational_training` JSONB column ensures no entry can be saved without a `certificate_path`. A `BEFORE UPDATE` trigger on each profile table atomically sets `profile_modified_since_verification = true` when a verified user edits watched fields. Admins review a diff of `verified_snapshot` (last-approved state) vs the current profile in a new queue tab, with Approve / Reject / Revoke actions.

**Tech Stack:** React 18, Supabase (Postgres + Storage), TailwindCSS, Vitest + jsdom, lucide-react

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `sql/add_reverification_columns.sql` | Create | `verified_snapshot` JSONB + `profile_modified_since_verification` for employer_profiles |
| `sql/add_vocational_cert_constraint.sql` | Create | CHECK constraint on `vocational_training` array |
| `sql/add_reverification_triggers.sql` | Create | BEFORE UPDATE triggers for jobseeker + employer profile tables |
| `sql/add_reverification_admin_rpc.sql` | Create | RPCs: get queue, approve, reject, revoke |
| `src/components/common/CertificateUpload.jsx` | Modify | Add `maxFiles` + `deleteOnRemove` props |
| `src/components/registration/Step4Education.jsx` | Modify | Per-entry cert upload zone + step validator |
| `src/pages/JobseekerRegistration.jsx` | Modify | Step 4 validation blocks advance without certs |
| `src/pages/JobseekerProfileEdit.jsx` | Modify | Per-entry cert upload + expand CRITICAL_FIELDS |
| `src/components/common/PendingReverificationBadge.jsx` | Create | Amber "Pending Re-verification" pill |
| `src/pages/Profile.jsx` | Modify | Render `PendingReverificationBadge` |
| `src/components/admin/JobseekerCard.jsx` | Modify | Replace inline badge with `PendingReverificationBadge` |
| `src/components/admin/EmployerCard.jsx` | Modify | Render `PendingReverificationBadge` |
| `src/pages/EmployerProfileEdit.jsx` | Modify | Watched-field toast + client-side flag |
| `src/pages/admin/Dashboard.jsx` | Modify | Save `verified_snapshot` on initial approval |
| `src/components/admin/ReverificationQueue.jsx` | Create | Diff view + Approve/Reject/Revoke queue |
| `src/components/admin/AdminSidebar.jsx` | Modify | Add Re-verification tab with count badge |
| `src/App.jsx` | Modify | `/admin/reverification` route |

---

## Task 1: SQL — Add `verified_snapshot` column and employer flag column

**Files:**
- Create: `sql/add_reverification_columns.sql`

- [ ] **Step 1: Write the migration**

```sql
-- sql/add_reverification_columns.sql
-- Adds the verified_snapshot column to both profile tables.
-- Also adds profile_modified_since_verification to employer_profiles
-- (jobseeker_profiles already has it from add_profile_modified_flag.sql).

ALTER TABLE public.jobseeker_profiles
  ADD COLUMN IF NOT EXISTS verified_snapshot jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS profile_modified_since_verification boolean DEFAULT false NOT NULL;

ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS verified_snapshot jsonb DEFAULT '{}'::jsonb;
```

- [ ] **Step 2: Apply the migration in Supabase SQL Editor**

Paste the file contents into the Supabase Dashboard → SQL Editor and run it.
Verify: check Table Editor → `jobseeker_profiles` and `employer_profiles` for the new columns.

- [ ] **Step 3: Commit**

```bash
git add sql/add_reverification_columns.sql
git commit -m "sql: add verified_snapshot column and employer reverification flag"
```

---

## Task 2: SQL — Vocational training CHECK constraint

**Files:**
- Create: `sql/add_vocational_cert_constraint.sql`

- [ ] **Step 1: Write the migration**

```sql
-- sql/add_vocational_cert_constraint.sql
-- Enforces that every element in the vocational_training JSONB array
-- has a non-empty certificate_path. An empty array ([]) is still valid.
-- This is the DB-level safety net for the 1:1 cert rule.

ALTER TABLE public.jobseeker_profiles
  DROP CONSTRAINT IF EXISTS chk_vocational_training_has_cert;

ALTER TABLE public.jobseeker_profiles
  ADD CONSTRAINT chk_vocational_training_has_cert
  CHECK (
    vocational_training = '[]'::jsonb
    OR (
      SELECT bool_and(
        (elem->>'certificate_path') IS NOT NULL
        AND trim(elem->>'certificate_path') <> ''
      )
      FROM jsonb_array_elements(vocational_training) AS elem
    )
  );
```

- [ ] **Step 2: Apply in Supabase SQL Editor**

Run the migration. Verify the constraint is listed under `jobseeker_profiles` → Constraints.

- [ ] **Step 3: Smoke-test the constraint**

In the Supabase SQL Editor run:

```sql
-- Should fail with constraint violation:
UPDATE public.jobseeker_profiles
SET vocational_training = '[{"course":"NCII","institution":"TESDA","hours":"40","skills_acquired":"wiring","certificate_level":"NC II","certificate_path":""}]'::jsonb
WHERE id = (SELECT id FROM public.jobseeker_profiles LIMIT 1);

-- Should succeed (empty array):
UPDATE public.jobseeker_profiles
SET vocational_training = '[]'::jsonb
WHERE id = (SELECT id FROM public.jobseeker_profiles LIMIT 1);
```

Expected: first statement throws `new row for relation "jobseeker_profiles" violates check constraint "chk_vocational_training_has_cert"`. Second statement succeeds.

- [ ] **Step 4: Commit**

```bash
git add sql/add_vocational_cert_constraint.sql
git commit -m "sql: add NOT NULL certificate_path check constraint on vocational_training"
```

---

## Task 3: SQL — BEFORE UPDATE reverification triggers

**Files:**
- Create: `sql/add_reverification_triggers.sql`

- [ ] **Step 1: Write the migration**

```sql
-- sql/add_reverification_triggers.sql
-- BEFORE UPDATE triggers that atomically set profile_modified_since_verification = true
-- when a verified user edits watched fields.
--
-- Name fields (first_name, surname, middle_name) live in public.users, not the
-- profile tables, so they are handled client-side in JobseekerProfileEdit.jsx.
-- This trigger is the DB-level safety net for profile-table fields only.
--
-- Case-insensitivity rule: scalar text fields use lower(trim(...)) comparison
-- so "Google" → "google" does NOT trigger a re-verification wait.

-- ── Jobseeker trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_jobseeker_reverification_flag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  is_user_verified boolean;
BEGIN
  SELECT is_verified INTO is_user_verified
  FROM public.users WHERE id = NEW.id;

  IF NOT COALESCE(is_user_verified, false) THEN
    RETURN NEW;
  END IF;

  IF lower(trim(NEW.highest_education))        IS DISTINCT FROM lower(trim(OLD.highest_education))        OR
     lower(trim(NEW.school_name))              IS DISTINCT FROM lower(trim(OLD.school_name))              OR
     lower(trim(NEW.course_or_field))          IS DISTINCT FROM lower(trim(OLD.course_or_field))          OR
     lower(trim(COALESCE(NEW.civil_service_eligibility,''))) IS DISTINCT FROM lower(trim(COALESCE(OLD.civil_service_eligibility,''))) OR
     NEW.vocational_training::text             IS DISTINCT FROM OLD.vocational_training::text             OR
     NEW.professional_licenses::text           IS DISTINCT FROM OLD.professional_licenses::text           OR
     NEW.work_experiences::text                IS DISTINCT FROM OLD.work_experiences::text
  THEN
    NEW.profile_modified_since_verification := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobseeker_reverification ON public.jobseeker_profiles;
CREATE TRIGGER trg_jobseeker_reverification
  BEFORE UPDATE ON public.jobseeker_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_jobseeker_reverification_flag();

-- ── Employer trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_employer_reverification_flag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  is_user_verified boolean;
BEGIN
  SELECT is_verified INTO is_user_verified
  FROM public.users WHERE id = NEW.id;

  IF NOT COALESCE(is_user_verified, false) THEN
    RETURN NEW;
  END IF;

  IF lower(trim(COALESCE(NEW.company_name,'')))        IS DISTINCT FROM lower(trim(COALESCE(OLD.company_name,'')))        OR
     lower(trim(COALESCE(NEW.tin,'')))                 IS DISTINCT FROM lower(trim(COALESCE(OLD.tin,'')))                 OR
     lower(trim(COALESCE(NEW.business_reg_number,''))) IS DISTINCT FROM lower(trim(COALESCE(OLD.business_reg_number,''))) OR
     lower(trim(COALESCE(NEW.owner_name,'')))          IS DISTINCT FROM lower(trim(COALESCE(OLD.owner_name,'')))          OR
     lower(trim(COALESCE(NEW.representative_name,''))) IS DISTINCT FROM lower(trim(COALESCE(OLD.representative_name,'')))
  THEN
    NEW.profile_modified_since_verification := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employer_reverification ON public.employer_profiles;
CREATE TRIGGER trg_employer_reverification
  BEFORE UPDATE ON public.employer_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_employer_reverification_flag();
```

- [ ] **Step 2: Apply in Supabase SQL Editor and verify**

After running, confirm in Supabase Dashboard → Database → Functions that `fn_jobseeker_reverification_flag` and `fn_employer_reverification_flag` exist.

- [ ] **Step 3: Commit**

```bash
git add sql/add_reverification_triggers.sql
git commit -m "sql: add BEFORE UPDATE reverification triggers for jobseeker and employer profiles"
```

---

## Task 4: SQL — Admin RPCs for the re-verification queue

**Files:**
- Create: `sql/add_reverification_admin_rpc.sql`

- [ ] **Step 1: Write the migration**

```sql
-- sql/add_reverification_admin_rpc.sql
-- Three RPC functions for the admin re-verification queue.
-- All are SECURITY DEFINER so they run with elevated privileges;
-- each one validates that the caller is an admin before acting.

-- ── Helper ────────────────────────────────────────────────────────────────

-- Reuse the existing get_admin_level() function already in the DB.
-- No need to recreate it.

-- ── 1. Get pending queue ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_get_reverification_queue(p_role text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result jsonb;
BEGIN
  IF public.get_admin_level(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_role = 'jobseeker' THEN
    SELECT jsonb_agg(row_to_json(q)) INTO result FROM (
      SELECT
        jp.id,
        jp.highest_education,
        jp.school_name,
        jp.course_or_field,
        jp.vocational_training,
        jp.professional_licenses,
        jp.civil_service_eligibility,
        jp.work_experiences,
        jp.verified_snapshot,
        jp.profile_modified_since_verification,
        u.email,
        u.first_name,
        u.surname,
        u.middle_name,
        u.profile_photo,
        u.is_verified
      FROM public.jobseeker_profiles jp
      JOIN public.users u ON u.id = jp.id
      WHERE jp.profile_modified_since_verification = true
        AND u.is_verified = true
      ORDER BY jp.updated_at DESC
    ) q;
  ELSIF p_role = 'employer' THEN
    SELECT jsonb_agg(row_to_json(q)) INTO result FROM (
      SELECT
        ep.id,
        ep.company_name,
        ep.tin,
        ep.business_reg_number,
        ep.owner_name,
        ep.representative_name,
        ep.verified_snapshot,
        ep.profile_modified_since_verification,
        u.email,
        u.profile_photo,
        u.is_verified
      FROM public.employer_profiles ep
      JOIN public.users u ON u.id = ep.id
      WHERE ep.profile_modified_since_verification = true
        AND u.is_verified = true
      ORDER BY ep.updated_at DESC
    ) q;
  ELSE
    RAISE EXCEPTION 'Invalid role: must be jobseeker or employer';
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- ── 2. Approve re-verification ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_approve_reverification(
  p_user_id uuid,
  p_role    text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF public.get_admin_level(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_role = 'jobseeker' THEN
    UPDATE public.jobseeker_profiles
    SET
      profile_modified_since_verification = false,
      verified_snapshot = (
        SELECT jsonb_build_object(
          'highest_education', highest_education,
          'school_name',       school_name,
          'course_or_field',   course_or_field,
          'vocational_training', vocational_training,
          'professional_licenses', professional_licenses,
          'civil_service_eligibility', civil_service_eligibility,
          'work_experiences',  work_experiences
        )
        FROM public.jobseeker_profiles WHERE id = p_user_id
      ),
      updated_at = now()
    WHERE id = p_user_id;
  ELSIF p_role = 'employer' THEN
    UPDATE public.employer_profiles
    SET
      profile_modified_since_verification = false,
      verified_snapshot = (
        SELECT jsonb_build_object(
          'company_name',       company_name,
          'tin',                tin,
          'business_reg_number', business_reg_number,
          'owner_name',         owner_name,
          'representative_name', representative_name
        )
        FROM public.employer_profiles WHERE id = p_user_id
      ),
      updated_at = now()
    WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid role';
  END IF;
END;
$$;

-- ── 3. Reject re-verification (flag stays; notification handled client-side) ─

CREATE OR REPLACE FUNCTION admin_reject_reverification(
  p_user_id uuid,
  p_role    text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF public.get_admin_level(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  -- Flag intentionally stays true; client sends the in-app notification.
  -- Nothing to update in the DB for a rejection.
END;
$$;

-- ── 4. Revoke verification ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_revoke_verification(
  p_user_id uuid,
  p_role    text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF public.get_admin_level(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.users
  SET is_verified = false, updated_at = now()
  WHERE id = p_user_id;

  IF p_role = 'jobseeker' THEN
    UPDATE public.jobseeker_profiles
    SET
      profile_modified_since_verification = false,
      jobseeker_status = 'pending',
      updated_at = now()
    WHERE id = p_user_id;
  ELSIF p_role = 'employer' THEN
    UPDATE public.employer_profiles
    SET
      profile_modified_since_verification = false,
      employer_status = 'pending',
      updated_at = now()
    WHERE id = p_user_id;
  END IF;
END;
$$;
```

- [ ] **Step 2: Apply in Supabase SQL Editor**

Run the migration. Confirm all four functions appear in Dashboard → Database → Functions.

- [ ] **Step 3: Commit**

```bash
git add sql/add_reverification_admin_rpc.sql
git commit -m "sql: add admin RPCs for reverification queue (get, approve, reject, revoke)"
```

---

## Task 5: Extend `CertificateUpload` with `maxFiles` and `deleteOnRemove` props

**Files:**
- Modify: `src/components/common/CertificateUpload.jsx`
- Test: `src/components/common/CertificateUpload.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/common/CertificateUpload.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CertificateUpload from './CertificateUpload'

vi.mock('../../config/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url/file.pdf' }, error: null }),
      }),
    },
  },
}))

vi.mock('../../utils/certificateUtils', () => ({
  buildCertificateStoragePath: (_uid, file) => `uid/${file.name}`,
  CERTIFICATE_ACCEPT: '.pdf,.jpg,.jpeg,.png',
  CERTIFICATE_BUCKET: 'certificates',
  getCertificateSignedUrl: vi.fn().mockResolvedValue('https://signed.url/file.pdf'),
  getCertificateSource: vi.fn().mockReturnValue(''),
  normalizeCertificateRecords: (v) => (Array.isArray(v) ? v : []),
  validateCertificateFile: vi.fn().mockReturnValue(null),
}))

describe('CertificateUpload', () => {
  const userId = 'user-123'

  it('appends a file when maxFiles is unlimited (default)', async () => {
    const onChange = vi.fn()
    render(
      <CertificateUpload
        userId={userId}
        value={[{ name: 'existing.pdf', path: 'uid/existing.pdf', type: 'application/pdf', size: 1000, uploaded_at: '' }]}
        onChange={onChange}
        inputId="cert-test"
      />
    )
    const input = document.getElementById('cert-test')
    const newFile = new File(['data'], 'new.pdf', { type: 'application/pdf' })
    await waitFor(() => fireEvent.change(input, { target: { files: [newFile] } }))
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const result = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(result.length).toBe(2)
  })

  it('replaces existing file when maxFiles={1}', async () => {
    const onChange = vi.fn()
    render(
      <CertificateUpload
        userId={userId}
        value={[{ name: 'old.pdf', path: 'uid/old.pdf', type: 'application/pdf', size: 1000, uploaded_at: '' }]}
        onChange={onChange}
        maxFiles={1}
        inputId="cert-single"
      />
    )
    const input = document.getElementById('cert-single')
    const newFile = new File(['data'], 'new.pdf', { type: 'application/pdf' })
    await waitFor(() => fireEvent.change(input, { target: { files: [newFile] } }))
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const result = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(result.length).toBe(1)
    expect(result[0].name).toBe('new.pdf')
  })

  it('removes from local state only when deleteOnRemove={false}', async () => {
    const { supabase } = await import('../../config/supabase')
    const removeSpy = vi.spyOn(supabase.storage.from(), 'remove')
    const onChange = vi.fn()
    render(
      <CertificateUpload
        userId={userId}
        value={[{ name: 'cert.pdf', path: 'uid/cert.pdf', type: 'application/pdf', size: 1000, uploaded_at: '' }]}
        onChange={onChange}
        deleteOnRemove={false}
        inputId="cert-nodelete"
      />
    )
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([]))
    expect(removeSpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx vitest run src/components/common/CertificateUpload.test.jsx
```

Expected: FAIL — `maxFiles` and `deleteOnRemove` props don't exist yet.

- [ ] **Step 3: Implement `maxFiles` and `deleteOnRemove` props**

Open `src/components/common/CertificateUpload.jsx`. Make these changes:

**a) Add new props to the function signature** (line ~29):

```jsx
export default function CertificateUpload({
    userId,
    value,
    onChange,
    inputId = 'certificate-upload',
    maxFiles = Infinity,
    deleteOnRemove = true,
}) {
```

**b) Replace the append line in `handleUpload`** (currently `onChange?.([...(certificates || []), ...uploadedCertificates])`):

```jsx
    // When maxFiles=1, replace the entire list; otherwise append.
    if (maxFiles === 1) {
        onChange?.([...uploadedCertificates])
    } else {
        onChange?.([...(certificates || []), ...uploadedCertificates])
    }
```

**c) Replace the `handleRemove` function body** — wrap the storage delete in a conditional:

```jsx
    const handleRemove = async (index) => {
        const target = certificates[index]
        if (!target) return

        setError('')

        if (deleteOnRemove && target.path) {
            setUploading(true)
            try {
                const { error: removeError } = await supabase.storage
                    .from(CERTIFICATE_BUCKET)
                    .remove([target.path])
                if (removeError) throw removeError
            } catch (removeError) {
                setError(removeError?.message || 'Failed to remove certificate.')
                setUploading(false)
                return
            } finally {
                setUploading(false)
            }
        }

        onChange?.(certificates.filter((_, currentIndex) => currentIndex !== index))
    }
```

**d) Add `multiple` attribute control on the `<input>`** — when `maxFiles=1`, omit `multiple`:

```jsx
                <input
                    ref={inputRef}
                    type="file"
                    accept={CERTIFICATE_ACCEPT}
                    multiple={maxFiles !== 1}
                    onChange={handleUpload}
                    className="hidden"
                    id={inputId}
                    disabled={uploading || !userId}
                />
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx vitest run src/components/common/CertificateUpload.test.jsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/common/CertificateUpload.jsx src/components/common/CertificateUpload.test.jsx
git commit -m "feat: add maxFiles and deleteOnRemove props to CertificateUpload"
```

---

## Task 6: Step4Education — per-entry certificate upload + validation

**Files:**
- Modify: `src/components/registration/Step4Education.jsx`
- Test: `src/components/registration/Step4Education.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/registration/Step4Education.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Step4Education } from './Step4Education'

vi.mock('../common/CertificateUpload', () => ({
  default: ({ onChange, inputId }) => (
    <button
      data-testid={`cert-upload-${inputId}`}
      onClick={() => onChange([{ name: 'cert.pdf', path: 'uid/cert.pdf', type: 'application/pdf', size: 1000, uploaded_at: '' }])}
    >
      Upload
    </button>
  ),
}))

const BASE_FORM = {
  currently_in_school: false,
  highest_education: 'Tertiary',
  school_name: 'UP',
  vocational_training: [],
}

describe('Step4Education — vocational training cert validation', () => {
  it('shows cert-required banner for a training entry with no certificate_path', () => {
    const formData = {
      ...BASE_FORM,
      vocational_training: [
        { course: 'NCII', institution: 'TESDA', hours: '40', skills_acquired: '', certificate_level: 'NC II', certificate_path: '', certificate_name: '' },
      ],
    }
    render(
      <Step4Education
        formData={formData}
        handleChange={vi.fn()}
        setFormData={vi.fn()}
        errors={{}}
        userId="user-1"
      />
    )
    expect(screen.getByText(/Proof of Completion Required/i)).toBeInTheDocument()
  })

  it('hides cert-required banner once certificate_path is set', () => {
    const formData = {
      ...BASE_FORM,
      vocational_training: [
        { course: 'NCII', institution: 'TESDA', hours: '40', skills_acquired: '', certificate_level: 'NC II', certificate_path: 'uid/cert.pdf', certificate_name: 'cert.pdf' },
      ],
    }
    render(
      <Step4Education
        formData={formData}
        handleChange={vi.fn()}
        setFormData={vi.fn()}
        errors={{}}
        userId="user-1"
      />
    )
    expect(screen.queryByText(/Proof of Completion Required/i)).not.toBeInTheDocument()
    expect(screen.getByText('cert.pdf')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — confirm FAIL**

```bash
npx vitest run src/components/registration/Step4Education.test.jsx
```

Expected: FAIL — `userId` prop not accepted, no cert upload zone rendered, no `certificate_path` in `EMPTY_TRAINING`.

- [ ] **Step 3: Update `EMPTY_TRAINING` and add `userId` prop**

In `Step4Education.jsx`:

```jsx
const EMPTY_TRAINING = {
  course: '',
  institution: '',
  hours: '',
  skills_acquired: '',
  certificate_level: '',
  certificate_path: '',
  certificate_name: '',
}
```

Update the function signature to accept `userId`:

```jsx
function Step4Education({ formData, handleChange, setFormData, errors = {}, userId }) {
```

- [ ] **Step 4: Add `updateTrainingFields` helper** (batch-update multiple keys in one training entry)

Add this helper alongside `updateTraining`:

```jsx
  const updateTrainingFields = (index, fields) => {
    setFormData(prev => {
      const updated = [...(prev.vocational_training || [])]
      updated[index] = { ...updated[index], ...fields }
      return { ...prev, vocational_training: updated }
    })
  }
```

- [ ] **Step 5: Add import for CertificateUpload and AlertCircle/CheckCircle**

At the top of `Step4Education.jsx`, add:

```jsx
import CertificateUpload from '../common/CertificateUpload'
import { GraduationCap, Calendar, Plus, X, CheckCircle, Sparkles, AlertCircle } from 'lucide-react'
```

(Replace the existing `lucide-react` import line — just add `AlertCircle` to the list.)

- [ ] **Step 6: Add the cert upload zone inside each training card**

Replace the closing `</div>` of the inner `space-y-3` div in the training map (after the Skills Acquired field) with:

```jsx
              <FloatingLabelInput label="Skills Acquired" name={`training_skills_${index}`} value={training.skills_acquired} onChange={(e) => updateTraining(index, 'skills_acquired', e.target.value)} />

              {/* Certificate upload — required, single file, no storage delete on remove */}
              <div className="pt-3 border-t border-gray-200">
                {!training.certificate_path ? (
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Proof of Completion Required
                  </div>
                ) : (
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-600">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {training.certificate_name || training.certificate_path.split('/').pop()}
                  </div>
                )}
                <CertificateUpload
                  userId={userId}
                  value={training.certificate_path
                    ? [{ name: training.certificate_name || training.certificate_path.split('/').pop(), path: training.certificate_path, type: 'application/pdf', size: 0, uploaded_at: '' }]
                    : []}
                  onChange={(certs) => {
                    const cert = certs[0] || null
                    updateTrainingFields(index, {
                      certificate_path: cert?.path || '',
                      certificate_name: cert?.name || '',
                    })
                  }}
                  maxFiles={1}
                  deleteOnRemove={false}
                  inputId={`training-cert-upload-${index}`}
                />
              </div>
```

- [ ] **Step 7: Add the section-level validation error display**

Below the `<p className="text-sm text-gray-500 mb-4">Optional — add up to 3 training entries.</p>` line, add:

```jsx
        {errors.vocational_training_certs && (
          <p className="text-sm text-red-500 mb-3 flex items-center gap-1">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errors.vocational_training_certs}
          </p>
        )}
```

- [ ] **Step 8: Run tests — confirm they pass**

```bash
npx vitest run src/components/registration/Step4Education.test.jsx
```

Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/components/registration/Step4Education.jsx src/components/registration/Step4Education.test.jsx
git commit -m "feat: add per-entry certificate upload zone to Step4Education"
```

---

## Task 7: JobseekerRegistration — step 4 cert validation blocks advance

**Files:**
- Modify: `src/pages/JobseekerRegistration.jsx`

- [ ] **Step 1: Find the step 4 validation function**

Search for where step 4 errors are built. Look for `case 4:` in the validation logic. The step uses `errors` passed down to components.

- [ ] **Step 2: Add cert validation to the step 4 validator**

In `JobseekerRegistration.jsx`, find the function that returns errors for each step (look for a `validateStep` or `getStepErrors` function, or inline error building in `handleNext`). Add to the step 4 branch:

```jsx
case 4: {
  const stepErrors = {}
  // ... existing field validations (currently_in_school, highest_education, school_name) ...

  // Vocational cert validation — every entry must have certificate_path
  const trainings = formData.vocational_training || []
  const missingCert = trainings.some(t => !t.certificate_path || t.certificate_path.trim() === '')
  if (missingCert) {
    stepErrors.vocational_training_certs = 'Each training entry requires a certificate upload before you can continue.'
  }

  return stepErrors
}
```

> **Note:** The exact insertion point depends on the existing validator structure. Find the `case 4:` branch and add the above block. Keep all existing validations — do not remove them.

- [ ] **Step 3: Verify `userId` is passed to `Step4Education`**

In `JobseekerRegistration.jsx`, find where `<Step4Education>` is rendered. Confirm `userId` is passed:

```jsx
<Step4Education
  formData={formData}
  handleChange={handleChange}
  setFormData={setFormData}
  errors={errors}
  userId={user?.id}   // add this if missing
/>
```

- [ ] **Step 4: Manual test**

Run `npm run dev`, register as a jobseeker, reach Step 4, add a training entry without uploading a cert, click Next. Confirm the error message appears and the step does not advance.

- [ ] **Step 5: Commit**

```bash
git add src/pages/JobseekerRegistration.jsx
git commit -m "feat: block step 4 advance when training entries are missing certificates"
```

---

## Task 8: JobseekerProfileEdit — per-entry cert upload + expand CRITICAL_FIELDS

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx`

- [ ] **Step 1: Add import for `CertificateUpload` and `AlertCircle`**

`CertificateUpload` is already imported at line 15. Confirm `AlertCircle` is in the lucide-react import list. If missing, add it:

```jsx
import { ..., AlertCircle } from 'lucide-react'
```

- [ ] **Step 2: Update `EMPTY_TRAINING` constant**

Find `const EMPTY_TRAINING` near the top of the file and add the new fields:

```jsx
const EMPTY_TRAINING = {
  course: '',
  institution: '',
  hours: '',
  skills_acquired: '',
  certificate_level: '',
  certificate_path: '',
  certificate_name: '',
}
```

- [ ] **Step 3: Add `updateTrainingFields` helper**

Find the `updateTraining` and `removeTraining` functions (around line 453). Add alongside them:

```jsx
  const updateTrainingFields = (index, fields) => {
    setFormData(prev => {
      const updated = [...(prev.vocational_training || [])]
      updated[index] = { ...updated[index], ...fields }
      return { ...prev, vocational_training: updated }
    })
  }
```

- [ ] **Step 4: Add the cert upload zone to each training card in the render**

Find the training map (around line 1138). After the Skills Acquired `FloatingLabelInput` inside each card, add:

```jsx
                      <FloatingLabelInput label="Skills Acquired" name={`training_skills_${index}`} value={training.skills_acquired} onChange={(e) => updateTraining(index, 'skills_acquired', e.target.value)} />

                      {/* Certificate upload — single file, no immediate storage delete */}
                      <div className="pt-3 border-t border-gray-200">
                        {!training.certificate_path ? (
                          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-600">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            Proof of Completion Required
                          </div>
                        ) : (
                          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-600">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            {training.certificate_name || training.certificate_path.split('/').pop()}
                          </div>
                        )}
                        <CertificateUpload
                          userId={currentUser?.uid}
                          value={training.certificate_path
                            ? [{ name: training.certificate_name || training.certificate_path.split('/').pop(), path: training.certificate_path, type: 'application/pdf', size: 0, uploaded_at: '' }]
                            : []}
                          onChange={(certs) => {
                            const cert = certs[0] || null
                            updateTrainingFields(index, {
                              certificate_path: cert?.path || '',
                              certificate_name: cert?.name || '',
                            })
                          }}
                          maxFiles={1}
                          deleteOnRemove={false}
                          inputId={`profile-training-cert-${index}`}
                        />
                      </div>
```

- [ ] **Step 5: Expand CRITICAL_FIELDS and add `vocational_training` + name fields**

Find the `CRITICAL_FIELDS` array around line 680 and replace it:

```jsx
            const CRITICAL_FIELDS = [
              'surname', 'first_name', 'middle_name',
              'highest_education', 'school_name', 'course_or_field',
              'vocational_training', 'professional_licenses',
              'civil_service_eligibility', 'work_experiences',
            ]
```

- [ ] **Step 6: Add save-time cert validation**

Find the save function (`handleSave` or similar). Before the Supabase upsert, add:

```jsx
        const trainings = formData.vocational_training || []
        const missingCert = trainings.some(t => !t.certificate_path || t.certificate_path.trim() === '')
        if (missingCert) {
          setError('Each training entry requires a certificate upload before saving.')
          setSaving(false)
          return
        }
```

- [ ] **Step 7: Manual test**

Run `npm run dev`, log in as a verified jobseeker, go to profile edit, add a training entry without a cert, click Save. Confirm the error shows and save is blocked. Add a cert, save — confirm success.

- [ ] **Step 8: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "feat: add per-entry cert upload and expanded CRITICAL_FIELDS to JobseekerProfileEdit"
```

---

## Task 9: `PendingReverificationBadge` component + render sites

**Files:**
- Create: `src/components/common/PendingReverificationBadge.jsx`
- Test: `src/components/common/PendingReverificationBadge.test.jsx`
- Modify: `src/pages/Profile.jsx`
- Modify: `src/components/admin/JobseekerCard.jsx`
- Modify: `src/components/admin/EmployerCard.jsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/PendingReverificationBadge.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PendingReverificationBadge from './PendingReverificationBadge'

describe('PendingReverificationBadge', () => {
  it('renders the badge when both flags are true', () => {
    render(<PendingReverificationBadge isVerified={true} isPendingReverification={true} />)
    expect(screen.getByText(/Pending Re-verification/i)).toBeInTheDocument()
  })

  it('renders nothing when isPendingReverification is false', () => {
    const { container } = render(<PendingReverificationBadge isVerified={true} isPendingReverification={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when isVerified is false', () => {
    const { container } = render(<PendingReverificationBadge isVerified={false} isPendingReverification={true} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run — confirm FAIL**

```bash
npx vitest run src/components/common/PendingReverificationBadge.test.jsx
```

Expected: FAIL — component file doesn't exist.

- [ ] **Step 3: Create the component**

Create `src/components/common/PendingReverificationBadge.jsx`:

```jsx
import { RefreshCw } from 'lucide-react'

export default function PendingReverificationBadge({ isVerified, isPendingReverification }) {
  if (!isVerified || !isPendingReverification) return null

  return (
    <span
      title="This user's profile has recent changes under review by PESO staff."
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-300"
    >
      <RefreshCw className="w-3 h-3" />
      Pending Re-verification
    </span>
  )
}
```

- [ ] **Step 4: Run tests — confirm PASS**

```bash
npx vitest run src/components/common/PendingReverificationBadge.test.jsx
```

Expected: PASS (3 tests).

- [ ] **Step 5: Render badge in `Profile.jsx`**

Open `src/pages/Profile.jsx`. Find the block around line 115 that shows the verified/pending pill. Add the badge after the existing verification pill:

```jsx
import PendingReverificationBadge from '../components/common/PendingReverificationBadge'

// In JSX, after the existing verified badge:
<PendingReverificationBadge
  isVerified={userData?.is_verified}
  isPendingReverification={userData?.profile_modified_since_verification}
/>
```

- [ ] **Step 6: Update `JobseekerCard.jsx` to use the new component**

Open `src/components/admin/JobseekerCard.jsx`. Import the new component:

```jsx
import PendingReverificationBadge from '../common/PendingReverificationBadge'
```

Replace the existing inline badge block (lines ~160-165, the yellow "Profile Modified" span) with:

```jsx
<PendingReverificationBadge
  isVerified={status === 'verified'}
  isPendingReverification={jobseeker.profile_modified_since_verification}
/>
```

- [ ] **Step 7: Add badge to `EmployerCard.jsx`**

Open `src/components/admin/EmployerCard.jsx`. Find where the employer's verification status badge is rendered. Import and add:

```jsx
import PendingReverificationBadge from '../common/PendingReverificationBadge'

// Alongside the existing status badge:
<PendingReverificationBadge
  isVerified={employer.employer_status === 'approved' || employer.is_verified}
  isPendingReverification={employer.profile_modified_since_verification}
/>
```

- [ ] **Step 8: Commit**

```bash
git add src/components/common/PendingReverificationBadge.jsx src/components/common/PendingReverificationBadge.test.jsx src/pages/Profile.jsx src/components/admin/JobseekerCard.jsx src/components/admin/EmployerCard.jsx
git commit -m "feat: add PendingReverificationBadge and render at all verified-badge sites"
```

---

## Task 10: EmployerProfileEdit — watched-field toast + client-side flag

**Files:**
- Modify: `src/pages/EmployerProfileEdit.jsx`

- [ ] **Step 1: Add session-state toast flag**

In `EmployerProfileEdit.jsx`, add a state variable near the top of the component:

```jsx
const [hasShownReverifyWarning, setHasShownReverifyWarning] = useState(false)
```

- [ ] **Step 2: Add `EMPLOYER_WATCHED_FIELDS` constant**

Near the top of the file (alongside the other constants):

```jsx
const EMPLOYER_WATCHED_FIELDS = ['company_name', 'tin', 'business_reg_number', 'owner_name', 'representative_name']
```

- [ ] **Step 3: Add toast state**

```jsx
const [showReverifyToast, setShowReverifyToast] = useState(false)
```

- [ ] **Step 4: Create the `handleWatchedFieldFocus` handler**

```jsx
  const handleWatchedFieldFocus = () => {
    if (userData?.is_verified && !hasShownReverifyWarning) {
      setHasShownReverifyWarning(true)
      setShowReverifyToast(true)
      setTimeout(() => setShowReverifyToast(false), 8000)
    }
  }
```

- [ ] **Step 5: Add the toast JSX**

Near the top of the form JSX (before the first input section), add:

```jsx
      {showReverifyToast && (
        <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <RefreshCw className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
          <p>
            <strong>Heads up:</strong> Saving changes to your company details will temporarily add a{' '}
            <em>Pending Re-verification</em> badge to your profile while PESO staff reviews the update.
            Your profile remains visible throughout.
          </p>
          <button
            type="button"
            onClick={() => setShowReverifyToast(false)}
            className="ml-auto text-amber-500 hover:text-amber-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
```

Make sure `RefreshCw` and `X` are in the lucide-react import.

- [ ] **Step 6: Attach `onFocus` to each watched field input**

For each of the five watched fields (`company_name`, `tin`, `business_reg_number`, `owner_name`, `representative_name`), add `onFocus={handleWatchedFieldFocus}` to the input element. Example:

```jsx
<FloatingLabelInput
  label="Company Name"
  name="company_name"
  value={formData.company_name}
  onChange={handleChange}
  onFocus={handleWatchedFieldFocus}
  required
/>
```

Repeat for each of the five fields. Adjust the exact component/prop name based on how each is rendered.

- [ ] **Step 7: Add client-side flag setting in the save function**

Find the save function in `EmployerProfileEdit.jsx`. Before the Supabase upsert, add:

```jsx
        if (userData?.is_verified) {
          const initial = initialFormDataRef.current ? JSON.parse(initialFormDataRef.current) : {}
          const watchedChanged = EMPLOYER_WATCHED_FIELDS.some(
            field => (formData[field] || '').toLowerCase().trim() !== (initial[field] || '').toLowerCase().trim()
          )
          if (watchedChanged) {
            profileData.profile_modified_since_verification = true
          }
        }
```

> **Note:** If `EmployerProfileEdit` doesn't have `initialFormDataRef`, add one:
> ```jsx
> const initialFormDataRef = useRef(null)
> // In the useEffect that loads profile data:
> initialFormDataRef.current = JSON.stringify(loadedFormData)
> ```

- [ ] **Step 8: Manual test**

Run `npm run dev`, log in as a verified employer, go to profile edit, click into the Company Name field. Confirm the amber toast appears. Fill a new company name, save. Confirm `profile_modified_since_verification = true` in Supabase Table Editor.

- [ ] **Step 9: Commit**

```bash
git add src/pages/EmployerProfileEdit.jsx
git commit -m "feat: add watched-field reverification toast and flag to EmployerProfileEdit"
```

---

## Task 11: Save `verified_snapshot` on initial admin approval

**Files:**
- Modify: `src/pages/admin/Dashboard.jsx`

- [ ] **Step 1: Find the approval handler**

In `Dashboard.jsx`, find the function that handles approving a user (look for the block around line 440 that calls `.update({ is_verified: true, ...verificationMeta })`).

- [ ] **Step 2: Add snapshot save for jobseekers**

After the existing `is_verified: true` update succeeds and before the success toast, add a snapshot save call. The snapshot is saved to the profile table via Supabase:

```jsx
            // Save the verified_snapshot so the re-verification diff view has a baseline.
            if (userRole === 'jobseeker') {
              const { data: jsProfile } = await supabase
                .from('jobseeker_profiles')
                .select('highest_education, school_name, course_or_field, vocational_training, professional_licenses, civil_service_eligibility, work_experiences')
                .eq('id', userId)
                .single()

              if (jsProfile) {
                await supabase
                  .from('jobseeker_profiles')
                  .update({
                    verified_snapshot: {
                      highest_education: jsProfile.highest_education,
                      school_name: jsProfile.school_name,
                      course_or_field: jsProfile.course_or_field,
                      vocational_training: jsProfile.vocational_training,
                      professional_licenses: jsProfile.professional_licenses,
                      civil_service_eligibility: jsProfile.civil_service_eligibility,
                      work_experiences: jsProfile.work_experiences,
                    },
                    profile_modified_since_verification: false,
                  })
                  .eq('id', userId)
              }
            } else if (userRole === 'employer') {
              const { data: epProfile } = await supabase
                .from('employer_profiles')
                .select('company_name, tin, business_reg_number, owner_name, representative_name')
                .eq('id', userId)
                .single()

              if (epProfile) {
                await supabase
                  .from('employer_profiles')
                  .update({
                    verified_snapshot: {
                      company_name: epProfile.company_name,
                      tin: epProfile.tin,
                      business_reg_number: epProfile.business_reg_number,
                      owner_name: epProfile.owner_name,
                      representative_name: epProfile.representative_name,
                    },
                    profile_modified_since_verification: false,
                  })
                  .eq('id', userId)
              }
            }
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/Dashboard.jsx
git commit -m "feat: save verified_snapshot on initial admin approval for reverification diff baseline"
```

---

## Task 12: `ReverificationQueue` admin component

**Files:**
- Create: `src/components/admin/ReverificationQueue.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/admin/ReverificationQueue.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../config/supabase'
import { CheckCircle, XCircle, ShieldOff, ChevronDown, ChevronUp, ExternalLink, RefreshCw } from 'lucide-react'
import { getCertificateSignedUrl } from '../../utils/certificateUtils'

const JOBSEEKER_WATCHED = [
  'highest_education', 'school_name', 'course_or_field',
  'vocational_training', 'professional_licenses',
  'civil_service_eligibility', 'work_experiences',
]

const EMPLOYER_WATCHED = [
  'company_name', 'tin', 'business_reg_number', 'owner_name', 'representative_name',
]

function fieldLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function ScalarDiff({ label, before, after }) {
  const changed = (before || '').toLowerCase().trim() !== (after || '').toLowerCase().trim()
  return (
    <div className={`grid grid-cols-2 gap-4 p-2 rounded-lg ${changed ? 'bg-amber-50' : ''}`}>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-700">{before || '—'}</p>
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-sm ${changed ? 'text-amber-800 font-medium' : 'text-gray-400'}`}>{after || '—'}</p>
      </div>
    </div>
  )
}

function VocationalDiff({ before = [], after = [] }) {
  const [certUrls, setCertUrls] = useState({})

  useEffect(() => {
    const paths = after.map(e => e.certificate_path).filter(Boolean)
    paths.forEach(async (path) => {
      try {
        const url = await getCertificateSignedUrl(path)
        setCertUrls(prev => ({ ...prev, [path]: url }))
      } catch { /* leave missing */ }
    })
  }, [after])

  const beforeCourses = new Set(before.map(e => e.course))

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vocational Training</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          {before.length === 0 && <p className="text-sm text-gray-400">—</p>}
          {before.map((entry, i) => (
            <div key={i} className="text-sm text-gray-700">• {entry.course} — {entry.institution}</div>
          ))}
        </div>
        <div className="space-y-2">
          {after.length === 0 && <p className="text-sm text-gray-400">—</p>}
          {after.map((entry, i) => {
            const isNew = !beforeCourses.has(entry.course)
            const certUrl = certUrls[entry.certificate_path]
            return (
              <div key={i} className={`text-sm rounded p-1 ${isNew ? 'bg-green-50' : ''}`}>
                <span className="text-gray-700">• {entry.course} — {entry.institution}</span>
                {isNew && <span className="ml-2 text-xs font-semibold text-green-600">NEW</span>}
                {certUrl && (
                  <a href={certUrl} target="_blank" rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-0.5 text-xs text-primary-600 hover:underline">
                    📎 cert <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ profile, role, onApprove, onReject, onRevoke }) {
  const [expanded, setExpanded] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const snapshot = profile.verified_snapshot || {}
  const watched = role === 'jobseeker' ? JOBSEEKER_WATCHED : EMPLOYER_WATCHED
  const scalarFields = watched.filter(f => f !== 'vocational_training' && f !== 'professional_licenses' && f !== 'work_experiences')

  const handleAction = async (action) => {
    setActionLoading(action)
    try {
      if (action === 'approve') await onApprove(profile.id, role)
      else if (action === 'reject') await onReject(profile.id, role, rejectReason)
      else if (action === 'revoke') await onRevoke(profile.id, role)
    } finally {
      setActionLoading(null)
      setShowRejectInput(false)
    }
  }

  const displayName = role === 'jobseeker'
    ? `${profile.first_name || ''} ${profile.surname || ''}`.trim() || profile.email
    : profile.company_name || profile.email

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-4">
        <div>
          <p className="font-semibold text-gray-900">{displayName}</p>
          <p className="text-xs text-gray-400">{profile.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onApprove(profile.id, role)}
            disabled={!!actionLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Approve
          </button>
          <button
            type="button"
            onClick={() => setShowRejectInput(v => !v)}
            disabled={!!actionLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
          <button
            type="button"
            onClick={() => handleAction('revoke')}
            disabled={!!actionLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
          >
            <ShieldOff className="w-3.5 h-3.5" /> Revoke
          </button>
          <button type="button" onClick={() => setExpanded(v => !v)} className="p-1 text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {showRejectInput && (
        <div className="px-4 pb-3 flex gap-2">
          <input
            type="text"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (required)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="button"
            disabled={!rejectReason.trim() || !!actionLoading}
            onClick={() => handleAction('reject')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Before (verified snapshot)</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">After (current profile)</p>
          </div>

          {scalarFields.map(field => (
            <ScalarDiff
              key={field}
              label={fieldLabel(field)}
              before={snapshot[field]}
              after={profile[field]}
            />
          ))}

          {role === 'jobseeker' && (
            <VocationalDiff
              before={snapshot.vocational_training || []}
              after={profile.vocational_training || []}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default function ReverificationQueue() {
  const [tab, setTab] = useState('jobseeker')
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('admin_get_reverification_queue', { p_role: tab })
      if (error) throw error
      setProfiles(data || [])
    } catch (err) {
      console.error('Failed to load reverification queue:', err)
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  const sendNotification = async (userId, title, body) => {
    await supabase.from('admin_notifications').insert({
      user_id: userId,
      type: 'account_status',
      title,
      body,
    })
  }

  const handleApprove = async (userId, role) => {
    await supabase.rpc('admin_approve_reverification', { p_user_id: userId, p_role: role })
    await sendNotification(userId, 'Profile Changes Approved', 'Your recent profile changes have been reviewed and approved by PESO staff.')
    setProfiles(prev => prev.filter(p => p.id !== userId))
  }

  const handleReject = async (userId, role, reason) => {
    await supabase.rpc('admin_reject_reverification', { p_user_id: userId, p_role: role })
    await sendNotification(userId, 'Profile Changes Require Attention', `A PESO staff member has flagged your recent profile changes: ${reason}. Please update your profile accordingly.`)
  }

  const handleRevoke = async (userId, role) => {
    await supabase.rpc('admin_revoke_verification', { p_user_id: userId, p_role: role })
    await sendNotification(userId, 'Verification Revoked', 'Your PESO verification has been revoked due to a discrepancy in your profile information. Please re-apply for verification.')
    setProfiles(prev => prev.filter(p => p.id !== userId))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-amber-500" />
          Re-verification Queue
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Profiles where a verified user edited sensitive fields. Review changes and take action.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {['jobseeker', 'employer'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'jobseeker' ? 'Jobseekers' : 'Employers'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No pending re-verifications.</div>
      ) : (
        <div className="space-y-4">
          {profiles.map(profile => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              role={tab}
              onApprove={handleApprove}
              onReject={handleReject}
              onRevoke={handleRevoke}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/ReverificationQueue.jsx
git commit -m "feat: add ReverificationQueue admin component with diff view and Approve/Reject/Revoke"
```

---

## Task 13: Admin route, sidebar tab, and permissions

**Files:**
- Modify: `src/components/admin/AdminSidebar.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/admin/AdminManagementSection.jsx` (or wherever admin permissions are defined)

- [ ] **Step 1: Add Re-verification tab to `AdminSidebar.jsx`**

Open `src/components/admin/AdminSidebar.jsx`. Import `RefreshCw` from lucide-react (add to existing import). Find where other nav items are defined (array of `{ label, icon, path }` or similar). Add:

```jsx
{ label: 'Re-verification', icon: RefreshCw, path: '/admin/reverification' },
```

If the sidebar shows a count badge for notifications, add a count prop that reads the queue length. Otherwise a static entry is fine for now.

- [ ] **Step 2: Add route to `App.jsx`**

Open `src/App.jsx`. Find the block of `/admin/*` routes. Import `ReverificationQueue`:

```jsx
import ReverificationQueue from './components/admin/ReverificationQueue'
```

Add the route inside the admin route group (wrapped in `<ErrorBoundary>` per the existing pattern):

```jsx
<Route
  path="/admin/reverification"
  element={
    <ErrorBoundary>
      <ReverificationQueue />
    </ErrorBoundary>
  }
/>
```

- [ ] **Step 3: Add `reverify_profiles` permission**

Open `src/components/admin/AdminManagementSection.jsx` (or wherever `ADMIN_PERMISSIONS` / permission definitions live). Add the new permission to the list for `superadmin` and `sub-admin`:

```jsx
{ key: 'reverify_profiles', label: 'Re-verify Profiles', description: 'Review and action pending re-verification requests' },
```

Grant it by default to `superadmin` and `sub-admin` in the default permissions map.

- [ ] **Step 4: Guard the route with the permission**

In `App.jsx`, wrap the `/admin/reverification` route with a permission check. Follow the existing pattern for other gated admin routes (look for how `manage_admins` or similar permissions gate routes). Example:

```jsx
<Route
  path="/admin/reverification"
  element={
    userData?.permissions?.reverify_profiles || userData?.admin_level === 'superadmin' ? (
      <ErrorBoundary><ReverificationQueue /></ErrorBoundary>
    ) : (
      <Navigate to="/admin" replace />
    )
  }
/>
```

Adjust the permission key access pattern to match how existing routes check it.

- [ ] **Step 5: Manual end-to-end test**

1. Log in as admin → confirm "Re-verification" appears in the sidebar.
2. Log in as a verified jobseeker → add a training entry with a cert → save profile.
3. Back in admin → Re-verification tab → Jobseekers → confirm the profile appears.
4. Expand the card → confirm the diff shows the new training entry with the cert link.
5. Click Approve → confirm the card disappears and the jobseeker's amber badge is gone.
6. Repeat step 2 → go to admin → click Revoke → confirm `is_verified` is false in Supabase Table Editor.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminSidebar.jsx src/App.jsx src/components/admin/AdminManagementSection.jsx
git commit -m "feat: wire ReverificationQueue into admin sidebar, routing, and permissions"
```

---

## Done

All 13 tasks complete. The feature is fully implemented:

- **DB safety net:** CHECK constraint on `vocational_training` ensures no entry without `certificate_path` can reach the DB.
- **DB trigger:** BEFORE UPDATE triggers on both profile tables atomically flag sensitive field changes for verified users.
- **UI enforcement:** Per-entry cert upload in registration wizard and profile edit; save is blocked without certs.
- **Transparency:** Amber "Pending Re-verification" badge rendered alongside existing verified badge at all display sites.
- **Employer UX:** Toast warning before a verified employer touches critical company fields.
- **Admin queue:** Diff-based review with Approve / Reject / Revoke and audit notifications.

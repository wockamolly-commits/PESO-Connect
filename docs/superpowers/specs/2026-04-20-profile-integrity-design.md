# Profile Integrity & Re-verification System — Design Spec
**Date:** 2026-04-20
**Status:** Approved for implementation

---

## 1. Overview

This feature enforces proof-of-completion for every Technical/Vocational training entry a jobseeker adds, and introduces a re-verification audit trail for verified users who later edit sensitive identity or credential fields. It covers both the initial registration wizard and the profile-edit pages, and gives admin staff a dedicated review queue with Approve / Reject / Revoke actions.

**Goals:**
- Prevent fraudulent skill claims by requiring a 1:1 certificate upload per Tech/Voc entry (Jobseekers only)
- Trigger a "Pending Re-verification" flag when a verified user edits high-trust fields
- Give admins a diff-based review queue to audit changes before clearing the flag
- Surface the pending state transparently to employers without suspending the profile

---

## 2. Scope

| Surface | Jobseeker | Employer |
|---|---|---|
| 1:1 cert per Tech/Voc entry | ✅ Registration + Profile Edit | N/A |
| Re-verification trigger on sensitive field edits | ✅ | ✅ |
| Mandatory document re-upload on edit | ✅ (new cert per new entry) | ❌ (flag only) |
| "Pending Re-verification" badge | ✅ | ✅ |
| Admin re-verification queue | ✅ | ✅ |

---

## 3. Data Model (Approach B)

### 3.1 `vocational_training` JSONB entry shape

Each element of the `vocational_training` array in `jobseeker_profiles` gains one new required key:

```jsonc
{
  "course": "NCII Electrical Installation",
  "institution": "TESDA",
  "hours": "40",
  "skills_acquired": "Wiring, panel work",
  "certificate_level": "NC II",
  "certificate_path": "user-uuid/certs/training-0-abc123.pdf"  // NEW
}
```

`certificate_path` holds the Supabase Storage path only — signed URLs are minted at render time, never persisted.

### 3.2 Postgres CHECK constraint

Migration file: `sql/add_vocational_cert_constraint.sql`

```sql
ALTER TABLE public.jobseeker_profiles
ADD CONSTRAINT chk_vocational_training_has_cert
CHECK (
  (
    SELECT bool_and(
      (elem->>'certificate_path') IS NOT NULL
      AND trim(elem->>'certificate_path') <> ''
    )
    FROM jsonb_array_elements(vocational_training) AS elem
  )
  OR vocational_training = '[]'::jsonb
);
```

- An empty array passes (training is optional).
- Any array element missing or having a blank `certificate_path` causes the write to fail at the DB level — even if the client-side guard is bypassed.

### 3.3 `profile_modified_since_verification` flag

New `boolean DEFAULT false NOT NULL` column added to both `jobseeker_profiles` and `employer_profiles`.

Migration file: `sql/add_reverification_flag.sql`

```sql
ALTER TABLE public.jobseeker_profiles
  ADD COLUMN IF NOT EXISTS profile_modified_since_verification boolean DEFAULT false NOT NULL;

ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS profile_modified_since_verification boolean DEFAULT false NOT NULL;
```

### 3.4 Verified-profile snapshot

To power the diff view, when a user's `is_verified` transitions from `false → true`, the admin approval action saves a JSON snapshot of the profile's watched fields into a new `verified_snapshot` JSONB column (same tables). This snapshot becomes the "BEFORE" side of the diff.

```sql
ALTER TABLE public.jobseeker_profiles
  ADD COLUMN IF NOT EXISTS verified_snapshot jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS verified_snapshot jsonb DEFAULT '{}'::jsonb;
```

When admin clicks **Approve** on a re-verification, the snapshot is refreshed to the current profile state.

---

## 4. Re-verification Trigger Logic

Migration file: `sql/add_reverification_trigger.sql`

### 4.1 Watched fields

**Jobseekers (strict):**
`first_name`, `surname`, `middle_name`, `vocational_training`, `highest_education`, `school_name`, `course_or_field`, `professional_licenses`, `civil_service_eligibility`, `work_experiences`

**Employers:**
`company_name`, `tin`, `business_reg_number`, `owner_name`, `representative_name`

### 4.2 Trigger function

The trigger fires `BEFORE UPDATE` on each profile table (so the flag is set atomically in the same write). It only sets the flag when:
1. The user is currently verified (`is_verified = true` in `public.users`)
2. At least one watched field has changed **after case-insensitive, whitespace-normalised comparison**

```sql
CREATE OR REPLACE FUNCTION fn_set_reverification_flag()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  is_user_verified boolean;
  fields_changed   boolean := false;
BEGIN
  SELECT is_verified INTO is_user_verified
  FROM public.users WHERE id = NEW.id;

  IF NOT COALESCE(is_user_verified, false) THEN
    RETURN NEW;
  END IF;

  -- Case-insensitive, trimmed text comparison for scalar fields.
  -- JSONB fields use a canonical text cast.
  IF lower(trim(NEW.first_name))    IS DISTINCT FROM lower(trim(OLD.first_name))    OR
     lower(trim(NEW.surname))       IS DISTINCT FROM lower(trim(OLD.surname))       OR
     lower(trim(NEW.middle_name))   IS DISTINCT FROM lower(trim(OLD.middle_name))   OR
     NEW.vocational_training::text  IS DISTINCT FROM OLD.vocational_training::text  OR
     lower(trim(NEW.highest_education))   IS DISTINCT FROM lower(trim(OLD.highest_education))   OR
     lower(trim(NEW.school_name))         IS DISTINCT FROM lower(trim(OLD.school_name))         OR
     lower(trim(NEW.course_or_field))     IS DISTINCT FROM lower(trim(OLD.course_or_field))     OR
     NEW.professional_licenses::text      IS DISTINCT FROM OLD.professional_licenses::text      OR
     lower(trim(NEW.civil_service_eligibility)) IS DISTINCT FROM lower(trim(OLD.civil_service_eligibility)) OR
     NEW.work_experiences::text           IS DISTINCT FROM OLD.work_experiences::text
  THEN
    fields_changed := true;
  END IF;

  IF fields_changed THEN
    NEW.profile_modified_since_verification := true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_jobseeker_reverification
BEFORE UPDATE ON public.jobseeker_profiles
FOR EACH ROW EXECUTE FUNCTION fn_set_reverification_flag();
```

A parallel trigger and function is created for `employer_profiles` watching `company_name`, `tin`, `business_reg_number`, `owner_name`, `representative_name`.

**Case-insensitivity rule:** Scalar text fields are compared with `lower(trim(...))`. Changing `"Google"` to `"google"` does not set the flag. JSONB fields (arrays) are compared as canonical text — order-sensitive, but array content changes (adding a new training entry) will correctly trigger.

---

## 5. UI/UX

### 5.1 Per-entry certificate upload (Jobseekers)

**Affected files:** `src/components/registration/Step4Education.jsx`, `src/pages/JobseekerProfileEdit.jsx`

Each training entry card gets an inline certificate upload zone at the bottom, using the existing `CertificateUpload` component configured with `maxFiles={1}` (single-file mode — `multiple` attribute removed):

```
┌─────────────────────────────────────────────────┐
│ Training 1                          [× remove]  │
│  Course: NCII Electrical Installation           │
│  Institution: TESDA      Hours: 40              │
│  Certificate Level: NC II                       │
│  Skills: Wiring, panel work                     │
│ ─────────────────────────────────────────────── │
│ ⚠ Proof of Completion Required                  │  ← red banner, no cert yet
│ [ 📎 Upload Certificate (PDF / JPG / PNG, 5MB)] │
│                                                 │
│  ✓ TESDA-NC2-cert.pdf              [× remove]  │  ← replaces banner once uploaded
└─────────────────────────────────────────────────┘
```

The `updateTraining(index, 'certificate_path', path)` handler stores the storage path in the JSONB entry. Removing the file clears `certificate_path` to `''` and restores the red banner.

**Step-level validation** (blocks Next / Save):
- Counts training entries vs entries with a non-empty `certificate_path`.
- If counts differ, shows a top-of-section error: *"Each training entry requires a certificate upload before you can continue."*
- The button itself stays enabled so the error is visible inline.

### 5.2 Employer "Heads Up" warning

**Affected files:** `src/pages/EmployerProfileEdit.jsx`

When a verified employer focuses on any watched field (`company_name`, `tin`, `business_reg_number`, `owner_name`, `representative_name`) for the first time in a session, a non-blocking **toast** appears:

> **Heads up:** Saving changes to your company details will temporarily add a "Pending Re-verification" badge to your profile while PESO staff reviews the update. Your profile remains visible throughout.

The toast uses the existing amber/warning palette, appears once per session (tracked in component state), and auto-dismisses after 8 seconds. It does not block the form.

### 5.3 "Pending Re-verification" badge

Rendered wherever the green verified badge currently appears (jobseeker cards, employer cards, profile headers, admin user cards). Both badges sit side-by-side — the original green badge is NOT removed:

```
 ✓ Verified   🔄 Pending Re-verification
 (green)      (amber pill)
```

**Tailwind classes:** `bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5 text-xs font-medium`
**Icon:** `RefreshCw` (lucide-react, 12px)
**Tooltip:** *"This user's profile has recent changes under review by PESO staff."*

Badge rendering condition: `userData.is_verified && userData.profile_modified_since_verification`

---

## 6. Admin Re-verification Queue

### 6.1 Permissions

New permission `reverify_profiles` added to the admin permissions system. Granted to: `superadmin` and `sub-admin` roles.

**Affected files:** `src/components/admin/AdminManagementSection.jsx` (or wherever admin permissions are defined), admin route guards.

### 6.2 UI — New "Re-verification" tab

Added to `AdminSidebar.jsx` as a new top-level entry (with a `RefreshCw` icon and a count badge showing pending items). The tab renders two sub-tabs: **Jobseekers** and **Employers**.

Each pending user appears as a card. Expanding it shows a side-by-side diff:

```
┌──────────────────────────────────────────────────────────────────┐
│ Juan Dela Cruz — Flagged 2026-04-20  [Approve] [Reject] [Revoke] │
├───────────────────────────────┬──────────────────────────────────┤
│ BEFORE (verified snapshot)    │ AFTER (current profile)          │
│───────────────────────────────│──────────────────────────────────│
│ Vocational Training:          │ Vocational Training:             │
│  • NCII Welding — TESDA       │  • NCII Welding — TESDA         │
│                               │  • NCII Electrical — TESDA  NEW │
│                               │    📎 cert.pdf  [view ↗]        │
│ Work Experience:              │ Work Experience: (unchanged)     │
│  • Helper, ABC Corp 2022      │                                  │
└───────────────────────────────┴──────────────────────────────────┘
```

- Changed fields: amber highlight
- New items: `NEW` tag in green
- Certificate links: open signed URL in new tab
- Unchanged fields: collapsed / greyed out

### 6.3 Admin actions

| Action | Effect |
|---|---|
| **Approve** | `profile_modified_since_verification = false`; `verified_snapshot` refreshed to current profile state; in-app notification sent to user |
| **Reject** | Admin enters a short reason; in-app notification sent to user specifying which field was rejected; `profile_modified_since_verification` stays `true` |
| **Revoke** | `is_verified = false` on `public.users`; `profile_modified_since_verification = false`; in-app notification sent; profile re-enters the original verification queue |

All three actions are logged to the existing `admin_notifications` / audit log table.

---

## 7. Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| User removes a training entry that had a certificate | `handleRemove` deletes the storage object from the `certificates` bucket, then removes the entry from the array. No orphaned files. |
| DB CHECK constraint fires (bypassed client) | Supabase returns a 400 with a constraint violation message. The save function catches this and shows a generic error: *"One or more training entries is missing a certificate. Please refresh and try again."* |
| Employer edits a non-watched field (e.g., company website) | Trigger does not fire — no flag set. |
| Admin approves while user is mid-edit | Flag is cleared server-side. The amber badge disappears on the user's next page load / data refresh. No conflict. |
| Verified user with 0 vocational entries edits name only | Trigger still fires on name change (watched field). No cert upload required — the CHECK constraint only applies to JSONB array elements. |
| Admin tries to Revoke a non-verified user | Button is hidden — Revoke only renders when `is_verified = true`. |
| User uploads a new cert then immediately removes the training entry | File is deleted from storage on entry removal. `certificate_path` is never persisted to the DB. |

---

## 8. Files Changed (Summary)

| Layer | File | Change |
|---|---|---|
| SQL | `sql/add_vocational_cert_constraint.sql` | New — CHECK constraint |
| SQL | `sql/add_reverification_flag.sql` | New — flag + snapshot columns |
| SQL | `sql/add_reverification_trigger.sql` | New — BEFORE UPDATE triggers |
| React | `src/components/registration/Step4Education.jsx` | Add per-entry CertificateUpload, step validator |
| React | `src/pages/JobseekerProfileEdit.jsx` | Add per-entry CertificateUpload, save validator |
| React | `src/pages/EmployerProfileEdit.jsx` | Add watched-field toast warning |
| React | `src/components/admin/AdminSidebar.jsx` | Add Re-verification tab entry |
| React | `src/components/admin/` | New `ReverificationQueue.jsx` component |
| React | `src/components/common/` | Amber `PendingReverificationBadge.jsx` component |
| React | Verified badge render sites | Add `PendingReverificationBadge` alongside existing badge |
| React | `src/components/admin/AdminManagementSection.jsx` | Add `reverify_profiles` permission |
| React | `src/App.jsx` | Add `/admin/reverification` route |

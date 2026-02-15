# Save & Resume Registration — Design Document

**Date:** 2026-02-15
**Feature:** Save & resume registration progress across sessions

## Goal

Allow users to create their account on Step 1, save registration progress to Firestore after each step, and resume from where they left off on their next login.

## Approach

**Early Account Creation + Incremental Firestore Saves**

- Firebase Auth account is created on Step 1 (email + password + role selection)
- A minimal Firestore user document is created immediately with `registration_complete: false` and `registration_step: 1`
- Each subsequent step saves its fields to Firestore via `updateDoc`
- On the final step, `registration_complete` is set to `true` and confirmation email is sent
- On re-login, the app detects incomplete registration and shows a banner on the dashboard with a "Continue Registration" link

## Registration Flow Restructuring

### Current Flow
All steps collected in React state (memory only) → account created at the end → single Firestore write. If user refreshes or navigates away, all progress is lost.

### New Flow
1. **Step 1:** Collect email, password, role → create Firebase Auth account → create minimal Firestore doc
2. **Steps 2+:** Each step saves its fields to Firestore immediately
3. **Final step:** Set `registration_complete: true`, send confirmation email

## Step-by-Step Data Saving

### Jobseeker (6 steps)

| Step | Data Saved | Firestore Fields |
|------|-----------|-----------------|
| 1 | Email, password, role | `email`, `role: 'jobseeker'`, `registration_complete: false`, `registration_step: 1` |
| 2 | Personal info | `full_name`, `date_of_birth`, `barangay`, `city`, `province`, `mobile_number`, `preferred_contact_method` |
| 3 | Employment prefs | `preferred_job_type`, `preferred_job_location`, `expected_salary_min/max`, `willing_to_relocate` |
| 4 | Education | `highest_education`, `school_name`, `course_or_field`, `year_graduated` |
| 5 | Skills & experience | `skills`, `work_experiences`, `certifications`, `portfolio_url`, `resume_url`, `certificate_urls` |
| 6 | Consent + finish | `terms_accepted`, consent flags, then `registration_complete: true` |

### Employer (4 steps)

| Step | Data Saved |
|------|-----------|
| 1 | Email, password, role (`employer`) |
| 2 | `company_name`, `employer_type`, `business_reg_number`, `business_address`, `nature_of_business` |
| 3 | `representative_name`, `representative_position`, `gov_id_url`, `contact_email`, `contact_number`, `preferred_contact_method` |
| 4 | `business_permit_url`, consent flags, then `registration_complete: true` |

### Individual (2 steps)

| Step | Data Saved |
|------|-----------|
| 1 | Email, password, role (`individual`) |
| 2 | `full_name`, `contact_number`, then `registration_complete: true` (auto-verified) |

## Incomplete Registration Detection

- Dashboard shows a prominent "Complete your registration" banner when `registration_complete === false`
- Banner includes a "Continue Registration" button linking to `/register/continue`
- Key actions (applying for jobs, posting jobs) remain gated by existing `isVerified()` check
- Users are NOT force-redirected; they can browse the platform

## Architecture & File Changes

### Files to Modify

1. **`src/contexts/AuthContext.jsx`**
   - Add `createAccount(email, password, role)` — creates Firebase Auth + minimal Firestore doc
   - Add `saveRegistrationStep(stepData, stepNumber)` — updates Firestore with step data
   - Add `completeRegistration(finalData)` — sets `registration_complete: true`, sends email
   - Remove `registerJobseeker`, `registerEmployer`, `registerIndividual` (replaced by incremental saves)
   - Keep `compressAndEncode` utility

2. **`src/pages/JobseekerRegistration.jsx`**
   - Step 1 calls `createAccount()` then auto-logs in
   - Steps 2-5 call `saveRegistrationStep()` on next
   - Step 6 calls `completeRegistration()`
   - Pre-fill form fields from `userData` when resuming

3. **`src/pages/EmployerRegistration.jsx`**
   - Same incremental save pattern, 4 steps

4. **`src/pages/IndividualRegistration.jsx`**
   - Split into 2 steps: account creation + profile details

5. **`src/pages/Dashboard.jsx`**
   - Add "Complete Registration" banner when `userData.registration_complete === false`

6. **`src/App.jsx`**
   - Add `/register/continue` route

### Files to Create

1. **`src/pages/RegistrationContinue.jsx`**
   - Reads `userData.role` and `userData.registration_step`
   - Renders the correct role-specific wizard at the saved step
   - Pre-fills form fields from existing Firestore data

### Step Component Changes

- Each step component receives `initialData` prop for pre-filling when resuming
- Step 1 calls `createAccount()` directly instead of storing credentials in local state
- Each step shows a "Saving..." indicator during Firestore writes

## Key Design Decisions

1. **Early account creation:** Simplest approach — user has a real account from Step 1, progress tied to their UID
2. **Firestore storage:** Works across devices, real-time sync via existing `onSnapshot`
3. **No force redirect:** Users can browse with limited access, reducing friction
4. **Existing verification gates:** `isVerified()` already blocks key actions, so incomplete registration users are naturally limited

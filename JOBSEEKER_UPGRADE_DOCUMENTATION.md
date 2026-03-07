# PESO Connect - Jobseeker Registration Upgrade Documentation

## Overview

This document outlines the comprehensive upgrade to the jobseeker registration process in PESO Connect. The upgrade transforms the simple registration into a multi-step, detailed profile creation system with PESO verification requirements.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Updated Registration Flow](#updated-registration-flow)
3. [Database Schema Changes](#database-schema-changes)
4. [Verification Workflow](#verification-workflow)
5. [User Journeys](#user-journeys)
6. [Testing Checklist](#testing-checklist)
7. [Future Enhancements](#future-enhancements)

---

## System Architecture

### Key Components Modified

1. **Frontend Components**
   - `JobseekerRegistration.jsx` - New 6-step registration form
   - `Register.jsx` - Updated to redirect jobseekers to new form
   - `admin/Dashboard.jsx` - Added jobseeker verification section
   - `App.jsx` - Added new route for jobseeker registration

2. **Backend/Context**
   - `AuthContext.jsx` - Added `registerJobseeker()` function
   - Enhanced document compression and storage

3. **Routing**
   - `/register` - Role selection page
   - `/register/jobseeker` - Multi-step jobseeker registration
   - `/register/employer` - Employer registration (existing)

---

## Updated Registration Flow

### Step 1: Account Credentials
**Purpose:** Create secure login credentials

**Required Fields:**
- Email address (unique)
- Password (min. 6 characters)
- Confirm password

**Validation:**
- Email format validation
- Password match confirmation
- Password strength check

---

### Step 2: Personal & Contact Information
**Purpose:** Collect basic identity and contact details

**Required Fields:**
- Full name
- Date of birth
- Home address (barangay, city, province)
- Mobile number
- Preferred communication method (email/SMS/call)

**Validation:**
- All fields required
- Date of birth must be valid date
- Mobile number format validation

---

### Step 3: Employment Preferences
**Purpose:** Understand job seeker's career goals and preferences

**Required Fields:**
- Preferred job type(s) - Multiple selection:
  - Full-time
  - Part-time
  - Contractual
  - On-demand
- Preferred job location
- Expected salary range (optional)
  - Minimum salary
  - Maximum salary
- Willingness to relocate (yes/no)

**Validation:**
- At least one job type must be selected
- Job location is required

---

### Step 4: Educational Background
**Purpose:** Document educational qualifications

**Required Fields:**
- Highest educational attainment (dropdown):
  - Elementary Graduate
  - High School Graduate
  - Senior High School Graduate
  - Vocational/Technical Graduate
  - College Undergraduate
  - College Graduate
  - Masteral Degree
  - Doctoral Degree
- School or institution attended

**Optional Fields:**
- Course or field of study
- Year graduated

**Validation:**
- Education level and school name are required

---

### Step 5: Skills & Work Experience
**Purpose:** Showcase abilities and professional background

**Required Fields:**
- Skills and competencies (list, min. 1 skill)
- Resume or CV upload (PDF/DOC, max 2MB)

**Optional Fields:**
- Work experience entries (company, position, duration)
- Certifications or licenses (list)
- Supporting documents (certificates, max 2MB each)

**Validation:**
- At least one skill required
- Resume upload required
- File format validation (PDF, DOC, DOCX for resume)
- File size validation (2MB limit)

---

### Step 6: Terms & Verification
**Purpose:** Legal consent and information accuracy confirmation

**Required Checkboxes (all must be checked):**
- ✅ Acceptance of Terms and Conditions
- ✅ Consent to data processing and storage
- ✅ Understanding of PESO verification requirement
- ✅ Confirmation of information accuracy

**Features:**
- Registration summary preview
- Important notice about account verification
- Visual confirmation of all accepted terms

---

## Database Schema Changes

### Updated `users` Collection (Firestore)

#### New Jobseeker Document Structure

```javascript
{
  // Authentication & Identity
  uid: string,                    // Firebase Auth UID
  email: string,                  // Login email
  name: string,                   // Display name (same as full_name)
  role: 'jobseeker',             // User role

  // Personal Information
  full_name: string,              // Complete name
  date_of_birth: string,          // ISO date string
  barangay: string,               // Barangay name
  city: string,                   // City name
  province: string,               // Province name

  // Contact Information
  mobile_number: string,          // Phone number
  preferred_contact_method: string, // 'email' | 'sms' | 'call'

  // Employment Preferences
  preferred_job_type: string[],   // Array of job types
  preferred_job_location: string, // Preferred work location
  expected_salary_min: string,    // Minimum expected salary (optional)
  expected_salary_max: string,    // Maximum expected salary (optional)
  willing_to_relocate: string,    // 'yes' | 'no'

  // Educational Background
  highest_education: string,      // Education level
  school_name: string,            // Institution name
  course_or_field: string,        // Field of study (optional)
  year_graduated: string,         // Graduation year (optional)

  // Skills and Experience
  skills: string[],               // Array of skills
  work_experiences: [             // Array of work experience objects
    {
      company: string,
      position: string,
      duration: string
    }
  ],
  certifications: string[],       // Array of certification names

  // Documents (Base64 encoded)
  resume_url: string,             // Compressed resume data
  certificate_urls: [             // Array of certificate objects
    {
      name: string,
      data: string,              // Base64 data
      type: string               // MIME type
    }
  ],

  // Status and Verification
  is_verified: boolean,           // General verification flag (false by default)
  jobseeker_status: string,       // 'pending' | 'verified' | 'rejected'
  rejection_reason: string,       // Reason if rejected

  // Consent Flags
  terms_accepted: boolean,
  data_processing_consent: boolean,
  peso_verification_consent: boolean,
  info_accuracy_confirmation: boolean,

  // Legacy/Compatibility
  credentials_url: string,        // Empty string (for compatibility)

  // Timestamps
  created_at: string,             // ISO timestamp
  updated_at: string              // ISO timestamp
}
```

---

## Verification Workflow

### Admin Dashboard - Jobseeker Verification Section

#### Access Path
`Admin Panel → Jobseeker Verification`

#### Status Tabs
1. **Pending** - New registrations awaiting review
2. **Verified** - Approved and active jobseekers
3. **Rejected** - Rejected applications with reasons
4. **All** - Complete list of all jobseekers

#### Review Process

**For Each Jobseeker, Admins Can View:**

1. **Personal Information Card**
   - Full name
   - Date of birth
   - Complete address (barangay, city, province)
   - Mobile number
   - Preferred contact method

2. **Employment Preferences Card**
   - Preferred job types
   - Preferred location
   - Salary expectations
   - Relocation willingness

3. **Educational Background Card**
   - Education level
   - School/institution
   - Course/field of study
   - Graduation year

4. **Skills & Certifications Card**
   - Listed skills (with visual tags)
   - Certifications (if any)

5. **Work Experience Section** (if provided)
   - Company name
   - Position held
   - Duration of employment

6. **Documents Section**
   - Resume/CV viewer
   - Supporting certificates viewer
   - Built-in zoom and download features

#### Admin Actions

**Verify (Approve)**
- Sets `is_verified = true`
- Sets `jobseeker_status = 'verified'`
- Clears any previous rejection reason
- Enables user to apply for jobs

**Reject**
- Opens rejection reason modal
- Sets `is_verified = false`
- Sets `jobseeker_status = 'rejected'`
- Records rejection reason (visible to user)
- User cannot apply for jobs

---

## User Journeys

### Journey 1: Successful Registration & Verification

```
1. User visits /register
   ↓
2. Selects "Jobseeker" role
   ↓
3. Redirected to /register/jobseeker
   ↓
4. Completes Step 1: Account Credentials
   ↓
5. Completes Step 2: Personal & Contact Info
   ↓
6. Completes Step 3: Employment Preferences
   ↓
7. Completes Step 4: Educational Background
   ↓
8. Completes Step 5: Skills & Documents (uploads resume)
   ↓
9. Completes Step 6: Terms & Verification
   ↓
10. Submits registration
   ↓
11. Account created with status: "pending"
   ↓
12. Redirected to /dashboard (sees pending verification notice)
   ↓
13. PESO Admin reviews in Admin Dashboard
   ↓
14. Admin clicks "Verify" → User's is_verified = true
   ↓
15. User can now browse and apply for jobs
```

### Journey 2: Rejected Application

```
[Steps 1-13 same as Journey 1]
   ↓
14. Admin clicks "Reject" → Provides reason
   ↓
15. User's is_verified = false, status = "rejected"
   ↓
16. User sees rejection notice on dashboard
   ↓
17. User can view rejection reason
   ↓
18. [User may need to contact PESO or re-register]
```

### Journey 3: Attempting to Apply Without Verification

```
1. Unverified user logs in
   ↓
2. Browses job listings at /jobs
   ↓
3. Clicks on a job posting
   ↓
4. Clicks "Apply Now" button
   ↓
5. System checks: isVerified() returns false
   ↓
6. Error message: "Your account must be verified to apply for jobs"
   ↓
7. Apply button remains disabled
   ↓
8. User must wait for PESO verification
```

---

## System Rules Enforced

### Registration Rules
1. ✅ Email must be unique across all users
2. ✅ Password minimum 6 characters
3. ✅ At least 1 skill required
4. ✅ Resume upload mandatory (max 2MB)
5. ✅ All consent checkboxes must be checked
6. ✅ Each step validates before allowing next step

### Verification Rules
1. ✅ New jobseekers start with `jobseeker_status = 'pending'`
2. ✅ `is_verified` defaults to `false`
3. ✅ Only PESO admins can change verification status
4. ✅ Rejection requires a reason to be provided

### Job Application Rules
1. ✅ Only verified jobseekers can apply (`is_verified === true`)
2. ✅ Unverified users see disabled "Apply" button
3. ✅ Error message shown if unverified user attempts to apply
4. ✅ Job detail page checks verification status before allowing application

---

## Testing Checklist

### Registration Flow Testing

- [ ] **Step 1: Credentials**
  - [ ] Email validation works
  - [ ] Password match validation works
  - [ ] Password strength validation (min 6 chars)
  - [ ] Cannot proceed without valid credentials

- [ ] **Step 2: Personal Info**
  - [ ] All required fields validated
  - [ ] Date picker works correctly
  - [ ] Address fields accept valid input
  - [ ] Contact method selection works

- [ ] **Step 3: Employment Preferences**
  - [ ] Can select multiple job types
  - [ ] Must select at least one job type
  - [ ] Salary range is optional
  - [ ] Relocation preference selection works

- [ ] **Step 4: Education**
  - [ ] Education level dropdown works
  - [ ] Required fields prevent proceeding
  - [ ] Optional fields can be left empty

- [ ] **Step 5: Skills & Documents**
  - [ ] Can add multiple skills
  - [ ] Can remove skills
  - [ ] Can add work experiences
  - [ ] Resume upload validates file type (PDF, DOC, DOCX)
  - [ ] Resume upload validates file size (max 2MB)
  - [ ] Certificate uploads work (optional)
  - [ ] Cannot proceed without resume

- [ ] **Step 6: Terms**
  - [ ] All checkboxes must be checked to submit
  - [ ] Summary preview shows correct data
  - [ ] Submit button processes registration

- [ ] **Navigation**
  - [ ] "Previous" button works on all steps
  - [ ] "Next" button validates before proceeding
  - [ ] Progress bar updates correctly
  - [ ] Can navigate back and forth without data loss

### Admin Verification Testing

- [ ] **Dashboard Access**
  - [ ] Admin can access /admin route
  - [ ] Jobseeker verification section appears
  - [ ] Status tabs show correct counts

- [ ] **Jobseeker List**
  - [ ] Pending jobseekers appear in list
  - [ ] Search functionality works
  - [ ] Status filtering works (pending/verified/rejected/all)
  - [ ] Can expand/collapse jobseeker details

- [ ] **Review Process**
  - [ ] All jobseeker information displays correctly
  - [ ] Personal info card shows all fields
  - [ ] Employment preferences card shows selections
  - [ ] Education card shows details
  - [ ] Skills display with visual tags
  - [ ] Work experience shows if provided
  - [ ] Resume viewer opens and displays document
  - [ ] Certificate viewer works

- [ ] **Verification Actions**
  - [ ] "Verify" button sets is_verified = true
  - [ ] "Verify" button sets jobseeker_status = 'verified'
  - [ ] "Reject" button opens modal
  - [ ] Rejection requires reason text
  - [ ] "Reject" sets is_verified = false
  - [ ] "Reject" sets jobseeker_status = 'rejected'
  - [ ] Rejection reason saves correctly
  - [ ] Status updates reflect immediately
  - [ ] Data refetches after action

### Job Application Testing

- [ ] **Verified User**
  - [ ] Can see "Apply Now" button enabled
  - [ ] Can submit application
  - [ ] Application saves correctly

- [ ] **Unverified User**
  - [ ] Sees "Apply Now" button disabled
  - [ ] Sees verification warning message
  - [ ] Cannot submit application
  - [ ] Error message shows: "Your account must be verified"

- [ ] **Edge Cases**
  - [ ] User verified mid-session refreshes properly
  - [ ] User rejected mid-session cannot apply
  - [ ] Verification status updates in real-time (via onSnapshot)

### Database Testing

- [ ] **Document Creation**
  - [ ] User document created with all fields
  - [ ] Resume stored as Base64
  - [ ] Certificates stored as array of objects
  - [ ] Timestamps created correctly
  - [ ] Status fields default correctly

- [ ] **Document Updates**
  - [ ] Admin actions update correct fields
  - [ ] updated_at timestamp updates
  - [ ] Real-time listeners trigger updates

### Security Testing

- [ ] **Authentication**
  - [ ] Only authenticated users access dashboard
  - [ ] Only admins access admin panel
  - [ ] Jobseekers cannot access employer routes
  - [ ] Email already exists error handled

- [ ] **Data Validation**
  - [ ] File size limits enforced (2MB)
  - [ ] File type restrictions enforced
  - [ ] SQL injection prevention (Firestore handles this)
  - [ ] XSS prevention in text inputs

---

## User-Facing Messages

### Success Messages
- **Registration Complete**: "Your account has been created! PESO personnel will review your information. You will be notified once verified."
- **Verification Approved**: "Your account has been verified! You can now apply for jobs."

### Error Messages
- **Unverified Application Attempt**: "Your account must be verified to apply for jobs."
- **Duplicate Email**: "An account with this email already exists."
- **Weak Password**: "Password is too weak. Please use a stronger password."
- **File Too Large**: "Resume must be under 2MB." / "Certificate must be under 2MB."
- **Invalid File Type**: "Resume must be PDF or DOC format." / "Certificates must be PDF, JPG, or PNG format."
- **Missing Skills**: "Please add at least one skill."
- **Missing Resume**: "Please upload your resume."
- **Incomplete Terms**: "You must accept all terms and confirmations to proceed."

### Warning Messages
- **Pending Status**: "Your account is pending verification by PESO personnel. You will be notified once your account is reviewed."
- **Rejected Status**: "Your application was rejected. Reason: [rejection_reason]"

---

## Future Enhancements

### Phase 2 Improvements
1. **Email Notifications**
   - Send email when jobseeker registers
   - Send email when verification status changes
   - Reminder emails for pending verifications

2. **SMS Notifications**
   - SMS verification for mobile numbers
   - SMS alerts for status changes

3. **Profile Editing**
   - Allow jobseekers to update their profile
   - Require re-verification after major changes

4. **Batch Operations**
   - Bulk approve/reject in admin dashboard
   - Export jobseeker data to CSV
   - Batch email notifications

5. **Advanced Filtering**
   - Filter by education level
   - Filter by skills
   - Filter by location
   - Filter by registration date

6. **Analytics Dashboard**
   - Registration trends
   - Verification processing time
   - Rejection rate analysis
   - Skills distribution

7. **Document Management**
   - Allow multiple resume versions
   - Document expiry tracking (for certifications)
   - Document re-upload requests

8. **Verification Workflow**
   - Multi-step verification (initial review → final approval)
   - Verification comments/notes
   - Verification history log

---

## Technical Notes

### Document Compression
- Images are resized to max 800px dimension
- Images compressed to JPEG at 0.6 quality (~30-80KB typical)
- PDFs limited to 400KB raw size
- Non-image files use raw base64 with size cap

### Performance Considerations
- Resume and certificates stored as Base64 in Firestore
- Document viewer includes zoom functionality (0.25x to 3x)
- Real-time listeners used for status updates
- Pagination not yet implemented (consider if jobseekers exceed 100)

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- File upload requires HTML5 FileReader API
- Canvas API used for image compression

---

## Support & Maintenance

### Common Admin Tasks

**Verify a Jobseeker:**
1. Go to Admin Dashboard
2. Click "Jobseeker Verification"
3. Find user in "Pending" tab
4. Click to expand details
5. Review information and documents
6. Click "Verify" button

**Reject a Jobseeker:**
1. Follow steps 1-5 above
2. Click "Reject" button
3. Enter clear rejection reason
4. Click "Confirm Reject"

**Search for a Jobseeker:**
1. Use search bar in Jobseeker Verification section
2. Search by name or email
3. Works across all status tabs

### Troubleshooting

**Issue: User can't register**
- Check if email already exists
- Verify password meets requirements
- Check file upload size limits
- Verify all required fields are filled

**Issue: Admin can't see new jobseekers**
- Refresh the dashboard
- Check filter tabs (pending/verified/rejected)
- Verify admin has proper permissions

**Issue: Document viewer not working**
- Check if document was uploaded properly
- Verify Base64 encoding is valid
- Check browser console for errors

---

## Deployment Checklist

Before deploying to production:

- [ ] Test all registration steps thoroughly
- [ ] Test admin verification workflow
- [ ] Test job application with verification check
- [ ] Verify Firestore security rules allow proper access
- [ ] Test on multiple browsers
- [ ] Test on mobile devices
- [ ] Backup existing user data
- [ ] Update Firebase security rules if needed
- [ ] Test error handling and validation
- [ ] Review and test all user-facing messages
- [ ] Document admin procedures for PESO staff
- [ ] Create admin training materials

---

## Conclusion

This upgrade transforms PESO Connect from a basic registration system into a comprehensive job seeker profile platform with proper verification controls. The multi-step registration ensures complete information capture, while the admin verification workflow maintains quality control and platform security.

The system now enforces that only PESO-verified jobseekers can apply for jobs, ensuring employers receive applications from validated candidates and maintaining the integrity of the PESO Connect platform.

---

**Document Version:** 1.0
**Last Updated:** 2026-02-10
**Author:** PESO Connect Development Team

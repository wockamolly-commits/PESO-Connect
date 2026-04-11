# Objective
Implement the redesigned Employer Registration process based on the NSRP Form 2 standard.

## Target File to Update
`src/pages/EmployerRegistration.jsx`

## Tasks

### 1. Update State & Initial Data
Update the initial state and any `restoredRef` loading logic to include the new and modified fields:
- `trade_name`: ''
- `acronym`: ''
- `office_type`: ''
- `employer_sector`: '' // specifically 'private' or 'public'
- `employer_type_specific`: '' // for the specific type under private/public
- `total_work_force`: ''
- `tin`: ''
- `business_reg_number`: ''
- `province`: ''
- `city`: ''
- `barangay`: ''
- `street`: ''
- `owner_name`: ''
- `same_as_owner`: false // boolean for contact person

(Note: remove `business_address`, `employer_type`, and `preferred_contact_method` if replacing them)

### 2. Update Form Steps UI

**Step 1:** (Unchanged)
Keep Login Email, Password, Confirm Password.

**Step 2: Establishment Details**
- Add Business Name (required)
- Add Trade Name (optional)
- Add Acronym / Abbreviation (optional)
- Add Office Classification (required radio: Main Office / Branch)
- Add Employer Sector (required):
  - Private: Direct Hire, Local Recruitment Agency, Overseas Recruitment Agency, D.O. 174
  - Public: National Government Agency, Local Government Unit, Government-owned and Controlled Corporation, State/Local University or College
- Add Line of Business / Industry (required - renamed from nature_of_business)
- Add Total Work Force (required dropdown: Micro (1-9), Small (10-99), Medium (100-199), Large (200 and up))
- Add TIN (required)
- Add Business Registration Number (DTI/SEC) (optional)

**Step 3: Business Address**
Instead of a single textarea, use 4 fields:
- Province (required)
- City / Municipality (required)
- Barangay (required)
- Street / Village / Bldg Number (optional)

**Step 4: Contact & Representative**
- Add Name of Owner / President (required)
- Add Checkbox `Same as Owner/President` that auto-fills Contact Person Name.
- Keep Contact Person Full Name (required)
- Keep Position (required)
- Keep Official Contact Email (required)
- Keep Mobile Number (required)
- Add Telephone / Landline Number (optional)

**Step 5: Verification Documents**
- Keep Government-Issued ID upload (required)
- Keep Business Permit upload (required)
- Keep Agreements (Terms, PESO consent, Labor compliance)

### 3. Update Validation Logic (`validateStep`)
- Ensure all new required fields are checked before allowing the user to proceed to the next step.
- Ensure TIN follows a valid format expectation (or simply check if not empty for now).
- Ensure Mobile Number validation is applied to `contact_number` or the new `mobile_number` field.

### 4. Update Save Hooks
Modify the `nextStep` function where `saveRegistrationStep` is called to ensure it captures all the new fields in `stepData` accurately for Steps 2, 3, and 4.

## Important Constraints
- Maintain the current use of Tailwind CSS and Lucide icons for styling.
- Keep the `fileUpload` and `ProgressBar` visual structures.
- Ensure the API calls (`saveRegistrationStep` and `completeRegistration`) receive the updated schema. Be mindful that subsequent backend/database modifications might be needed to accept the new fields.

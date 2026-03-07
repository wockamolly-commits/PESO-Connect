# Phase 2 Features - Testing Guide

Complete testing checklist for all Phase 2 improvements.

---

## Pre-Testing Setup

### 1. Start Development Server
```bash
npm run dev
```

### 2. Open Browser
- Navigate to `http://localhost:5173` (or your dev server URL)
- Open Browser DevTools (F12) → Console tab
- Keep Console open to monitor logs

### 3. Prepare Test Accounts
You'll need:
- ✅ 1-2 Test Jobseeker accounts (to be created)
- ✅ 1 Test Employer account (to be created)
- ✅ 1 Admin account (should already exist)

---

## Feature 1: Profile Editing for Jobseekers

### Test Scenario 1.1: Create Test Jobseeker
1. **Register as Jobseeker**
   - Go to `/register`
   - Click "Continue as Jobseeker"
   - Complete all 6 steps:
     - Email: `testjobseeker1@test.com`
     - Password: `Test123!`
     - Full name: `Test Jobseeker`
     - Add at least 2 skills (e.g., "Microsoft Excel", "Communication")
     - Upload a test resume (any PDF)
   - Submit registration

2. **Verify Registration**
   - ✅ Registration success message appears
   - ✅ Redirected to dashboard
   - ✅ Sees "Account Pending Review" banner
   - ✅ Can see profile summary with name and email

3. **Check Console Logs**
   - Look for: `📧 Email notifications disabled. Email would be sent: JOBSEEKER_REGISTRATION testjobseeker1@test.com`
   - Or if emails enabled: `✅ Email sent successfully: JOBSEEKER_REGISTRATION to testjobseeker1@test.com`

### Test Scenario 1.2: Access Profile Edit
1. **Navigate to Profile**
   - From dashboard, click "Update Profile" quick action
   - OR click "Edit Profile" button in Profile Summary card
   - **Expected**: Automatically redirected to `/profile/edit`

2. **Verify Pre-populated Data**
   - ✅ All fields show current user data
   - ✅ Name, location, mobile number populated
   - ✅ Skills list shows added skills
   - ✅ Employment preferences show selections
   - ✅ Education information displays

### Test Scenario 1.3: Edit Profile Information
1. **Update Personal Information**
   - Change mobile number
   - Update barangay/city/province
   - Modify date of birth

2. **Update Employment Preferences**
   - Change preferred job types (select/deselect)
   - Update salary expectations
   - Change willing to relocate status

3. **Update Skills**
   - Add new skill: "Project Management"
   - Remove an existing skill
   - Add certification: "PRC License"

4. **Add Work Experience**
   - Company: "ABC Corporation"
   - Position: "Office Assistant"
   - Duration: "2020-2022"
   - Click "Add Experience"

5. **Update Documents** (Optional)
   - Upload new resume (if you want to test)
   - Add additional certificate

6. **Save Changes**
   - Click "Save Changes"
   - **Expected**:
     - ✅ Success message: "Profile updated successfully!"
     - ✅ Redirected to dashboard after 2 seconds
     - ✅ Dashboard shows updated information

### Test Scenario 1.4: Verify Updates Persisted
1. **Refresh Page**
   - Press F5 or refresh browser

2. **Go Back to Profile Edit**
   - Click "Update Profile" again
   - **Expected**: All changes are still there

3. **Check Dashboard**
   - **Expected**: Dashboard shows updated skills count

### Test Scenario 1.5: Test Validation
1. **Try Invalid Data**
   - Go to profile edit
   - Clear the "Full Name" field
   - Click "Save Changes"
   - **Expected**: Error message about required fields

2. **Cancel Editing**
   - Make some changes
   - Click "Cancel"
   - **Expected**: Redirected to dashboard without saving

---

## Feature 2: Advanced Filtering in Admin Dashboard

### Test Scenario 2.1: Prepare Test Data
First, create multiple jobseeker accounts with different data:

**Jobseeker 1:**
- Email: `js1@test.com`
- Name: `John Doe`
- Location: `San Carlos City, Negros Occidental`
- Education: `College Graduate`
- Skills: `Microsoft Excel`, `Data Entry`

**Jobseeker 2:**
- Email: `js2@test.com`
- Name: `Jane Smith`
- Location: `Bacolod City, Negros Occidental`
- Education: `High School Graduate`
- Skills: `Customer Service`, `Communication`

**Jobseeker 3:**
- Email: `js3@test.com`
- Name: `Bob Johnson`
- Location: `Bago City, Negros Occidental`
- Education: `College Graduate`
- Skills: `Microsoft Excel`, `Accounting`

### Test Scenario 2.2: Access Admin Dashboard
1. **Login as Admin**
   - Go to `/admin/login`
   - Enter admin credentials
   - **Expected**: Redirected to admin dashboard

2. **Navigate to Jobseeker Verification**
   - Click "Jobseeker Verification" in sidebar
   - **Expected**: See list of pending jobseekers (3+)

### Test Scenario 2.3: Test Basic Search
1. **Search by Name**
   - Type "John" in search box
   - **Expected**: Only John Doe appears

2. **Search by Email**
   - Clear search, type "js2"
   - **Expected**: Only js2@test.com (Jane) appears

3. **Clear Search**
   - Clear search box
   - **Expected**: All jobseekers appear again

### Test Scenario 2.4: Test Education Filter
1. **Open Filters**
   - Click "Filters" button
   - **Expected**: Filter panel expands

2. **Filter by College Graduate**
   - Select "College Graduate" from Education dropdown
   - **Expected**: Only John Doe and Bob Johnson appear (2 results)
   - **Expected**: Filter badge shows "1" active filter

3. **Filter by High School**
   - Change to "High School Graduate"
   - **Expected**: Only Jane Smith appears

4. **Clear Filter**
   - Select "All Levels"
   - **Expected**: All jobseekers appear again

### Test Scenario 2.5: Test Skills Filter
1. **Filter by Excel**
   - In Skills field, type "excel"
   - **Expected**: John Doe and Bob Johnson appear (both have Excel skill)
   - **Expected**: Filter badge shows "1"

2. **Filter by Customer Service**
   - Change to "customer service"
   - **Expected**: Only Jane Smith appears

3. **Test Case-Insensitive Search**
   - Type "EXCEL" (uppercase)
   - **Expected**: Still finds John and Bob

### Test Scenario 2.6: Test Location Filter
1. **Filter by San Carlos**
   - Type "San Carlos" in Location field
   - **Expected**: Only John Doe appears

2. **Filter by Province**
   - Type "Negros Occidental"
   - **Expected**: All 3 appear (all are in same province)

3. **Filter by City Partial Match**
   - Type "Bacolod"
   - **Expected**: Only Jane Smith appears

### Test Scenario 2.7: Test Date Range Filter
1. **Filter by Today's Registrations**
   - Set "Registered From" to today's date
   - Set "Registered To" to today's date
   - **Expected**: All 3 test jobseekers appear (just registered today)

2. **Filter Future Date Range**
   - Set "Registered From" to tomorrow
   - **Expected**: No results (no one registered in the future)

### Test Scenario 2.8: Test Combined Filters
1. **Combine Multiple Filters**
   - Education: "College Graduate"
   - Skills: "Excel"
   - **Expected**: John Doe and Bob Johnson (both match both criteria)
   - **Expected**: Filter badge shows "2"

2. **Add More Filters**
   - Keep above filters
   - Location: "San Carlos"
   - **Expected**: Only John Doe (matches all 3 criteria)
   - **Expected**: Filter badge shows "3"

3. **Clear All Filters**
   - Click "Clear Filters" button
   - **Expected**: All filters reset
   - **Expected**: Badge disappears
   - **Expected**: All jobseekers appear

### Test Scenario 2.9: Test Filter Persistence
1. **Apply Filters**
   - Set Education: "College Graduate"
   - Close filter panel (click Filters button)

2. **Verify Filter Still Active**
   - **Expected**: Only college graduates shown
   - **Expected**: Badge still shows "1"

3. **Reopen Filters**
   - Click Filters button again
   - **Expected**: Education still set to "College Graduate"

### Test Scenario 2.10: Test Status Tabs + Filters
1. **Switch to Verified Tab**
   - Click "Verified" tab
   - **Expected**: No results (test accounts not verified yet)

2. **Verify One Jobseeker**
   - Go back to "Pending" tab
   - Expand John Doe
   - Click "Verify" button
   - **Expected**: Success, John moves to Verified tab

3. **Test Filter on Verified Tab**
   - Stay on "Verified" tab
   - Open filters
   - Set Skills: "Excel"
   - **Expected**: John Doe appears (verified AND has Excel)

---

## Feature 3: Email Notifications

### Test Scenario 3.1: Verify Email Service Setup

1. **Check Environment Variables**
   - Open `.env` file in root directory
   - Verify these variables exist:
     ```
     VITE_EMAILJS_SERVICE_ID=...
     VITE_EMAILJS_PUBLIC_KEY=...
     VITE_EMAIL_NOTIFICATIONS_ENABLED=true (or false)
     ```

2. **Test Without Email Service** (Recommended First)
   - If `VITE_EMAIL_NOTIFICATIONS_ENABLED=false`:
     - **Expected**: Console logs show `📧 Email notifications disabled`
     - No actual emails sent (safe for testing)

### Test Scenario 3.2: Test Registration Emails (Console Mode)

1. **Register New Jobseeker**
   - Register: `emailtest1@test.com`
   - Complete registration

2. **Check Console**
   - **Expected**: See log like:
     ```
     📧 Email notifications disabled. Email would be sent: JOBSEEKER_REGISTRATION emailtest1@test.com
     ```
   - This confirms email would be triggered

3. **Register New Employer**
   - Register employer account
   - **Expected**: Similar console log for employer registration

### Test Scenario 3.3: Test Admin Action Emails (Console Mode)

1. **Approve Jobseeker**
   - Login as admin
   - Go to Jobseeker Verification
   - Approve a pending jobseeker
   - **Check Console**: Log for `JOBSEEKER_VERIFIED`

2. **Reject Jobseeker**
   - Reject a jobseeker with reason: "Documents unclear"
   - **Check Console**: Log for `JOBSEEKER_REJECTED`

3. **Approve Employer**
   - Go to Employer Verification
   - Approve an employer
   - **Check Console**: Log for `EMPLOYER_APPROVED`

4. **Reject Employer**
   - Reject employer with reason
   - **Check Console**: Log for `EMPLOYER_REJECTED`

### Test Scenario 3.4: Setup Real Email Service (Optional)

**Only if you want to send real emails:**

1. **Setup EmailJS** (5 minutes)
   - Follow [EMAIL_NOTIFICATIONS_SETUP.md](EMAIL_NOTIFICATIONS_SETUP.md)
   - Sign up at https://www.emailjs.com/
   - Create email service
   - Create 6 templates
   - Get Service ID and Public Key

2. **Update .env**
   ```env
   VITE_EMAILJS_SERVICE_ID=service_abc123
   VITE_EMAILJS_PUBLIC_KEY=xyz789_abc123
   VITE_EMAIL_NOTIFICATIONS_ENABLED=true
   ```

3. **Restart Dev Server**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

### Test Scenario 3.5: Test Real Emails (If Configured)

1. **Register with Your Email**
   - Use your real email address
   - Complete registration
   - **Check Console**: `✅ Email sent successfully: JOBSEEKER_REGISTRATION`
   - **Check Email Inbox**: Should receive welcome email

2. **Test Verification Email**
   - Login as admin
   - Verify the account
   - **Check Console**: Success log
   - **Check Email**: Should receive verification email

3. **Test Rejection Email**
   - Register another test account
   - Reject it with reason
   - **Check Email**: Should receive rejection with reason

---

## Integration Testing

### Test Scenario 4.1: Complete User Journey

**Jobseeker Journey:**
1. Register as jobseeker → Check email log
2. Login → See pending status
3. Edit profile → Add new skills
4. Logout
5. Admin approves account → Check email log
6. Login again → See verified status
7. Edit profile again → Update education
8. Browse jobs → Can apply (verification check passes)

**Employer Journey:**
1. Register as employer → Check email log
2. Login → See pending status
3. Admin approves → Check email log
4. Login again → Can post jobs

### Test Scenario 4.2: Edge Cases

1. **Profile Edit Without Changes**
   - Open profile edit
   - Don't change anything
   - Click Save
   - **Expected**: Still succeeds, shows success message

2. **Large Number of Skills**
   - Add 20+ skills
   - Save
   - **Expected**: All skills saved and displayed

3. **Special Characters in Fields**
   - Name with apostrophe: "O'Brien"
   - Location with special chars
   - **Expected**: Saved correctly

4. **Multiple Simultaneous Filters**
   - Apply all 5 filters at once
   - **Expected**: Correct filtered results

5. **Empty Filter Results**
   - Filter for skill that doesn't exist: "Quantum Computing"
   - **Expected**: "No jobseekers found" message

---

## Performance Testing

### Test Scenario 5.1: Load Testing

1. **Large Dataset**
   - If possible, create 10-20 test jobseekers
   - Test filters with larger dataset
   - **Expected**: Filters still responsive

2. **Rapid Filter Changes**
   - Quickly change between different filters
   - **Expected**: No lag, smooth transitions

3. **Profile Edit with Large Data**
   - Add 50 skills
   - Add 10 work experiences
   - Save
   - **Expected**: Saves within reasonable time (<3 sec)

---

## Bug Checklist

Common issues to watch for:

### Profile Editing
- [ ] Data persists after save
- [ ] Validation errors display correctly
- [ ] Cancel button doesn't save changes
- [ ] File uploads work (resume, certificates)
- [ ] Success message displays
- [ ] Redirect to dashboard works
- [ ] No console errors

### Advanced Filtering
- [ ] All 5 filters work independently
- [ ] Filters work together (combined)
- [ ] Clear filters button works
- [ ] Filter badge count accurate
- [ ] Filtered results correct
- [ ] Filter panel opens/closes smoothly
- [ ] No performance issues

### Email Notifications
- [ ] Console logs appear when disabled
- [ ] All 6 email types trigger correctly
- [ ] Emails don't block registration/approval
- [ ] Error handling works (registration succeeds even if email fails)
- [ ] Real emails work (if configured)
- [ ] Email content accurate

---

## Success Criteria

✅ **Profile Editing**: All fields editable, changes persist, validation works
✅ **Advanced Filtering**: All 5 filters work alone and combined
✅ **Email Notifications**: All 6 email types trigger, console logs visible
✅ **Integration**: Features work together without conflicts
✅ **No Critical Bugs**: No errors that break functionality

---

## Reporting Issues

If you find bugs, note:
1. **What you did** (steps to reproduce)
2. **What happened** (actual result)
3. **What should happen** (expected result)
4. **Console errors** (if any)
5. **Browser** (Chrome, Firefox, etc.)

---

## Next Steps After Testing

Once all tests pass:
1. ✅ Mark features as production-ready
2. 📝 Document any configuration needed for deployment
3. 🚀 Prepare for production deployment
4. 📊 Consider Phase 2 analytics/reporting features

Good luck with testing! 🧪

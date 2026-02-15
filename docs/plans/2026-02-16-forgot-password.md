# Forgot Password Flow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a complete "Forgot Password" flow using Firebase Auth's `sendPasswordResetEmail`, with a polished UI matching the existing premium design.

**Architecture:** Add `resetPassword(email)` to AuthContext, create a new `ForgotPassword.jsx` page with loading/error/success states, wire up the route in App.jsx, and add a "Forgot Password?" link to Login.jsx.

**Tech Stack:** React 18, Firebase Auth, Tailwind CSS, Lucide React, Vitest

---

### Task 1: Add `resetPassword` to AuthContext

**Files:**
- Modify: `src/contexts/AuthContext.jsx`

**Step 1: Add `sendPasswordResetEmail` to Firebase import**

Change line 3-7 from:
```jsx
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth'
```
To:
```jsx
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from 'firebase/auth'
```

**Step 2: Add `resetPassword` function after `logout`**

After the `logout` function (after line 167), add:
```jsx
    // Send password reset email
    const resetPassword = async (email) => {
        await sendPasswordResetEmail(auth, email)
    }
```

**Step 3: Add `resetPassword` to the context value**

In the `value` object (line 239-256), add `resetPassword`:
```jsx
    const value = {
        currentUser,
        userData,
        loading,
        register,
        createAccount,
        saveRegistrationStep,
        completeRegistration,
        compressAndEncode,
        login,
        logout,
        resetPassword,
        isVerified,
        hasRole,
        isAdmin,
        isEmployer,
        isJobseeker,
        isIndividual
    }
```

**Step 4: Commit**

```bash
git add src/contexts/AuthContext.jsx
git commit -m "feat: add resetPassword to AuthContext using Firebase sendPasswordResetEmail"
```

---

### Task 2: Create ForgotPassword.jsx page

**Files:**
- Create: `src/pages/ForgotPassword.jsx`

**Step 1: Create the component**

Create `src/pages/ForgotPassword.jsx` with:
- Glassmorphic card matching Login.jsx design
- Single email input with Mail icon
- Three states: `idle`, `loading`, `success`
- Error display matching Login.jsx error pattern
- Success state: CheckCircle icon, "Email Sent" heading, instructions to check inbox/spam, "Back to Login" link
- Security-first error handling: show generic "If an account exists..." message for auth/user-not-found
- Rate limit handling for auth/too-many-requests
- Button disables while loading
- Link back to Login on all states

**Step 2: Commit**

```bash
git add src/pages/ForgotPassword.jsx
git commit -m "feat: add ForgotPassword page with email sent confirmation UI"
```

---

### Task 3: Add route and login link

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/pages/Login.jsx`

**Step 1: Add import and route to App.jsx**

Add import after Login import (line 12):
```jsx
import ForgotPassword from './pages/ForgotPassword'
```

Add route after the login route (after line 55):
```jsx
<Route path="/forgot-password" element={<ErrorBoundary><ForgotPassword /></ErrorBoundary>} />
```

**Step 2: Add "Forgot Password?" link to Login.jsx**

After the password field div (after line 98, before the submit button), add:
```jsx
                        <div className="flex justify-end">
                            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                Forgot password?
                            </Link>
                        </div>
```

**Step 3: Commit**

```bash
git add src/App.jsx src/pages/Login.jsx
git commit -m "feat: add forgot-password route and link from login page"
```

---

### Task 4: Verify build

**Files:** None (verification only)

**Step 1: Run build**

```bash
npx vite build
```

Expected: Build succeeds with no errors.

**Step 2: Run tests**

```bash
npx vitest run
```

Expected: No new test failures.

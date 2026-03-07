# Supabase Phase 1 — Auth + User Profiles Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Firebase Auth and the Firestore `users` collection with Supabase Auth and a Supabase Postgres `users` table, with zero changes to any page or component file.

**Architecture:** Install `@supabase/supabase-js` alongside the existing Firebase SDK (Firebase stays for jobs/applications/messages). Create `src/config/supabase.js`. Rewrite `AuthContext.jsx` to use Supabase, keeping the exact same exported interface. Add a `uid` shim (`uid: user.id`) so all consumers continue working without changes.

**Tech Stack:** React 18, Supabase JS v2, Vitest, Tailwind CSS

---

### Task 1: Supabase project setup (manual — done in browser)

**Files:** None

**Step 1: Create a Supabase project**

Go to https://supabase.com → New Project. Note the **Project URL** and **anon public** key from Project Settings → API.

**Step 2: Run the users table schema**

In the Supabase SQL editor, run:

```sql
create table public.users (
  id                       uuid references auth.users(id) on delete cascade primary key,
  email                    text not null,
  role                     text not null,
  name                     text default '',
  is_verified              boolean default false,
  skills                   text[] default '{}',
  credentials_url          text default '',
  registration_complete    boolean default false,
  registration_step        integer,
  notification_preferences jsonb,
  privacy_settings         jsonb,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can read own row"
  on public.users for select using (auth.uid() = id);

create policy "Users can update own row"
  on public.users for update using (auth.uid() = id);

create policy "Users can insert own row"
  on public.users for insert with check (auth.uid() = id);
```

Expected: "Success. No rows returned."

**Step 3: Run the delete_user function**

```sql
create or replace function public.delete_user()
returns void
language sql security definer
as $$
  delete from auth.users where id = auth.uid();
$$;
```

Expected: "Success. No rows returned."

**Step 4: Verify in Table Editor**

Open Table Editor → confirm `users` table exists with all columns.

---

### Task 2: Install Supabase SDK

**Files:**
- Modify: `package.json` (via npm)

**Step 1: Install the package**

```bash
npm install @supabase/supabase-js
```

Expected output: `added 1 package` (or similar).

**Step 2: Verify installation**

```bash
npm list @supabase/supabase-js
```

Expected: `@supabase/supabase-js@2.x.x`

---

### Task 3: Create Supabase config and update .env

**Files:**
- Create: `src/config/supabase.js`
- Modify: `.env`

**Step 1: Create `src/config/supabase.js`**

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 2: Add env vars to `.env`**

Append these two lines (get values from Supabase Project Settings → API):

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Leave all existing `VITE_FIREBASE_*` vars in place — they are still needed.

**Step 3: Commit**

```bash
git add src/config/supabase.js
git commit -m "feat: add Supabase client config"
```

Do NOT commit `.env` — it contains secrets.

---

### Task 4: Rewrite AuthContext tests for Supabase

**Files:**
- Modify: `src/contexts/AuthContext.test.jsx`

> **Note:** The test file contains two test blocks (`registerJobseeker`, `registerEmployer`) that test functions not present in `AuthContext.jsx`. These are pre-existing failures — leave them as-is, do not delete them.

**Step 1: Replace the mock declarations at the top of the file**

Remove all `mockSignIn*`, `mockCreate*`, `mockSignOut`, `mockOnAuthStateChanged`, `mockSetDoc`, `mockGetDoc`, `mockOnSnapshot`, `mockDoc` declarations and the three `vi.mock` blocks for Firebase. Replace with:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ── Supabase auth mock functions ──────────────────────────────────────────────
const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockRpc = vi.fn()

// ── Supabase DB mock (chained builder: from().select().eq().single()) ─────────
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn()
const mockFrom = vi.fn()

mockSelect.mockReturnValue({ eq: mockEq })
mockEq.mockReturnValue({ single: mockSingle, eq: mockEq })
mockInsert.mockResolvedValue({ error: null })
mockUpdateEq.mockResolvedValue({ error: null })
mockUpdate.mockReturnValue({ eq: mockUpdateEq })
mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert, update: mockUpdate })

vi.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      signUp: (...args) => mockSignUp(...args),
      signOut: (...args) => mockSignOut(...args),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
      resetPasswordForEmail: (...args) => mockResetPasswordForEmail(...args),
    },
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
  },
}))

// Mock email service (unchanged)
vi.mock('../services/emailService', () => ({
  sendJobseekerRegistrationEmail: vi.fn().mockResolvedValue(true),
  sendEmployerRegistrationEmail: vi.fn().mockResolvedValue(true),
}))

import { AuthProvider, useAuth } from './AuthContext'

function wrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}
```

**Step 2: Rewrite the `beforeEach` block**

```js
beforeEach(() => {
  vi.clearAllMocks()

  // Reset builder chain mocks
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ single: mockSingle, eq: mockEq })
  mockInsert.mockResolvedValue({ error: null })
  mockUpdateEq.mockResolvedValue({ error: null })
  mockUpdate.mockReturnValue({ eq: mockUpdateEq })
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert, update: mockUpdate })

  // Default: no user signed in
  mockOnAuthStateChange.mockImplementation((callback) => {
    callback('INITIAL_SESSION', null)
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
})
```

**Step 3: Rewrite the `starts with no user` test**

```js
it('starts with no user after loading completes', async () => {
  const { result } = renderHook(() => useAuth(), { wrapper })

  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  })

  expect(result.current.currentUser).toBeNull()
  expect(result.current.userData).toBeNull()
})
```

**Step 4: Rewrite the `login` tests**

```js
describe('login', () => {
  it('calls signInWithPassword with correct args', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' }
    mockSignInWithPassword.mockResolvedValue({ data: { user: mockUser }, error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      const user = await result.current.login('test@test.com', 'password123')
      expect(user.uid).toBe('user-1')
    })

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password123',
    })
  })

  it('throws on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid login credentials'),
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(() => result.current.login('bad@test.com', 'wrong'))
    ).rejects.toThrow('Invalid login credentials')
  })
})
```

**Step 5: Rewrite the `logout` test**

```js
describe('logout', () => {
  it('calls signOut and clears user state', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' }

    mockOnAuthStateChange.mockImplementation((callback) => {
      callback('SIGNED_IN', { user: mockUser })
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', role: 'jobseeker', is_verified: false },
      error: null,
    })
    mockSignOut.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.currentUser).toBeTruthy()

    await act(async () => {
      await result.current.logout()
    })

    expect(mockSignOut).toHaveBeenCalled()
    expect(result.current.currentUser).toBeNull()
    expect(result.current.userData).toBeNull()
  })
})
```

**Step 6: Rewrite the `register (legacy)` test**

```js
describe('register (legacy)', () => {
  it('creates user and inserts profile row', async () => {
    const mockUser = { id: 'new-user-1', email: 'new@test.com' }
    mockSignUp.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockInsert.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let response
    await act(async () => {
      response = await result.current.register(
        'new@test.com',
        'password123',
        'jobseeker',
        'John Doe',
        ['plumbing']
      )
    })

    expect(mockSignUp).toHaveBeenCalledWith({ email: 'new@test.com', password: 'password123' })
    expect(mockInsert).toHaveBeenCalled()
    expect(response.user.uid).toBe('new-user-1')
    expect(response.userData.role).toBe('jobseeker')
    expect(response.userData.name).toBe('John Doe')
    expect(response.userData.is_verified).toBe(false)
    expect(response.userData.skills).toEqual(['plumbing'])
  })
})
```

**Step 7: Rewrite the `role and verification helpers` setup function**

The `setupSignedInUser` helper must now use `mockOnAuthStateChange` and `mockSingle`:

```js
function setupSignedInUser(userData) {
  const mockUser = { id: userData.uid || userData.id, email: userData.email || 'u@test.com' }

  mockOnAuthStateChange.mockImplementation((callback) => {
    callback('SIGNED_IN', { user: mockUser })
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })

  mockSingle.mockResolvedValue({ data: userData, error: null })
}
```

The individual role/verification test cases (`detects employer role`, `detects admin role`, etc.) do not need changes — they call `setupSignedInUser` which is now updated.

**Step 8: Run tests to verify they fail**

```bash
npx vitest run src/contexts/AuthContext.test.jsx
```

Expected: Tests FAIL with errors like "supabase is not defined" or import errors — because `AuthContext.jsx` still imports Firebase. This is correct — the tests are now written for Supabase but the implementation hasn't been updated yet.

---

### Task 5: Rewrite AuthContext.jsx

**Files:**
- Modify: `src/contexts/AuthContext.jsx`

**Step 1: Replace the entire file content**

```jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../config/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null)
    const [userData, setUserData] = useState(null)
    const [loading, setLoading] = useState(true)

    // Compress an image file via Canvas and return a Base64 data URL.
    // Images are resized to max 800px and compressed as JPEG (quality 0.6).
    // Non-image files (PDF) fall back to raw base64 with a 400KB size cap.
    const compressAndEncode = (file) => {
        return new Promise((resolve, reject) => {
            if (!file) return resolve('')

            if (!file.type.startsWith('image/')) {
                if (file.size > 400 * 1024) {
                    return reject(new Error('PDF must be under 400KB.'))
                }
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result)
                reader.onerror = (err) => reject(err)
                reader.readAsDataURL(file)
                return
            }

            const img = new Image()
            const url = URL.createObjectURL(file)

            img.onload = () => {
                URL.revokeObjectURL(url)
                const MAX_DIM = 800
                let { width, height } = img

                if (width > MAX_DIM || height > MAX_DIM) {
                    if (width > height) {
                        height = Math.round(height * (MAX_DIM / width))
                        width = MAX_DIM
                    } else {
                        width = Math.round(width * (MAX_DIM / height))
                        height = MAX_DIM
                    }
                }

                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
                resolve(dataUrl)
            }

            img.onerror = () => {
                URL.revokeObjectURL(url)
                reject(new Error('Failed to load image for compression.'))
            }

            img.src = url
        })
    }

    const fetchUserData = async (userId) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()
        if (!error && data) {
            setUserData(data)
        }
    }

    // Create Supabase Auth account and insert minimal users row (Step 1 of registration)
    const createAccount = async (email, password, role) => {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        const user = data.user
        const minimalDoc = {
            id: user.id,
            email,
            role,
            name: '',
            registration_complete: false,
            registration_step: 1,
            is_verified: role === 'individual',
            skills: [],
            credentials_url: '',
        }

        const { error: insertError } = await supabase.from('users').insert(minimalDoc)
        if (insertError) throw insertError

        return { user: { ...user, uid: user.id }, userData: minimalDoc }
    }

    // Save registration step data to Supabase
    const saveRegistrationStep = async (stepData, stepNumber) => {
        if (!currentUser) throw new Error('No authenticated user')
        const { error } = await supabase
            .from('users')
            .update({ ...stepData, registration_step: stepNumber, updated_at: new Date().toISOString() })
            .eq('id', currentUser.id)
        if (error) throw error
        setUserData(prev => ({ ...prev, ...stepData, registration_step: stepNumber }))
    }

    // Mark registration as complete
    const completeRegistration = async (finalData = {}) => {
        if (!currentUser) throw new Error('No authenticated user')
        const { error } = await supabase
            .from('users')
            .update({ ...finalData, registration_complete: true, registration_step: null, updated_at: new Date().toISOString() })
            .eq('id', currentUser.id)
        if (error) throw error
        setUserData(prev => ({ ...prev, ...finalData, registration_complete: true, registration_step: null }))
    }

    // Register new user — legacy function kept for backward compatibility
    const register = async (email, password, role, name, skills = []) => {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        const user = data.user
        const userDoc = {
            id: user.id,
            email,
            name,
            role,
            is_verified: false,
            skills,
            credentials_url: '',
        }

        const { error: insertError } = await supabase.from('users').insert(userDoc)
        if (insertError) throw insertError

        return { user: { ...user, uid: user.id }, userData: userDoc }
    }

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return { ...data.user, uid: data.user.id }
    }

    const logout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setCurrentUser(null)
        setUserData(null)
    }

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
    }

    // Delete account — re-authenticates then calls a Postgres RPC that
    // deletes from auth.users (cascades to public.users)
    const deleteAccount = async (password) => {
        if (!currentUser) throw new Error('No authenticated user')

        const { error: reAuthError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password,
        })
        if (reAuthError) {
            // Normalize to a Firebase-compatible error code so Settings.jsx needs no change
            const err = new Error('Incorrect password. Please try again.')
            err.code = 'auth/wrong-password'
            throw err
        }

        const { error } = await supabase.rpc('delete_user')
        if (error) throw error

        setCurrentUser(null)
        setUserData(null)
    }

    const isVerified = () => userData?.is_verified === true
    const hasRole = (role) => userData?.role === role
    const isAdmin = () => userData?.role === 'admin'
    const isEmployer = () => userData?.role === 'employer'
    const isJobseeker = () => userData?.role === 'jobseeker'
    const isIndividual = () => userData?.role === 'individual'

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const user = session.user
                // uid shim: all consumers use currentUser.uid — Supabase uses .id
                setCurrentUser({ ...user, uid: user.id })
                await fetchUserData(user.id)
            } else {
                setCurrentUser(null)
                setUserData(null)
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

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
        deleteAccount,
        isVerified,
        hasRole,
        isAdmin,
        isEmployer,
        isJobseeker,
        isIndividual,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext
```

**Step 2: Run tests**

```bash
npx vitest run src/contexts/AuthContext.test.jsx
```

Expected: All tests that previously passed should now pass. The `registerJobseeker` and `registerEmployer` tests will still fail — that is pre-existing and not our concern.

**Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: No new failures introduced. Pre-existing failures are unchanged.

**Step 4: Commit**

```bash
git add src/contexts/AuthContext.jsx src/contexts/AuthContext.test.jsx
git commit -m "feat: migrate AuthContext from Firebase to Supabase Auth + Postgres users table"
```

---

### Task 6: Smoke test in browser

**Files:** None

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test each auth flow**

| Flow | Steps | Expected |
|------|-------|----------|
| Register | Go to /register, create a new account | Redirected to dashboard; user appears in Supabase Auth dashboard |
| Login | Log out, log back in | Lands on dashboard with correct role/name |
| Profile loads | Check nav shows correct user name | `userData` populated from Supabase `users` table |
| Password reset | Settings → Send Password Reset Email | Email arrives from Supabase |
| Delete account | Settings → Delete Account → type DELETE + password | Redirected to /login; user gone from Supabase Auth |

**Step 3: Verify in Supabase dashboard**

Authentication → Users: confirm registered test users appear.
Table Editor → users: confirm profile rows exist with correct data.

**Step 4: Final commit**

```bash
git add .
git commit -m "chore: Phase 1 complete — Supabase Auth + users table live"
```

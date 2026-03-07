# Supabase Migration — Phase 1: Auth + User Profiles

## Overview

Replace Firebase Auth and the Firestore `users` collection with Supabase Auth and a Supabase Postgres `users` table. All other Firestore collections (jobs, applications, messages) remain on Firebase until Phase 2.

**Goal:** The swap is invisible to the rest of the app. No page or component files change. The `useAuth()` hook exposes the same interface as before.

## Phased Migration Context

- **Phase 1 (this doc):** Supabase Auth + `users` table. Firebase stays for jobs/applications/messages.
- **Phase 2:** Migrate Firestore collections to Supabase Postgres.
- **Phase 3:** Migrate file storage to Supabase Storage. Remove Firebase SDK entirely.

## Files Changed

| Action | File |
|--------|------|
| Create | `src/config/supabase.js` |
| Rewrite | `src/contexts/AuthContext.jsx` |
| Update | `.env` |
| Unchanged | Everything else |

## Supabase `users` Table Schema

Run in Supabase SQL editor:

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

Also create the `delete_user` RPC function used by `deleteAccount`:

```sql
create or replace function public.delete_user()
returns void
language sql security definer
as $$
  delete from auth.users where id = auth.uid();
$$;
```

## Function Mapping

| Firebase | Supabase |
|----------|----------|
| `createUserWithEmailAndPassword` | `supabase.auth.signUp()` |
| `signInWithEmailAndPassword` | `supabase.auth.signInWithPassword()` |
| `signOut` | `supabase.auth.signOut()` |
| `onAuthStateChanged` | `supabase.auth.onAuthStateChange()` |
| `sendPasswordResetEmail` | `supabase.auth.resetPasswordForEmail()` |
| `reauthenticateWithCredential` | `supabase.auth.signInWithPassword()` (re-auth before delete) |
| Firestore `setDoc/updateDoc/getDoc` on users | `supabase.from('users').insert/update/select` |

## Key Design Decisions

### 1. `currentUser.uid` shim
Supabase users have `.id` instead of `.uid`. `AuthContext` will add `uid: user.id` to the user object so all 20+ consumer files remain unchanged.

### 2. No real-time user profile subscription in Phase 1
Firestore's `onSnapshot` gave live profile updates. For Phase 1, the profile is fetched once on auth state change and local state is updated immediately after any mutation. Supabase Realtime can be added in Phase 2 if needed.

### 3. Account deletion via RPC
Supabase does not support client-side `deleteUser`. A Postgres function `delete_user()` with `security definer` is called via `supabase.rpc('delete_user')`. The `on delete cascade` on the `users` table ensures the profile row is deleted when the auth user is deleted.

## Implementation Steps

1. **Supabase project setup** — create project, run schema SQL, run `delete_user` function SQL
2. **`src/config/supabase.js`** — initialize Supabase client with env vars
3. **`.env`** — add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Firebase vars stay)
4. **Rewrite `AuthContext.jsx`** — replace Firebase Auth + Firestore user calls with Supabase, keep identical exported interface
5. **Smoke test** — register, login, logout, password reset, delete account all work as before

## Success Criteria

- All auth flows work identically to before (register, login, logout, password reset, delete account)
- User profile data (role, name, skills, is_verified, etc.) persists correctly in Supabase Postgres
- No changes required in any page or component file
- Firebase SDK still functional for jobs/applications/messages

# Settings Page — Design Document

**Date:** 2026-02-16
**Feature:** Full settings page with account, notification, and privacy controls

## Goal

Add a `/settings` page where users can manage their account (password reset, delete account), notification preferences, and privacy settings. All settings persist to Firestore.

## Approach

Tabbed settings page with left sidebar on desktop, tabs on mobile. Three sections: Account, Notifications, Privacy. Uses existing Firebase Auth capabilities. Password changes via reset email (no complex re-auth). Delete account uses `reauthenticateWithCredential` + `deleteUser`.

## Page Layout

- **Route:** `/settings` (protected, any authenticated user)
- **Layout:** Left sidebar navigation on desktop, horizontal tabs on mobile
- **Sections:** Account, Notifications, Privacy
- **Design:** Card-based glassmorphic style matching existing pages
- **Navigation:** Settings link added to Navbar (the `Settings` icon import already exists but is unused)

## Account Section

- **Email:** Read-only display of current email address
- **Password:** "Send Password Reset Email" button reusing `resetPassword` from AuthContext. Shows inline success confirmation.
- **Delete Account:** Red button at bottom, opens confirmation modal requiring:
  1. Type "DELETE" to confirm
  2. Enter current password for Firebase re-authentication
  3. Executes: `reauthenticateWithCredential` → `deleteUser` → delete Firestore doc

## Notification Preferences

Stored as `notification_preferences` on user Firestore document:

```js
{
    email_notifications: true,      // Master toggle
    job_match_alerts: true,         // Jobseeker only
    application_updates: true,      // Jobseeker only
    new_applicant_alerts: true,     // Employer only
    message_notifications: true,    // All roles
}
```

- Toggle switches with descriptions
- Master toggle disables sub-toggles when off
- Role-specific toggles shown only for relevant roles
- Auto-save on toggle change (debounced 500ms) with "Saved" indicator

## Privacy Settings

Stored as `privacy_settings` on user Firestore document:

```js
{
    profile_visibility: 'public',   // 'public' | 'verified_only'
    show_contact_info: true,
    show_skills: true,
}
```

- Radio buttons for profile visibility
- Toggle switches for contact info and skills
- Auto-save like notifications
- PublicProfile.jsx will check these settings when rendering

## Architecture & File Changes

### Files to Create
1. `src/pages/Settings.jsx` — Main settings page with tabbed layout and all three sections

### Files to Modify
1. `src/contexts/AuthContext.jsx` — Add `deleteAccount(password)` function (reauthenticate + delete user + delete Firestore doc)
2. `src/App.jsx` — Add `/settings` route
3. `src/components/Navbar.jsx` — Add Settings link to navigation
4. `src/pages/PublicProfile.jsx` — Respect `privacy_settings` when rendering contact info and skills

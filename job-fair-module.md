# Job Fair Announcements Module

## Goal
Add a job fair events module: public listing page + admin CRUD, with status, Google Form pre-registration, filtering/sorting, highlighting, and bookmarks.

## Tech decisions
- New table `public.job_fair_events` + `public.job_fair_bookmarks` (Supabase, RLS).
- Public read for events; admin-only writes; user-scoped writes for bookmarks.
- Status is **derived** from dates + `is_registration_open` flag (no manual state-machine drift). Stored values: `upcoming` / `open` / `closed`. `is_highlighted` boolean for featuring.
- Admin section follows existing `AdminDashboard` section pattern (see `OverviewSection`, `UserManagementSection`).
- Public page mirrors `JobListings.jsx` patterns (filters + grid).

## Tasks

- [ ] **1. SQL migration** — Create `sql/create_job_fair_events.sql`: tables `job_fair_events` (id, title, description, event_date, end_date, location, companies text[], google_form_url, registration_deadline, is_registration_open bool, is_highlighted bool, banner_url, status_override text null, created_by uuid, timestamps) and `job_fair_bookmarks` (user_id, event_id, created_at, PK composite). Add RLS: public SELECT on events, admin INSERT/UPDATE/DELETE (use `is_admin(auth.uid())` if exists, else check users.role); user CRUD on own bookmarks. Add indexes on `event_date`, `is_highlighted`. → Verify: run in Supabase SQL editor, no errors; `select * from job_fair_events` returns empty set.
- [ ] **2. Service layer** — Create `src/services/jobFairService.js` exporting: `listEvents({ status, sort, search })`, `getEvent(id)`, `createEvent(data)`, `updateEvent(id, data)`, `deleteEvent(id)`, `toggleBookmark(userId, eventId)`, `listBookmarks(userId)`, plus `deriveStatus(event)` helper (upcoming if `event_date > now`, closed if `end_date < now`, else open). → Verify: import in console, `listEvents()` resolves to array.
- [ ] **3. Public listing page** — Create `src/pages/JobFairs.jsx` (and `.test.jsx`): card grid with title/date/location/companies/status badge/highlight ribbon, filter chips (All/Upcoming/Open/Closed), sort dropdown (date asc/desc, recently added), search input, bookmark button (auth-gated). Route `/job-fairs` (public, ErrorBoundary-wrapped) added in `src/App.jsx`. → Verify: `npm run dev`, visit `/job-fairs`, see seeded events; filters change list; `npm test src/pages/JobFairs.test.jsx` passes.
- [ ] **4. Event detail page** — Create `src/pages/JobFairDetail.jsx`: full description, participating companies, dates, location, "Pre-register" button → opens `google_form_url` in new tab (disabled when `!is_registration_open` or status closed, with reason text). Route `/job-fairs/:id`. → Verify: click card from listing, detail loads, register button opens form in new tab; closed event shows disabled state.
- [ ] **5. Admin section** — Create `src/components/admin/JobFairManagementSection.jsx` (table list + create/edit modal `JobFairFormModal.jsx` with all fields, including `is_highlighted` toggle and `is_registration_open` toggle) and wire it into `src/pages/admin/Dashboard.jsx` sidebar/sections (alongside `OverviewSection` etc.). Gate behind permission key `manage_job_fairs` in `src/utils/adminPermissions.js`. → Verify: log in as admin, open Job Fairs section, create/edit/delete event, toggle highlight + registration; changes appear on `/job-fairs`.
- [ ] **6. Bookmarks + Navbar entry** — Add "Job Fairs" link to `src/components/Navbar.jsx` `navLinks` (public, between Job Listings and Find Workers), add a "Bookmarked Job Fairs" tab/filter on `/job-fairs` for logged-in users (reads `job_fair_bookmarks`). → Verify: link visible in navbar; bookmarking an event toggles persistence across reload; "Bookmarked" filter shows only saved events.
- [ ] **7. Lint + tests + manual smoke** — `npm run lint` clean, `npm test` green, then manual smoke: create event as admin → appears on `/job-fairs` → bookmark as jobseeker → click pre-register → close registration as admin → button becomes disabled.

## Done When
- [ ] `/job-fairs` lists, filters, sorts, and highlights events for any visitor.
- [ ] Authenticated users can bookmark and view their bookmarks.
- [ ] Admin can fully CRUD events and toggle registration availability/highlighting.
- [ ] Pre-registration opens the configured Google Form; disabled when registration closed.
- [ ] All lint + tests pass.

## Notes
- Follow the project's snake_case-at-DB-boundary convention (mirror `messagingService` style).
- Wrap every new route in `<ErrorBoundary>` per existing convention in `App.jsx`.
- Don't hard-code status; derive from dates + flag so it stays accurate without a cron.
- "homeowner" UI / "individual" DB rule does not apply here — this module has no role split beyond admin vs everyone.

# Auto Unlist Zero Vacancy Jobs Implementation Plan

## Goal

Automatically remove jobs from active search once their vacancy count reaches zero.

## Current State

- The system uses `job_postings.vacancies` as the live vacancy count.
- Public job search in `src/pages/JobListings.jsx` only fetches rows where `status = 'open'`.
- `src/pages/JobDetail.jsx` also blocks applying when `status !== 'open'`.
- Employers can manually change status in `src/pages/employer/MyListings.jsx`.
- The posting form in `src/pages/employer/PostJob.jsx` enforces at least 1 vacancy during creation and editing.
- Applications currently update application status, but there is no automatic vacancy-to-status sync.

## Recommended Rule

- When `job_postings.vacancies` becomes `0`, force `status = 'closed'`.
- When an employer later increases vacancies above `0`, do not automatically reopen by default.
- Reopening should remain an explicit employer action to avoid unexpectedly republishing an old listing.

## Step-by-Step Breakdown

### Phase 1: Normalize the source of truth

1. Treat `job_postings.vacancies` as the authoritative remaining-slot field.
2. Document that `number_of_vacancies` in the feature request maps to the existing `vacancies` column.
3. Keep `status` as the field used by public listing pages and application guards.

### Phase 2: Database-level automatic closure

1. Add a database trigger on `job_postings`.
2. On insert or update:
   - if `vacancies <= 0`, set `status = 'closed'`
   - if `vacancies > 0`, preserve the incoming status value
3. Add a check constraint preventing negative vacancy values.

### Phase 3: Application-flow vacancy decrement

1. Review every path that fills a job position.
2. When the system marks an applicant as `hired`, decrement `job_postings.vacancies`.
3. If the decrement produces `0`, let the trigger close the posting automatically.

### Phase 4: Employer UI updates

1. In `src/pages/employer/MyListings.jsx`, show a clearer badge when a listing closed because vacancies reached zero.
2. Prevent employers from selecting `open` if vacancies are still `0`.
3. When editing a closed job with zero vacancies in `src/pages/employer/PostJob.jsx`, require the employer to increase vacancies before reopening.

### Phase 5: Public search and detail consistency

1. Keep `src/pages/JobListings.jsx` filtering on `status = 'open'`.
2. Keep `src/pages/JobDetail.jsx` re-checking status before submit.
3. Optionally add a zero-vacancy-safe guard by also verifying `vacancies > 0` before application insert.

### Phase 6: Testing

1. Create a job with 1 vacancy and hire 1 applicant.
2. Confirm the job becomes `closed` automatically.
3. Confirm it disappears from `/jobs`.
4. Confirm the detail page blocks new applications if loaded before closure.
5. Confirm increasing vacancies later does not silently republish the job.

## Database Schema Changes

### Constraint

```sql
alter table public.job_postings
  add constraint chk_job_postings_vacancies_nonnegative
  check (vacancies >= 0);
```

### Trigger function

```sql
create or replace function public.sync_job_status_with_vacancies()
returns trigger as $$
begin
  if coalesce(new.vacancies, 0) <= 0 then
    new.vacancies := 0;
    new.status := 'closed';
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql;
```

### Trigger

```sql
create trigger trg_sync_job_status_with_vacancies
before insert or update on public.job_postings
for each row
execute function public.sync_job_status_with_vacancies();
```

## Code Changes Required

### SQL

- Create `sql/auto_close_zero_vacancy_jobs.sql` for the constraint and trigger.

### Employer posting flow

- Update `src/pages/employer/PostJob.jsx`:
  - keep vacancy validation aligned with the database rule
  - if editing a zero-vacancy closed job, require an explicit status decision after vacancy increase

### Employer listings

- Update `src/pages/employer/MyListings.jsx`:
  - disable misleading status changes when `vacancies === 0`
  - show clearer copy such as "Closed: no vacancies remaining"

### Applicant management

- Update `src/pages/employer/JobApplicants.jsx`:
  - when an application transitions to `hired`, decrement the job's vacancy count
  - prevent repeated decrements if the same applicant is already marked `hired`
  - optionally enforce bulk-hire behavior carefully so vacancy counts do not go below zero

### Public browsing and apply flow

- Update `src/pages/JobDetail.jsx` to re-check both `status` and `vacancies` before insert.
- Keep `src/pages/JobListings.jsx` as-is or add a secondary `gt('vacancies', 0)` filter for defense in depth.

## Suggested File Deliverables

- `sql/auto_close_zero_vacancy_jobs.sql`
- `src/pages/employer/JobApplicants.jsx`
- `src/pages/employer/MyListings.jsx`
- `src/pages/employer/PostJob.jsx`
- `src/pages/JobListings.jsx`
- `src/pages/JobDetail.jsx`

## Risks and Notes

- The biggest correctness risk is double-decrementing vacancies when an applicant is toggled into `hired` more than once or during bulk actions.
- Database-level closure is important because relying only on the React UI would miss edits, imports, or future admin tooling.
- The existing status values are `open`, `filled`, and `closed`. Using `closed` for automatic zero-vacancy handling fits current code with the fewest downstream changes.

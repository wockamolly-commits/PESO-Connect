-- Auto-close job postings when vacancies reach zero.
--
-- Run this migration once against the production database.
-- The constraint prevents negative vacancy values at the DB level.
-- The trigger enforces automatic closure so no application path,
-- admin tool, or future feature can leave a zero-vacancy job open.

-- 1. Check constraint: vacancies may never be negative.
alter table public.job_postings
  add constraint chk_job_postings_vacancies_nonnegative
  check (vacancies >= 0);

-- 2. Trigger function: force status='closed' when vacancies <= 0.
--    Does NOT reopen a job when vacancies go back above 0;
--    reopening remains an explicit employer action.
create or replace function public.sync_job_status_with_vacancies()
returns trigger as $$
begin
  if coalesce(new.vacancies, 0) <= 0 then
    new.vacancies := 0;
    new.status    := 'closed';
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- 3. Attach the trigger to job_postings.
--    Drop first so this file is safe to re-run.
drop trigger if exists trg_sync_job_status_with_vacancies on public.job_postings;

create trigger trg_sync_job_status_with_vacancies
before insert or update on public.job_postings
for each row
execute function public.sync_job_status_with_vacancies();

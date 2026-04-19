-- Reject application INSERTs against jobs that are full or closed.
--
-- Context:
--   JobDetail.jsx SELECTs vacancies/status, checks client-side, then
--   INSERTs into public.applications. Two concurrent applicants can both
--   pass the SELECT when vacancies=1 and both INSERT, over-filling the
--   position. The trigger below makes the database the final arbiter —
--   the SELECT becomes a UX pre-check, not a correctness boundary.
--
-- Raises a non-unique-violation SQLSTATE so the client can distinguish
-- "already applied" (23505) from "job full/closed" (23514).
--
-- Idempotent; safe to re-run.

create or replace function public.applications_guard_vacancies()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  job_status  text;
  job_vacs    integer;
begin
  select status, vacancies
    into job_status, job_vacs
    from public.job_postings
    where id = new.job_id
    for update;

  if not found then
    raise exception 'job_not_found'
      using errcode = '23503';
  end if;

  if job_status <> 'open' then
    raise exception 'job_closed'
      using errcode = '23514';
  end if;

  if coalesce(job_vacs, 0) <= 0 then
    raise exception 'job_full'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- SECURITY DEFINER above is required:
--   Applying users (jobseekers) do not hold UPDATE on public.job_postings,
--   so `select ... for update` under SECURITY INVOKER returns zero rows for
--   them and the trigger spuriously raises job_not_found. Running as the
--   function owner (typically postgres) lets the lock + visibility check
--   succeed regardless of the caller's grants/RLS.

revoke all on function public.applications_guard_vacancies() from public;

drop trigger if exists trg_applications_guard_vacancies on public.applications;
create trigger trg_applications_guard_vacancies
  before insert on public.applications
  for each row
  execute function public.applications_guard_vacancies();

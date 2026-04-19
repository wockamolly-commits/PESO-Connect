-- Server-side sanitation of admin_export_logs.filter_state.
--
-- Context:
--   filter_state is a jsonb column that stores the filter set used for a
--   CSV export. The React client (JobseekerExportSection) and the edge
--   function (export-jobseekers-csv) both sanitize before inserting, but
--   RLS allows any admin to INSERT rows directly via PostgREST. A tampered
--   client could still shove megabytes or arbitrary keys into the column.
--
-- Fix: normalize filter_state inside a BEFORE INSERT trigger to a fixed
-- shape with length-clamped string values. Anything outside the whitelist
-- is discarded.
--
-- Idempotent; safe to re-run.

create or replace function public.sanitize_admin_export_filter_state()
returns trigger
language plpgsql
as $$
declare
  raw          jsonb := coalesce(new.filter_state, '{}'::jsonb);
  cleaned      jsonb := '{}'::jsonb;
  -- Clamp helpers
  keyword       text := left(coalesce(raw ->> 'keyword', ''), 200);
  location_txt  text := left(coalesce(raw ->> 'location', ''), 200);
  education     text := left(coalesce(raw ->> 'education', ''), 100);
  verification  text := left(coalesce(raw ->> 'verificationStatus', 'all'), 40);
begin
  cleaned := jsonb_build_object(
    'keyword',            keyword,
    'location',           location_txt,
    'education',          education,
    'verificationStatus', case when verification = '' then 'all' else verification end
  );
  new.filter_state := cleaned;

  -- Cap row_count at a sane ceiling so a corrupted payload can't claim
  -- an export of 2 billion rows.
  if new.row_count is null or new.row_count < 0 then
    new.row_count := 0;
  elsif new.row_count > 1000000 then
    new.row_count := 1000000;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_admin_export_logs_sanitize_filter_state on public.admin_export_logs;
create trigger trg_admin_export_logs_sanitize_filter_state
  before insert on public.admin_export_logs
  for each row
  execute function public.sanitize_admin_export_filter_state();

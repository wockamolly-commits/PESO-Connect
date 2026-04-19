-- Enforce proof attachments for professional licenses and civil service eligibility.
-- Safe to re-run.

alter table public.jobseeker_profiles
  add column if not exists civil_service_cert_path text default '';

create or replace function public.professional_licenses_have_proof(licenses jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(coalesce(licenses, '[]'::jsonb)) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(licenses, '[]'::jsonb)) as license(entry)
      where nullif(btrim(coalesce(entry->>'license_copy_path', '')), '') is null
    );
$$;

alter table public.jobseeker_profiles
  drop constraint if exists chk_professional_licenses_has_cert,
  add constraint chk_professional_licenses_has_cert
    check (public.professional_licenses_have_proof(professional_licenses));

alter table public.jobseeker_profiles
  drop constraint if exists chk_civil_service_eligibility_has_cert,
  add constraint chk_civil_service_eligibility_has_cert
    check (
      nullif(btrim(coalesce(civil_service_eligibility, '')), '') is null
      or nullif(btrim(coalesce(civil_service_cert_path, '')), '') is not null
    );

create or replace function public.jobseeker_profiles_reverification_guard()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  if coalesce(old.profile_modified_since_verification, false) = false
     and (
       coalesce(old.is_verified, false) = true
       or old.jobseeker_status = 'verified'
     )
     and (
       coalesce(new.highest_education, '') is distinct from coalesce(old.highest_education, '')
       or coalesce(new.school_name, '') is distinct from coalesce(old.school_name, '')
       or coalesce(new.course_or_field, '') is distinct from coalesce(old.course_or_field, '')
       or coalesce(new.vocational_training, '[]'::jsonb) is distinct from coalesce(old.vocational_training, '[]'::jsonb)
       or coalesce(new.certifications, '{}'::text[]) is distinct from coalesce(old.certifications, '{}'::text[])
       or coalesce(new.professional_licenses, '[]'::jsonb) is distinct from coalesce(old.professional_licenses, '[]'::jsonb)
       or coalesce(new.civil_service_eligibility, '') is distinct from coalesce(old.civil_service_eligibility, '')
       or new.civil_service_date is distinct from old.civil_service_date
       or coalesce(new.civil_service_cert_path, '') is distinct from coalesce(old.civil_service_cert_path, '')
     ) then
    new.profile_modified_since_verification := true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_jobseeker_profiles_reverification_guard on public.jobseeker_profiles;

create trigger trg_jobseeker_profiles_reverification_guard
before update on public.jobseeker_profiles
for each row
execute function public.jobseeker_profiles_reverification_guard();

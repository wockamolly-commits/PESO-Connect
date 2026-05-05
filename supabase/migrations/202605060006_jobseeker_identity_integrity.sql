-- Keep jobseeker identity fields canonical and searchable for admin views.

update public.jobseeker_profiles js
set
  first_name = coalesce(nullif(trim(js.first_name), ''), nullif(trim(u.first_name), '')),
  middle_name = coalesce(nullif(trim(js.middle_name), ''), nullif(trim(u.middle_name), '')),
  surname = coalesce(nullif(trim(js.surname), ''), nullif(trim(u.surname), '')),
  full_name = coalesce(
    nullif(trim(js.full_name), ''),
    nullif(concat_ws(' ', nullif(trim(js.first_name), ''), nullif(trim(js.middle_name), ''), nullif(trim(js.surname), '')), ''),
    nullif(concat_ws(' ', nullif(trim(u.first_name), ''), nullif(trim(u.middle_name), ''), nullif(trim(u.surname), '')), ''),
    nullif(trim(u.name), '')
  )
from public.users u
where u.id = js.id
  and (
    nullif(trim(js.first_name), '') is null
    or nullif(trim(js.surname), '') is null
    or nullif(trim(js.full_name), '') is null
  );

update public.users u
set name = coalesce(
  nullif(trim(u.name), ''),
  nullif(concat_ws(' ', nullif(trim(u.first_name), ''), nullif(trim(u.middle_name), ''), nullif(trim(u.surname), '')), ''),
  nullif(trim(js.full_name), '')
)
from public.jobseeker_profiles js
where js.id = u.id
  and u.role = 'user'
  and u.subtype = 'jobseeker'
  and nullif(trim(u.name), '') is null;

alter table public.users
  add constraint users_completed_jobseeker_name_present
  check (
    role <> 'user'
    or subtype <> 'jobseeker'
    or coalesce(registration_complete, false) = false
    or nullif(trim(coalesce(name, '')), '') is not null
    or nullif(concat_ws(' ', nullif(trim(coalesce(first_name, '')), ''), nullif(trim(coalesce(surname, '')), '')), '') is not null
  ) not valid;

alter table public.jobseeker_profiles
  add constraint jobseeker_profiles_completed_name_present
  check (
    coalesce(registration_complete, false) = false
    or nullif(trim(coalesce(full_name, '')), '') is not null
    or nullif(concat_ws(' ', nullif(trim(coalesce(first_name, '')), ''), nullif(trim(coalesce(surname, '')), '')), '') is not null
  ) not valid;

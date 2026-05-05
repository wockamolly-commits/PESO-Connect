-- Private resume storage.
--
-- Resume files contain sensitive jobseeker data. The bucket must not be
-- public, and reads must be limited to the owner, admins, or the employer
-- who owns a job application that references the resume path.

insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('resumes', 'resumes', false, array['application/pdf'], 5 * 1024 * 1024)
on conflict (id) do update
set
  public = false,
  allowed_mime_types = array['application/pdf'],
  file_size_limit = 5 * 1024 * 1024;

drop policy if exists "Anyone can read resumes" on storage.objects;
drop policy if exists "Users can read own resumes" on storage.objects;
drop policy if exists "Resume owners admins and application employers can read" on storage.objects;

create policy "Resume owners admins and application employers can read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'resumes'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.get_admin_level(auth.uid()) is not null
    or exists (
      select 1
      from public.applications a
      join public.job_postings j on j.id = a.job_id
      where j.employer_id = auth.uid()
        and a.resume_url = storage.objects.name
    )
  )
);

drop policy if exists "Users can upload own resumes" on storage.objects;
drop policy if exists "Users can update own resumes" on storage.objects;
drop policy if exists "Users can delete own resumes" on storage.objects;

create policy "Users can upload own resumes"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own resumes"
on storage.objects for update
to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own resumes"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- Profile tables for PESO Connect
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- 0. ADD MISSING COLUMNS (safe to run even if columns exist)
--    Run this FIRST if tables already exist
-- ============================================================

-- Jobseeker: extra fields from profile edit page
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS gender text default '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS civil_status text default '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS is_pwd boolean default false;
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS pwd_id_number text default '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS languages jsonb default '[]';

-- Employer: extra fields from profile edit page
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS company_description text default '';
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS company_size text default '';
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS year_established text default '';
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS company_website text default '';
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS company_logo text default '';
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS social_media_links jsonb default '{}';
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS facebook_url text default '';
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS linkedin_url text default '';

-- ============================================================
-- 1. JOBSEEKER PROFILES
-- ============================================================
create table if not exists public.jobseeker_profiles (
  id                        uuid references public.users(id) on delete cascade primary key,

  -- Personal Information (Step 2)
  full_name                 text default '',
  date_of_birth             text default '',
  barangay                  text default '',
  city                      text default '',
  province                  text default '',

  -- Contact (Step 2)
  mobile_number             text default '',
  preferred_contact_method  text default 'email',

  -- Employment Preferences (Step 3)
  preferred_job_type        text[] default '{}',
  preferred_job_location    text default '',
  expected_salary_min       text default '',
  expected_salary_max       text default '',
  willing_to_relocate       text default 'no',

  -- Education (Step 4)
  highest_education         text default '',
  school_name               text default '',
  course_or_field           text default '',
  year_graduated            text default '',

  -- Skills & Experience (Step 5)
  skills                    text[] default '{}',
  work_experiences          jsonb default '[]',
  certifications            text[] default '{}',
  professional_licenses     jsonb default '[]',
  civil_service_eligibility text default '',
  civil_service_date        date,
  civil_service_cert_path   text default '',
  portfolio_url             text default '',
  resume_url                text default '',
  certificate_urls          jsonb default '[]',

  -- Consent & Status (Step 6 / final)
  terms_accepted            boolean default false,
  data_processing_consent   boolean default false,
  peso_verification_consent boolean default false,
  info_accuracy_confirmation boolean default false,
  jobseeker_status          text default 'pending',
  rejection_reason          text default '',

  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

alter table public.jobseeker_profiles enable row level security;

create policy "Jobseekers can read own profile"
  on public.jobseeker_profiles for select using (auth.uid() = id);
create policy "Jobseekers can insert own profile"
  on public.jobseeker_profiles for insert with check (auth.uid() = id);
create policy "Jobseekers can update own profile"
  on public.jobseeker_profiles for update using (auth.uid() = id);


-- ============================================================
-- 2. EMPLOYER PROFILES
-- ============================================================
create table if not exists public.employer_profiles (
  id                        uuid references public.users(id) on delete cascade primary key,

  -- Business Info (Step 2)
  company_name              text default '',
  employer_type             text default '',
  business_reg_number       text default '',
  business_address          text default '',
  nature_of_business        text default '',

  -- Representative & Contact (Step 3)
  representative_name       text default '',
  representative_position   text default '',
  contact_email             text default '',
  contact_number            text default '',
  preferred_contact_method  text default 'email',
  gov_id_url                text default '',

  -- Documents & Consent (Step 4 / final)
  business_permit_url       text default '',
  terms_accepted            boolean default false,
  peso_consent              boolean default false,
  labor_compliance          boolean default false,
  employer_status           text default 'pending',
  rejection_reason          text default '',

  -- Extended fields (used in settings/profile pages)
  company_description       text default '',
  company_size              text default '',
  year_established          text default '',
  company_website           text default '',
  company_logo              text default '',
  social_media_links        jsonb default '{}',

  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

alter table public.employer_profiles enable row level security;

create policy "Employers can read own profile"
  on public.employer_profiles for select using (auth.uid() = id);
create policy "Employers can insert own profile"
  on public.employer_profiles for insert with check (auth.uid() = id);
create policy "Employers can update own profile"
  on public.employer_profiles for update using (auth.uid() = id);


-- ============================================================
-- 3. INDIVIDUAL PROFILES
-- ============================================================
create table if not exists public.individual_profiles (
  id                        uuid references public.users(id) on delete cascade primary key,

  -- Personal Info (Step 2)
  full_name                 text default '',
  contact_number            text default '',

  -- Status
  individual_status         text default 'active',

  -- Extended fields (used in settings/profile pages)
  barangay                  text default '',
  city                      text default '',
  province                  text default '',
  bio                       text default '',
  service_preferences       text[] default '{}',

  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

alter table public.individual_profiles enable row level security;

create policy "Individuals can read own profile"
  on public.individual_profiles for select using (auth.uid() = id);
create policy "Individuals can insert own profile"
  on public.individual_profiles for insert with check (auth.uid() = id);
create policy "Individuals can update own profile"
  on public.individual_profiles for update using (auth.uid() = id);


-- ============================================================
-- 4. ADMIN READ ACCESS (so admin dashboard can view all profiles)
-- ============================================================

-- Allow admins to read all profiles
create policy "Admins can read all jobseeker profiles"
  on public.jobseeker_profiles for select
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can read all employer profiles"
  on public.employer_profiles for select
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can read all individual profiles"
  on public.individual_profiles for select
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Allow admins to update profiles (for verification status changes)
create policy "Admins can update all jobseeker profiles"
  on public.jobseeker_profiles for update
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update all employer profiles"
  on public.employer_profiles for update
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update all individual profiles"
  on public.individual_profiles for update
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

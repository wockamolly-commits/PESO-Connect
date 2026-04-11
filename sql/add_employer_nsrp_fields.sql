-- Add NSRP Form 2 fields to employer_profiles
-- Aligned with the redesigned EmployerRegistration wizard.

ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS trade_name              text default '';
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS acronym                 text default '';
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS office_type             text default ''; -- 'main_office' | 'branch'
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS employer_sector         text default ''; -- 'private' | 'public'
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS employer_type_specific  text default ''; -- specific type under sector
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS total_work_force        text default ''; -- 'micro' | 'small' | 'medium' | 'large'
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS tin                     text default '';

-- Address fields (replacing single business_address textarea)
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS province                text default '';
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS city                    text default '';
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS barangay                text default '';
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS street                  text default '';

-- Contact / representative additions
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS owner_name              text default '';
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS same_as_owner           boolean default false;
ALTER TABLE public.employer_profiles ADD COLUMN IF NOT EXISTS telephone_number        text default '';

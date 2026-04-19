CREATE OR REPLACE FUNCTION public.fn_norm_reverification_text(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(coalesce(value, '')));
$$;

CREATE OR REPLACE FUNCTION public.fn_set_jobseeker_reverification_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  is_user_verified boolean;
BEGIN
  SELECT is_verified INTO is_user_verified
  FROM public.users
  WHERE id = NEW.id;

  IF NOT COALESCE(is_user_verified, false) THEN
    RETURN NEW;
  END IF;

  IF public.fn_norm_reverification_text(NEW.first_name) IS DISTINCT FROM public.fn_norm_reverification_text(OLD.first_name)
     OR public.fn_norm_reverification_text(NEW.surname) IS DISTINCT FROM public.fn_norm_reverification_text(OLD.surname)
     OR public.fn_norm_reverification_text(NEW.middle_name) IS DISTINCT FROM public.fn_norm_reverification_text(OLD.middle_name)
     OR coalesce(NEW.vocational_training, '[]'::jsonb)::text IS DISTINCT FROM coalesce(OLD.vocational_training, '[]'::jsonb)::text
     OR public.fn_norm_reverification_text(NEW.highest_education) IS DISTINCT FROM public.fn_norm_reverification_text(OLD.highest_education)
     OR public.fn_norm_reverification_text(NEW.school_name) IS DISTINCT FROM public.fn_norm_reverification_text(OLD.school_name)
     OR public.fn_norm_reverification_text(NEW.course_or_field) IS DISTINCT FROM public.fn_norm_reverification_text(OLD.course_or_field)
     OR coalesce(NEW.professional_licenses, '[]'::jsonb)::text IS DISTINCT FROM coalesce(OLD.professional_licenses, '[]'::jsonb)::text
     OR public.fn_norm_reverification_text(NEW.civil_service_eligibility) IS DISTINCT FROM public.fn_norm_reverification_text(OLD.civil_service_eligibility)
     OR coalesce(NEW.work_experiences, '[]'::jsonb)::text IS DISTINCT FROM coalesce(OLD.work_experiences, '[]'::jsonb)::text
  THEN
    NEW.profile_modified_since_verification := true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_employer_reverification_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  is_user_verified boolean;
BEGIN
  SELECT is_verified INTO is_user_verified
  FROM public.users
  WHERE id = NEW.id;

  IF NOT COALESCE(is_user_verified, false) THEN
    RETURN NEW;
  END IF;

  IF public.fn_norm_reverification_text(NEW.company_name) IS DISTINCT FROM public.fn_norm_reverification_text(OLD.company_name)
     OR public.fn_norm_reverification_text(NEW.tin) IS DISTINCT FROM public.fn_norm_reverification_text(OLD.tin)
     OR public.fn_norm_reverification_text(NEW.business_reg_number) IS DISTINCT FROM public.fn_norm_reverification_text(OLD.business_reg_number)
     OR public.fn_norm_reverification_text(NEW.owner_name) IS DISTINCT FROM public.fn_norm_reverification_text(OLD.owner_name)
     OR public.fn_norm_reverification_text(NEW.representative_name) IS DISTINCT FROM public.fn_norm_reverification_text(OLD.representative_name)
  THEN
    NEW.profile_modified_since_verification := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobseeker_reverification ON public.jobseeker_profiles;
CREATE TRIGGER trg_jobseeker_reverification
BEFORE UPDATE ON public.jobseeker_profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_jobseeker_reverification_flag();

DROP TRIGGER IF EXISTS trg_employer_reverification ON public.employer_profiles;
CREATE TRIGGER trg_employer_reverification
BEFORE UPDATE ON public.employer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_employer_reverification_flag();

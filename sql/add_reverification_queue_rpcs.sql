CREATE OR REPLACE FUNCTION public.admin_get_reverification_queue()
RETURNS TABLE (
  id uuid,
  role_label text,
  email text,
  display_name text,
  company_name text,
  updated_at timestamptz,
  is_verified boolean,
  profile_modified_since_verification boolean,
  verified_snapshot jsonb,
  profile_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_admin_level(auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'insufficient_privilege: admin role required'
      USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    'jobseeker'::text AS role_label,
    u.email,
    COALESCE(NULLIF(CONCAT_WS(' ', NULLIF(js.first_name, ''), NULLIF(js.middle_name, ''), NULLIF(js.surname, '')), ''), NULLIF(u.name, '')) AS display_name,
    NULL::text AS company_name,
    js.updated_at,
    COALESCE(u.is_verified, false) AS is_verified,
    COALESCE(js.profile_modified_since_verification, false) AS profile_modified_since_verification,
    COALESCE(js.verified_snapshot, '{}'::jsonb) AS verified_snapshot,
    to_jsonb(js) AS profile_data
  FROM public.users u
  JOIN public.jobseeker_profiles js ON js.id = u.id
  WHERE u.role = 'user'
    AND u.subtype = 'jobseeker'
    AND COALESCE(u.is_verified, false) = true
    AND COALESCE(js.profile_modified_since_verification, false) = true

  UNION ALL

  SELECT
    u.id,
    'employer'::text AS role_label,
    u.email,
    ep.representative_name AS display_name,
    ep.company_name,
    ep.updated_at,
    COALESCE(u.is_verified, false) AS is_verified,
    COALESCE(ep.profile_modified_since_verification, false) AS profile_modified_since_verification,
    COALESCE(ep.verified_snapshot, '{}'::jsonb) AS verified_snapshot,
    to_jsonb(ep) AS profile_data
  FROM public.users u
  JOIN public.employer_profiles ep ON ep.id = u.id
  WHERE u.role = 'employer'
    AND COALESCE(u.is_verified, false) = true
    AND COALESCE(ep.profile_modified_since_verification, false) = true
  ORDER BY updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_process_reverification(
  p_user_id uuid,
  p_role_label text,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_admin_id uuid := auth.uid();
  v_admin_name text := COALESCE((SELECT name FROM public.users WHERE id = v_admin_id), 'PESO staff');
  v_profile_table text;
  v_status_field text;
  v_status_value text;
  v_notification_title text;
  v_notification_message text;
  v_snapshot jsonb;
BEGIN
  IF public.get_admin_level(v_admin_id) IS NULL THEN
    RAISE EXCEPTION 'insufficient_privilege: admin role required'
      USING errcode = '42501';
  END IF;

  IF p_role_label NOT IN ('jobseeker', 'employer') THEN
    RAISE EXCEPTION 'invalid_role_label';
  END IF;

  IF p_action NOT IN ('approve', 'reject', 'revoke') THEN
    RAISE EXCEPTION 'invalid_action';
  END IF;

  v_profile_table := CASE WHEN p_role_label = 'jobseeker' THEN 'jobseeker_profiles' ELSE 'employer_profiles' END;
  v_status_field := CASE WHEN p_role_label = 'jobseeker' THEN 'jobseeker_status' ELSE 'employer_status' END;

  IF p_action = 'approve' THEN
    IF p_role_label = 'jobseeker' THEN
      SELECT jsonb_build_object(
        'first_name', first_name,
        'surname', surname,
        'middle_name', middle_name,
        'vocational_training', vocational_training,
        'highest_education', highest_education,
        'school_name', school_name,
        'course_or_field', course_or_field,
        'professional_licenses', professional_licenses,
        'civil_service_eligibility', civil_service_eligibility,
        'work_experiences', work_experiences
      )
      INTO v_snapshot
      FROM public.jobseeker_profiles
      WHERE id = p_user_id;
    ELSE
      SELECT jsonb_build_object(
        'company_name', company_name,
        'tin', tin,
        'business_reg_number', business_reg_number,
        'owner_name', owner_name,
        'representative_name', representative_name
      )
      INTO v_snapshot
      FROM public.employer_profiles
      WHERE id = p_user_id;
    END IF;

    EXECUTE format(
      'UPDATE public.%I
       SET profile_modified_since_verification = false,
           verified_snapshot = COALESCE($2, ''{}''::jsonb),
           rejection_reason = '''',
           updated_at = $3
       WHERE id = $1',
      v_profile_table
    )
    USING p_user_id, v_snapshot, v_now;

    v_notification_title := 'Re-verification approved';
    v_notification_message := 'PESO staff approved your recent profile changes and refreshed your verified record.';

  ELSIF p_action = 'reject' THEN
    IF COALESCE(trim(p_reason), '') = '' THEN
      RAISE EXCEPTION 'reject_reason_required';
    END IF;

    EXECUTE format(
      'UPDATE public.%I
       SET rejection_reason = $2,
           updated_at = $3
       WHERE id = $1',
      v_profile_table
    )
    USING p_user_id, p_reason, v_now;

    v_notification_title := 'Re-verification needs changes';
    v_notification_message := format('PESO staff reviewed your recent profile changes and requested updates: %s', trim(p_reason));

  ELSE
    v_status_value := 'pending';

    UPDATE public.users
    SET is_verified = false,
        updated_at = v_now
    WHERE id = p_user_id;

    EXECUTE format(
      'UPDATE public.%I
       SET is_verified = false,
           profile_modified_since_verification = false,
           %I = $2,
           updated_at = $3
       WHERE id = $1',
      v_profile_table,
      v_status_field
    )
    USING p_user_id, v_status_value, v_now;

    v_notification_title := 'Verification revoked';
    v_notification_message := 'PESO staff revoked your verified status. Your account has returned to the verification queue for review.';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'profile_reverification',
    v_notification_title,
    v_notification_message,
    jsonb_build_object(
      'action', p_action,
      'role_label', p_role_label,
      'reason', COALESCE(p_reason, ''),
      'reviewed_by', v_admin_name,
      'reviewed_at', v_now
    )
  );

  INSERT INTO public.admin_notifications (
    recipient_admin_id,
    type,
    priority,
    title,
    message,
    reference_link,
    metadata
  )
  SELECT
    aa.user_id,
    'system_alert',
    CASE WHEN p_action = 'revoke' THEN 'high' ELSE 'medium' END,
    'Re-verification action completed',
    format('%s handled %s re-verification for user %s.', v_admin_name, p_action, p_user_id),
    '/admin',
    jsonb_build_object(
      'user_id', p_user_id,
      'role_label', p_role_label,
      'action', p_action,
      'reason', COALESCE(p_reason, '')
    )
  FROM public.admin_access aa;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_reverification_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_process_reverification(uuid, text, text, text) TO authenticated;

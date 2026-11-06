CREATE OR REPLACE FUNCTION public.verify_user_pin (
  p_user_id uuid,
  p_pin     text
)
  RETURNS TABLE (
    success   boolean,
    user_id   uuid,
    full_name text,
    role      text,
    message   text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_user public.app_users%ROWTYPE;
BEGIN
    -- Fetch active user record
    SELECT * INTO v_user
    FROM public.app_users
    WHERE id = p_user_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, 'User not found or account deactivated'::TEXT;
        RETURN;
    END IF;

    -- Verify the input PIN against stored bcrypt hash
    IF v_user.pin_hash = crypt(p_pin, v_user.pin_hash) THEN
        RETURN QUERY SELECT true, v_user.id, v_user.full_name, v_user.role, 'Authentication successful'::TEXT;
    ELSE
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, 'Invalid PIN code'::TEXT;
    END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."verify_user_pin"(uuid, text) TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."verify_user_pin"(uuid, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."verify_user_pin"(uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."verify_user_pin"(uuid, text) TO "postgres";

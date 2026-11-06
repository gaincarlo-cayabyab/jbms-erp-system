CREATE OR REPLACE FUNCTION public.create_app_user (
  p_full_name text,
  p_role      text,
  p_pin       text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_new_id UUID;
BEGIN
    INSERT INTO public.app_users (full_name, role, pin_hash)
    VALUES (
        p_full_name,
        p_role,
        crypt(p_pin, gen_salt('bf', 8))
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."create_app_user"(text, text, text) TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."create_app_user"(text, text, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."create_app_user"(text, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_app_user"(text, text, text) TO "postgres";

CREATE OR REPLACE FUNCTION public.get_users_by_role (
  p_role text
)
  RETURNS TABLE (
    id        uuid,
    full_name text,
    role      text
  )
  LANGUAGE sql
  SECURITY DEFINER
  AS $function$
    SELECT id, full_name, role
    FROM public.app_users
    WHERE role = p_role AND is_active = true
    ORDER BY full_name ASC;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_users_by_role"(text) TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."get_users_by_role"(text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_users_by_role"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_users_by_role"(text) TO "postgres";

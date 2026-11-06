CREATE TABLE "public"."app_users" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "full_name"  text                     NOT NULL,
  "role"       text                     NOT NULL,
  "pin_hash"   text                     NOT NULL,
  "is_active"  boolean                  DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "app_users_pkey" PRIMARY KEY (id),
  CONSTRAINT "app_users_role_check" CHECK ((role = ANY (ARRAY['Admin'::text, 'Manager'::text, 'Cashier'::text, 'Inventory'::text, 'Staff'::text])))
);

ALTER TABLE "public"."app_users"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."app_users" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."app_users" TO "service_role";

REVOKE ALL ON TABLE "public"."app_users" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."app_users" TO "postgres";

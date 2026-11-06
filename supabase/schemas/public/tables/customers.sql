CREATE TABLE "public"."customers" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name"           text                     NOT NULL,
  "contact_number" text,
  "email"          text,
  "address"        text,
  "credit_limit"   numeric(12,2)            NOT NULL DEFAULT 0.00,
  "balance"        numeric(12,2)            NOT NULL DEFAULT 0.00,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "customers_email_key" UNIQUE (email),
  CONSTRAINT "customers_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customers"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers: admins and managers can modify" ON "public"."customers"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Store_Manager'::text, 'Accountant'::text]))))));

CREATE POLICY "customers: allow anon insert dev" ON "public"."customers"
  FOR INSERT
  TO "anon"
  WITH CHECK (true);

CREATE POLICY "customers: allow anon read dev" ON "public"."customers"
  FOR SELECT
  TO "anon"
  USING (true);

CREATE POLICY "customers: allow anon update dev" ON "public"."customers"
  FOR UPDATE
  TO "anon"
  USING (true);

CREATE POLICY "customers: authenticated users can read" ON "public"."customers"
  FOR SELECT
  TO "authenticated"
  USING (true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customers" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customers" TO "service_role";

REVOKE ALL ON TABLE "public"."customers" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customers" TO "postgres";

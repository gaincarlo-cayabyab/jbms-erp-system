CREATE TABLE "public"."expenses" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "category"       text                     NOT NULL,
  "description"    text                     NOT NULL,
  "amount"         numeric(12,2)            NOT NULL DEFAULT 0.00,
  "payment_method" text                     NOT NULL DEFAULT 'Cash'::text,
  "date"           date                     NOT NULL DEFAULT CURRENT_DATE,
  "reference_no"   text,
  "branch"         text                     DEFAULT 'Main Branch'::text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "expenses_payment_method_check"
    CHECK ((payment_method = ANY (ARRAY['Cash'::text, 'GCash'::text, 'Maya'::text, 'Bank Transfer'::text, 'Cheque'::text, 'Credit Card'::text]))),
  CONSTRAINT "expenses_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."expenses"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_expenses_category ON public.expenses USING btree (category);

CREATE INDEX idx_expenses_date ON public.expenses USING btree (date);

CREATE POLICY "expenses: accountant insert" ON "public"."expenses"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Accountant'::text, 'Store_Manager'::text]))))));

CREATE POLICY "expenses: accountant update" ON "public"."expenses"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Accountant'::text]))))));

CREATE POLICY "expenses: admin delete" ON "public"."expenses"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'Admin'::text)))));

CREATE POLICY "expenses: allow anon delete dev" ON "public"."expenses"
  FOR DELETE
  TO "anon"
  USING (true);

CREATE POLICY "expenses: allow anon insert dev" ON "public"."expenses"
  FOR INSERT
  TO "anon"
  WITH CHECK (true);

CREATE POLICY "expenses: allow anon read dev" ON "public"."expenses"
  FOR SELECT
  TO "anon"
  USING (true);

CREATE POLICY "expenses: allow anon update dev" ON "public"."expenses"
  FOR UPDATE
  TO "anon"
  USING (true);

CREATE POLICY "expenses: authenticated read" ON "public"."expenses"
  FOR SELECT
  TO "authenticated"
  USING (true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "service_role";

REVOKE ALL ON TABLE "public"."expenses" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "postgres";

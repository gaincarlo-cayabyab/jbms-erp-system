CREATE TABLE "public"."payroll_records" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "staff_name"       text                     NOT NULL,
  "role"             text                     NOT NULL DEFAULT 'Production_Staff'::text,
  "branch"           text                     NOT NULL DEFAULT 'Main Branch'::text,
  "daily_rate"       numeric(12,2)            NOT NULL DEFAULT 610.00,
  "days_worked"      numeric(6,2)             NOT NULL DEFAULT 0.00,
  "overtime_hours"   numeric(6,2)             NOT NULL DEFAULT 0.00,
  "overtime_rate"    numeric(12,2)            NOT NULL DEFAULT 100.00,
  "deductions"       numeric(12,2)            NOT NULL DEFAULT 0.00,
  "total_net_pay"    numeric(12,2)            NOT NULL DEFAULT 0.00,
  "status"           text                     NOT NULL DEFAULT 'Pending'::text,
  "pay_period_start" date,
  "pay_period_end"   date,
  "payment_date"     date,
  "payment_method"   text                     NOT NULL DEFAULT 'Cash'::text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "payroll_records_payment_method_check" CHECK ((payment_method = ANY (ARRAY['Cash'::text, 'GCash'::text, 'Maya'::text, 'Bank Transfer'::text, 'Cheque'::text]))),
  CONSTRAINT "payroll_records_pkey" PRIMARY KEY (id),
  CONSTRAINT "payroll_records_status_check" CHECK ((status = ANY (ARRAY['Pending'::text, 'Processing'::text, 'Paid'::text, 'Cancelled'::text])))
);

ALTER TABLE "public"."payroll_records"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_payroll_staff_name ON public.payroll_records USING btree (staff_name);

CREATE INDEX idx_payroll_status ON public.payroll_records USING btree (status);

CREATE POLICY "payroll: admin manage" ON "public"."payroll_records"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Accountant'::text, 'Store_Manager'::text]))))));

CREATE POLICY "payroll: allow anon delete dev" ON "public"."payroll_records"
  FOR DELETE
  TO "anon"
  USING (true);

CREATE POLICY "payroll: allow anon insert dev" ON "public"."payroll_records"
  FOR INSERT
  TO "anon"
  WITH CHECK (true);

CREATE POLICY "payroll: allow anon read dev" ON "public"."payroll_records"
  FOR SELECT
  TO "anon"
  USING (true);

CREATE POLICY "payroll: allow anon update dev" ON "public"."payroll_records"
  FOR UPDATE
  TO "anon"
  USING (true);

CREATE POLICY "payroll: authenticated read" ON "public"."payroll_records"
  FOR SELECT
  TO "authenticated"
  USING (true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payroll_records" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payroll_records" TO "service_role";

REVOKE ALL ON TABLE "public"."payroll_records" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payroll_records" TO "postgres";

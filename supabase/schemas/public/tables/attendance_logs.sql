CREATE TABLE "public"."attendance_logs" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "staff_name"     text                     NOT NULL,
  "branch"         text                     NOT NULL DEFAULT 'Main Branch'::text,
  "date"           date                     NOT NULL DEFAULT CURRENT_DATE,
  "time_in"        text,
  "time_out"       text,
  "status"         text                     NOT NULL DEFAULT 'Present'::text,
  "overtime_hours" numeric(4,2)             NOT NULL DEFAULT 0.00,
  "notes"          text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "attendance_logs_pkey" PRIMARY KEY (id),
  CONSTRAINT "attendance_logs_status_check" CHECK ((status = ANY (ARRAY['Present'::text, 'Late'::text, 'Half_Day'::text, 'Absent'::text, 'On_Leave'::text])))
);

ALTER TABLE "public"."attendance_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_attendance_date ON public.attendance_logs USING btree (date);

CREATE INDEX idx_attendance_staff_name ON public.attendance_logs USING btree (staff_name);

CREATE POLICY "attendance: allow anon delete dev" ON "public"."attendance_logs"
  FOR DELETE
  TO "anon"
  USING (true);

CREATE POLICY "attendance: allow anon insert dev" ON "public"."attendance_logs"
  FOR INSERT
  TO "anon"
  WITH CHECK (true);

CREATE POLICY "attendance: allow anon read dev" ON "public"."attendance_logs"
  FOR SELECT
  TO "anon"
  USING (true);

CREATE POLICY "attendance: allow anon update dev" ON "public"."attendance_logs"
  FOR UPDATE
  TO "anon"
  USING (true);

CREATE POLICY "attendance: authenticated read" ON "public"."attendance_logs"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "attendance: staff manage" ON "public"."attendance_logs"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Store_Manager'::text, 'Accountant'::text, 'Production_Staff'::text]))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."attendance_logs" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."attendance_logs" TO "service_role";

REVOKE ALL ON TABLE "public"."attendance_logs" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."attendance_logs" TO "postgres";

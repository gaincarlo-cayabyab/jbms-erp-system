CREATE TABLE "public"."job_orders" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "job_number"         text                     NOT NULL,
  "sales_order_id"     uuid,
  "production_area"    text,
  "assigned_worker_id" uuid,
  "stage_status"       text                     NOT NULL DEFAULT 'Queued'::text,
  "deadline"           date,
  "artwork_url"        text,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "job_orders_job_number_key" UNIQUE (job_number),
  CONSTRAINT "job_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "job_orders_stage_status_check"
    CHECK
    ((stage_status = ANY (ARRAY['Queued'::text, 'Pending'::text, 'Pre_Press'::text, 'Printing'::text, 'In_Production'::text, 'Finishing'::text, 'Quality_Check'::text, 'Done'::text,
    'Completed'::text, 'Cancelled'::text]))),
  CONSTRAINT "job_orders_assigned_worker_id_fkey" FOREIGN KEY (assigned_worker_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT "job_orders_sales_order_id_fkey" FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE SET NULL
);

ALTER TABLE "public"."job_orders"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_job_orders_sales_order ON public.job_orders USING btree (sales_order_id);

CREATE INDEX idx_job_orders_stage ON public.job_orders USING btree (stage_status);

CREATE INDEX idx_job_orders_worker ON public.job_orders USING btree (assigned_worker_id);

CREATE POLICY "job_orders: allow anon insert dev" ON "public"."job_orders"
  FOR INSERT
  TO "anon"
  WITH CHECK (true);

CREATE POLICY "job_orders: allow anon read dev" ON "public"."job_orders"
  FOR SELECT
  TO "anon"
  USING (true);

CREATE POLICY "job_orders: allow anon update dev" ON "public"."job_orders"
  FOR UPDATE
  TO "anon"
  USING (true);

CREATE POLICY "job_orders: authenticated users can read" ON "public"."job_orders"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "job_orders: staff can modify" ON "public"."job_orders"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Store_Manager'::text, 'Production_Staff'::text]))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."job_orders" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."job_orders" TO "service_role";

REVOKE ALL ON TABLE "public"."job_orders" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."job_orders" TO "postgres";

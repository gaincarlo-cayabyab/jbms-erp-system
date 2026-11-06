CREATE TABLE "public"."sales_orders" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "order_number"   text                     NOT NULL,
  "customer_id"    uuid,
  "total_amount"   numeric(12,2)            NOT NULL DEFAULT 0.00,
  "payment_status" text                     NOT NULL DEFAULT 'Pending'::text,
  "order_status"   text                     NOT NULL DEFAULT 'Draft'::text,
  "branch"         text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL,
  CONSTRAINT "sales_orders_order_number_key" UNIQUE (order_number),
  CONSTRAINT "sales_orders_order_status_check"
    CHECK
    ((order_status = ANY (ARRAY['Draft'::text, 'Pending'::text, 'Approved'::text, 'Invoiced'::text, 'Confirmed'::text, 'In_Production'::text, 'Ready'::text, 'Delivered'::text,
    'Cancelled'::text]))),
  CONSTRAINT "sales_orders_payment_status_check" CHECK ((payment_status = ANY (ARRAY['Pending'::text, 'Partial'::text, 'Paid'::text, 'Overdue'::text]))),
  CONSTRAINT "sales_orders_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."sales_orders"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_sales_orders_customer ON public.sales_orders USING btree (customer_id);

CREATE INDEX idx_sales_orders_payment ON public.sales_orders USING btree (payment_status);

CREATE INDEX idx_sales_orders_status ON public.sales_orders USING btree (order_status);

CREATE POLICY "sales_orders: allow anon insert dev" ON "public"."sales_orders"
  FOR INSERT
  TO "anon"
  WITH CHECK (true);

CREATE POLICY "sales_orders: allow anon read dev" ON "public"."sales_orders"
  FOR SELECT
  TO "anon"
  USING (true);

CREATE POLICY "sales_orders: allow anon update dev" ON "public"."sales_orders"
  FOR UPDATE
  TO "anon"
  USING (true);

CREATE POLICY "sales_orders: authenticated users can read" ON "public"."sales_orders"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "sales_orders: staff can modify" ON "public"."sales_orders"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Store_Manager'::text, 'Accountant'::text]))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sales_orders" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sales_orders" TO "service_role";

REVOKE ALL ON TABLE "public"."sales_orders" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sales_orders" TO "postgres";

CREATE TABLE "public"."products_and_inventory" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "sku"            text                     NOT NULL,
  "item_name"      text                     NOT NULL,
  "category"       text,
  "unit_price"     numeric(12,2)            NOT NULL DEFAULT 0.00,
  "cost_price"     numeric(12,2)            NOT NULL DEFAULT 0.00,
  "stock_quantity" integer                  NOT NULL DEFAULT 0,
  "reorder_level"  integer                  NOT NULL DEFAULT 10,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "products_and_inventory_pkey" PRIMARY KEY (id),
  CONSTRAINT "products_and_inventory_sku_key" UNIQUE (sku)
);

ALTER TABLE "public"."products_and_inventory"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_inventory_stock_quantity ON public.products_and_inventory USING btree (stock_quantity);

CREATE POLICY "inventory: admin delete" ON "public"."products_and_inventory"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'Admin'::text)))));

CREATE POLICY "inventory: admins and managers can modify" ON "public"."products_and_inventory"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Store_Manager'::text]))))));

CREATE POLICY "inventory: allow anon delete dev" ON "public"."products_and_inventory"
  FOR DELETE
  TO "anon"
  USING (true);

CREATE POLICY "inventory: allow anon insert dev" ON "public"."products_and_inventory"
  FOR INSERT
  TO "anon"
  WITH CHECK (true);

CREATE POLICY "inventory: allow anon read dev" ON "public"."products_and_inventory"
  FOR SELECT
  TO "anon"
  USING (true);

CREATE POLICY "inventory: allow anon update dev" ON "public"."products_and_inventory"
  FOR UPDATE
  TO "anon"
  USING (true);

CREATE POLICY "inventory: authenticated read" ON "public"."products_and_inventory"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "inventory: authenticated users can read" ON "public"."products_and_inventory"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "inventory: manager insert" ON "public"."products_and_inventory"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Store_Manager'::text]))))));

CREATE POLICY "inventory: staff update" ON "public"."products_and_inventory"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['Admin'::text, 'Store_Manager'::text, 'Production_Staff'::text]))))));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."products_and_inventory" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."products_and_inventory" TO "service_role";

REVOKE ALL ON TABLE "public"."products_and_inventory" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."products_and_inventory" TO "postgres";

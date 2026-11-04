-- ============================================================
-- JBMS ERP System — Initial Database Schema
-- Migration: 01_initial_schema.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- TABLE: profiles
-- Links to Supabase auth.users. Stores role and branch info.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'Production_Staff'
                  CHECK (role IN ('Admin', 'Store_Manager', 'Production_Staff', 'Accountant')),
  branch        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can only read/update their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ----------------------------------------------------------------
-- TABLE: customers
-- CRM table for customer accounts and credit management.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  contact_number  TEXT,
  email           TEXT UNIQUE,
  address         TEXT,
  credit_limit    NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  balance         NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers: authenticated users can read"
  ON public.customers FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "customers: admins and managers can modify"
  ON public.customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('Admin', 'Store_Manager', 'Accountant')
    )
  );

-- ----------------------------------------------------------------
-- TABLE: products_and_inventory
-- Core product catalog with stock tracking.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products_and_inventory (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku             TEXT UNIQUE NOT NULL,
  item_name       TEXT NOT NULL,
  category        TEXT,
  unit_price      NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  cost_price      NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  stock_quantity  INTEGER NOT NULL DEFAULT 0,
  reorder_level   INTEGER NOT NULL DEFAULT 10,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products_and_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory: authenticated users can read"
  ON public.products_and_inventory FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "inventory: admins and managers can modify"
  ON public.products_and_inventory FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('Admin', 'Store_Manager')
    )
  );

-- ----------------------------------------------------------------
-- TABLE: sales_orders
-- Tracks customer orders across branches with payment/status.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number    TEXT UNIQUE NOT NULL,
  customer_id     UUID REFERENCES public.customers (id) ON DELETE SET NULL,
  total_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_status  TEXT NOT NULL DEFAULT 'Pending'
                    CHECK (payment_status IN ('Pending', 'Partial', 'Paid', 'Overdue')),
  order_status    TEXT NOT NULL DEFAULT 'Draft'
                    CHECK (order_status IN ('Draft', 'Confirmed', 'In_Production', 'Ready', 'Delivered', 'Cancelled')),
  branch          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_orders: authenticated users can read"
  ON public.sales_orders FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "sales_orders: staff can modify"
  ON public.sales_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('Admin', 'Store_Manager', 'Accountant')
    )
  );

-- ----------------------------------------------------------------
-- TABLE: job_orders
-- Production/manufacturing jobs linked to sales orders.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_number        TEXT UNIQUE NOT NULL,
  sales_order_id    UUID REFERENCES public.sales_orders (id) ON DELETE SET NULL,
  production_area   TEXT,
  assigned_worker_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  stage_status      TEXT NOT NULL DEFAULT 'Queued'
                      CHECK (stage_status IN ('Queued', 'Pre_Press', 'Printing', 'Finishing', 'Quality_Check', 'Done', 'Cancelled')),
  deadline          DATE,
  artwork_url       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.job_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_orders: authenticated users can read"
  ON public.job_orders FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "job_orders: staff can modify"
  ON public.job_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('Admin', 'Store_Manager', 'Production_Staff')
    )
  );

-- ----------------------------------------------------------------
-- Indexes for common query patterns
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer      ON public.sales_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status        ON public.sales_orders (order_status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_payment       ON public.sales_orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_job_orders_sales_order     ON public.job_orders (sales_order_id);
CREATE INDEX IF NOT EXISTS idx_job_orders_worker          ON public.job_orders (assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_job_orders_stage           ON public.job_orders (stage_status);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_quantity   ON public.products_and_inventory (stock_quantity);


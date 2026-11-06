-- ============================================================
-- Supabase Cloud Full Database Backup (Schema + DDL + Data)
-- Project Ref: wcviadvulpkzkzqwnrdb (jbms-erp)
-- Timestamp: 2026-11-06T03:48:56.800Z
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Migration File: 01_initial_schema.sql
-- ============================================================
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



-- ============================================================
-- Migration File: 02_crm_dev_policies.sql
-- ============================================================
-- ============================================================
-- Migration: 02_crm_dev_policies.sql
-- Development policies allowing public/anon access for testing
-- Execute this in the Supabase SQL Editor if testing without Auth.
-- ============================================================

-- Allow anon users to read customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'customers: allow anon read dev'
  ) THEN
    CREATE POLICY "customers: allow anon read dev"
      ON public.customers FOR SELECT
      TO anon USING (TRUE);
  END IF;
END $$;

-- Allow anon users to insert new customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'customers: allow anon insert dev'
  ) THEN
    CREATE POLICY "customers: allow anon insert dev"
      ON public.customers FOR INSERT
      TO anon WITH CHECK (TRUE);
  END IF;
END $$;

-- Allow anon users to update customer records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'customers: allow anon update dev'
  ) THEN
    CREATE POLICY "customers: allow anon update dev"
      ON public.customers FOR UPDATE
      TO anon USING (TRUE);
  END IF;
END $$;



-- ============================================================
-- Migration File: 03_sales_orders_policies.sql
-- ============================================================
-- ============================================================
-- Migration: 03_sales_orders_policies.sql
-- Development policies and status update for Sales Orders & Quotations
-- Run in Supabase SQL Editor if testing in dev mode.
-- ============================================================

-- 1. Relax or expand check constraint on sales_orders.order_status
-- to include 'Pending', 'Approved', and 'Invoiced' alongside existing values.
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.sales_orders 
    DROP CONSTRAINT IF EXISTS sales_orders_order_status_check;

  -- Add updated constraint allowing Draft, Pending, Approved, Invoiced, Confirmed, In_Production, Ready, Delivered, Cancelled
  ALTER TABLE public.sales_orders
    ADD CONSTRAINT sales_orders_order_status_check
    CHECK (order_status IN ('Draft', 'Pending', 'Approved', 'Invoiced', 'Confirmed', 'In_Production', 'Ready', 'Delivered', 'Cancelled'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint update skipped: %', SQLERRM;
END $$;

-- 2. Allow anon users to read and insert sales_orders for development
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales_orders' AND policyname = 'sales_orders: allow anon read dev'
  ) THEN
    CREATE POLICY "sales_orders: allow anon read dev"
      ON public.sales_orders FOR SELECT
      TO anon USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales_orders' AND policyname = 'sales_orders: allow anon insert dev'
  ) THEN
    CREATE POLICY "sales_orders: allow anon insert dev"
      ON public.sales_orders FOR INSERT
      TO anon WITH CHECK (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales_orders' AND policyname = 'sales_orders: allow anon update dev'
  ) THEN
    CREATE POLICY "sales_orders: allow anon update dev"
      ON public.sales_orders FOR UPDATE
      TO anon USING (TRUE);
  END IF;
END $$;



-- ============================================================
-- Migration File: 04_job_orders_policies.sql
-- ============================================================
-- ============================================================
-- Migration: 04_job_orders_policies.sql
-- Development policies and status update for Production Queue & Job Orders
-- Run in Supabase SQL Editor if testing in dev mode without Auth.
-- ============================================================

-- 1. Relax or expand check constraint on job_orders.stage_status
DO $$
BEGIN
  ALTER TABLE public.job_orders 
    DROP CONSTRAINT IF EXISTS job_orders_stage_status_check;

  ALTER TABLE public.job_orders
    ADD CONSTRAINT job_orders_stage_status_check
    CHECK (stage_status IN ('Queued', 'Pending', 'Pre_Press', 'Printing', 'In_Production', 'Finishing', 'Quality_Check', 'Done', 'Completed', 'Cancelled'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint update skipped: %', SQLERRM;
END $$;

-- 2. Allow anon users to read, insert, and update job_orders for development
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'job_orders' AND policyname = 'job_orders: allow anon read dev'
  ) THEN
    CREATE POLICY "job_orders: allow anon read dev"
      ON public.job_orders FOR SELECT
      TO anon USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'job_orders' AND policyname = 'job_orders: allow anon insert dev'
  ) THEN
    CREATE POLICY "job_orders: allow anon insert dev"
      ON public.job_orders FOR INSERT
      TO anon WITH CHECK (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'job_orders' AND policyname = 'job_orders: allow anon update dev'
  ) THEN
    CREATE POLICY "job_orders: allow anon update dev"
      ON public.job_orders FOR UPDATE
      TO anon USING (TRUE);
  END IF;
END $$;



-- ============================================================
-- Migration File: 05_inventory_policies.sql
-- ============================================================
-- ============================================================
-- Migration: 05_inventory_policies.sql
-- Full CRUD RLS Policies for Multi-Store Inventory & Products
-- ============================================================

-- Ensure Row Level Security is active
ALTER TABLE public.products_and_inventory ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 1. AUTHENTICATED USER POLICIES (Production)
-- ------------------------------------------------------------

-- Read Policy: All authenticated employees can view product catalog and stock levels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products_and_inventory' AND policyname = 'inventory: authenticated read'
  ) THEN
    CREATE POLICY "inventory: authenticated read"
      ON public.products_and_inventory FOR SELECT
      TO authenticated USING (TRUE);
  END IF;
END $$;

-- Insert Policy: Admins and Store Managers can add new catalog items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products_and_inventory' AND policyname = 'inventory: manager insert'
  ) THEN
    CREATE POLICY "inventory: manager insert"
      ON public.products_and_inventory FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('Admin', 'Store_Manager')
        )
      );
  END IF;
END $$;

-- Update Policy: Admins, Store Managers, and Staff can update products & stock levels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products_and_inventory' AND policyname = 'inventory: staff update'
  ) THEN
    CREATE POLICY "inventory: staff update"
      ON public.products_and_inventory FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('Admin', 'Store_Manager', 'Production_Staff')
        )
      );
  END IF;
END $$;

-- Delete Policy: Admins only can delete catalog items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products_and_inventory' AND policyname = 'inventory: admin delete'
  ) THEN
    CREATE POLICY "inventory: admin delete"
      ON public.products_and_inventory FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
            AND role = 'Admin'
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. DEVELOPMENT / ANON POLICIES (Testing without Auth)
-- ------------------------------------------------------------

-- Allow anon read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products_and_inventory' AND policyname = 'inventory: allow anon read dev'
  ) THEN
    CREATE POLICY "inventory: allow anon read dev"
      ON public.products_and_inventory FOR SELECT
      TO anon USING (TRUE);
  END IF;
END $$;

-- Allow anon insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products_and_inventory' AND policyname = 'inventory: allow anon insert dev'
  ) THEN
    CREATE POLICY "inventory: allow anon insert dev"
      ON public.products_and_inventory FOR INSERT
      TO anon WITH CHECK (TRUE);
  END IF;
END $$;

-- Allow anon update (for stock adjustments and product edits)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products_and_inventory' AND policyname = 'inventory: allow anon update dev'
  ) THEN
    CREATE POLICY "inventory: allow anon update dev"
      ON public.products_and_inventory FOR UPDATE
      TO anon USING (TRUE);
  END IF;
END $$;

-- Allow anon delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products_and_inventory' AND policyname = 'inventory: allow anon delete dev'
  ) THEN
    CREATE POLICY "inventory: allow anon delete dev"
      ON public.products_and_inventory FOR DELETE
      TO anon USING (TRUE);
  END IF;
END $$;



-- ============================================================
-- Migration File: 06_financials_policies.sql
-- ============================================================
-- ============================================================
-- Migration: 06_financials_policies.sql
-- Table & Full CRUD RLS Policies for Financials & Expenses
-- ============================================================

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category        TEXT NOT NULL,
  description     TEXT NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method  TEXT NOT NULL DEFAULT 'Cash'
                    CHECK (payment_method IN ('Cash', 'GCash', 'Maya', 'Bank Transfer', 'Cheque', 'Credit Card')),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_no    TEXT,
  branch          TEXT DEFAULT 'Main Branch',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 2. Indexes for fast date and category reporting
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses (category);

-- ------------------------------------------------------------
-- 3. PRODUCTION AUTHENTICATED POLICIES
-- ------------------------------------------------------------

-- Read Policy: Authenticated staff can view expenses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'expenses' AND policyname = 'expenses: authenticated read'
  ) THEN
    CREATE POLICY "expenses: authenticated read"
      ON public.expenses FOR SELECT
      TO authenticated USING (TRUE);
  END IF;
END $$;

-- Insert Policy: Admins and Accountants can log expenses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'expenses' AND policyname = 'expenses: accountant insert'
  ) THEN
    CREATE POLICY "expenses: accountant insert"
      ON public.expenses FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('Admin', 'Accountant', 'Store_Manager')
        )
      );
  END IF;
END $$;

-- Update Policy: Admins and Accountants can edit expenses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'expenses' AND policyname = 'expenses: accountant update'
  ) THEN
    CREATE POLICY "expenses: accountant update"
      ON public.expenses FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('Admin', 'Accountant')
        )
      );
  END IF;
END $$;

-- Delete Policy: Admins only can delete expense entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'expenses' AND policyname = 'expenses: admin delete'
  ) THEN
    CREATE POLICY "expenses: admin delete"
      ON public.expenses FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
            AND role = 'Admin'
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. DEVELOPMENT / ANON POLICIES (Testing without Auth)
-- ------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'expenses' AND policyname = 'expenses: allow anon read dev'
  ) THEN
    CREATE POLICY "expenses: allow anon read dev"
      ON public.expenses FOR SELECT
      TO anon USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'expenses' AND policyname = 'expenses: allow anon insert dev'
  ) THEN
    CREATE POLICY "expenses: allow anon insert dev"
      ON public.expenses FOR INSERT
      TO anon WITH CHECK (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'expenses' AND policyname = 'expenses: allow anon update dev'
  ) THEN
    CREATE POLICY "expenses: allow anon update dev"
      ON public.expenses FOR UPDATE
      TO anon USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'expenses' AND policyname = 'expenses: allow anon delete dev'
  ) THEN
    CREATE POLICY "expenses: allow anon delete dev"
      ON public.expenses FOR DELETE
      TO anon USING (TRUE);
  END IF;
END $$;



-- ============================================================
-- Migration File: 07_payroll_policies.sql
-- ============================================================
-- ============================================================
-- Migration: 07_payroll_policies.sql
-- Schema and RLS Policies for Staff Attendance & Payroll Records
-- ============================================================

-- 1. Create payroll_records table
CREATE TABLE IF NOT EXISTS public.payroll_records (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_name          TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'Production_Staff',
  branch              TEXT NOT NULL DEFAULT 'Main Branch',
  daily_rate          NUMERIC(12, 2) NOT NULL DEFAULT 610.00,
  days_worked         NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  overtime_hours      NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  overtime_rate       NUMERIC(12, 2) NOT NULL DEFAULT 100.00,
  deductions          NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_net_pay       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status              TEXT NOT NULL DEFAULT 'Pending'
                        CHECK (status IN ('Pending', 'Processing', 'Paid', 'Cancelled')),
  pay_period_start    DATE,
  pay_period_end      DATE,
  payment_date        DATE,
  payment_method      TEXT NOT NULL DEFAULT 'Cash'
                        CHECK (payment_method IN ('Cash', 'GCash', 'Maya', 'Bank Transfer', 'Cheque')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create attendance_logs table
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_name          TEXT NOT NULL,
  branch              TEXT NOT NULL DEFAULT 'Main Branch',
  date                DATE NOT NULL DEFAULT CURRENT_DATE,
  time_in             TEXT,
  time_out            TEXT,
  status              TEXT NOT NULL DEFAULT 'Present'
                        CHECK (status IN ('Present', 'Late', 'Half_Day', 'Absent', 'On_Leave')),
  overtime_hours      NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_staff_name ON public.payroll_records (staff_name);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON public.payroll_records (status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_logs (date);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_name ON public.attendance_logs (staff_name);

-- ------------------------------------------------------------
-- 3. PRODUCTION AUTHENTICATED POLICIES
-- ------------------------------------------------------------

-- Attendance read: Authenticated users can view attendance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attendance_logs' AND policyname = 'attendance: authenticated read'
  ) THEN
    CREATE POLICY "attendance: authenticated read"
      ON public.attendance_logs FOR SELECT
      TO authenticated USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attendance_logs' AND policyname = 'attendance: staff manage'
  ) THEN
    CREATE POLICY "attendance: staff manage"
      ON public.attendance_logs FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('Admin', 'Store_Manager', 'Accountant', 'Production_Staff')
        )
      );
  END IF;
END $$;

-- Payroll read: Authenticated staff can read payroll
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payroll_records' AND policyname = 'payroll: authenticated read'
  ) THEN
    CREATE POLICY "payroll: authenticated read"
      ON public.payroll_records FOR SELECT
      TO authenticated USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payroll_records' AND policyname = 'payroll: admin manage'
  ) THEN
    CREATE POLICY "payroll: admin manage"
      ON public.payroll_records FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('Admin', 'Accountant', 'Store_Manager')
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. DEVELOPMENT / ANON POLICIES (Testing without Auth)
-- ------------------------------------------------------------

DO $$
BEGIN
  -- Attendance logs anon policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attendance_logs' AND policyname = 'attendance: allow anon read dev'
  ) THEN
    CREATE POLICY "attendance: allow anon read dev"
      ON public.attendance_logs FOR SELECT TO anon USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attendance_logs' AND policyname = 'attendance: allow anon insert dev'
  ) THEN
    CREATE POLICY "attendance: allow anon insert dev"
      ON public.attendance_logs FOR INSERT TO anon WITH CHECK (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attendance_logs' AND policyname = 'attendance: allow anon update dev'
  ) THEN
    CREATE POLICY "attendance: allow anon update dev"
      ON public.attendance_logs FOR UPDATE TO anon USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attendance_logs' AND policyname = 'attendance: allow anon delete dev'
  ) THEN
    CREATE POLICY "attendance: allow anon delete dev"
      ON public.attendance_logs FOR DELETE TO anon USING (TRUE);
  END IF;

  -- Payroll records anon policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payroll_records' AND policyname = 'payroll: allow anon read dev'
  ) THEN
    CREATE POLICY "payroll: allow anon read dev"
      ON public.payroll_records FOR SELECT TO anon USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payroll_records' AND policyname = 'payroll: allow anon insert dev'
  ) THEN
    CREATE POLICY "payroll: allow anon insert dev"
      ON public.payroll_records FOR INSERT TO anon WITH CHECK (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payroll_records' AND policyname = 'payroll: allow anon update dev'
  ) THEN
    CREATE POLICY "payroll: allow anon update dev"
      ON public.payroll_records FOR UPDATE TO anon USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payroll_records' AND policyname = 'payroll: allow anon delete dev'
  ) THEN
    CREATE POLICY "payroll: allow anon delete dev"
      ON public.payroll_records FOR DELETE TO anon USING (TRUE);
  END IF;
END $$;



-- ============================================================
-- Migration File: 08_seed_enterprise_users.sql
-- ============================================================
-- Migration 08: Clean and Seed JAPA Global Enterprise Users with Secured PINs

TRUNCATE TABLE public.app_users CASCADE;

-- Insert Administrators
INSERT INTO public.app_users (full_name, role, pin_hash, is_active)
VALUES
  ('Gain Carlo (Admin)', 'Admin', crypt('7492', gen_salt('bf', 8)), true),
  ('Belinda Dee (CEO)', 'Admin', crypt('8315', gen_salt('bf', 8)), true);

-- Insert Store Managers (Dagupan & Manila)
INSERT INTO public.app_users (full_name, role, pin_hash, is_active)
VALUES
  ('Store Manager — Dagupan (DAG)', 'Manager', crypt('6284', gen_salt('bf', 8)), true),
  ('Store Manager — Manila (MNL)', 'Manager', crypt('9147', gen_salt('bf', 8)), true);

-- Insert Cashier POS (Dagupan & Manila)
INSERT INTO public.app_users (full_name, role, pin_hash, is_active)
VALUES
  ('Cashier POS — Dagupan (DAG)', 'Cashier', crypt('5829', gen_salt('bf', 8)), true),
  ('Cashier POS — Manila (MNL)', 'Cashier', crypt('3716', gen_salt('bf', 8)), true);

-- Insert Inventory Officers (Dagupan & Manila)
INSERT INTO public.app_users (full_name, role, pin_hash, is_active)
VALUES
  ('Inventory Officer — Dagupan (DAG)', 'Inventory', crypt('4938', gen_salt('bf', 8)), true),
  ('Inventory Officer — Manila (MNL)', 'Inventory', crypt('8521', gen_salt('bf', 8)), true);

-- Insert Production Staff (Dagupan & Manila)
INSERT INTO public.app_users (full_name, role, pin_hash, is_active)
VALUES
  ('Production Staff — Dagupan (DAG)', 'Staff', crypt('2694', gen_salt('bf', 8)), true),
  ('Production Staff — Manila (MNL)', 'Staff', crypt('7153', gen_salt('bf', 8)), true);




-- ============================================================
-- LIVE DATA RECORDS DUMP
-- ============================================================

-- ============================================================
-- Supabase Cloud Live Database Data Backup
-- Project Ref: wcviadvulpkzkzqwnrdb (jbms-erp)
-- Timestamp: 2026-11-06T03:48:54.682Z
-- ============================================================

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET row_security = off;

-- ------------------------------------------------------------
-- Table Data: public.profiles (2 rows)
-- ------------------------------------------------------------
INSERT INTO public.profiles (id, full_name, role, branch, created_at) VALUES ('2f841124-b741-404e-aef6-d2ab6168efd1', 'Lead Administrator', 'Production_Staff', NULL, '2026-11-05T02:12:31.457348+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, full_name, role, branch, created_at) VALUES ('4b8f72c1-5e88-4192-a2bb-609948571285', NULL, 'Production_Staff', NULL, '2026-11-06T02:51:00.784316+00:00') ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Table Data: public.customers (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.products_and_inventory (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.sales_orders (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.job_orders (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.expenses (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.attendance_logs (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.payroll_records (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.app_users (10 rows)
-- ------------------------------------------------------------
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('2e7592c5-2e8c-4449-83f8-10cdcb2d06c6', 'Gain Carlo (Admin)', 'Admin', '$2a$08$5ZRooikMW1WWZdHnYoemNOWkzZXl9wh1f5ge2Ddac9J5mT12Y/tH6', true, '2026-11-06T03:06:38.155395+00:00', '2026-11-06T03:06:38.155395+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('6ed88c01-453e-4036-9cfe-e3cabb194cba', 'Belinda Dee (CEO)', 'Admin', '$2a$08$L2G6cycHw0XgIdC9t1/vu.Oeb.TYs1AOVHAeRmmrFhJCl5HKt9106', true, '2026-11-06T03:06:38.466191+00:00', '2026-11-06T03:06:38.466191+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('c17c2550-000a-4aac-afa3-dda5bb03d1fe', 'Store Manager — Dagupan (DAG)', 'Manager', '$2a$08$ECKNBOOIR89sF7QHV2acd.JWztD6TaGIbNkItf4ojOou/L/I0dAiK', true, '2026-11-06T03:06:38.886798+00:00', '2026-11-06T03:06:38.886798+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('b603e120-dece-4cac-885a-1fff11bd93d3', 'Store Manager — Manila (MNL)', 'Manager', '$2a$08$DxzCHKMvRnyPn8eA.p5eiOx5SUPf2rVcUX2NR.g2ABBYwHTKdVY5G', true, '2026-11-06T03:06:39.106392+00:00', '2026-11-06T03:06:39.106392+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('e32dac5f-c442-4659-9309-07434b7ed51c', 'Cashier POS — Dagupan (DAG)', 'Cashier', '$2a$08$wgQVcOqWK/S7hNFL0QES0OdQJoYYgTmZFg8itXGo0my57N5jaXq1G', true, '2026-11-06T03:06:39.287254+00:00', '2026-11-06T03:06:39.287254+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('2baa314b-1af9-4593-89bb-f57feb4abc07', 'Cashier POS — Manila (MNL)', 'Cashier', '$2a$08$SnLyXnm8Xx3VAO.L0gdpuOMUNZ4OqToCQe3ICqjxEYSu1zXBxosN.', true, '2026-11-06T03:06:39.458033+00:00', '2026-11-06T03:06:39.458033+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('7c2a66d2-0308-4631-b843-98d53029ab9e', 'Inventory Officer — Dagupan (DAG)', 'Inventory', '$2a$08$PXCjCtOWMKMHfvO7dR.tNeaISrBGrAvVaCZE.GoJStXlxe6rdy1Ri', true, '2026-11-06T03:06:39.689525+00:00', '2026-11-06T03:06:39.689525+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('e7004842-5ccf-4ac0-9f12-7ebb34262143', 'Inventory Officer — Manila (MNL)', 'Inventory', '$2a$08$OqMnE401PnqoD4suWcqGA.ryvi/H4.1AyOR4zUpP5Mzy0M8M/8IHu', true, '2026-11-06T03:06:39.99607+00:00', '2026-11-06T03:06:39.99607+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('73e5af98-ad35-46af-bb5e-dc7e0e02f0db', 'Production Staff — Dagupan (DAG)', 'Staff', '$2a$08$utlibDB7stPkdCC.gtphluQ4Byyzi3mJqNAy6yrSMU57ABTW5G6ym', true, '2026-11-06T03:06:40.217086+00:00', '2026-11-06T03:06:40.217086+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('8414b40f-d834-4e39-b7a7-4a0298cf8159', 'Production Staff — Manila (MNL)', 'Staff', '$2a$08$aWD9oXd7YesxKjGZ/CkmzOt122r6KHdaU7LXK2rntO7OwW7Oz1PCi', true, '2026-11-06T03:06:40.55964+00:00', '2026-11-06T03:06:40.55964+00:00') ON CONFLICT DO NOTHING;


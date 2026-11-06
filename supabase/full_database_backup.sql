-- ============================================================
-- Supabase Cloud Full Database Backup (Schema + DDL + Data)
-- Project Ref: wcviadvulpkzkzqwnrdb (jbms-erp)
-- Timestamp: 2026-11-06T07:04:30.235Z
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
  ('Gain Carlo (Admin)', 'Admin', crypt('0820', gen_salt('bf', 8)), true),
  ('Belinda Dee (CEO)', 'Admin', crypt('1888', gen_salt('bf', 8)), true);

-- Insert Store Managers (Dagupan & Manila)
INSERT INTO public.app_users (full_name, role, pin_hash, is_active)
VALUES
  ('Store Manager — Dagupan (DAG)', 'Manager', crypt('6284', gen_salt('bf', 8)), true),
  ('Store Manager — Manila (MNL)', 'Manager', crypt('9147', gen_salt('bf', 8)), true);

-- Insert Cashier POS (Dagupan & Manila) and Dagupan Shift Staff
INSERT INTO public.app_users (full_name, role, pin_hash, is_active)
VALUES
  ('Cashier POS — Dagupan (DAG)', 'Cashier', crypt('5829', gen_salt('bf', 8)), true),
  ('JAPA Pearly', 'Cashier', crypt('8168', gen_salt('bf', 8)), true),
  ('JAPA Ivan', 'Cashier', crypt('7168', gen_salt('bf', 8)), true),
  ('JAPA Lanie', 'Cashier', crypt('0119', gen_salt('bf', 8)), true),
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
-- Migration File: 09_multi_branch_architecture.sql
-- ============================================================
-- ============================================================
-- Migration: 09_multi_branch_architecture.sql
-- Multi-Branch ERP Architecture, Inter-Branch STO & Audit Logs
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- 1. Branch Master Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    contact_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Dagupan Main and Manila Branch
INSERT INTO public.branches (id, name, address, contact_number, is_active)
VALUES
    ('dagupan_main', 'JAPA Dagupan (Main Branch)', 'AB Fernandez Ave, Downtown District, Dagupan City, Pangasinan', '(075) 522-1234', true),
    ('manila_branch', 'JAPA Manila Operations Hub', 'Morayta St, Sampaloc, Manila, Metro Manila', '(02) 8123-4567', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    contact_number = EXCLUDED.contact_number,
    is_active = EXCLUDED.is_active;

-- ------------------------------------------------------------
-- 2. Associate Branch to App Users & Profiles
-- ------------------------------------------------------------
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS branch_id VARCHAR(32) REFERENCES public.branches(id);

-- Update branch assignment for enterprise app_users
UPDATE public.app_users SET branch_id = 'dagupan_main' WHERE full_name LIKE '%Dagupan%' OR full_name LIKE '%Admin%';
UPDATE public.app_users SET branch_id = 'manila_branch' WHERE full_name LIKE '%Manila%';

-- Also ensure profiles has primary_branch_id
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS primary_branch_id VARCHAR(32) REFERENCES public.branches(id);

-- ------------------------------------------------------------
-- 3. Multi-Store Inventory Stock Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id VARCHAR(32) NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products_and_inventory(id) ON DELETE CASCADE,
    quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    reorder_level INT NOT NULL DEFAULT 10,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_branch ON public.inventory_stock(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_product ON public.inventory_stock(product_id);

-- ------------------------------------------------------------
-- 4. Seed Standard Products into products_and_inventory
-- ------------------------------------------------------------
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level)
VALUES
    ('11111111-1111-4111-a111-111111111111', 'JAPA-TEE-WHT', 'JAPA Classic Dry-Fit Tee (White)', 'Apparel', 350.00, 180.00, 150, 20),
    ('22222222-2222-4222-a222-222222222222', 'JAPA-JSY-SUB', 'JAPA Custom Basketball Jersey (Sublimated)', 'Apparel', 850.00, 420.00, 85, 15),
    ('33333333-3333-4333-a333-333333333333', 'JAPA-COT-BLK', 'JAPA Heavyweight Cotton Tee (Black)', 'Apparel', 450.00, 220.00, 120, 25),
    ('44444444-4444-4444-a444-444444444444', 'SUB-INK-CMYK', 'Sublimation Ink Set (CMYK 1-Liter Bottles)', 'Consumables', 2800.00, 1600.00, 40, 8),
    ('55555555-5555-4555-a555-555555555555', 'VINYL-HT-WHT', 'Heat Transfer Vinyl Roll (White, 50m)', 'Raw Materials', 1950.00, 1100.00, 30, 5),
    ('66666666-6666-4666-a666-666666666666', 'JAPA-CAP-EMB', 'JAPA Snapback Cap (3D Embroidered)', 'Headwear', 400.00, 190.00, 95, 15),
    ('77777777-7777-4777-a777-777777777777', 'PAP-SUB-A3', 'Sublimation Transfer Paper (A3, 100 Sheets)', 'Consumables', 650.00, 320.00, 60, 12),
    ('88888888-8888-4888-a888-888888888888', 'JAPA-HDY-NVY', 'JAPA Pullover Fleece Hoodie (Navy Blue)', 'Apparel', 1200.00, 650.00, 50, 10)
ON CONFLICT (sku) DO UPDATE SET
    item_name = EXCLUDED.item_name,
    category = EXCLUDED.category,
    unit_price = EXCLUDED.unit_price,
    cost_price = EXCLUDED.cost_price;

-- Seed inventory_stock for both Dagupan and Manila branches
INSERT INTO public.inventory_stock (branch_id, product_id, quantity_on_hand, reorder_level)
VALUES
    -- Dagupan Main Branch Stock
    ('dagupan_main', '11111111-1111-4111-a111-111111111111', 95, 20),
    ('dagupan_main', '22222222-2222-4222-a222-222222222222', 50, 15),
    ('dagupan_main', '33333333-3333-4333-a333-333333333333', 75, 25),
    ('dagupan_main', '44444444-4444-4444-a444-444444444444', 25, 8),
    ('dagupan_main', '55555555-5555-4555-a555-555555555555', 18, 5),
    ('dagupan_main', '66666666-6666-4666-a666-666666666666', 60, 15),
    ('dagupan_main', '77777777-7777-4777-a777-777777777777', 40, 12),
    ('dagupan_main', '88888888-8888-4888-a888-888888888888', 30, 10),

    -- Manila Operations Hub Stock
    ('manila_branch', '11111111-1111-4111-a111-111111111111', 55, 20),
    ('manila_branch', '22222222-2222-4222-a222-222222222222', 35, 15),
    ('manila_branch', '33333333-3333-4333-a333-333333333333', 45, 25),
    ('manila_branch', '44444444-4444-4444-a444-444444444444', 15, 8),
    ('manila_branch', '55555555-5555-4555-a555-555555555555', 12, 5),
    ('manila_branch', '66666666-6666-4666-a666-666666666666', 35, 15),
    ('manila_branch', '77777777-7777-4777-a777-777777777777', 20, 12),
    ('manila_branch', '88888888-8888-4888-a888-888888888888', 20, 10)
ON CONFLICT (branch_id, product_id) DO UPDATE SET
    quantity_on_hand = EXCLUDED.quantity_on_hand,
    reorder_level = EXCLUDED.reorder_level,
    last_updated = NOW();

-- ------------------------------------------------------------
-- 5. Inter-Branch Stock Transfer (STO) Tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number VARCHAR(100) UNIQUE NOT NULL,
    source_branch_id VARCHAR(32) NOT NULL REFERENCES public.branches(id),
    destination_branch_id VARCHAR(32) NOT NULL REFERENCES public.branches(id),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'requested', 'dispatched', 'in_transit', 'received', 'variance_flagged', 'cancelled')),
    dispatched_by UUID REFERENCES public.app_users(id),
    received_by UUID REFERENCES public.app_users(id),
    dispatched_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products_and_inventory(id) ON DELETE CASCADE,
    quantity_sent INT NOT NULL CHECK (quantity_sent > 0),
    quantity_received INT DEFAULT 0 CHECK (quantity_received >= 0),
    variance_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_source ON public.stock_transfers(source_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_dest ON public.stock_transfers(destination_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON public.stock_transfers(status);

-- Seed a sample pending STO between Dagupan and Manila
INSERT INTO public.stock_transfers (id, transfer_number, source_branch_id, destination_branch_id, status, notes, created_at)
VALUES
    ('99999999-9999-4999-a999-999999999999', 'STO-202611-001', 'dagupan_main', 'manila_branch', 'in_transit', 'Urgent apparel blanks replenishment for Manila sublimation orders', NOW())
ON CONFLICT (transfer_number) DO NOTHING;

INSERT INTO public.stock_transfer_items (transfer_id, product_id, quantity_sent, quantity_received)
VALUES
    ('99999999-9999-4999-a999-999999999999', '11111111-1111-4111-a111-111111111111', 25, 0),
    ('99999999-9999-4999-a999-999999999999', '44444444-4444-4444-a444-444444444444', 5, 0)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 6. Audit Logging & System Ledger
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID,
    user_name TEXT,
    role TEXT,
    branch_id VARCHAR(32) REFERENCES public.branches(id),
    action_type VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    impersonated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_audit_branch_timestamp ON public.audit_logs(branch_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action_type);

-- Seed sample audit entries
INSERT INTO public.audit_logs (user_name, role, branch_id, action_type, entity_name, entity_id, new_state)
VALUES
    ('System Initializer', 'Admin', 'dagupan_main', 'MULTI_BRANCH_INIT', 'branches', 'dagupan_main', '{"status":"activated","branch":"Dagupan Main"}'::jsonb),
    ('Gain Carlo (Admin)', 'Admin', 'dagupan_main', 'SECURITY_CHECKPOINT', 'app_users', '2e7592c5-2e8c-4449-83f8-10cdcb2d06c6', '{"event":"v1.0-checkpoint"}'::jsonb),
    ('Store Manager — Dagupan (DAG)', 'Manager', 'dagupan_main', 'STO_DISPATCH', 'stock_transfers', 'STO-202611-001', '{"dispatched_items":30,"dest":"manila_branch"}'::jsonb);

-- ------------------------------------------------------------
-- 7. Stored Procedures / RPC Functions for Stock Transfers
-- ------------------------------------------------------------

-- Function: Dispatch Stock Transfer (deducts stock from source branch)
CREATE OR REPLACE FUNCTION public.dispatch_stock_transfer(
    p_transfer_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = p_transfer_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transfer order not found');
    END IF;

    IF v_transfer.status NOT IN ('draft', 'requested') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transfer is already dispatched or processed');
    END IF;

    -- Deduct stock from source branch
    FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
        UPDATE public.inventory_stock
        SET quantity_on_hand = GREATEST(0, quantity_on_hand - v_item.quantity_sent),
            last_updated = NOW()
        WHERE branch_id = v_transfer.source_branch_id AND product_id = v_item.product_id;
    END LOOP;

    -- Update transfer status
    UPDATE public.stock_transfers
    SET status = 'in_transit',
        dispatched_by = p_user_id,
        dispatched_at = NOW()
    WHERE id = p_transfer_id;

    -- Log audit entry
    INSERT INTO public.audit_logs (user_id, branch_id, action_type, entity_name, entity_id, new_state)
    VALUES (p_user_id, v_transfer.source_branch_id, 'STO_DISPATCH', 'stock_transfers', p_transfer_id::text, jsonb_build_object('transfer_number', v_transfer.transfer_number, 'status', 'in_transit'));

    RETURN jsonb_build_object('success', true, 'message', 'Stock transfer dispatched successfully');
END;
$$;

-- Function: Receive Stock Transfer (adds stock to destination branch, detects variance)
CREATE OR REPLACE FUNCTION public.receive_stock_transfer(
    p_transfer_id UUID,
    p_user_id UUID,
    p_items JSONB -- Array of { item_id: UUID, quantity_received: INT, variance_reason: TEXT }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer RECORD;
    v_item JSONB;
    v_has_variance BOOLEAN := false;
    v_stock_item RECORD;
BEGIN
    SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = p_transfer_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transfer order not found');
    END IF;

    IF v_transfer.status != 'in_transit' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transfer is not in transit');
    END IF;

    -- Process received items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT * INTO v_stock_item FROM public.stock_transfer_items WHERE id = (v_item->>'item_id')::UUID;
        
        UPDATE public.stock_transfer_items
        SET quantity_received = (v_item->>'quantity_received')::INT,
            variance_reason = (v_item->>'variance_reason')
        WHERE id = (v_item->>'item_id')::UUID;

        IF (v_item->>'quantity_received')::INT != v_stock_item.quantity_sent THEN
            v_has_variance := true;
        END IF;

        -- Add received quantity to destination branch
        INSERT INTO public.inventory_stock (branch_id, product_id, quantity_on_hand, last_updated)
        VALUES (v_transfer.destination_branch_id, v_stock_item.product_id, (v_item->>'quantity_received')::INT, NOW())
        ON CONFLICT (branch_id, product_id)
        DO UPDATE SET
            quantity_on_hand = public.inventory_stock.quantity_on_hand + EXCLUDED.quantity_on_hand,
            last_updated = NOW();
    END LOOP;

    -- Set final status
    UPDATE public.stock_transfers
    SET status = CASE WHEN v_has_variance THEN 'variance_flagged' ELSE 'received' END,
        received_by = p_user_id,
        received_at = NOW()
    WHERE id = p_transfer_id;

    -- Log audit entry
    INSERT INTO public.audit_logs (user_id, branch_id, action_type, entity_name, entity_id, new_state)
    VALUES (p_user_id, v_transfer.destination_branch_id, 'STO_RECEIVE', 'stock_transfers', p_transfer_id::text, jsonb_build_object('transfer_number', v_transfer.transfer_number, 'has_variance', v_has_variance));

    RETURN jsonb_build_object(
        'success', true, 
        'status', CASE WHEN v_has_variance THEN 'variance_flagged' ELSE 'received' END,
        'message', 'Stock transfer received and verified'
    );
END;
$$;

-- Function: Log Audit Event RPC
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_user_id UUID,
    p_user_name TEXT,
    p_role TEXT,
    p_branch_id VARCHAR(32),
    p_action_type VARCHAR(100),
    p_entity_name VARCHAR(100),
    p_entity_id VARCHAR(100),
    p_new_state JSONB DEFAULT NULL,
    p_previous_state JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id, user_name, role, branch_id, action_type, entity_name, entity_id, new_state, previous_state
    )
    VALUES (
        p_user_id, p_user_name, p_role, p_branch_id, p_action_type, p_entity_name, p_entity_id, p_new_state, p_previous_state
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- ------------------------------------------------------------
-- 8. Enable Row Level Security & Operational Policies
-- ------------------------------------------------------------
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read and write for operational ERP tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'branches: allow all') THEN
        CREATE POLICY "branches: allow all" ON public.branches FOR ALL USING (TRUE) WITH CHECK (TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_stock' AND policyname = 'inventory_stock: allow all') THEN
        CREATE POLICY "inventory_stock: allow all" ON public.inventory_stock FOR ALL USING (TRUE) WITH CHECK (TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_transfers' AND policyname = 'stock_transfers: allow all') THEN
        CREATE POLICY "stock_transfers: allow all" ON public.stock_transfers FOR ALL USING (TRUE) WITH CHECK (TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_transfer_items' AND policyname = 'stock_transfer_items: allow all') THEN
        CREATE POLICY "stock_transfer_items: allow all" ON public.stock_transfer_items FOR ALL USING (TRUE) WITH CHECK (TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs: allow all') THEN
        CREATE POLICY "audit_logs: allow all" ON public.audit_logs FOR ALL USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;




-- ============================================================
-- LIVE DATA RECORDS DUMP
-- ============================================================

-- ============================================================
-- Supabase Cloud Live Database Data Backup
-- Project Ref: wcviadvulpkzkzqwnrdb (jbms-erp)
-- Timestamp: 2026-11-06T07:04:27.681Z
-- ============================================================

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET row_security = off;

-- ------------------------------------------------------------
-- Table Data: public.profiles (2 rows)
-- ------------------------------------------------------------
INSERT INTO public.profiles (id, full_name, role, branch, created_at, primary_branch_id) VALUES ('2f841124-b741-404e-aef6-d2ab6168efd1', 'Lead Administrator', 'Production_Staff', NULL, '2026-11-05T02:12:31.457348+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, full_name, role, branch, created_at, primary_branch_id) VALUES ('4b8f72c1-5e88-4192-a2bb-609948571285', NULL, 'Production_Staff', NULL, '2026-11-06T02:51:00.784316+00:00', NULL) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Table Data: public.customers (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.products_and_inventory (8 rows)
-- ------------------------------------------------------------
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('11111111-1111-4111-a111-111111111111', 'JAPA-TEE-WHT', 'JAPA Classic Dry-Fit Tee (White)', 'Apparel', 350, 180, 150, 20, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('33333333-3333-4333-a333-333333333333', 'JAPA-COT-BLK', 'JAPA Heavyweight Cotton Tee (Black)', 'Apparel', 450, 220, 120, 25, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('44444444-4444-4444-a444-444444444444', 'SUB-INK-CMYK', 'Sublimation Ink Set (CMYK 1-Liter Bottles)', 'Consumables', 2800, 1600, 40, 8, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('55555555-5555-4555-a555-555555555555', 'VINYL-HT-WHT', 'Heat Transfer Vinyl Roll (White, 50m)', 'Raw Materials', 1950, 1100, 30, 5, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('66666666-6666-4666-a666-666666666666', 'JAPA-CAP-EMB', 'JAPA Snapback Cap (3D Embroidered)', 'Headwear', 400, 190, 95, 15, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('77777777-7777-4777-a777-777777777777', 'PAP-SUB-A3', 'Sublimation Transfer Paper (A3, 100 Sheets)', 'Consumables', 650, 320, 60, 12, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('88888888-8888-4888-a888-888888888888', 'JAPA-HDY-NVY', 'JAPA Pullover Fleece Hoodie (Navy Blue)', 'Apparel', 1200, 650, 50, 10, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('22222222-2222-4222-a222-222222222222', 'JAPA-JSY-SUB', 'JAPA Custom Basketball Jersey (Sublimated)', 'Apparel', 850, 420, 84, 15, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Table Data: public.sales_orders (1 rows)
-- ------------------------------------------------------------
INSERT INTO public.sales_orders (id, order_number, customer_id, total_amount, payment_status, order_status, branch, created_at) VALUES ('9f0e3258-e7d6-4a72-82a7-903f5a498d27', 'INV-20261106-6767', NULL, 850, 'Paid', 'Delivered', 'JAPA Dagupan (Main Branch)', '2026-11-06T06:38:46.594086+00:00') ON CONFLICT DO NOTHING;

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
-- Table Data: public.app_users (13 rows)
-- ------------------------------------------------------------
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('c17c2550-000a-4aac-afa3-dda5bb03d1fe', 'Store Manager — Dagupan (DAG)', 'Manager', '$2a$08$ECKNBOOIR89sF7QHV2acd.JWztD6TaGIbNkItf4ojOou/L/I0dAiK', true, '2026-11-06T03:06:38.886798+00:00', '2026-11-06T03:06:38.886798+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('e32dac5f-c442-4659-9309-07434b7ed51c', 'Cashier POS — Dagupan (DAG)', 'Cashier', '$2a$08$wgQVcOqWK/S7hNFL0QES0OdQJoYYgTmZFg8itXGo0my57N5jaXq1G', true, '2026-11-06T03:06:39.287254+00:00', '2026-11-06T03:06:39.287254+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('7c2a66d2-0308-4631-b843-98d53029ab9e', 'Inventory Officer — Dagupan (DAG)', 'Inventory', '$2a$08$PXCjCtOWMKMHfvO7dR.tNeaISrBGrAvVaCZE.GoJStXlxe6rdy1Ri', true, '2026-11-06T03:06:39.689525+00:00', '2026-11-06T03:06:39.689525+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('73e5af98-ad35-46af-bb5e-dc7e0e02f0db', 'Production Staff — Dagupan (DAG)', 'Staff', '$2a$08$utlibDB7stPkdCC.gtphluQ4Byyzi3mJqNAy6yrSMU57ABTW5G6ym', true, '2026-11-06T03:06:40.217086+00:00', '2026-11-06T03:06:40.217086+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('b603e120-dece-4cac-885a-1fff11bd93d3', 'Store Manager — Manila (MNL)', 'Manager', '$2a$08$DxzCHKMvRnyPn8eA.p5eiOx5SUPf2rVcUX2NR.g2ABBYwHTKdVY5G', true, '2026-11-06T03:06:39.106392+00:00', '2026-11-06T03:06:39.106392+00:00', 'manila_branch') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('2baa314b-1af9-4593-89bb-f57feb4abc07', 'Cashier POS — Manila (MNL)', 'Cashier', '$2a$08$SnLyXnm8Xx3VAO.L0gdpuOMUNZ4OqToCQe3ICqjxEYSu1zXBxosN.', true, '2026-11-06T03:06:39.458033+00:00', '2026-11-06T03:06:39.458033+00:00', 'manila_branch') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('e7004842-5ccf-4ac0-9f12-7ebb34262143', 'Inventory Officer — Manila (MNL)', 'Inventory', '$2a$08$OqMnE401PnqoD4suWcqGA.ryvi/H4.1AyOR4zUpP5Mzy0M8M/8IHu', true, '2026-11-06T03:06:39.99607+00:00', '2026-11-06T03:06:39.99607+00:00', 'manila_branch') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('8414b40f-d834-4e39-b7a7-4a0298cf8159', 'Production Staff — Manila (MNL)', 'Staff', '$2a$08$aWD9oXd7YesxKjGZ/CkmzOt122r6KHdaU7LXK2rntO7OwW7Oz1PCi', true, '2026-11-06T03:06:40.55964+00:00', '2026-11-06T03:06:40.55964+00:00', 'manila_branch') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('2e7592c5-2e8c-4449-83f8-10cdcb2d06c6', 'Gain Carlo (Admin)', 'Admin', '$2a$08$VxmB2dvk0RFGfsdVFLAtHu5vgSlPCZYKxoI.UujdPmjq1Gxkg1iOa', true, '2026-11-06T03:06:38.155395+00:00', '2026-11-06T03:06:38.155395+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('6ed88c01-453e-4036-9cfe-e3cabb194cba', 'Belinda Dee (CEO)', 'Admin', '$2a$08$MnZeTbeh7uhLYcHrT68TBOhmKYanosMWQaPzVR1qF1bMeX8Q6rTfi', true, '2026-11-06T03:06:38.466191+00:00', '2026-11-06T03:06:38.466191+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('d1111111-1111-4000-8000-000000000001', 'JAPA Pearly', 'Cashier', '$2a$08$IPA65Ag2DVBMRhTcvRLI.e/Dbs7RA59YHsA9.CxsGCcR7Qqrl7FYG', true, '2026-11-06T06:59:26.655554+00:00', '2026-11-06T06:59:26.655554+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('d1111111-1111-4000-8000-000000000002', 'JAPA Ivan', 'Cashier', '$2a$08$P.ERmUjUFYeNem3Wgg3QRu3Urk.R.vMyZ4woR3AoZ1U0emxCNRbz2', true, '2026-11-06T06:59:27.642302+00:00', '2026-11-06T06:59:27.642302+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('d1111111-1111-4000-8000-000000000003', 'JAPA Lanie', 'Cashier', '$2a$08$RKamDsCm0oCux6KLpMv8tOyBlHE2Z1JQqdqeE.IsdmZX4lm.NIeY2', true, '2026-11-06T06:59:31.453846+00:00', '2026-11-06T06:59:31.453846+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;


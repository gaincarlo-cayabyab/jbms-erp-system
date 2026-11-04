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

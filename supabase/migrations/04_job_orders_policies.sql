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

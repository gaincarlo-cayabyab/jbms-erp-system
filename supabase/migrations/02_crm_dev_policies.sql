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


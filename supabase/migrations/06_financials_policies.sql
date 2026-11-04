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

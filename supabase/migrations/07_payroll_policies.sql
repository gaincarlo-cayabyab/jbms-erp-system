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


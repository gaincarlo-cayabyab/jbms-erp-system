-- ============================================================
-- Migration: 22_production_queue_enhancements.sql
-- Description:
-- 1. Enhances job_orders table with:
--    - branch_id ('dagupan_main', 'manila_branch')
--    - priority ('Low', 'Normal', 'High', 'Rush')
--    - specifications (TEXT details on material, dimensions, finishing)
--    - assigned_operator (TEXT name of operator / machine team)
--    - notes (TEXT client or shop special notes)
-- 2. Expands stage_status constraint to include 'Ready' for 7-Stage pipeline
-- 3. Enables Supabase Realtime for job_orders
-- 4. Ensures RLS policies for seamless multi-device production tracking
-- ============================================================

DO $$
BEGIN
  -- Add branch_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'job_orders' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.job_orders ADD COLUMN branch_id TEXT DEFAULT 'dagupan_main';
  END IF;

  -- Add priority column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'job_orders' AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.job_orders ADD COLUMN priority TEXT DEFAULT 'Normal';
  END IF;

  -- Add specifications column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'job_orders' AND column_name = 'specifications'
  ) THEN
    ALTER TABLE public.job_orders ADD COLUMN specifications TEXT;
  END IF;

  -- Add assigned_operator column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'job_orders' AND column_name = 'assigned_operator'
  ) THEN
    ALTER TABLE public.job_orders ADD COLUMN assigned_operator TEXT;
  END IF;

  -- Add notes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'job_orders' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.job_orders ADD COLUMN notes TEXT;
  END IF;

  -- Update stage_status constraint
  ALTER TABLE public.job_orders DROP CONSTRAINT IF EXISTS job_orders_stage_status_check;
  ALTER TABLE public.job_orders ADD CONSTRAINT job_orders_stage_status_check
    CHECK (stage_status IN (
      'Queued', 'Pending', 'Pre_Press', 'Printing', 'In_Production', 
      'Finishing', 'Quality_Check', 'Ready', 'Ready_For_Pickup', 'Done', 'Completed', 'Cancelled'
    ));

  -- Update priority constraint
  ALTER TABLE public.job_orders DROP CONSTRAINT IF EXISTS job_orders_priority_check;
  ALTER TABLE public.job_orders ADD CONSTRAINT job_orders_priority_check
    CHECK (priority IN ('Low', 'Normal', 'High', 'Rush'));
END $$;

-- Enable Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_orders;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Permissive RLS for production operators
DO $$
BEGIN
  DROP POLICY IF EXISTS "job_orders: allow all read" ON public.job_orders;
  CREATE POLICY "job_orders: allow all read"
    ON public.job_orders FOR SELECT
    TO anon, authenticated
    USING (TRUE);

  DROP POLICY IF EXISTS "job_orders: allow all insert" ON public.job_orders;
  CREATE POLICY "job_orders: allow all insert"
    ON public.job_orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (TRUE);

  DROP POLICY IF EXISTS "job_orders: allow all update" ON public.job_orders;
  CREATE POLICY "job_orders: allow all update"
    ON public.job_orders FOR UPDATE
    TO anon, authenticated
    USING (TRUE);

  DROP POLICY IF EXISTS "job_orders: allow all delete" ON public.job_orders;
  CREATE POLICY "job_orders: allow all delete"
    ON public.job_orders FOR DELETE
    TO anon, authenticated
    USING (TRUE);
END $$;


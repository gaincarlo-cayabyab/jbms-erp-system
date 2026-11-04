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


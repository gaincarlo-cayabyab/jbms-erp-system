-- ============================================================
-- Migration: 11_enable_admin_crud_policies.sql
-- Enable Full CRUD (Add, Edit, Delete, Void) on Sales Orders & Inventory
-- ============================================================

-- 1. Enable DELETE policy for sales_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales_orders' AND policyname = 'sales_orders: allow anon delete dev'
  ) THEN
    CREATE POLICY "sales_orders: allow anon delete dev"
      ON public.sales_orders FOR DELETE
      TO anon USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales_orders' AND policyname = 'sales_orders: allow authenticated delete'
  ) THEN
    CREATE POLICY "sales_orders: allow authenticated delete"
      ON public.sales_orders FOR DELETE
      TO authenticated USING (TRUE);
  END IF;
END $$;

-- 2. Ensure customers delete is allowed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'customers: allow anon delete dev'
  ) THEN
    CREATE POLICY "customers: allow anon delete dev"
      ON public.customers FOR DELETE
      TO anon USING (TRUE);
  END IF;
END $$;

-- 3. Auto-populate inventory_stock for all existing products across all branches
INSERT INTO public.inventory_stock (branch_id, product_id, quantity_on_hand, reorder_level)
SELECT b.id, p.id, p.stock_quantity, p.reorder_level
FROM public.branches b
CROSS JOIN public.products_and_inventory p
ON CONFLICT (branch_id, product_id) DO NOTHING;

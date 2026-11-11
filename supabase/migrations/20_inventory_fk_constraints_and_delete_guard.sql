-- ============================================================
-- Migration: 20_inventory_fk_constraints_and_delete_guard.sql
-- Purpose:
--   1. Ensure sales_order_items.product_id uses ON DELETE SET NULL
--      so deleting a product preserves the historical sales audit trail
--      (line items retain sku, item_name, unit_price, quantity, subtotal)
--   2. Ensure inventory_stock uses ON DELETE CASCADE
--      so deleting a product removes its branch stock rows automatically
--   3. Ensure stock_transfer_items uses ON DELETE CASCADE
--   4. Enable Supabase Realtime on key operational tables so POS,
--      Inventory, and Sales pages update instantly across tabs/devices
-- ============================================================

-- Step 1: Ensure sales_order_items FK is ON DELETE SET NULL
DO $$
BEGIN
  ALTER TABLE public.sales_order_items
    DROP CONSTRAINT IF EXISTS sales_order_items_product_id_fkey;

  ALTER TABLE public.sales_order_items
    ADD CONSTRAINT sales_order_items_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products_and_inventory(id)
    ON DELETE SET NULL;

  RAISE NOTICE 'sales_order_items FK updated to ON DELETE SET NULL';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'sales_order_items FK notice: %', SQLERRM;
END $$;

-- Step 2: Ensure inventory_stock FK is ON DELETE CASCADE
DO $$
BEGIN
  ALTER TABLE public.inventory_stock
    DROP CONSTRAINT IF EXISTS inventory_stock_product_id_fkey;

  ALTER TABLE public.inventory_stock
    ADD CONSTRAINT inventory_stock_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products_and_inventory(id)
    ON DELETE CASCADE;

  RAISE NOTICE 'inventory_stock FK updated to ON DELETE CASCADE';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'inventory_stock FK notice: %', SQLERRM;
END $$;

-- Step 3: Ensure stock_transfer_items FK is ON DELETE CASCADE
DO $$
BEGIN
  ALTER TABLE public.stock_transfer_items
    DROP CONSTRAINT IF EXISTS stock_transfer_items_product_id_fkey;

  ALTER TABLE public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products_and_inventory(id)
    ON DELETE CASCADE;

  RAISE NOTICE 'stock_transfer_items FK updated to ON DELETE CASCADE';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'stock_transfer_items FK notice: %', SQLERRM;
END $$;

-- Step 4: Add operational tables to supabase_realtime publication
DO $$
BEGIN
  -- Add products_and_inventory if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products_and_inventory'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products_and_inventory;
  END IF;

  -- Add inventory_stock if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_stock'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_stock;
  END IF;

  -- Add sales_orders if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sales_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_orders;
  END IF;

  -- Add cash_transactions if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'cash_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_transactions;
  END IF;

  -- Add cash_accounts if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'cash_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_accounts;
  END IF;

  -- Add expenses if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;

  RAISE NOTICE 'supabase_realtime publication verified for operational tables';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'supabase_realtime publication notice: %', SQLERRM;
END $$;

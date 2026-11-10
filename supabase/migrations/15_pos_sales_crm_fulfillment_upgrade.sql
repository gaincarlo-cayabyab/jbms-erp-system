-- ============================================================
-- Migration: 15_pos_sales_crm_fulfillment_upgrade.sql
-- Upgrades sales_orders with fulfillment tracking, quotations,
-- deposits, pickup dates, and delivery courier details.
-- Creates sales_order_items for itemized breakdown.
-- ============================================================

-- 1. Add fulfillment, quotation, and payment tracking columns to sales_orders
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'sale',
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT NOT NULL DEFAULT 'walk_in',
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'handed_over',
  ADD COLUMN IF NOT EXISTS payment_terms TEXT NOT NULL DEFAULT 'full_payment',
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pickup_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS courier_name TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- 2. Drop existing restrictive constraints and recreate them
DO $$
BEGIN
  ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_order_type_check;
  ALTER TABLE public.sales_orders ADD CONSTRAINT sales_orders_order_type_check
    CHECK (order_type IN ('sale', 'quotation'));

  ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_fulfillment_type_check;
  ALTER TABLE public.sales_orders ADD CONSTRAINT sales_orders_fulfillment_type_check
    CHECK (fulfillment_type IN ('walk_in', 'pickup', 'delivery'));

  ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_fulfillment_status_check;
  ALTER TABLE public.sales_orders ADD CONSTRAINT sales_orders_fulfillment_status_check
    CHECK (fulfillment_status IN (
      'handed_over',       -- Over-the-counter walk-in completed
      'pending_staging',   -- In preparation for pickup
      'ready_for_pickup',  -- Staged at branch counter ready for client
      'picked_up',         -- Client picked up & cleared
      'pending_dispatch',  -- Awaiting courier rider
      'out_for_delivery',  -- In-transit with rider/carrier
      'delivered',         -- Confirmed receipt by buyer
      'cancelled',         -- Order voided
      'draft'              -- Quotation draft
    ));

  ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_payment_terms_check;
  ALTER TABLE public.sales_orders ADD CONSTRAINT sales_orders_payment_terms_check
    CHECK (payment_terms IN ('full_payment', 'downpayment_50', 'custom_deposit', 'pay_on_pickup', 'quotation_unpaid'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint update notice: %', SQLERRM;
END $$;

-- 3. Create sales_order_items table
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products_and_inventory(id) ON DELETE SET NULL,
  sku TEXT,
  item_name TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable RLS on sales_order_items
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sales_order_items' AND policyname = 'sales_order_items: allow all'
  ) THEN
    CREATE POLICY "sales_order_items: allow all" ON public.sales_order_items
      FOR ALL USING (TRUE) WITH CHECK (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sales_orders' AND policyname = 'sales_orders: allow all'
  ) THEN
    CREATE POLICY "sales_orders: allow all" ON public.sales_orders
      FOR ALL USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;

-- 5. Create indices for fast lookup
CREATE INDEX IF NOT EXISTS idx_sales_orders_type ON public.sales_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_sales_orders_fulfillment ON public.sales_orders(fulfillment_type, fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON public.sales_order_items(sales_order_id);


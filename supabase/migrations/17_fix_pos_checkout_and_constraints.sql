-- ============================================================
-- Migration: 17_fix_pos_checkout_and_constraints.sql
-- Fixes:
-- 1. Updates sales_orders check constraint to allow modern order statuses
-- 2. Rewrites complete_pos_checkout RPC with exact columns:
--    - inventory_stock uses last_updated = NOW()
--    - products_and_inventory updates stock_quantity
--    - sales_orders uses valid order_status ('Confirmed', 'Draft', etc.)
--    - cash_transactions includes transaction_no, branch_id, status = 'completed'
--    - safe UUID casting for items
-- ============================================================

-- 1. Expand sales_orders_order_status_check constraint
DO $$
BEGIN
  ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_order_status_check;
  ALTER TABLE public.sales_orders ADD CONSTRAINT sales_orders_order_status_check
    CHECK (order_status IN (
      'Draft', 'Pending', 'Approved', 'Invoiced', 'Confirmed',
      'In_Production', 'Ready', 'Delivered', 'Completed', 'Processing', 'Cancelled'
    ));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint update notice: %', SQLERRM;
END $$;

-- 2. Replace complete_pos_checkout RPC
CREATE OR REPLACE FUNCTION public.complete_pos_checkout(
  p_branch_id          TEXT,
  p_items              JSONB,
  p_total              NUMERIC,
  p_payment_method     TEXT,
  p_invoice_no         TEXT,
  p_order_type         TEXT DEFAULT 'sale',
  p_fulfillment_type   TEXT DEFAULT 'walk_in',
  p_fulfillment_status TEXT DEFAULT 'handed_over',
  p_payment_terms      TEXT DEFAULT 'full_payment',
  p_amount_paid        NUMERIC DEFAULT 0,
  p_balance_due        NUMERIC DEFAULT 0,
  p_customer_id        UUID DEFAULT NULL,
  p_recipient_name     TEXT DEFAULT NULL,
  p_recipient_phone    TEXT DEFAULT NULL,
  p_shipping_address   TEXT DEFAULT NULL,
  p_courier_name       TEXT DEFAULT NULL,
  p_pickup_date        TIMESTAMPTZ DEFAULT NULL,
  p_customer_notes     TEXT DEFAULT NULL,
  p_cashier_name       TEXT DEFAULT 'JAPA Cashier'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id        UUID;
  v_customer_id     UUID := p_customer_id;
  v_item            JSONB;
  v_product_id_str  TEXT;
  v_product_id      UUID;
  v_qty             INT;
  v_cash_account_id UUID;
  v_category_id     UUID;
  v_target_type     TEXT;
  v_tx_no           TEXT;
  v_clean_branch    TEXT;
  v_order_status    TEXT;
BEGIN
  -- Normalize branch ID
  v_clean_branch := CASE
    WHEN lower(p_branch_id) LIKE '%manila%' THEN 'manila_branch'
    ELSE 'dagupan_main'
  END;

  -- 0. CRM auto-registration: if no customer_id but recipient info is provided
  IF v_customer_id IS NULL AND p_recipient_name IS NOT NULL AND trim(p_recipient_name) <> '' THEN
    IF p_recipient_phone IS NOT NULL AND trim(p_recipient_phone) <> '' THEN
      SELECT id INTO v_customer_id
        FROM public.customers
        WHERE contact_number = trim(p_recipient_phone)
        LIMIT 1;
    END IF;

    IF v_customer_id IS NULL THEN
      INSERT INTO public.customers (name, contact_number, customer_type, status)
        VALUES (
          trim(p_recipient_name),
          COALESCE(trim(p_recipient_phone), 'N/A'),
          'Individual',
          'Active'
        )
        RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  -- 1. Atomic stock deduction for each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id_str := v_item->>'product_id';
    v_qty            := COALESCE((v_item->>'quantity')::INT, 1);

    -- Safe UUID parsing
    IF v_product_id_str ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_product_id := v_product_id_str::UUID;

      -- Deduct from branch-specific inventory_stock (uses last_updated)
      UPDATE public.inventory_stock
        SET quantity_on_hand = GREATEST(0, quantity_on_hand - v_qty),
            last_updated = NOW()
        WHERE product_id = v_product_id
          AND branch_id  = v_clean_branch;

      -- Deduct from consolidated products_and_inventory (no updated_at column)
      UPDATE public.products_and_inventory
        SET stock_quantity = GREATEST(0, stock_quantity - v_qty)
        WHERE id = v_product_id;
    END IF;
  END LOOP;

  -- Determine order_status
  v_order_status := CASE
    WHEN p_order_type = 'quotation' THEN 'Draft'
    WHEN p_balance_due > 0 THEN 'Pending'
    ELSE 'Confirmed'
  END;

  -- 2. Insert sales_order record
  INSERT INTO public.sales_orders (
    order_number, total_amount, payment_status, order_status,
    branch, order_type, fulfillment_type, fulfillment_status,
    payment_terms, amount_paid, balance_due,
    customer_id, recipient_name, recipient_phone,
    shipping_address, courier_name, pickup_date,
    customer_notes
  ) VALUES (
    p_invoice_no,
    p_total,
    CASE WHEN p_balance_due > 0 THEN 'Partial' ELSE 'Paid' END,
    v_order_status,
    CASE WHEN v_clean_branch = 'manila_branch' THEN 'JAPA Manila' ELSE 'JAPA Dagupan (Main Branch)' END,
    p_order_type,
    p_fulfillment_type,
    p_fulfillment_status,
    p_payment_terms,
    p_amount_paid,
    p_balance_due,
    v_customer_id,
    p_recipient_name,
    p_recipient_phone,
    p_shipping_address,
    p_courier_name,
    p_pickup_date,
    p_customer_notes
  ) RETURNING id INTO v_order_id;

  -- 3. Insert sales_order_items (itemized breakdown)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id_str := v_item->>'product_id';
    v_product_id := NULL;
    IF v_product_id_str ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_product_id := v_product_id_str::UUID;
    END IF;

    INSERT INTO public.sales_order_items (
      sales_order_id, product_id, sku, item_name,
      quantity, unit_price, discount_amount, subtotal
    ) VALUES (
      v_order_id,
      v_product_id,
      v_item->>'sku',
      COALESCE(v_item->>'item_name', 'Item'),
      COALESCE((v_item->>'quantity')::INT, 1),
      COALESCE((v_item->>'unit_price')::NUMERIC, 0),
      COALESCE((v_item->>'discount_amount')::NUMERIC, 0),
      COALESCE((v_item->>'subtotal')::NUMERIC, 0)
    );
  END LOOP;

  -- 4. Cash Management entry (only for confirmed sales with payment > 0)
  IF p_order_type = 'sale' AND p_amount_paid > 0 THEN
    v_target_type := CASE WHEN lower(p_payment_method) = 'gcash' THEN 'ewallet' ELSE 'cash_drawer' END;

    SELECT id INTO v_cash_account_id
      FROM public.cash_accounts
      WHERE branch_id  = v_clean_branch
        AND account_type = v_target_type
      LIMIT 1;

    SELECT id INTO v_category_id
      FROM public.cash_categories
      WHERE category_name = 'POS Retail Sales'
      LIMIT 1;

    -- Generate transaction number for cash_transactions
    v_tx_no := 'CRV-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random() * 9000 + 1000)::TEXT;

    IF v_cash_account_id IS NOT NULL AND v_category_id IS NOT NULL THEN
      INSERT INTO public.cash_transactions (
        transaction_no,
        branch_id,
        cash_account_id,
        category_id,
        flow_type,
        amount,
        payment_method,
        reference_no,
        source_module,
        status,
        payee_or_payer,
        notes
      ) VALUES (
        v_tx_no,
        v_clean_branch,
        v_cash_account_id,
        v_category_id,
        'inflow',
        p_amount_paid,
        CASE lower(p_payment_method)
          WHEN 'cash' THEN 'cash'
          WHEN 'gcash' THEN 'ewallet'
          WHEN 'card' THEN 'bank_transfer'
          ELSE 'cash'
        END,
        p_invoice_no,
        'pos',
        'completed',
        COALESCE(p_recipient_name, 'Walk-in Customer') || ' (' || p_cashier_name || ')',
        'POS Checkout – Line items: ' || jsonb_array_length(p_items)::TEXT
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success',    true,
    'order_id',   v_order_id,
    'invoice_no', p_invoice_no
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execution to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.complete_pos_checkout TO anon, authenticated;


-- ============================================================
-- Migration: 21_crm_pos_loyalty_and_customer_integration.sql
-- Description:
-- 1. Adds customer loyalty & tier fields to customers table:
--    - customer_type ('Individual', 'Corporate', 'Reseller', 'Government')
--    - loyalty_tier ('New Customer', 'Repeat Buyer', 'VIP Loyal', 'Corporate')
--    - total_orders (INTEGER)
--    - total_spent (NUMERIC)
--    - last_order_date (TIMESTAMPTZ)
--    - allow_credit_terms (BOOLEAN)
-- 2. Grants staff & POS permissions on customers table
-- 3. Updates complete_pos_checkout RPC:
--    - Resolves customer by ID, phone, or name
--    - Auto-registers new customer if named
--    - Updates customer total_orders, total_spent, last_order_date
--    - Auto-promotes loyalty tier based on spend/order count
-- ============================================================

-- 1. Enhance customers table
DO $$
BEGIN
  -- Add customer_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'customer_type'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN customer_type TEXT DEFAULT 'Individual';
    ALTER TABLE public.customers ADD CONSTRAINT customers_customer_type_check 
      CHECK (customer_type IN ('Individual', 'Corporate', 'Reseller', 'Government'));
  END IF;

  -- Add loyalty_tier column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'loyalty_tier'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN loyalty_tier TEXT DEFAULT 'New Customer';
    ALTER TABLE public.customers ADD CONSTRAINT customers_loyalty_tier_check 
      CHECK (loyalty_tier IN ('New Customer', 'Repeat Buyer', 'VIP Loyal', 'Corporate'));
  END IF;

  -- Add total_orders column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'total_orders'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN total_orders INT NOT NULL DEFAULT 0;
  END IF;

  -- Add total_spent column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'total_spent'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
  END IF;

  -- Add last_order_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'last_order_date'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN last_order_date TIMESTAMPTZ;
  END IF;

  -- Add allow_credit_terms column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'allow_credit_terms'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN allow_credit_terms BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 2. Open RLS policies on customers table for authenticated staff and anon POS operations
DO $$
BEGIN
  DROP POLICY IF EXISTS "customers: all users can insert" ON public.customers;
  CREATE POLICY "customers: all users can insert"
    ON public.customers FOR INSERT
    TO anon, authenticated
    WITH CHECK (TRUE);

  DROP POLICY IF EXISTS "customers: all users can update" ON public.customers;
  CREATE POLICY "customers: all users can update"
    ON public.customers FOR UPDATE
    TO anon, authenticated
    USING (TRUE);
END $$;

-- 3. Replace complete_pos_checkout RPC with integrated CRM linking & loyalty tracking
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
  v_customer_name   TEXT := p_recipient_name;
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

  -- 0. CRM Resolution & Auto-Registration
  IF v_customer_id IS NOT NULL THEN
    -- Fetch customer's primary name if recipient_name not explicitly provided
    SELECT name INTO v_customer_name FROM public.customers WHERE id = v_customer_id;
    IF v_customer_name IS NULL THEN
      v_customer_name := p_recipient_name;
    END IF;
  ELSE
    -- If no customer_id, check if valid recipient name provided (excluding generic walk-in)
    IF p_recipient_name IS NOT NULL 
       AND trim(p_recipient_name) <> '' 
       AND lower(trim(p_recipient_name)) NOT IN ('walk-in', 'walk-in customer', 'general', 'general customer') THEN
      
      -- Look up by phone if provided
      IF p_recipient_phone IS NOT NULL AND trim(p_recipient_phone) <> '' THEN
        SELECT id, name INTO v_customer_id, v_customer_name
          FROM public.customers
          WHERE contact_number = trim(p_recipient_phone)
          LIMIT 1;
      END IF;

      -- Look up by exact name if still not found
      IF v_customer_id IS NULL THEN
        SELECT id, name INTO v_customer_id, v_customer_name
          FROM public.customers
          WHERE lower(trim(name)) = lower(trim(p_recipient_name))
          LIMIT 1;
      END IF;

      -- If still not found, create new customer profile
      IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (
          name, contact_number, address,
          customer_type, loyalty_tier,
          total_orders, total_spent,
          balance, credit_limit, created_at
        ) VALUES (
          trim(p_recipient_name),
          COALESCE(trim(p_recipient_phone), 'N/A'),
          p_shipping_address,
          'Individual',
          'New Customer',
          0,
          0.00,
          0.00,
          0.00,
          NOW()
        )
        RETURNING id INTO v_customer_id;
        v_customer_name := trim(p_recipient_name);
      END IF;
    END IF;
  END IF;

  -- If customer exists, update their order history and loyalty tier
  IF v_customer_id IS NOT NULL THEN
    UPDATE public.customers
      SET
        total_orders = COALESCE(total_orders, 0) + 1,
        total_spent = COALESCE(total_spent, 0) + COALESCE(p_amount_paid, 0),
        last_order_date = NOW(),
        loyalty_tier = CASE
          WHEN customer_type IN ('Corporate', 'Reseller', 'Government') THEN 'Corporate'
          WHEN (COALESCE(total_spent, 0) + COALESCE(p_amount_paid, 0)) >= 25000 OR (COALESCE(total_orders, 0) + 1) >= 10 THEN 'VIP Loyal'
          WHEN (COALESCE(total_spent, 0) + COALESCE(p_amount_paid, 0)) >= 5000 OR (COALESCE(total_orders, 0) + 1) >= 2 THEN 'Repeat Buyer'
          ELSE 'New Customer'
        END
      WHERE id = v_customer_id;
  END IF;

  -- 1. Atomic stock deduction for each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id_str := v_item->>'product_id';
    v_qty            := COALESCE((v_item->>'quantity')::INT, 1);

    -- Safe UUID parsing
    IF v_product_id_str ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_product_id := v_product_id_str::UUID;

      -- Deduct from branch-specific inventory_stock
      UPDATE public.inventory_stock
        SET quantity_on_hand = GREATEST(0, quantity_on_hand - v_qty),
            last_updated = NOW()
        WHERE product_id = v_product_id
          AND branch_id  = v_clean_branch;

      -- Deduct from consolidated products_and_inventory
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
    COALESCE(v_customer_name, p_recipient_name, 'Walk-in Customer'),
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
        COALESCE(v_customer_name, p_recipient_name, 'Walk-in Customer') || ' (' || p_cashier_name || ')',
        'POS Checkout – Line items: ' || jsonb_array_length(p_items)::TEXT
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success',     true,
    'order_id',    v_order_id,
    'invoice_no',  p_invoice_no,
    'customer_id', v_customer_id,
    'customer_name', COALESCE(v_customer_name, 'Walk-in Customer')
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execution to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.complete_pos_checkout TO anon, authenticated;


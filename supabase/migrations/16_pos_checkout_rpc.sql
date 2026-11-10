-- ============================================================
-- Migration: 16_pos_checkout_rpc.sql
-- Atomic POS checkout: stock deduction + sales insert + cash entry + CRM sync
-- ============================================================

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
  v_product_id      UUID;
  v_qty             INT;
  v_cash_account_id UUID;
  v_category_id     UUID;
  v_target_type     TEXT;
BEGIN
  -- 0. CRM auto-registration: if no customer_id but recipient info is provided
  IF v_customer_id IS NULL AND p_recipient_name IS NOT NULL AND p_recipient_phone IS NOT NULL THEN
    SELECT id INTO v_customer_id
      FROM public.customers
      WHERE contact_number = p_recipient_phone
      LIMIT 1;

    IF v_customer_id IS NULL THEN
      INSERT INTO public.customers (name, contact_number, customer_type, status)
        VALUES (p_recipient_name, p_recipient_phone, 'Individual', 'Active')
        RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  -- 1. Stock deduction for each item (atomic dual-table)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty        := (v_item->>'quantity')::INT;

    -- Deduct from branch-specific inventory_stock
    UPDATE public.inventory_stock
      SET quantity_on_hand = GREATEST(0, quantity_on_hand - v_qty),
          updated_at = NOW()
      WHERE product_id = v_product_id
        AND branch_id  = p_branch_id;

    -- Deduct from consolidated products_and_inventory
    UPDATE public.products_and_inventory
      SET stock_quantity = GREATEST(0, stock_quantity - v_qty),
          updated_at = NOW()
      WHERE id = v_product_id;
  END LOOP;

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
    CASE
      WHEN p_order_type = 'quotation' THEN 'Draft'
      WHEN p_fulfillment_type = 'walk_in' THEN 'Completed'
      ELSE 'Processing'
    END,
    p_branch_id,
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
    INSERT INTO public.sales_order_items (
      sales_order_id, product_id, sku, item_name,
      quantity, unit_price, discount_amount, subtotal
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      v_item->>'sku',
      v_item->>'item_name',
      (v_item->>'quantity')::INT,
      (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'discount_amount')::NUMERIC, 0),
      (v_item->>'subtotal')::NUMERIC
    );
  END LOOP;

  -- 4. Cash Management entry (only for confirmed sales with payment)
  IF p_order_type = 'sale' AND p_amount_paid > 0 THEN
    v_target_type := CASE WHEN p_payment_method = 'gcash' THEN 'ewallet' ELSE 'cash_drawer' END;

    SELECT id INTO v_cash_account_id
      FROM public.cash_accounts
      WHERE branch_id  = p_branch_id
        AND account_type = v_target_type
      LIMIT 1;

    SELECT id INTO v_category_id
      FROM public.cash_categories
      WHERE category_name = 'POS Retail Sales'
      LIMIT 1;

    IF v_cash_account_id IS NOT NULL AND v_category_id IS NOT NULL THEN
      INSERT INTO public.cash_transactions (
        cash_account_id, category_id, flow_type,
        amount, payment_method, reference_no,
        source_module, payee_or_payer, notes
      ) VALUES (
        v_cash_account_id,
        v_category_id,
        'inflow',
        p_amount_paid,
        CASE p_payment_method
          WHEN 'cash' THEN 'cash'
          WHEN 'gcash' THEN 'ewallet'
          WHEN 'card' THEN 'bank_transfer'
          ELSE 'cash'
        END,
        p_invoice_no,
        'pos',
        COALESCE(p_recipient_name, 'Walk-in Customer') || ' (' || p_cashier_name || ')',
        'POS Checkout – Items: ' || jsonb_array_length(p_items)::TEXT
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


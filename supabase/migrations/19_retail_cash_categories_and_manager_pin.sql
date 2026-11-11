-- ============================================================
-- Migration: 19_retail_cash_categories_and_manager_pin.sql
-- 1. Create verify_manager_pin RPC to validate Admin/Manager PINs
-- 2. Seed retail cash categories (Couriers, Parcel COD, Supplies, Float)
-- 3. Create atomic order deletion with inventory and cash reversal RPC
-- ============================================================

-- 1. Manager PIN verification RPC
CREATE OR REPLACE FUNCTION public.verify_manager_pin(p_pin TEXT)
RETURNS TABLE (
  success BOOLEAN,
  user_id UUID,
  full_name TEXT,
  role TEXT,
  message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as success,
    u.id as user_id,
    u.full_name,
    u.role,
    'Manager authorization verified'::TEXT as message
  FROM public.app_users u
  WHERE u.is_active = TRUE
    AND u.role IN ('Admin', 'Manager')
    AND u.pin_hash = crypt(p_pin, u.pin_hash)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      FALSE as success,
      NULL::UUID as user_id,
      ''::TEXT as full_name,
      ''::TEXT as role,
      'Invalid Manager or Admin PIN'::TEXT as message;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_manager_pin TO anon, authenticated;

-- 2. Seed missing retail store cash categories
INSERT INTO public.cash_categories (category_name, flow_type, description)
VALUES
  ('Courier & Shipping Dispatch', 'outflow', 'Lalamove, Grab, J&T courier rider cash fees paid at register'),
  ('Parcel COD Supplier Delivery', 'outflow', 'Raw materials, inks, vinyl, blank shirts arriving Cash On Delivery'),
  ('Store & Office Supplies', 'outflow', 'Packaging boxes, tape, printer paper, cleaning, emergency hardware'),
  ('Transportation & Store Errands', 'outflow', 'Tricycle/transportation fare for urgent store errands and pickups'),
  ('Staff Meal & Emergency Allowance', 'outflow', 'Overtime meals, emergency staff food and drink allowances'),
  ('Register Change Float Addition', 'inflow', 'Morning opening cash float or change bills/coins added to register till'),
  ('Customer COD Remittance', 'inflow', 'Cash collected from courier riders for fulfilled COD deliveries')
ON CONFLICT DO NOTHING;

-- 3. Atomic Order Deletion with Stock & Cash Reversal RPC
CREATE OR REPLACE FUNCTION public.delete_sales_order_with_reversal(
  p_order_id UUID,
  p_authorized_by TEXT DEFAULT 'Manager',
  p_reason TEXT DEFAULT 'Cancelled by Manager'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_branch_id TEXT;
  v_clean_branch TEXT;
BEGIN
  -- Fetch order details
  SELECT * INTO v_order FROM public.sales_orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  v_branch_id := COALESCE(v_order.branch, 'dagupan_main');
  v_clean_branch := CASE
    WHEN lower(v_branch_id) LIKE '%manila%' THEN 'manila_branch'
    ELSE 'dagupan_main'
  END;

  -- 1. Restore stock in inventory_stock and products_and_inventory for each line item
  FOR v_item IN SELECT * FROM public.sales_order_items WHERE sales_order_id = p_order_id LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.inventory_stock
        SET quantity_on_hand = quantity_on_hand + v_item.quantity,
            last_updated = NOW()
        WHERE product_id = v_item.product_id
          AND branch_id = v_clean_branch;

      UPDATE public.products_and_inventory
        SET stock_quantity = stock_quantity + v_item.quantity
        WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  -- 2. Reverse matching cash_transactions entry (the trigger will automatically decrement the drawer balance)
  DELETE FROM public.cash_transactions
    WHERE reference_no = v_order.order_number;

  -- 3. Delete order items and order
  DELETE FROM public.sales_order_items WHERE sales_order_id = p_order_id;
  DELETE FROM public.sales_orders WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_number', v_order.order_number,
    'authorized_by', p_authorized_by,
    'reason', p_reason
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_sales_order_with_reversal TO anon, authenticated;


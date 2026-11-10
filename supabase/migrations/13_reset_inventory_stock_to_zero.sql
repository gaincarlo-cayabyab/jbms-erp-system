-- ==============================================================================
-- Migration 13: Reset Inventory Stock to Clean Slate (0 Counts)
-- Description:
--   Zero out lingering historical numbers from CSV import across all 2,556 items.
--   Enables store team to conduct fresh physical inventory count and stock-in.
-- ==============================================================================

-- 1. Reset products_and_inventory catalog totals to 0
UPDATE products_and_inventory
SET 
  stock_quantity = 0,
  reserved_stock = 0,
  in_transit_stock = 0,
  quarantine_stock = 0;

-- 2. Reset branch-level inventory_stock records to 0
UPDATE inventory_stock
SET 
  quantity_on_hand = 0,
  reserved_quantity = 0,
  in_transit_quantity = 0,
  quarantine_quantity = 0;

-- 3. Clean up any phantom pending transfer lines
UPDATE stock_transfers
SET status = 'cancelled'
WHERE status = 'pending' OR status = 'in_transit';

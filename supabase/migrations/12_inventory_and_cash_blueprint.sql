-- ============================================================
-- Migration: 12_inventory_and_cash_blueprint.sql
-- JAPA Global Dagupan: Standardized Inventory & Cash Blueprint Architecture
-- ============================================================

-- 1. Standardized Product Attributes & 4-Tab Stock Structure
ALTER TABLE public.products_and_inventory 
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS tab TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS reserved_stock INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS in_transit_stock INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quarantine_stock INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_tab ON public.products_and_inventory(tab);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products_and_inventory(brand);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products_and_inventory(barcode);

-- 2. Multi-Store Stock Attributes (Available, Reserved, In-Transit, Quarantine)
ALTER TABLE public.inventory_stock
  ADD COLUMN IF NOT EXISTS reserved_quantity INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS in_transit_quantity INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quarantine_quantity INT NOT NULL DEFAULT 0;

-- 3. Cash Container Architecture Enhancements
ALTER TABLE public.cash_accounts 
  DROP CONSTRAINT IF EXISTS cash_accounts_account_type_check;

ALTER TABLE public.cash_accounts 
  ADD CONSTRAINT cash_accounts_account_type_check 
  CHECK (account_type IN ('cash_drawer', 'vault', 'manager_safe', 'petty_cash', 'bank_checking', 'bank_savings', 'ewallet', 'in_transit'));

ALTER TABLE public.cash_accounts
  ADD COLUMN IF NOT EXISTS cash_ceiling DECIMAL(15,2) DEFAULT 15000.00,
  ADD COLUMN IF NOT EXISTS default_float DECIMAL(15,2) DEFAULT 5000.00,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Seed Level 2 Manager Safe Boxes
INSERT INTO public.cash_accounts (branch_id, account_name, account_type, account_number, currency, current_balance, is_active, cash_ceiling, default_float)
SELECT 'dagupan_main', 'Manager Back-Office Safe — Dagupan', 'manager_safe', NULL, 'PHP', 25000.00, true, 50000.00, 0.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.cash_accounts WHERE branch_id = 'dagupan_main' AND account_type = 'manager_safe'
);

INSERT INTO public.cash_accounts (branch_id, account_name, account_type, account_number, currency, current_balance, is_active, cash_ceiling, default_float)
SELECT 'manila_branch', 'Manager Back-Office Safe — Manila', 'manager_safe', NULL, 'PHP', 15000.00, true, 50000.00, 0.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.cash_accounts WHERE branch_id = 'manila_branch' AND account_type = 'manager_safe'
);

-- Seed Categories for Safe Drop and Petty Cash
INSERT INTO public.cash_categories (category_name, flow_type, description) VALUES
('POS Till Float Allocation', 'outflow', 'Cash float assigned from Manager Safe to POS Cash Drawer'),
('POS Cash Drawer Float Return', 'inflow', 'Float returned to Manager Safe at shift end'),
('POS Drawer Safe Drop', 'inflow', 'Excess cash dropped from POS Drawer to Manager Safe Box'),
('Drawer Safe Drop Outflow', 'outflow', 'Excess cash removed from POS Cash Drawer during shift'),
('Vault Bank Deposit', 'outflow', 'Consolidated vault funds dispatched to commercial bank')
ON CONFLICT (category_name) DO UPDATE SET
  flow_type = EXCLUDED.flow_type,
  description = EXCLUDED.description;

-- 4. Cash Transactions Audit & Approval Structure
ALTER TABLE public.cash_transactions 
  DROP CONSTRAINT IF EXISTS cash_transactions_status_check;

ALTER TABLE public.cash_transactions 
  ADD CONSTRAINT cash_transactions_status_check 
  CHECK (status IN ('pending', 'completed', 'cancelled', 'reversed'));

ALTER TABLE public.cash_transactions
  ADD COLUMN IF NOT EXISTS is_safe_drop BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversal_of UUID REFERENCES public.cash_transactions(id),
  ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

-- 5. Shift Reconciliations Blind Count & Approval Fields
ALTER TABLE public.cash_reconciliations
  ADD COLUMN IF NOT EXISTS denominations JSONB,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by UUID;

-- 6. Ensure Dev/Admin RLS Policies for All Access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_accounts' AND policyname = 'cash_accounts_all_crud') THEN
    CREATE POLICY "cash_accounts_all_crud" ON public.cash_accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;


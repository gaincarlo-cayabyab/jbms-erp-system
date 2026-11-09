-- ============================================================
-- Migration: 10_cash_management_module.sql
-- Cash Management Engine: Accounts, Categories, Transactions,
-- Shift Reconciliations, Inter-Account Transfers & Balance Triggers
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CASH ACCOUNTS (Vaults, Banks, POS Drawers, Digital Wallets, Petty Cash)
CREATE TABLE IF NOT EXISTS public.cash_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id VARCHAR(50) NOT NULL REFERENCES public.branches(id) ON UPDATE CASCADE,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(30) NOT NULL CHECK (
        account_type IN ('cash_drawer', 'vault', 'bank_checking', 'bank_savings', 'petty_cash', 'ewallet')
    ),
    account_number VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'PHP',
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CASH CATEGORIES
CREATE TABLE IF NOT EXISTS public.cash_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL UNIQUE,
    flow_type VARCHAR(10) NOT NULL CHECK (flow_type IN ('inflow', 'outflow')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Essential Categories
INSERT INTO public.cash_categories (category_name, flow_type, description) VALUES
('POS Retail Sales', 'inflow', 'Daily counter sales from retail registers'),
('Accounts Receivable Settlement', 'inflow', 'Payments collected against outstanding customer invoices'),
('Inter-Branch Transfer In', 'inflow', 'Liquidity received from another branch'),
('Miscellaneous Inflow', 'inflow', 'Scrap sales, refunds, or capital deposits'),
('Vendor/Supplier Settlement', 'outflow', 'Disbursements paid against purchase orders'),
('Payroll Payout', 'outflow', 'Salaries, wages, and employee allowances'),
('Petty Cash Expenditure', 'outflow', 'Daily operational micro-expenses'),
('Utilities & OpEx', 'outflow', 'Electricity, water, internet, rent, and logistics'),
('Inter-Branch Transfer Out', 'outflow', 'Liquidity transferred to another branch')
ON CONFLICT (category_name) DO UPDATE SET
    flow_type = EXCLUDED.flow_type,
    description = EXCLUDED.description;

-- 3. MASTER CASH TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_no VARCHAR(50) NOT NULL UNIQUE,
    branch_id VARCHAR(50) NOT NULL REFERENCES public.branches(id) ON UPDATE CASCADE,
    cash_account_id UUID NOT NULL REFERENCES public.cash_accounts(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES public.cash_categories(id),
    flow_type VARCHAR(10) NOT NULL CHECK (flow_type IN ('inflow', 'outflow')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL CHECK (
        payment_method IN ('cash', 'check', 'bank_transfer', 'ewallet')
    ),
    reference_no VARCHAR(100),
    source_module VARCHAR(30) NOT NULL CHECK (
        source_module IN ('pos', 'sales', 'procurement', 'payroll', 'opex', 'transfer', 'manual')
    ),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    payee_or_payer VARCHAR(150),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. REGISTER SHIFT RECONCILIATION LOG
CREATE TABLE IF NOT EXISTS public.cash_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id VARCHAR(50) NOT NULL REFERENCES public.branches(id) ON UPDATE CASCADE,
    cash_account_id UUID NOT NULL REFERENCES public.cash_accounts(id),
    shift_opened_at TIMESTAMPTZ NOT NULL,
    shift_closed_at TIMESTAMPTZ DEFAULT NOW(),
    opening_balance DECIMAL(15, 2) NOT NULL,
    total_inflows DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_outflows DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    expected_amount DECIMAL(15, 2) NOT NULL,
    actual_amount DECIMAL(15, 2) NOT NULL,
    variance DECIMAL(15, 2) GENERATED ALWAYS AS (actual_amount - expected_amount) STORED,
    variance_reason TEXT,
    reconciled_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INTER-ACCOUNT CASH TRANSFERS
CREATE TABLE IF NOT EXISTS public.cash_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_no VARCHAR(50) NOT NULL UNIQUE,
    from_account_id UUID NOT NULL REFERENCES public.cash_accounts(id),
    to_account_id UUID NOT NULL REFERENCES public.cash_accounts(id),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    transfer_date TIMESTAMPTZ DEFAULT NOW(),
    initiated_by UUID,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AUTOMATIC BALANCE UPDATER TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_cash_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.status = 'completed') THEN
            IF (NEW.flow_type = 'inflow') THEN
                UPDATE public.cash_accounts 
                SET current_balance = current_balance + NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.cash_account_id;
            ELSIF (NEW.flow_type = 'outflow') THEN
                UPDATE public.cash_accounts 
                SET current_balance = current_balance - NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.cash_account_id;
            END IF;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status = 'pending' AND NEW.status = 'completed') THEN
            IF (NEW.flow_type = 'inflow') THEN
                UPDATE public.cash_accounts 
                SET current_balance = current_balance + NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.cash_account_id;
            ELSIF (NEW.flow_type = 'outflow') THEN
                UPDATE public.cash_accounts 
                SET current_balance = current_balance - NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.cash_account_id;
            END IF;
        ELSIF (OLD.status = 'completed' AND NEW.status = 'cancelled') THEN
            IF (NEW.flow_type = 'inflow') THEN
                UPDATE public.cash_accounts 
                SET current_balance = current_balance - NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.cash_account_id;
            ELSIF (NEW.flow_type = 'outflow') THEN
                UPDATE public.cash_accounts 
                SET current_balance = current_balance + NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.cash_account_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_cash_balance ON public.cash_transactions;
CREATE TRIGGER trg_update_cash_balance
AFTER INSERT OR UPDATE ON public.cash_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_cash_account_balance();

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_cash_transactions_branch ON public.cash_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_account ON public.cash_transactions(cash_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON public.cash_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_branch ON public.cash_accounts(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_reconciliations_branch ON public.cash_reconciliations(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_from ON public.cash_transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_to ON public.cash_transfers(to_account_id);

-- 8. ROW LEVEL SECURITY (RLS) & GRANTS
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transfers ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.cash_accounts TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.cash_categories TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.cash_transactions TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.cash_reconciliations TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.cash_transfers TO anon, authenticated, service_role, postgres;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_accounts' AND policyname = 'cash_accounts_all_access') THEN
    CREATE POLICY "cash_accounts_all_access" ON public.cash_accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_categories' AND policyname = 'cash_categories_all_access') THEN
    CREATE POLICY "cash_categories_all_access" ON public.cash_categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_transactions' AND policyname = 'cash_transactions_all_access') THEN
    CREATE POLICY "cash_transactions_all_access" ON public.cash_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_reconciliations' AND policyname = 'cash_reconciliations_all_access') THEN
    CREATE POLICY "cash_reconciliations_all_access" ON public.cash_reconciliations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_transfers' AND policyname = 'cash_transfers_all_access') THEN
    CREATE POLICY "cash_transfers_all_access" ON public.cash_transfers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 9. SEED INITIAL MULTI-BRANCH VAULTS, DRAWERS & ACCOUNTS
INSERT INTO public.cash_accounts (branch_id, account_name, account_type, account_number, currency, current_balance, is_active)
VALUES
  -- Dagupan Main Branch Accounts
  ('dagupan_main', 'Main Vault — Dagupan', 'vault', NULL, 'PHP', 50000.00, true),
  ('dagupan_main', 'POS Cash Drawer 01 — Dagupan', 'cash_drawer', NULL, 'PHP', 5000.00, true),
  ('dagupan_main', 'BDO Corporate Checking — Dagupan', 'bank_checking', '0012-3456-7890', 'PHP', 250000.00, true),
  ('dagupan_main', 'BPI Operations Savings — Dagupan', 'bank_savings', '0098-7654-3210', 'PHP', 100000.00, true),
  ('dagupan_main', 'Petty Cash Fund — Dagupan', 'petty_cash', NULL, 'PHP', 10000.00, true),
  ('dagupan_main', 'JAPA Dagupan GCash Merchant', 'ewallet', '0917-123-4567', 'PHP', 25000.00, true),

  -- Manila Operations Hub Accounts
  ('manila_branch', 'Main Vault — Manila', 'vault', NULL, 'PHP', 35000.00, true),
  ('manila_branch', 'POS Cash Drawer 01 — Manila', 'cash_drawer', NULL, 'PHP', 5000.00, true),
  ('manila_branch', 'Metrobank Manila Branch Hub', 'bank_checking', '0045-6789-0123', 'PHP', 150000.00, true),
  ('manila_branch', 'Petty Cash Fund — Manila', 'petty_cash', NULL, 'PHP', 8000.00, true),
  ('manila_branch', 'JAPA Manila GCash Merchant', 'ewallet', '0918-987-6543', 'PHP', 20000.00, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Migration: 18_clean_phantom_cash_tx_and_fix_trigger.sql
-- 1. Update update_cash_account_balance trigger function to handle DELETE
-- 2. Remove phantom duplicate cash_transactions from earlier loading-hang (INV-20261110-9363)
-- 3. Reconcile POS Cash Drawer 01 balance to match verified transactions (35.00)
-- ============================================================

-- 1. Upgrade trigger function to handle INSERT, UPDATE, and DELETE
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
        RETURN NEW;

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
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.status = 'completed') THEN
            IF (OLD.flow_type = 'inflow') THEN
                UPDATE public.cash_accounts 
                SET current_balance = current_balance - OLD.amount,
                    updated_at = NOW()
                WHERE id = OLD.cash_account_id;
            ELSIF (OLD.flow_type = 'outflow') THEN
                UPDATE public.cash_accounts 
                SET current_balance = current_balance + OLD.amount,
                    updated_at = NOW()
                WHERE id = OLD.cash_account_id;
            END IF;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger with DELETE support
DROP TRIGGER IF EXISTS trg_update_cash_balance ON public.cash_transactions;
CREATE TRIGGER trg_update_cash_balance
AFTER INSERT OR UPDATE OR DELETE ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_cash_account_balance();

-- 2. Remove phantom duplicate transactions from the hung loading test
DELETE FROM public.cash_transactions
WHERE reference_no = 'INV-20261110-9363';

-- 3. Explicitly reconcile POS Cash Drawer 01 to match genuine settled cash transactions (35.00)
UPDATE public.cash_accounts
SET current_balance = COALESCE((
    SELECT SUM(CASE WHEN flow_type = 'inflow' THEN amount ELSE -amount END)
    FROM public.cash_transactions
    WHERE cash_account_id = public.cash_accounts.id
      AND status = 'completed'
), 0.00),
updated_at = NOW()
WHERE account_type = 'cash_drawer'
  AND branch_id = 'dagupan_main';

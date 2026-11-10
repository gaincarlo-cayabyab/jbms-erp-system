-- ============================================================
-- Migration: 14_reset_cash_balances_to_zero.sql
-- Reset all seeded demo/fake cash account balances to ₱0.00
-- User will enter real starting balances manually via the UI
-- ============================================================

UPDATE public.cash_accounts
SET current_balance = 0.00,
    updated_at = NOW()
WHERE is_archived = false;

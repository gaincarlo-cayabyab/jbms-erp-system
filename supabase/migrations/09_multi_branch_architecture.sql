-- ============================================================
-- Migration: 09_multi_branch_architecture.sql
-- Multi-Branch ERP Architecture, Inter-Branch STO & Audit Logs
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- 1. Branch Master Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    contact_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Dagupan Main and Manila Branch
INSERT INTO public.branches (id, name, address, contact_number, is_active)
VALUES
    ('dagupan_main', 'JAPA Dagupan (Main Branch)', 'AB Fernandez Ave, Downtown District, Dagupan City, Pangasinan', '(075) 522-1234', true),
    ('manila_branch', 'JAPA Manila Operations Hub', 'Morayta St, Sampaloc, Manila, Metro Manila', '(02) 8123-4567', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    contact_number = EXCLUDED.contact_number,
    is_active = EXCLUDED.is_active;

-- ------------------------------------------------------------
-- 2. Associate Branch to App Users & Profiles
-- ------------------------------------------------------------
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS branch_id VARCHAR(32) REFERENCES public.branches(id);

-- Update branch assignment for enterprise app_users
UPDATE public.app_users SET branch_id = 'dagupan_main' WHERE full_name LIKE '%Dagupan%' OR full_name LIKE '%Admin%';
UPDATE public.app_users SET branch_id = 'manila_branch' WHERE full_name LIKE '%Manila%';

-- Also ensure profiles has primary_branch_id
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS primary_branch_id VARCHAR(32) REFERENCES public.branches(id);

-- ------------------------------------------------------------
-- 3. Multi-Store Inventory Stock Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id VARCHAR(32) NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products_and_inventory(id) ON DELETE CASCADE,
    quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    reorder_level INT NOT NULL DEFAULT 10,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_branch ON public.inventory_stock(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_product ON public.inventory_stock(product_id);

-- ------------------------------------------------------------
-- 4. Seed Standard Products into products_and_inventory
-- ------------------------------------------------------------
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level)
VALUES
    ('11111111-1111-4111-a111-111111111111', 'JAPA-TEE-WHT', 'JAPA Classic Dry-Fit Tee (White)', 'Apparel', 350.00, 180.00, 150, 20),
    ('22222222-2222-4222-a222-222222222222', 'JAPA-JSY-SUB', 'JAPA Custom Basketball Jersey (Sublimated)', 'Apparel', 850.00, 420.00, 85, 15),
    ('33333333-3333-4333-a333-333333333333', 'JAPA-COT-BLK', 'JAPA Heavyweight Cotton Tee (Black)', 'Apparel', 450.00, 220.00, 120, 25),
    ('44444444-4444-4444-a444-444444444444', 'SUB-INK-CMYK', 'Sublimation Ink Set (CMYK 1-Liter Bottles)', 'Consumables', 2800.00, 1600.00, 40, 8),
    ('55555555-5555-4555-a555-555555555555', 'VINYL-HT-WHT', 'Heat Transfer Vinyl Roll (White, 50m)', 'Raw Materials', 1950.00, 1100.00, 30, 5),
    ('66666666-6666-4666-a666-666666666666', 'JAPA-CAP-EMB', 'JAPA Snapback Cap (3D Embroidered)', 'Headwear', 400.00, 190.00, 95, 15),
    ('77777777-7777-4777-a777-777777777777', 'PAP-SUB-A3', 'Sublimation Transfer Paper (A3, 100 Sheets)', 'Consumables', 650.00, 320.00, 60, 12),
    ('88888888-8888-4888-a888-888888888888', 'JAPA-HDY-NVY', 'JAPA Pullover Fleece Hoodie (Navy Blue)', 'Apparel', 1200.00, 650.00, 50, 10)
ON CONFLICT (sku) DO UPDATE SET
    item_name = EXCLUDED.item_name,
    category = EXCLUDED.category,
    unit_price = EXCLUDED.unit_price,
    cost_price = EXCLUDED.cost_price;

-- Seed inventory_stock for both Dagupan and Manila branches
INSERT INTO public.inventory_stock (branch_id, product_id, quantity_on_hand, reorder_level)
VALUES
    -- Dagupan Main Branch Stock
    ('dagupan_main', '11111111-1111-4111-a111-111111111111', 95, 20),
    ('dagupan_main', '22222222-2222-4222-a222-222222222222', 50, 15),
    ('dagupan_main', '33333333-3333-4333-a333-333333333333', 75, 25),
    ('dagupan_main', '44444444-4444-4444-a444-444444444444', 25, 8),
    ('dagupan_main', '55555555-5555-4555-a555-555555555555', 18, 5),
    ('dagupan_main', '66666666-6666-4666-a666-666666666666', 60, 15),
    ('dagupan_main', '77777777-7777-4777-a777-777777777777', 40, 12),
    ('dagupan_main', '88888888-8888-4888-a888-888888888888', 30, 10),

    -- Manila Operations Hub Stock
    ('manila_branch', '11111111-1111-4111-a111-111111111111', 55, 20),
    ('manila_branch', '22222222-2222-4222-a222-222222222222', 35, 15),
    ('manila_branch', '33333333-3333-4333-a333-333333333333', 45, 25),
    ('manila_branch', '44444444-4444-4444-a444-444444444444', 15, 8),
    ('manila_branch', '55555555-5555-4555-a555-555555555555', 12, 5),
    ('manila_branch', '66666666-6666-4666-a666-666666666666', 35, 15),
    ('manila_branch', '77777777-7777-4777-a777-777777777777', 20, 12),
    ('manila_branch', '88888888-8888-4888-a888-888888888888', 20, 10)
ON CONFLICT (branch_id, product_id) DO UPDATE SET
    quantity_on_hand = EXCLUDED.quantity_on_hand,
    reorder_level = EXCLUDED.reorder_level,
    last_updated = NOW();

-- ------------------------------------------------------------
-- 5. Inter-Branch Stock Transfer (STO) Tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number VARCHAR(100) UNIQUE NOT NULL,
    source_branch_id VARCHAR(32) NOT NULL REFERENCES public.branches(id),
    destination_branch_id VARCHAR(32) NOT NULL REFERENCES public.branches(id),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'requested', 'dispatched', 'in_transit', 'received', 'variance_flagged', 'cancelled')),
    dispatched_by UUID REFERENCES public.app_users(id),
    received_by UUID REFERENCES public.app_users(id),
    dispatched_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products_and_inventory(id) ON DELETE CASCADE,
    quantity_sent INT NOT NULL CHECK (quantity_sent > 0),
    quantity_received INT DEFAULT 0 CHECK (quantity_received >= 0),
    variance_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_source ON public.stock_transfers(source_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_dest ON public.stock_transfers(destination_branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON public.stock_transfers(status);

-- Seed a sample pending STO between Dagupan and Manila
INSERT INTO public.stock_transfers (id, transfer_number, source_branch_id, destination_branch_id, status, notes, created_at)
VALUES
    ('99999999-9999-4999-a999-999999999999', 'STO-202611-001', 'dagupan_main', 'manila_branch', 'in_transit', 'Urgent apparel blanks replenishment for Manila sublimation orders', NOW())
ON CONFLICT (transfer_number) DO NOTHING;

INSERT INTO public.stock_transfer_items (transfer_id, product_id, quantity_sent, quantity_received)
VALUES
    ('99999999-9999-4999-a999-999999999999', '11111111-1111-4111-a111-111111111111', 25, 0),
    ('99999999-9999-4999-a999-999999999999', '44444444-4444-4444-a444-444444444444', 5, 0)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 6. Audit Logging & System Ledger
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID,
    user_name TEXT,
    role TEXT,
    branch_id VARCHAR(32) REFERENCES public.branches(id),
    action_type VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    impersonated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_audit_branch_timestamp ON public.audit_logs(branch_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action_type);

-- Seed sample audit entries
INSERT INTO public.audit_logs (user_name, role, branch_id, action_type, entity_name, entity_id, new_state)
VALUES
    ('System Initializer', 'Admin', 'dagupan_main', 'MULTI_BRANCH_INIT', 'branches', 'dagupan_main', '{"status":"activated","branch":"Dagupan Main"}'::jsonb),
    ('Gain Carlo (Admin)', 'Admin', 'dagupan_main', 'SECURITY_CHECKPOINT', 'app_users', '2e7592c5-2e8c-4449-83f8-10cdcb2d06c6', '{"event":"v1.0-checkpoint"}'::jsonb),
    ('Store Manager — Dagupan (DAG)', 'Manager', 'dagupan_main', 'STO_DISPATCH', 'stock_transfers', 'STO-202611-001', '{"dispatched_items":30,"dest":"manila_branch"}'::jsonb);

-- ------------------------------------------------------------
-- 7. Stored Procedures / RPC Functions for Stock Transfers
-- ------------------------------------------------------------

-- Function: Dispatch Stock Transfer (deducts stock from source branch)
CREATE OR REPLACE FUNCTION public.dispatch_stock_transfer(
    p_transfer_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = p_transfer_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transfer order not found');
    END IF;

    IF v_transfer.status NOT IN ('draft', 'requested') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transfer is already dispatched or processed');
    END IF;

    -- Deduct stock from source branch
    FOR v_item IN SELECT * FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id LOOP
        UPDATE public.inventory_stock
        SET quantity_on_hand = GREATEST(0, quantity_on_hand - v_item.quantity_sent),
            last_updated = NOW()
        WHERE branch_id = v_transfer.source_branch_id AND product_id = v_item.product_id;
    END LOOP;

    -- Update transfer status
    UPDATE public.stock_transfers
    SET status = 'in_transit',
        dispatched_by = p_user_id,
        dispatched_at = NOW()
    WHERE id = p_transfer_id;

    -- Log audit entry
    INSERT INTO public.audit_logs (user_id, branch_id, action_type, entity_name, entity_id, new_state)
    VALUES (p_user_id, v_transfer.source_branch_id, 'STO_DISPATCH', 'stock_transfers', p_transfer_id::text, jsonb_build_object('transfer_number', v_transfer.transfer_number, 'status', 'in_transit'));

    RETURN jsonb_build_object('success', true, 'message', 'Stock transfer dispatched successfully');
END;
$$;

-- Function: Receive Stock Transfer (adds stock to destination branch, detects variance)
CREATE OR REPLACE FUNCTION public.receive_stock_transfer(
    p_transfer_id UUID,
    p_user_id UUID,
    p_items JSONB -- Array of { item_id: UUID, quantity_received: INT, variance_reason: TEXT }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer RECORD;
    v_item JSONB;
    v_has_variance BOOLEAN := false;
    v_stock_item RECORD;
BEGIN
    SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = p_transfer_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transfer order not found');
    END IF;

    IF v_transfer.status != 'in_transit' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transfer is not in transit');
    END IF;

    -- Process received items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT * INTO v_stock_item FROM public.stock_transfer_items WHERE id = (v_item->>'item_id')::UUID;
        
        UPDATE public.stock_transfer_items
        SET quantity_received = (v_item->>'quantity_received')::INT,
            variance_reason = (v_item->>'variance_reason')
        WHERE id = (v_item->>'item_id')::UUID;

        IF (v_item->>'quantity_received')::INT != v_stock_item.quantity_sent THEN
            v_has_variance := true;
        END IF;

        -- Add received quantity to destination branch
        INSERT INTO public.inventory_stock (branch_id, product_id, quantity_on_hand, last_updated)
        VALUES (v_transfer.destination_branch_id, v_stock_item.product_id, (v_item->>'quantity_received')::INT, NOW())
        ON CONFLICT (branch_id, product_id)
        DO UPDATE SET
            quantity_on_hand = public.inventory_stock.quantity_on_hand + EXCLUDED.quantity_on_hand,
            last_updated = NOW();
    END LOOP;

    -- Set final status
    UPDATE public.stock_transfers
    SET status = CASE WHEN v_has_variance THEN 'variance_flagged' ELSE 'received' END,
        received_by = p_user_id,
        received_at = NOW()
    WHERE id = p_transfer_id;

    -- Log audit entry
    INSERT INTO public.audit_logs (user_id, branch_id, action_type, entity_name, entity_id, new_state)
    VALUES (p_user_id, v_transfer.destination_branch_id, 'STO_RECEIVE', 'stock_transfers', p_transfer_id::text, jsonb_build_object('transfer_number', v_transfer.transfer_number, 'has_variance', v_has_variance));

    RETURN jsonb_build_object(
        'success', true, 
        'status', CASE WHEN v_has_variance THEN 'variance_flagged' ELSE 'received' END,
        'message', 'Stock transfer received and verified'
    );
END;
$$;

-- Function: Log Audit Event RPC
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_user_id UUID,
    p_user_name TEXT,
    p_role TEXT,
    p_branch_id VARCHAR(32),
    p_action_type VARCHAR(100),
    p_entity_name VARCHAR(100),
    p_entity_id VARCHAR(100),
    p_new_state JSONB DEFAULT NULL,
    p_previous_state JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id, user_name, role, branch_id, action_type, entity_name, entity_id, new_state, previous_state
    )
    VALUES (
        p_user_id, p_user_name, p_role, p_branch_id, p_action_type, p_entity_name, p_entity_id, p_new_state, p_previous_state
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- ------------------------------------------------------------
-- 8. Enable Row Level Security & Operational Policies
-- ------------------------------------------------------------
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read and write for operational ERP tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'branches: allow all') THEN
        CREATE POLICY "branches: allow all" ON public.branches FOR ALL USING (TRUE) WITH CHECK (TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_stock' AND policyname = 'inventory_stock: allow all') THEN
        CREATE POLICY "inventory_stock: allow all" ON public.inventory_stock FOR ALL USING (TRUE) WITH CHECK (TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_transfers' AND policyname = 'stock_transfers: allow all') THEN
        CREATE POLICY "stock_transfers: allow all" ON public.stock_transfers FOR ALL USING (TRUE) WITH CHECK (TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_transfer_items' AND policyname = 'stock_transfer_items: allow all') THEN
        CREATE POLICY "stock_transfer_items: allow all" ON public.stock_transfer_items FOR ALL USING (TRUE) WITH CHECK (TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs: allow all') THEN
        CREATE POLICY "audit_logs: allow all" ON public.audit_logs FOR ALL USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;


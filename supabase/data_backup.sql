-- ============================================================
-- Supabase Cloud Live Database Data Backup
-- Project Ref: wcviadvulpkzkzqwnrdb (jbms-erp)
-- Timestamp: 2026-11-06T07:04:27.681Z
-- ============================================================

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET row_security = off;

-- ------------------------------------------------------------
-- Table Data: public.profiles (2 rows)
-- ------------------------------------------------------------
INSERT INTO public.profiles (id, full_name, role, branch, created_at, primary_branch_id) VALUES ('2f841124-b741-404e-aef6-d2ab6168efd1', 'Lead Administrator', 'Production_Staff', NULL, '2026-11-05T02:12:31.457348+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, full_name, role, branch, created_at, primary_branch_id) VALUES ('4b8f72c1-5e88-4192-a2bb-609948571285', NULL, 'Production_Staff', NULL, '2026-11-06T02:51:00.784316+00:00', NULL) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Table Data: public.customers (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.products_and_inventory (8 rows)
-- ------------------------------------------------------------
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('11111111-1111-4111-a111-111111111111', 'JAPA-TEE-WHT', 'JAPA Classic Dry-Fit Tee (White)', 'Apparel', 350, 180, 150, 20, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('33333333-3333-4333-a333-333333333333', 'JAPA-COT-BLK', 'JAPA Heavyweight Cotton Tee (Black)', 'Apparel', 450, 220, 120, 25, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('44444444-4444-4444-a444-444444444444', 'SUB-INK-CMYK', 'Sublimation Ink Set (CMYK 1-Liter Bottles)', 'Consumables', 2800, 1600, 40, 8, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('55555555-5555-4555-a555-555555555555', 'VINYL-HT-WHT', 'Heat Transfer Vinyl Roll (White, 50m)', 'Raw Materials', 1950, 1100, 30, 5, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('66666666-6666-4666-a666-666666666666', 'JAPA-CAP-EMB', 'JAPA Snapback Cap (3D Embroidered)', 'Headwear', 400, 190, 95, 15, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('77777777-7777-4777-a777-777777777777', 'PAP-SUB-A3', 'Sublimation Transfer Paper (A3, 100 Sheets)', 'Consumables', 650, 320, 60, 12, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('88888888-8888-4888-a888-888888888888', 'JAPA-HDY-NVY', 'JAPA Pullover Fleece Hoodie (Navy Blue)', 'Apparel', 1200, 650, 50, 10, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.products_and_inventory (id, sku, item_name, category, unit_price, cost_price, stock_quantity, reorder_level, created_at) VALUES ('22222222-2222-4222-a222-222222222222', 'JAPA-JSY-SUB', 'JAPA Custom Basketball Jersey (Sublimated)', 'Apparel', 850, 420, 84, 15, '2026-11-06T04:39:49.689568+00:00') ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Table Data: public.sales_orders (1 rows)
-- ------------------------------------------------------------
INSERT INTO public.sales_orders (id, order_number, customer_id, total_amount, payment_status, order_status, branch, created_at) VALUES ('9f0e3258-e7d6-4a72-82a7-903f5a498d27', 'INV-20261106-6767', NULL, 850, 'Paid', 'Delivered', 'JAPA Dagupan (Main Branch)', '2026-11-06T06:38:46.594086+00:00') ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Table Data: public.job_orders (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.expenses (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.attendance_logs (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.payroll_records (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.app_users (13 rows)
-- ------------------------------------------------------------
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('c17c2550-000a-4aac-afa3-dda5bb03d1fe', 'Store Manager — Dagupan (DAG)', 'Manager', '$2a$08$ECKNBOOIR89sF7QHV2acd.JWztD6TaGIbNkItf4ojOou/L/I0dAiK', true, '2026-11-06T03:06:38.886798+00:00', '2026-11-06T03:06:38.886798+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('e32dac5f-c442-4659-9309-07434b7ed51c', 'Cashier POS — Dagupan (DAG)', 'Cashier', '$2a$08$wgQVcOqWK/S7hNFL0QES0OdQJoYYgTmZFg8itXGo0my57N5jaXq1G', true, '2026-11-06T03:06:39.287254+00:00', '2026-11-06T03:06:39.287254+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('7c2a66d2-0308-4631-b843-98d53029ab9e', 'Inventory Officer — Dagupan (DAG)', 'Inventory', '$2a$08$PXCjCtOWMKMHfvO7dR.tNeaISrBGrAvVaCZE.GoJStXlxe6rdy1Ri', true, '2026-11-06T03:06:39.689525+00:00', '2026-11-06T03:06:39.689525+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('73e5af98-ad35-46af-bb5e-dc7e0e02f0db', 'Production Staff — Dagupan (DAG)', 'Staff', '$2a$08$utlibDB7stPkdCC.gtphluQ4Byyzi3mJqNAy6yrSMU57ABTW5G6ym', true, '2026-11-06T03:06:40.217086+00:00', '2026-11-06T03:06:40.217086+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('b603e120-dece-4cac-885a-1fff11bd93d3', 'Store Manager — Manila (MNL)', 'Manager', '$2a$08$DxzCHKMvRnyPn8eA.p5eiOx5SUPf2rVcUX2NR.g2ABBYwHTKdVY5G', true, '2026-11-06T03:06:39.106392+00:00', '2026-11-06T03:06:39.106392+00:00', 'manila_branch') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('2baa314b-1af9-4593-89bb-f57feb4abc07', 'Cashier POS — Manila (MNL)', 'Cashier', '$2a$08$SnLyXnm8Xx3VAO.L0gdpuOMUNZ4OqToCQe3ICqjxEYSu1zXBxosN.', true, '2026-11-06T03:06:39.458033+00:00', '2026-11-06T03:06:39.458033+00:00', 'manila_branch') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('e7004842-5ccf-4ac0-9f12-7ebb34262143', 'Inventory Officer — Manila (MNL)', 'Inventory', '$2a$08$OqMnE401PnqoD4suWcqGA.ryvi/H4.1AyOR4zUpP5Mzy0M8M/8IHu', true, '2026-11-06T03:06:39.99607+00:00', '2026-11-06T03:06:39.99607+00:00', 'manila_branch') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('8414b40f-d834-4e39-b7a7-4a0298cf8159', 'Production Staff — Manila (MNL)', 'Staff', '$2a$08$aWD9oXd7YesxKjGZ/CkmzOt122r6KHdaU7LXK2rntO7OwW7Oz1PCi', true, '2026-11-06T03:06:40.55964+00:00', '2026-11-06T03:06:40.55964+00:00', 'manila_branch') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('2e7592c5-2e8c-4449-83f8-10cdcb2d06c6', 'Gain Carlo (Admin)', 'Admin', '$2a$08$VxmB2dvk0RFGfsdVFLAtHu5vgSlPCZYKxoI.UujdPmjq1Gxkg1iOa', true, '2026-11-06T03:06:38.155395+00:00', '2026-11-06T03:06:38.155395+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('6ed88c01-453e-4036-9cfe-e3cabb194cba', 'Belinda Dee (CEO)', 'Admin', '$2a$08$MnZeTbeh7uhLYcHrT68TBOhmKYanosMWQaPzVR1qF1bMeX8Q6rTfi', true, '2026-11-06T03:06:38.466191+00:00', '2026-11-06T03:06:38.466191+00:00', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('d1111111-1111-4000-8000-000000000001', 'JAPA Pearly', 'Cashier', '$2a$08$IPA65Ag2DVBMRhTcvRLI.e/Dbs7RA59YHsA9.CxsGCcR7Qqrl7FYG', true, '2026-11-06T06:59:26.655554+00:00', '2026-11-06T06:59:26.655554+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('d1111111-1111-4000-8000-000000000002', 'JAPA Ivan', 'Cashier', '$2a$08$P.ERmUjUFYeNem3Wgg3QRu3Urk.R.vMyZ4woR3AoZ1U0emxCNRbz2', true, '2026-11-06T06:59:27.642302+00:00', '2026-11-06T06:59:27.642302+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at, branch_id) VALUES ('d1111111-1111-4000-8000-000000000003', 'JAPA Lanie', 'Cashier', '$2a$08$RKamDsCm0oCux6KLpMv8tOyBlHE2Z1JQqdqeE.IsdmZX4lm.NIeY2', true, '2026-11-06T06:59:31.453846+00:00', '2026-11-06T06:59:31.453846+00:00', 'dagupan_main') ON CONFLICT DO NOTHING;


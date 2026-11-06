-- ============================================================
-- Supabase Cloud Live Database Data Backup
-- Project Ref: wcviadvulpkzkzqwnrdb (jbms-erp)
-- Timestamp: 2026-11-06T03:48:54.682Z
-- ============================================================

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET row_security = off;

-- ------------------------------------------------------------
-- Table Data: public.profiles (2 rows)
-- ------------------------------------------------------------
INSERT INTO public.profiles (id, full_name, role, branch, created_at) VALUES ('2f841124-b741-404e-aef6-d2ab6168efd1', 'Lead Administrator', 'Production_Staff', NULL, '2026-11-05T02:12:31.457348+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, full_name, role, branch, created_at) VALUES ('4b8f72c1-5e88-4192-a2bb-609948571285', NULL, 'Production_Staff', NULL, '2026-11-06T02:51:00.784316+00:00') ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Table Data: public.customers (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.products_and_inventory (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

-- ------------------------------------------------------------
-- Table Data: public.sales_orders (0 rows)
-- ------------------------------------------------------------
-- (0 rows)

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
-- Table Data: public.app_users (10 rows)
-- ------------------------------------------------------------
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('2e7592c5-2e8c-4449-83f8-10cdcb2d06c6', 'Gain Carlo (Admin)', 'Admin', '$2a$08$5ZRooikMW1WWZdHnYoemNOWkzZXl9wh1f5ge2Ddac9J5mT12Y/tH6', true, '2026-11-06T03:06:38.155395+00:00', '2026-11-06T03:06:38.155395+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('6ed88c01-453e-4036-9cfe-e3cabb194cba', 'Belinda Dee (CEO)', 'Admin', '$2a$08$L2G6cycHw0XgIdC9t1/vu.Oeb.TYs1AOVHAeRmmrFhJCl5HKt9106', true, '2026-11-06T03:06:38.466191+00:00', '2026-11-06T03:06:38.466191+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('c17c2550-000a-4aac-afa3-dda5bb03d1fe', 'Store Manager — Dagupan (DAG)', 'Manager', '$2a$08$ECKNBOOIR89sF7QHV2acd.JWztD6TaGIbNkItf4ojOou/L/I0dAiK', true, '2026-11-06T03:06:38.886798+00:00', '2026-11-06T03:06:38.886798+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('b603e120-dece-4cac-885a-1fff11bd93d3', 'Store Manager — Manila (MNL)', 'Manager', '$2a$08$DxzCHKMvRnyPn8eA.p5eiOx5SUPf2rVcUX2NR.g2ABBYwHTKdVY5G', true, '2026-11-06T03:06:39.106392+00:00', '2026-11-06T03:06:39.106392+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('e32dac5f-c442-4659-9309-07434b7ed51c', 'Cashier POS — Dagupan (DAG)', 'Cashier', '$2a$08$wgQVcOqWK/S7hNFL0QES0OdQJoYYgTmZFg8itXGo0my57N5jaXq1G', true, '2026-11-06T03:06:39.287254+00:00', '2026-11-06T03:06:39.287254+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('2baa314b-1af9-4593-89bb-f57feb4abc07', 'Cashier POS — Manila (MNL)', 'Cashier', '$2a$08$SnLyXnm8Xx3VAO.L0gdpuOMUNZ4OqToCQe3ICqjxEYSu1zXBxosN.', true, '2026-11-06T03:06:39.458033+00:00', '2026-11-06T03:06:39.458033+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('7c2a66d2-0308-4631-b843-98d53029ab9e', 'Inventory Officer — Dagupan (DAG)', 'Inventory', '$2a$08$PXCjCtOWMKMHfvO7dR.tNeaISrBGrAvVaCZE.GoJStXlxe6rdy1Ri', true, '2026-11-06T03:06:39.689525+00:00', '2026-11-06T03:06:39.689525+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('e7004842-5ccf-4ac0-9f12-7ebb34262143', 'Inventory Officer — Manila (MNL)', 'Inventory', '$2a$08$OqMnE401PnqoD4suWcqGA.ryvi/H4.1AyOR4zUpP5Mzy0M8M/8IHu', true, '2026-11-06T03:06:39.99607+00:00', '2026-11-06T03:06:39.99607+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('73e5af98-ad35-46af-bb5e-dc7e0e02f0db', 'Production Staff — Dagupan (DAG)', 'Staff', '$2a$08$utlibDB7stPkdCC.gtphluQ4Byyzi3mJqNAy6yrSMU57ABTW5G6ym', true, '2026-11-06T03:06:40.217086+00:00', '2026-11-06T03:06:40.217086+00:00') ON CONFLICT DO NOTHING;
INSERT INTO public.app_users (id, full_name, role, pin_hash, is_active, created_at, updated_at) VALUES ('8414b40f-d834-4e39-b7a7-4a0298cf8159', 'Production Staff — Manila (MNL)', 'Staff', '$2a$08$aWD9oXd7YesxKjGZ/CkmzOt122r6KHdaU7LXK2rntO7OwW7Oz1PCi', true, '2026-11-06T03:06:40.55964+00:00', '2026-11-06T03:06:40.55964+00:00') ON CONFLICT DO NOTHING;


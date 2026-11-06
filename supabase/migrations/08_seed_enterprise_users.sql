-- Migration 08: Clean and Seed JAPA Global Enterprise Users with Secured PINs

TRUNCATE TABLE public.app_users CASCADE;

-- Insert Administrators
INSERT INTO public.app_users (full_name, role, pin_hash, is_active)
VALUES
  ('Gain Carlo (Admin)', 'Admin', crypt('0820', gen_salt('bf', 8)), true),
  ('Belinda Dee (CEO)', 'Admin', crypt('1888', gen_salt('bf', 8)), true);

-- Insert Store Managers (Dagupan & Manila)
INSERT INTO public.app_users (full_name, role, pin_hash, is_active)
VALUES
  ('Store Manager — Dagupan (DAG)', 'Manager', crypt('6284', gen_salt('bf', 8)), true),
  ('Store Manager — Manila (MNL)', 'Manager', crypt('9147', gen_salt('bf', 8)), true);

-- Insert Cashier POS (Dagupan & Manila) and Dagupan Shift Staff
INSERT INTO public.app_users (full_name, role, pin_hash, is_active)
VALUES
  ('Cashier POS — Dagupan (DAG)', 'Cashier', crypt('5829', gen_salt('bf', 8)), true),
  ('JAPA Pearly', 'Cashier', crypt('8168', gen_salt('bf', 8)), true),
  ('JAPA Ivan', 'Cashier', crypt('7168', gen_salt('bf', 8)), true),
  ('JAPA Lanie', 'Cashier', crypt('0119', gen_salt('bf', 8)), true),
  ('Cashier POS — Manila (MNL)', 'Cashier', crypt('3716', gen_salt('bf', 8)), true);

-- Insert Inventory Officers (Dagupan & Manila)
INSERT INTO public.app_users (full_name, role, pin_hash, is_active)
VALUES
  ('Inventory Officer — Dagupan (DAG)', 'Inventory', crypt('4938', gen_salt('bf', 8)), true),
  ('Inventory Officer — Manila (MNL)', 'Inventory', crypt('8521', gen_salt('bf', 8)), true);

-- Insert Production Staff (Dagupan & Manila)
INSERT INTO public.app_users (full_name, role, pin_hash, is_active)
VALUES
  ('Production Staff — Dagupan (DAG)', 'Staff', crypt('2694', gen_salt('bf', 8)), true),
  ('Production Staff — Manila (MNL)', 'Staff', crypt('7153', gen_salt('bf', 8)), true);


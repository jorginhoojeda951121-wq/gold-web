-- Migration: Add user_id columns to all tables for data isolation
-- This ensures each user only sees their own data in Supabase
-- Run this migration to add user_id columns to tables that don't have them

-- Function to safely add user_id column if it doesn't exist
CREATE OR REPLACE FUNCTION add_user_id_column_if_not_exists(p_table_name TEXT, p_column_name TEXT DEFAULT 'user_id')
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name 
        AND column_name = p_column_name
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I UUID REFERENCES auth.users(id) ON DELETE CASCADE', p_table_name, p_column_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_%I ON %I(%I)', p_table_name, p_column_name, p_table_name, p_column_name);
        RAISE NOTICE 'Added % column to % table', p_column_name, p_table_name;
    ELSE
        RAISE NOTICE 'Column % already exists in % table', p_column_name, p_table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add user_id to all tables that need data isolation
SELECT add_user_id_column_if_not_exists('inventory', 'user_id');
SELECT add_user_id_column_if_not_exists('gold', 'user_id');
SELECT add_user_id_column_if_not_exists('jewelry', 'user_id');
SELECT add_user_id_column_if_not_exists('stones', 'user_id');
SELECT add_user_id_column_if_not_exists('staff', 'user_id');
SELECT add_user_id_column_if_not_exists('customer_ledger', 'user_id');
SELECT add_user_id_column_if_not_exists('sales', 'user_id');
SELECT add_user_id_column_if_not_exists('sale_items', 'user_id');
SELECT add_user_id_column_if_not_exists('customers', 'user_id');
SELECT add_user_id_column_if_not_exists('craftsmen', 'user_id');
SELECT add_user_id_column_if_not_exists('categories', 'user_id');
SELECT add_user_id_column_if_not_exists('products', 'user_id');
SELECT add_user_id_column_if_not_exists('attendance', 'user_id');
SELECT add_user_id_column_if_not_exists('performance', 'user_id');
SELECT add_user_id_column_if_not_exists('training', 'user_id');
SELECT add_user_id_column_if_not_exists('salary_rules', 'user_id');
SELECT add_user_id_column_if_not_exists('materials', 'user_id');
SELECT add_user_id_column_if_not_exists('materials_assigned', 'user_id');
SELECT add_user_id_column_if_not_exists('projects', 'user_id');
SELECT add_user_id_column_if_not_exists('transactions', 'user_id');
SELECT add_user_id_column_if_not_exists('settings', 'user_id');

-- Clean up the function
DROP FUNCTION IF EXISTS add_user_id_column_if_not_exists(TEXT, TEXT);

-- Note: Existing rows will have NULL user_id. You may want to:
-- 1. Delete existing data, OR
-- 2. Assign existing data to a specific user, OR
-- 3. Leave as NULL and only new data will have user_id
-- 
-- Example to assign existing data to a user (replace USER_ID_HERE with actual user ID):
-- UPDATE inventory SET user_id = 'USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE gold SET user_id = 'USER_ID_HERE' WHERE user_id IS NULL;
-- ... (repeat for all tables)


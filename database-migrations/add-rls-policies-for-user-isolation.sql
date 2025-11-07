-- Migration: Add RLS policies for user data isolation
-- This ensures users can only access their own data through RLS
-- IMPORTANT: Run add-user-id-columns.sql FIRST before running this migration!

-- Function to enable RLS and add policies if they don't exist
-- Only creates policies if user_id column exists in the table
CREATE OR REPLACE FUNCTION setup_user_isolation_policies(p_table_name TEXT)
RETURNS void AS $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if user_id column exists in the table
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name 
        AND column_name = 'user_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE WARNING 'Table % does not have user_id column. Skipping RLS policy setup. Run add-user-id-columns.sql first!', p_table_name;
        RETURN;
    END IF;
    
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table_name);
    
    -- Drop existing policies if they exist (to avoid conflicts)
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own data" ON %I', p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own data" ON %I', p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own data" ON %I', p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own data" ON %I', p_table_name);
    
    -- Create SELECT policy
    EXECUTE format(
        'CREATE POLICY "Users can view own data" ON %I FOR SELECT USING (auth.uid() = user_id)',
        p_table_name
    );
    
    -- Create INSERT policy
    EXECUTE format(
        'CREATE POLICY "Users can insert own data" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)',
        p_table_name
    );
    
    -- Create UPDATE policy
    EXECUTE format(
        'CREATE POLICY "Users can update own data" ON %I FOR UPDATE USING (auth.uid() = user_id)',
        p_table_name
    );
    
    -- Create DELETE policy
    EXECUTE format(
        'CREATE POLICY "Users can delete own data" ON %I FOR DELETE USING (auth.uid() = user_id)',
        p_table_name
    );
    
    RAISE NOTICE 'Added RLS policies for % table', p_table_name;
END;
$$ LANGUAGE plpgsql;

-- Apply RLS policies to all tables
SELECT setup_user_isolation_policies('inventory');
SELECT setup_user_isolation_policies('gold');
SELECT setup_user_isolation_policies('jewelry');
SELECT setup_user_isolation_policies('stones');
SELECT setup_user_isolation_policies('staff');
SELECT setup_user_isolation_policies('customer_ledger');
SELECT setup_user_isolation_policies('sales');
SELECT setup_user_isolation_policies('sale_items');
SELECT setup_user_isolation_policies('customers');
SELECT setup_user_isolation_policies('craftsmen');
SELECT setup_user_isolation_policies('categories');
SELECT setup_user_isolation_policies('products');
SELECT setup_user_isolation_policies('attendance');
SELECT setup_user_isolation_policies('performance');
SELECT setup_user_isolation_policies('training');
SELECT setup_user_isolation_policies('salary_rules');
SELECT setup_user_isolation_policies('materials');
SELECT setup_user_isolation_policies('materials_assigned');
SELECT setup_user_isolation_policies('projects');
SELECT setup_user_isolation_policies('transactions');
SELECT setup_user_isolation_policies('settings');

-- Clean up the function
DROP FUNCTION IF EXISTS setup_user_isolation_policies(TEXT);

-- Note: These policies ensure that:
-- 1. Users can only SELECT rows where user_id matches their auth.uid()
-- 2. Users can only INSERT rows with their own user_id
-- 3. Users can only UPDATE rows where user_id matches their auth.uid()
-- 4. Users can only DELETE rows where user_id matches their auth.uid()


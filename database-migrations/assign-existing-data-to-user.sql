-- Migration: Assign all existing data to a specific user
-- This updates all existing rows to have user_id = '6b1df077-5f48-4247-9309-b046f1855781'
-- Run this after adding user_id columns to tables

-- Set the user ID to assign all existing data to
DO $$
DECLARE
    target_user_id UUID := '6b1df077-5f48-4247-9309-b046f1855781';
BEGIN
    -- Update all tables that have user_id column
    -- Only update rows where user_id IS NULL (existing data)
    
    -- Inventory
    UPDATE inventory SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated inventory table';
    
    -- Gold
    UPDATE gold SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated gold table';
    
    -- Jewelry
    UPDATE jewelry SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated jewelry table';
    
    -- Stones
    UPDATE stones SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated stones table';
    
    -- Staff
    UPDATE staff SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated staff table';
    
    -- Customer Ledger
    UPDATE customer_ledger SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated customer_ledger table';
    
    -- Sales
    UPDATE sales SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated sales table';
    
    -- Sale Items
    UPDATE sale_items SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated sale_items table';
    
    -- Customers
    UPDATE customers SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated customers table';
    
    -- Craftsmen
    UPDATE craftsmen SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated craftsmen table';
    
    -- Categories
    UPDATE categories SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated categories table';
    
    -- Products
    UPDATE products SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated products table';
    
    -- Attendance
    UPDATE attendance SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated attendance table';
    
    -- Performance
    UPDATE performance SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated performance table';
    
    -- Training
    UPDATE training SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated training table';
    
    -- Salary Rules
    UPDATE salary_rules SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated salary_rules table';
    
    -- Materials
    UPDATE materials SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated materials table';
    
    -- Materials Assigned
    UPDATE materials_assigned SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated materials_assigned table';
    
    -- Projects
    UPDATE projects SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated projects table';
    
    -- Transactions
    UPDATE transactions SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated transactions table';
    
    -- Settings
    UPDATE settings SET user_id = target_user_id WHERE user_id IS NULL;
    RAISE NOTICE 'Updated settings table';
    
    RAISE NOTICE 'All existing data has been assigned to user: %', target_user_id;
END $$;

-- Verify the updates
SELECT 
    'inventory' as table_name, 
    COUNT(*) as total_rows, 
    COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') as assigned_rows
FROM inventory
UNION ALL
SELECT 'gold', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM gold
UNION ALL
SELECT 'jewelry', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM jewelry
UNION ALL
SELECT 'stones', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM stones
UNION ALL
SELECT 'staff', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM staff
UNION ALL
SELECT 'customer_ledger', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM customer_ledger
UNION ALL
SELECT 'sales', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM sales
UNION ALL
SELECT 'sale_items', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM sale_items
UNION ALL
SELECT 'customers', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM customers
UNION ALL
SELECT 'craftsmen', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM craftsmen
UNION ALL
SELECT 'categories', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM categories
UNION ALL
SELECT 'products', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM products
UNION ALL
SELECT 'attendance', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM attendance
UNION ALL
SELECT 'performance', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM performance
UNION ALL
SELECT 'training', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM training
UNION ALL
SELECT 'salary_rules', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM salary_rules
UNION ALL
SELECT 'materials', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM materials
UNION ALL
SELECT 'materials_assigned', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM materials_assigned
UNION ALL
SELECT 'projects', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM projects
UNION ALL
SELECT 'transactions', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM transactions
UNION ALL
SELECT 'settings', COUNT(*), COUNT(*) FILTER (WHERE user_id = '6b1df077-5f48-4247-9309-b046f1855781') FROM settings;


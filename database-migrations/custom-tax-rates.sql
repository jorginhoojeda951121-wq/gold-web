    -- =====================================================
    -- Migration: Custom Tax Rates for Jewelry Items
    -- Description: Add custom tax rate fields to inventory tables
    -- Date: 2025-11-13
    -- =====================================================

    -- This migration adds support for per-item custom tax rates,
    -- essential for the jewelry industry where different items have
    -- different GST rates (3% for jewelry, 12% for artificial, etc.)

    -- =====================================================
    -- Add Tax Rate Columns to jewelry table
    -- =====================================================

    ALTER TABLE jewelry 
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 3.00,
    ADD COLUMN IF NOT EXISTS tax_included BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS tax_category VARCHAR(50) DEFAULT 'jewelry';

    -- Add comments to explain the columns
    COMMENT ON COLUMN jewelry.tax_rate IS 'Custom GST rate for this item (e.g., 3.00 for 3%, 12.00 for 12%)';
    COMMENT ON COLUMN jewelry.tax_included IS 'Whether the price includes tax (true) or tax should be added on top (false)';
    COMMENT ON COLUMN jewelry.tax_category IS 'Tax category: jewelry, artificial, gemstones, or other';

    -- =====================================================
    -- Add Tax Rate Columns to gold table
    -- =====================================================

    ALTER TABLE gold 
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 3.00,
    ADD COLUMN IF NOT EXISTS tax_included BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS tax_category VARCHAR(50) DEFAULT 'jewelry';

    COMMENT ON COLUMN gold.tax_rate IS 'Custom GST rate for this item (e.g., 3.00 for 3%, 12.00 for 12%)';
    COMMENT ON COLUMN gold.tax_included IS 'Whether the price includes tax (true) or tax should be added on top (false)';
    COMMENT ON COLUMN gold.tax_category IS 'Tax category: jewelry, artificial, gemstones, or other';

    -- =====================================================
    -- Add Tax Rate Columns to stones table
    -- =====================================================

    ALTER TABLE stones 
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 5.00,  -- 5% is common for stones
    ADD COLUMN IF NOT EXISTS tax_included BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS tax_category VARCHAR(50) DEFAULT 'gemstones';

    COMMENT ON COLUMN stones.tax_rate IS 'Custom GST rate for this item (e.g., 5.00 for 5%, 3.00 for 3%)';
    COMMENT ON COLUMN stones.tax_included IS 'Whether the price includes tax (true) or tax should be added on top (false)';
    COMMENT ON COLUMN stones.tax_category IS 'Tax category: jewelry, artificial, gemstones, or other';

    -- =====================================================
    -- Add Tax Rate Columns to inventory table
    -- =====================================================

    ALTER TABLE inventory 
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 3.00,
    ADD COLUMN IF NOT EXISTS tax_included BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS tax_category VARCHAR(50) DEFAULT 'jewelry';

    COMMENT ON COLUMN inventory.tax_rate IS 'Custom GST rate for this item (e.g., 3.00 for 3%, 12.00 for 12%)';
    COMMENT ON COLUMN inventory.tax_included IS 'Whether the price includes tax (true) or tax should be added on top (false)';
    COMMENT ON COLUMN inventory.tax_category IS 'Tax category: jewelry, artificial, gemstones, or other';

    -- =====================================================
    -- Add Tax Rate Columns to products table
    -- =====================================================

    ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 3.00,
    ADD COLUMN IF NOT EXISTS tax_included BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS tax_category VARCHAR(50) DEFAULT 'jewelry';

    COMMENT ON COLUMN products.tax_rate IS 'Custom GST rate for this item (e.g., 3.00 for 3%, 12.00 for 12%)';
    COMMENT ON COLUMN products.tax_included IS 'Whether the price includes tax (true) or tax should be added on top (false)';
    COMMENT ON COLUMN products.tax_category IS 'Tax category: jewelry, artificial, gemstones, or other';

    -- =====================================================
    -- Update sale_items table to store tax information
    -- =====================================================

    ALTER TABLE sale_items 
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS tax_category VARCHAR(50);

    COMMENT ON COLUMN sale_items.tax_rate IS 'The GST rate applied to this item at the time of sale';
    COMMENT ON COLUMN sale_items.tax_amount IS 'The actual tax amount charged for this item';
    COMMENT ON COLUMN sale_items.tax_category IS 'Tax category at time of sale for reporting';

    -- =====================================================
    -- Create indexes for efficient queries
    -- =====================================================

    CREATE INDEX IF NOT EXISTS idx_jewelry_tax_category ON jewelry(tax_category);
    CREATE INDEX IF NOT EXISTS idx_gold_tax_category ON gold(tax_category);
    CREATE INDEX IF NOT EXISTS idx_stones_tax_category ON stones(tax_category);
    CREATE INDEX IF NOT EXISTS idx_inventory_tax_category ON inventory(tax_category);
    CREATE INDEX IF NOT EXISTS idx_products_tax_category ON products(tax_category);
    CREATE INDEX IF NOT EXISTS idx_sale_items_tax_category ON sale_items(tax_category);

    -- =====================================================
    -- Create view for tax reporting
    -- =====================================================

    CREATE OR REPLACE VIEW tax_summary_by_category AS
    SELECT 
    si.tax_category,
    si.tax_rate,
    COUNT(*) as item_count,
    SUM(si.quantity) as total_quantity,
    SUM(si.unit_price * si.quantity) as total_base_amount,
    SUM(si.tax_amount) as total_tax_collected,
    SUM(si.total_price) as total_amount_with_tax
    FROM sale_items si
    WHERE si.tax_category IS NOT NULL
    GROUP BY si.tax_category, si.tax_rate
    ORDER BY si.tax_category, si.tax_rate;

    COMMENT ON VIEW tax_summary_by_category IS 'Provides GST collection summary by tax category and rate for reporting';

    -- =====================================================
    -- Set default tax rates based on item type
    -- =====================================================

    -- Update artificial jewelry to 12% GST
    UPDATE jewelry 
    SET tax_rate = 12.00, tax_category = 'artificial'
    WHERE is_artificial = 1 AND tax_rate = 3.00;

    -- Update gemstones to 5% GST
    UPDATE stones 
    SET tax_rate = 5.00, tax_category = 'gemstones'
    WHERE tax_rate = 3.00;

    -- =====================================================
    -- Validation: Check constraints
    -- =====================================================

    -- Ensure tax rate is within valid range (0-100%)
    ALTER TABLE jewelry ADD CONSTRAINT chk_jewelry_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100);
    ALTER TABLE gold ADD CONSTRAINT chk_gold_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100);
    ALTER TABLE stones ADD CONSTRAINT chk_stones_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100);
    ALTER TABLE inventory ADD CONSTRAINT chk_inventory_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100);
    ALTER TABLE products ADD CONSTRAINT chk_products_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100);

    -- =====================================================
    -- Row Level Security (RLS) - Already enabled on tables
    -- =====================================================
    -- Note: RLS is already configured on these tables from previous migrations.
    -- The new columns will automatically be subject to the existing RLS policies.

    -- =====================================================
    -- Verification Queries (for testing)
    -- =====================================================

    -- To verify the migration:
    -- SELECT table_name, column_name, data_type, column_default 
    -- FROM information_schema.columns 
    -- WHERE column_name IN ('tax_rate', 'tax_included', 'tax_category')
    -- ORDER BY table_name, column_name;

    -- To see tax rate distribution:
    -- SELECT tax_rate, tax_category, COUNT(*) as item_count 
    -- FROM jewelry 
    -- GROUP BY tax_rate, tax_category 
    -- ORDER BY tax_category, tax_rate;

    -- =====================================================
    -- END OF MIGRATION
    -- =====================================================


-- =====================================================
-- Migration: Barcode & SKU Support
-- Description: Add barcode and SKU fields to inventory tables for quick lookup
-- Date: 2025-11-13
-- =====================================================

-- This migration adds barcode and SKU support to all inventory tables,
-- enabling quick item lookup via barcode scanners or manual entry in POS.

-- =====================================================
-- Add Barcode and SKU columns to jewelry table
-- =====================================================

ALTER TABLE jewelry 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS sku VARCHAR(100);

COMMENT ON COLUMN jewelry.barcode IS 'Barcode for quick item lookup (e.g., EAN-13, UPC, Code 128)';
COMMENT ON COLUMN jewelry.sku IS 'Stock Keeping Unit - internal item code';

-- =====================================================
-- Add Barcode and SKU columns to gold table
-- =====================================================

ALTER TABLE gold 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS sku VARCHAR(100);

COMMENT ON COLUMN gold.barcode IS 'Barcode for quick item lookup';
COMMENT ON COLUMN gold.sku IS 'Stock Keeping Unit - internal item code';

-- =====================================================
-- Add Barcode and SKU columns to stones table
-- =====================================================

ALTER TABLE stones 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS sku VARCHAR(100);

COMMENT ON COLUMN stones.barcode IS 'Barcode for quick item lookup';
COMMENT ON COLUMN stones.sku IS 'Stock Keeping Unit - internal item code';

-- =====================================================
-- Add Barcode and SKU columns to inventory table
-- =====================================================

ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS sku VARCHAR(100);

COMMENT ON COLUMN inventory.barcode IS 'Barcode for quick item lookup';
COMMENT ON COLUMN inventory.sku IS 'Stock Keeping Unit - internal item code';

-- =====================================================
-- Add Barcode and SKU columns to products table
-- =====================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS sku VARCHAR(100);

COMMENT ON COLUMN products.barcode IS 'Barcode for quick item lookup';
COMMENT ON COLUMN products.sku IS 'Stock Keeping Unit - internal item code';

-- =====================================================
-- Create indexes for fast barcode lookups
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_jewelry_barcode ON jewelry(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jewelry_sku ON jewelry(sku) WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gold_barcode ON gold(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gold_sku ON gold(sku) WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stones_barcode ON stones(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stones_sku ON stones(sku) WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku) WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;

-- =====================================================
-- Create function for barcode lookup across all tables
-- =====================================================

CREATE OR REPLACE FUNCTION search_by_barcode(
  p_barcode TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  table_name TEXT,
  barcode TEXT,
  sku TEXT,
  price NUMERIC,
  stock INTEGER
) AS $$
BEGIN
  RETURN QUERY
  -- Search in jewelry table
  SELECT 
    j.id::TEXT,
    j.name,
    'jewelry'::TEXT as table_name,
    j.barcode,
    j.sku,
    j.price,
    j.in_stock as stock
  FROM jewelry j
  WHERE j.user_id = p_user_id 
    AND (
      j.barcode = p_barcode 
      OR j.sku = p_barcode
      OR j.id::TEXT = p_barcode
    )
  
  UNION ALL
  
  -- Search in gold table
  SELECT 
    g.id::TEXT,
    g.name,
    'gold'::TEXT as table_name,
    g.barcode,
    g.sku,
    g.total_price as price,
    g.in_stock as stock
  FROM gold g
  WHERE g.user_id = p_user_id 
    AND (
      g.barcode = p_barcode 
      OR g.sku = p_barcode
      OR g.id::TEXT = p_barcode
    )
  
  UNION ALL
  
  -- Search in stones table
  SELECT 
    s.id::TEXT,
    s.name,
    'stones'::TEXT as table_name,
    s.barcode,
    s.sku,
    s.total_price as price,
    s.stock_quantity as stock
  FROM stones s
  WHERE s.user_id = p_user_id 
    AND (
      s.barcode = p_barcode 
      OR s.sku = p_barcode
      OR s.id::TEXT = p_barcode
    )
  
  UNION ALL
  
  -- Search in inventory table
  SELECT 
    i.id::TEXT,
    i.name,
    'inventory'::TEXT as table_name,
    i.barcode,
    i.sku,
    i.price,
    i.stock
  FROM inventory i
  WHERE i.user_id = p_user_id 
    AND (
      i.barcode = p_barcode 
      OR i.sku = p_barcode
      OR i.id::TEXT = p_barcode
    )
  
  LIMIT 1; -- Return only first match
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_by_barcode IS 'Search for an item across all inventory tables by barcode, SKU, or ID';

-- =====================================================
-- Create view for all items with barcodes
-- =====================================================

CREATE OR REPLACE VIEW items_with_barcodes AS
SELECT 
  'jewelry'::TEXT as table_name,
  id::TEXT,
  name,
  barcode,
  sku,
  price,
  in_stock as stock,
  user_id
FROM jewelry
WHERE barcode IS NOT NULL OR sku IS NOT NULL

UNION ALL

SELECT 
  'gold'::TEXT as table_name,
  id::TEXT,
  name,
  barcode,
  sku,
  total_price as price,
  in_stock as stock,
  user_id
FROM gold
WHERE barcode IS NOT NULL OR sku IS NOT NULL

UNION ALL

SELECT 
  'stones'::TEXT as table_name,
  id::TEXT,
  name,
  barcode,
  sku,
  total_price as price,
  stock_quantity as stock,
  user_id
FROM stones
WHERE barcode IS NOT NULL OR sku IS NOT NULL

UNION ALL

SELECT 
  'inventory'::TEXT as table_name,
  id::TEXT,
  name,
  barcode,
  sku,
  price,
  stock,
  user_id
FROM inventory
WHERE barcode IS NOT NULL OR sku IS NOT NULL;

COMMENT ON VIEW items_with_barcodes IS 'Unified view of all inventory items that have barcodes or SKUs';

-- =====================================================
-- Unique constraints (optional - enable if needed)
-- =====================================================

-- Uncomment the following if you want to enforce unique barcodes per user
-- NOTE: This will prevent duplicate barcodes, which may or may not be desired

-- ALTER TABLE jewelry ADD CONSTRAINT uq_jewelry_barcode_user UNIQUE (barcode, user_id);
-- ALTER TABLE gold ADD CONSTRAINT uq_gold_barcode_user UNIQUE (barcode, user_id);
-- ALTER TABLE stones ADD CONSTRAINT uq_stones_barcode_user UNIQUE (barcode, user_id);
-- ALTER TABLE inventory ADD CONSTRAINT uq_inventory_barcode_user UNIQUE (barcode, user_id);
-- ALTER TABLE products ADD CONSTRAINT uq_products_barcode_user UNIQUE (barcode, user_id);

-- =====================================================
-- Verification Queries
-- =====================================================

-- To verify the migration:
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE column_name IN ('barcode', 'sku')
-- ORDER BY table_name, column_name;

-- Test barcode lookup:
-- SELECT * FROM search_by_barcode('YOUR-BARCODE', 'your-user-id'::UUID);

-- View all items with barcodes:
-- SELECT * FROM items_with_barcodes WHERE user_id = 'your-user-id'::UUID;

-- Count items with barcodes:
-- SELECT table_name, COUNT(*) 
-- FROM items_with_barcodes 
-- WHERE user_id = 'your-user-id'::UUID
-- GROUP BY table_name;

-- =====================================================
-- END OF MIGRATION
-- =====================================================


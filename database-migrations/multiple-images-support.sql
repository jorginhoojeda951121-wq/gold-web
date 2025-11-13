-- =====================================================
-- Migration: Multiple Images Support
-- Description: Add support for up to 4 images per inventory item
-- Date: 2025-11-13
-- =====================================================

-- This migration adds support for multiple images (up to 4) per item
-- across all inventory tables: jewelry, gold, stones, inventory, and products.

-- =====================================================
-- Add image columns to jewelry table
-- =====================================================

DO $$ 
BEGIN
    -- Add image_1 (rename existing image column if needed)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jewelry' 
        AND column_name = 'image_1'
    ) THEN
        -- If there's an existing 'image' column, rename it to image_1
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'jewelry' 
            AND column_name = 'image'
        ) THEN
            ALTER TABLE public.jewelry RENAME COLUMN image TO image_1;
        ELSE
            ALTER TABLE public.jewelry ADD COLUMN image_1 TEXT;
        END IF;
    END IF;
    
    -- Add image_2
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jewelry' 
        AND column_name = 'image_2'
    ) THEN
        ALTER TABLE public.jewelry ADD COLUMN image_2 TEXT;
    END IF;
    
    -- Add image_3
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jewelry' 
        AND column_name = 'image_3'
    ) THEN
        ALTER TABLE public.jewelry ADD COLUMN image_3 TEXT;
    END IF;
    
    -- Add image_4
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jewelry' 
        AND column_name = 'image_4'
    ) THEN
        ALTER TABLE public.jewelry ADD COLUMN image_4 TEXT;
    END IF;
END $$;

COMMENT ON COLUMN public.jewelry.image_1 IS 'Primary image URL or base64 data';
COMMENT ON COLUMN public.jewelry.image_2 IS 'Secondary image URL or base64 data';
COMMENT ON COLUMN public.jewelry.image_3 IS 'Tertiary image URL or base64 data';
COMMENT ON COLUMN public.jewelry.image_4 IS 'Quaternary image URL or base64 data';

-- =====================================================
-- Add image columns to gold table
-- =====================================================

DO $$ 
BEGIN
    -- Check for existing image or image_url column and consolidate to image_1
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gold' 
        AND column_name = 'image_1'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'gold' 
            AND column_name = 'image'
        ) THEN
            ALTER TABLE public.gold RENAME COLUMN image TO image_1;
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'gold' 
            AND column_name = 'image_url'
        ) THEN
            ALTER TABLE public.gold RENAME COLUMN image_url TO image_1;
        ELSE
            ALTER TABLE public.gold ADD COLUMN image_1 TEXT;
        END IF;
    END IF;
    
    -- Add remaining image columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gold' 
        AND column_name = 'image_2'
    ) THEN
        ALTER TABLE public.gold ADD COLUMN image_2 TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gold' 
        AND column_name = 'image_3'
    ) THEN
        ALTER TABLE public.gold ADD COLUMN image_3 TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gold' 
        AND column_name = 'image_4'
    ) THEN
        ALTER TABLE public.gold ADD COLUMN image_4 TEXT;
    END IF;
END $$;

COMMENT ON COLUMN public.gold.image_1 IS 'Primary image URL or base64 data';
COMMENT ON COLUMN public.gold.image_2 IS 'Secondary image URL or base64 data';
COMMENT ON COLUMN public.gold.image_3 IS 'Tertiary image URL or base64 data';
COMMENT ON COLUMN public.gold.image_4 IS 'Quaternary image URL or base64 data';

-- =====================================================
-- Add image columns to stones table
-- =====================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stones' 
        AND column_name = 'image_1'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stones' 
            AND column_name = 'image'
        ) THEN
            ALTER TABLE public.stones RENAME COLUMN image TO image_1;
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stones' 
            AND column_name = 'image_url'
        ) THEN
            ALTER TABLE public.stones RENAME COLUMN image_url TO image_1;
        ELSE
            ALTER TABLE public.stones ADD COLUMN image_1 TEXT;
        END IF;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stones' 
        AND column_name = 'image_2'
    ) THEN
        ALTER TABLE public.stones ADD COLUMN image_2 TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stones' 
        AND column_name = 'image_3'
    ) THEN
        ALTER TABLE public.stones ADD COLUMN image_3 TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stones' 
        AND column_name = 'image_4'
    ) THEN
        ALTER TABLE public.stones ADD COLUMN image_4 TEXT;
    END IF;
END $$;

COMMENT ON COLUMN public.stones.image_1 IS 'Primary image URL or base64 data';
COMMENT ON COLUMN public.stones.image_2 IS 'Secondary image URL or base64 data';
COMMENT ON COLUMN public.stones.image_3 IS 'Tertiary image URL or base64 data';
COMMENT ON COLUMN public.stones.image_4 IS 'Quaternary image URL or base64 data';

-- =====================================================
-- Add image columns to inventory table
-- =====================================================

DO $$ 
BEGIN
    -- Rename existing image_url to image_1
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory' 
        AND column_name = 'image_1'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'inventory' 
            AND column_name = 'image_url'
        ) THEN
            ALTER TABLE public.inventory RENAME COLUMN image_url TO image_1;
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'inventory' 
            AND column_name = 'image'
        ) THEN
            ALTER TABLE public.inventory RENAME COLUMN image TO image_1;
        ELSE
            ALTER TABLE public.inventory ADD COLUMN image_1 TEXT;
        END IF;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory' 
        AND column_name = 'image_2'
    ) THEN
        ALTER TABLE public.inventory ADD COLUMN image_2 TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory' 
        AND column_name = 'image_3'
    ) THEN
        ALTER TABLE public.inventory ADD COLUMN image_3 TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory' 
        AND column_name = 'image_4'
    ) THEN
        ALTER TABLE public.inventory ADD COLUMN image_4 TEXT;
    END IF;
END $$;

COMMENT ON COLUMN public.inventory.image_1 IS 'Primary image URL or base64 data';
COMMENT ON COLUMN public.inventory.image_2 IS 'Secondary image URL or base64 data';
COMMENT ON COLUMN public.inventory.image_3 IS 'Tertiary image URL or base64 data';
COMMENT ON COLUMN public.inventory.image_4 IS 'Quaternary image URL or base64 data';

-- =====================================================
-- Add image columns to products table
-- =====================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'image_1'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'products' 
            AND column_name = 'image'
        ) THEN
            ALTER TABLE public.products RENAME COLUMN image TO image_1;
        ELSE
            ALTER TABLE public.products ADD COLUMN image_1 TEXT;
        END IF;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'image_2'
    ) THEN
        ALTER TABLE public.products ADD COLUMN image_2 TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'image_3'
    ) THEN
        ALTER TABLE public.products ADD COLUMN image_3 TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'image_4'
    ) THEN
        ALTER TABLE public.products ADD COLUMN image_4 TEXT;
    END IF;
END $$;

COMMENT ON COLUMN public.products.image_1 IS 'Primary image URL or base64 data';
COMMENT ON COLUMN public.products.image_2 IS 'Secondary image URL or base64 data';
COMMENT ON COLUMN public.products.image_3 IS 'Tertiary image URL or base64 data';
COMMENT ON COLUMN public.products.image_4 IS 'Quaternary image URL or base64 data';

-- =====================================================
-- Create helper function to get all images as array
-- =====================================================

CREATE OR REPLACE FUNCTION get_item_images(
    p_table_name TEXT,
    p_item_id TEXT
)
RETURNS TEXT[] AS $$
DECLARE
    v_images TEXT[];
    v_image1 TEXT;
    v_image2 TEXT;
    v_image3 TEXT;
    v_image4 TEXT;
BEGIN
    -- Build dynamic query to get images
    EXECUTE format('
        SELECT image_1, image_2, image_3, image_4
        FROM %I
        WHERE id = $1
    ', p_table_name)
    INTO v_image1, v_image2, v_image3, v_image4
    USING p_item_id;
    
    -- Build array of non-null images
    v_images := ARRAY[]::TEXT[];
    IF v_image1 IS NOT NULL AND v_image1 != '' THEN
        v_images := array_append(v_images, v_image1);
    END IF;
    IF v_image2 IS NOT NULL AND v_image2 != '' THEN
        v_images := array_append(v_images, v_image2);
    END IF;
    IF v_image3 IS NOT NULL AND v_image3 != '' THEN
        v_images := array_append(v_images, v_image3);
    END IF;
    IF v_image4 IS NOT NULL AND v_image4 != '' THEN
        v_images := array_append(v_images, v_image4);
    END IF;
    
    RETURN v_images;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_item_images IS 'Get all images for an item as an array (filters out nulls and empty strings)';

-- =====================================================
-- Create view to show items with image count
-- =====================================================

CREATE OR REPLACE VIEW inventory_with_image_count AS
SELECT 
    'jewelry'::TEXT as table_name,
    id,
    name,
    price,
    CASE 
        WHEN image_4 IS NOT NULL AND image_4 != '' THEN 4
        WHEN image_3 IS NOT NULL AND image_3 != '' THEN 3
        WHEN image_2 IS NOT NULL AND image_2 != '' THEN 2
        WHEN image_1 IS NOT NULL AND image_1 != '' THEN 1
        ELSE 0
    END as image_count,
    image_1,
    user_id
FROM public.jewelry

UNION ALL

SELECT 
    'gold'::TEXT as table_name,
    id,
    name,
    total_price as price,
    CASE 
        WHEN image_4 IS NOT NULL AND image_4 != '' THEN 4
        WHEN image_3 IS NOT NULL AND image_3 != '' THEN 3
        WHEN image_2 IS NOT NULL AND image_2 != '' THEN 2
        WHEN image_1 IS NOT NULL AND image_1 != '' THEN 1
        ELSE 0
    END as image_count,
    image_1,
    user_id
FROM public.gold

UNION ALL

SELECT 
    'stones'::TEXT as table_name,
    id,
    name,
    total_price as price,
    CASE 
        WHEN image_4 IS NOT NULL AND image_4 != '' THEN 4
        WHEN image_3 IS NOT NULL AND image_3 != '' THEN 3
        WHEN image_2 IS NOT NULL AND image_2 != '' THEN 2
        WHEN image_1 IS NOT NULL AND image_1 != '' THEN 1
        ELSE 0
    END as image_count,
    image_1,
    user_id
FROM public.stones

UNION ALL

SELECT 
    'inventory'::TEXT as table_name,
    id,
    name,
    price,
    CASE 
        WHEN image_4 IS NOT NULL AND image_4 != '' THEN 4
        WHEN image_3 IS NOT NULL AND image_3 != '' THEN 3
        WHEN image_2 IS NOT NULL AND image_2 != '' THEN 2
        WHEN image_1 IS NOT NULL AND image_1 != '' THEN 1
        ELSE 0
    END as image_count,
    image_1,
    user_id
FROM public.inventory

UNION ALL

SELECT 
    'products'::TEXT as table_name,
    id,
    name,
    price,
    CASE 
        WHEN image_4 IS NOT NULL AND image_4 != '' THEN 4
        WHEN image_3 IS NOT NULL AND image_3 != '' THEN 3
        WHEN image_2 IS NOT NULL AND image_2 != '' THEN 2
        WHEN image_1 IS NOT NULL AND image_1 != '' THEN 1
        ELSE 0
    END as image_count,
    image_1,
    user_id
FROM public.products;

GRANT SELECT ON inventory_with_image_count TO authenticated;

COMMENT ON VIEW inventory_with_image_count IS 'Shows all inventory items with their image count (0-4)';

-- =====================================================
-- Usage Examples
-- =====================================================

-- Get all images for a jewelry item:
-- SELECT get_item_images('jewelry', 'ITEM-ID-HERE');

-- Get items with multiple images:
-- SELECT * FROM inventory_with_image_count WHERE image_count > 1;

-- Get items missing images:
-- SELECT * FROM inventory_with_image_count WHERE image_count = 0 AND user_id = auth.uid();

-- =====================================================
-- END OF MIGRATION
-- =====================================================


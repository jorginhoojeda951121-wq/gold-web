-- =====================================================
-- Migration: Base Database Schema
-- Description: Core table definitions for Gold POS system
-- Date: 2025-11-13
-- Priority: Run this FIRST before other migrations
-- =====================================================

-- This migration creates the foundational tables for the Gold POS system.
-- All tables include user_id for multi-tenant data isolation.

-- =====================================================
-- Create customers table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic information
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    
    -- Financial tracking
    current_balance NUMERIC(12,2) DEFAULT 0, -- Positive = customer owes money
    credit_limit NUMERIC(12,2) DEFAULT 0,
    total_purchases NUMERIC(12,2) DEFAULT 0,
    last_purchase_date DATE,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);

COMMENT ON TABLE public.customers IS 'Customer master data for sales and credit tracking';

-- =====================================================
-- Create categories table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    metal_type TEXT CHECK (metal_type IN ('gold', 'silver', 'platinum', 'diamond', 'gemstone', 'artificial', 'other')),
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_metal_type ON public.categories(metal_type);

COMMENT ON TABLE public.categories IS 'Product categories organized by metal type';

-- =====================================================
-- Create inventory table (general inventory)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic information
    name TEXT NOT NULL,
    category TEXT DEFAULT 'jewelry' CHECK (category IN ('gold', 'silver', 'platinum', 'stones', 'jewelry', 'artificial', 'equipment', 'other')),
    subcategory TEXT,
    
    -- Pricing
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(12,2),
    
    -- Stock
    stock INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    
    -- Item details
    weight NUMERIC(10,3), -- in grams
    description TEXT,
    
    -- Images (single image URL or base64)
    image_url TEXT,
    
    -- Supplier info
    supplier TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_stock ON public.inventory(stock);

COMMENT ON TABLE public.inventory IS 'General inventory table for all item types';

-- =====================================================
-- Create jewelry table (specialized jewelry items)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.jewelry (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic information
    name TEXT NOT NULL,
    type TEXT, -- Ring, Necklace, Earrings, Bracelet, etc.
    
    -- Material details
    metal TEXT, -- Gold 24K, Gold 22K, Gold 18K, Platinum, Silver, etc.
    gemstone TEXT, -- Diamond, Emerald, Sapphire, Ruby, None, etc.
    carat TEXT, -- Carat weight for gemstones
    purity TEXT, -- 24K, 22K, 18K, 14K, etc.
    
    -- Weight and measurements
    weight NUMERIC(10,3), -- Net weight in grams
    gross_weight NUMERIC(10,3), -- Gross weight with stones
    net_weight NUMERIC(10,3), -- Net gold/metal weight
    
    -- Pricing
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(12,2),
    making_charges NUMERIC(12,2),
    
    -- Stock
    in_stock INTEGER DEFAULT 0,
    
    -- Image
    image TEXT, -- Image URL or base64
    
    -- Flags
    is_artificial INTEGER DEFAULT 0, -- 0 = real, 1 = artificial
    
    -- Description
    description TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jewelry_user_id ON public.jewelry(user_id);
CREATE INDEX IF NOT EXISTS idx_jewelry_type ON public.jewelry(type);
CREATE INDEX IF NOT EXISTS idx_jewelry_metal ON public.jewelry(metal);
CREATE INDEX IF NOT EXISTS idx_jewelry_is_artificial ON public.jewelry(is_artificial);

COMMENT ON TABLE public.jewelry IS 'Specialized table for jewelry items with detailed attributes';

-- =====================================================
-- Create gold table (gold bars, coins, raw gold)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.gold (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic information
    name TEXT NOT NULL,
    purity TEXT NOT NULL, -- 24K, 22K, 18K, 14K, etc.
    
    -- Weight
    weight NUMERIC(10,3) NOT NULL, -- Weight in grams
    
    -- Pricing
    price_per_gram NUMERIC(12,2),
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    making_charges NUMERIC(12,2) DEFAULT 0,
    
    -- Stock
    in_stock INTEGER DEFAULT 0,
    stock INTEGER DEFAULT 0, -- Alias for consistency
    
    -- Supplier
    supplier TEXT,
    
    -- Description
    description TEXT,
    
    -- Image
    image TEXT,
    image_url TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gold_user_id ON public.gold(user_id);
CREATE INDEX IF NOT EXISTS idx_gold_purity ON public.gold(purity);

COMMENT ON TABLE public.gold IS 'Gold bars, coins, and raw gold inventory';

-- =====================================================
-- Create stones table (gemstones, diamonds)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stones (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic information
    name TEXT NOT NULL, -- Diamond, Emerald, Sapphire, Ruby, etc.
    type TEXT, -- Natural, Synthetic, Lab-grown
    
    -- Gemstone details
    carat NUMERIC(10,2), -- Carat weight
    clarity TEXT, -- IF, VVS1, VVS2, VS1, VS2, SI1, SI2, I1, I2, I3
    color TEXT, -- D, E, F, G, H, I, J, K, L, M, etc. (for diamonds)
    cut TEXT, -- Excellent, Very Good, Good, Fair, Poor
    shape TEXT, -- Round, Princess, Cushion, Emerald, etc.
    
    -- Pricing
    price_per_carat NUMERIC(12,2),
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Stock
    stock_quantity INTEGER DEFAULT 0,
    
    -- Certificate
    certificate_number TEXT,
    certificate_lab TEXT, -- GIA, IGI, HRD, etc.
    
    -- Origin
    origin TEXT,
    
    -- Description
    description TEXT,
    
    -- Image
    image TEXT,
    image_url TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stones_user_id ON public.stones(user_id);
CREATE INDEX IF NOT EXISTS idx_stones_name ON public.stones(name);
CREATE INDEX IF NOT EXISTS idx_stones_type ON public.stones(type);

COMMENT ON TABLE public.stones IS 'Gemstones and diamonds inventory';

-- =====================================================
-- Create products table (general products/equipment)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    
    -- Pricing
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(12,2),
    
    -- Stock
    stock INTEGER DEFAULT 0,
    
    -- Image
    image TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

COMMENT ON TABLE public.products IS 'General products and equipment inventory';

-- =====================================================
-- Create craftsmen table (artisans/craftsmen)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.craftsmen (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic information
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    
    -- Specialization
    specialty TEXT, -- Goldsmith, Diamond Setting, Polishing, etc.
    experience_years INTEGER,
    
    -- Status
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'active', 'inactive')),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_craftsmen_user_id ON public.craftsmen(user_id);
CREATE INDEX IF NOT EXISTS idx_craftsmen_status ON public.craftsmen(status);

COMMENT ON TABLE public.craftsmen IS 'Artisans and craftsmen who create jewelry';

-- =====================================================
-- Create materials_assigned table (work assignments)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.materials_assigned (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Assignment details
    craftsman_id TEXT NOT NULL REFERENCES public.craftsmen(id) ON DELETE CASCADE,
    craftsman_name TEXT NOT NULL,
    
    -- Item details
    item_code TEXT, -- Unique item code for what to make
    item_description TEXT NOT NULL,
    item_type TEXT, -- jewelry, gold, stones, custom
    
    -- Materials assigned
    gold_weight NUMERIC(10,3), -- Gold weight in grams
    gold_purity TEXT, -- 24K, 22K, 18K, 14K
    stone_details JSONB, -- Array of stones assigned
    other_materials TEXT,
    
    -- Target item reference
    target_item_id TEXT, -- ID of item to create/modify (from jewelry/gold/stones tables)
    is_new_item BOOLEAN DEFAULT true, -- true = create new, false = modify existing
    
    -- Work details
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    completion_date DATE,
    
    -- Status
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'returned', 'cancelled')),
    
    -- Quality check
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    quality_notes TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Images
    before_images TEXT, -- JSON array of image URLs
    after_images TEXT, -- JSON array of image URLs
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_assigned_user_id ON public.materials_assigned(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_assigned_craftsman_id ON public.materials_assigned(craftsman_id);
CREATE INDEX IF NOT EXISTS idx_materials_assigned_status ON public.materials_assigned(status);
CREATE INDEX IF NOT EXISTS idx_materials_assigned_target_item ON public.materials_assigned(target_item_id) WHERE target_item_id IS NOT NULL;

COMMENT ON TABLE public.materials_assigned IS 'Track materials and work assignments to artisans';

-- =====================================================
-- Create sales table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Customer information
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    
    -- Sale details
    sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invoice_number TEXT UNIQUE NOT NULL,
    
    -- Financial details
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Payment details
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Bank Transfer', 'Credit', 'Cheque')),
    payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'pending', 'credit')),
    amount_paid NUMERIC(12,2) DEFAULT 0,
    balance_due NUMERIC(12,2) DEFAULT 0,
    
    -- UPI details (if applicable)
    upi_id TEXT,
    transaction_reference TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON public.sales(invoice_number);

COMMENT ON TABLE public.sales IS 'Sales transactions and invoices';

-- =====================================================
-- Create sale_items table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sale_items (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Sale reference
    sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    
    -- Item details
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_type TEXT, -- jewelry, gold, stones, inventory
    
    -- Quantity and pricing
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    
    -- Discount
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_user_id ON public.sale_items(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_item_id ON public.sale_items(item_id);

COMMENT ON TABLE public.sale_items IS 'Line items in sales transactions';

-- =====================================================
-- Create customer_ledger table (credit/EMI tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.customer_ledger (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Customer reference
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'payment', 'adjustment', 'interest', 'refund')),
    amount NUMERIC(12,2) NOT NULL, -- Positive for purchases/charges, negative for payments
    
    -- Balance tracking
    balance_before NUMERIC(12,2) DEFAULT 0,
    balance_after NUMERIC(12,2) DEFAULT 0,
    
    -- References
    sale_id TEXT REFERENCES public.sales(id) ON DELETE SET NULL,
    invoice_number TEXT,
    
    -- Payment details (if payment)
    payment_method TEXT CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque')),
    transaction_reference TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_user_id ON public.customer_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON public.customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_date ON public.customer_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_sale_id ON public.customer_ledger(sale_id) WHERE sale_id IS NOT NULL;

COMMENT ON TABLE public.customer_ledger IS 'Customer credit ledger for EMI and credit sales tracking';

-- =====================================================
-- Create staff table (employees)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic information
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    emergency_contact TEXT,
    
    -- Employment details
    role TEXT NOT NULL,
    department TEXT,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Salary
    salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on-leave', 'terminated')),
    
    -- PF/ESI details
    pf_number TEXT,
    esi_number TEXT,
    pan_number TEXT,
    
    -- Bank details
    bank_name TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_department ON public.staff(department);

COMMENT ON TABLE public.staff IS 'Employee master data';

-- =====================================================
-- Create attendance table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Employee reference
    employee_id TEXT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    
    -- Attendance details
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half-day', 'on-leave')),
    
    -- Time tracking
    check_in_time TIME,
    check_out_time TIME,
    working_hours NUMERIC(5,2),
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per employee per day
    UNIQUE(user_id, employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date DESC);

COMMENT ON TABLE public.attendance IS 'Employee attendance tracking';

-- =====================================================
-- Enable Row Level Security (RLS) on all tables
-- =====================================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jewelry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftsmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials_assigned ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create RLS Policies (basic CRUD for user isolation)
-- =====================================================

-- Macro to create standard RLS policies for a table
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'customers', 'categories', 'inventory', 'jewelry', 'gold', 'stones', 
            'products', 'craftsmen', 'materials_assigned', 'sales', 'sale_items',
            'customer_ledger', 'staff', 'attendance'
        ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Users can view their own %s" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can view their own %s" ON public.%I FOR SELECT USING (auth.uid() = user_id)', tbl, tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert their own %s" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can insert their own %s" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', tbl, tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "Users can update their own %s" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can update their own %s" ON public.%I FOR UPDATE USING (auth.uid() = user_id)', tbl, tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "Users can delete their own %s" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can delete their own %s" ON public.%I FOR DELETE USING (auth.uid() = user_id)', tbl, tbl);
    END LOOP;
END $$;

-- =====================================================
-- Create updated_at trigger function
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'customers', 'categories', 'inventory', 'jewelry', 'gold', 'stones',
            'products', 'craftsmen', 'materials_assigned', 'sales', 'customer_ledger',
            'staff', 'attendance'
        ])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trigger_update_%I_updated_at ON public.%I', tbl, tbl);
        EXECUTE format('CREATE TRIGGER trigger_update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl, tbl);
    END LOOP;
END $$;

-- =====================================================
-- END OF BASE SCHEMA MIGRATION
-- =====================================================


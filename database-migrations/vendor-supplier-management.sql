-- =====================================================
-- Migration: Vendor & Supplier Management System
-- Description: Complete vendor management with purchase orders and invoices
-- Date: 2025-11-13
-- =====================================================

-- This migration adds a complete vendor/supplier management system for
-- tracking suppliers, purchase orders, and supplier invoices.

-- =====================================================
-- Create vendors table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vendors (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic information
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    
    -- Address details
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    pincode TEXT,
    
    -- Business details
    vendor_type TEXT NOT NULL DEFAULT 'supplier' CHECK (vendor_type IN ('supplier', 'manufacturer', 'wholesaler', 'artisan', 'other')),
    gst_number TEXT,
    pan_number TEXT,
    
    -- Specialization
    specialization JSONB, -- Array of specialties: ['gold', 'silver', 'gemstones', 'diamonds', 'equipment']
    
    -- Financial tracking
    total_purchases NUMERIC(12,2) DEFAULT 0,
    outstanding_balance NUMERIC(12,2) DEFAULT 0,
    credit_limit NUMERIC(12,2) DEFAULT 0,
    payment_terms TEXT, -- e.g., "Net 30", "Cash on Delivery", "50% Advance"
    
    -- Bank details (for payments)
    bank_name TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    upi_id TEXT,
    
    -- Status and ratings
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    
    -- Metadata
    notes TEXT,
    last_purchase_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Create purchase_orders table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Vendor information
    vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
    vendor_name TEXT NOT NULL,
    
    -- Order details
    order_number TEXT UNIQUE NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled')),
    
    -- Financial details
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    shipping_charges NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Payment tracking
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    amount_paid NUMERIC(12,2) DEFAULT 0,
    
    -- Additional details
    payment_terms TEXT,
    delivery_address TEXT,
    notes TEXT,
    terms_and_conditions TEXT,
    
    -- Metadata
    created_by TEXT,
    approved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Create purchase_order_items table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    purchase_order_id TEXT NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    
    -- Item details
    item_type TEXT NOT NULL CHECK (item_type IN ('gold', 'silver', 'platinum', 'gemstone', 'diamond', 'equipment', 'other')),
    item_name TEXT NOT NULL,
    description TEXT,
    
    -- Specifications
    purity TEXT, -- For metals: 24K, 22K, 18K, etc.
    weight NUMERIC(10,3), -- In grams
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL DEFAULT 'piece', -- piece, gram, kg, carat, etc.
    
    -- Pricing
    unit_price NUMERIC(12,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 3.00,
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    total_price NUMERIC(12,2) NOT NULL,
    
    -- Receiving status
    quantity_received INTEGER DEFAULT 0,
    quantity_pending INTEGER,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Create supplier_invoices table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.supplier_invoices (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Vendor and PO reference
    vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
    vendor_name TEXT NOT NULL,
    purchase_order_id TEXT REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    
    -- Invoice details
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    
    -- Financial details
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL,
    
    -- Payment tracking
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue')),
    amount_paid NUMERIC(12,2) DEFAULT 0,
    balance_due NUMERIC(12,2),
    
    -- Payment details
    payment_date DATE,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card')),
    transaction_reference TEXT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for vendor invoice numbers
    UNIQUE(vendor_id, invoice_number)
);

-- =====================================================
-- Create vendor_payments table (payment history)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vendor_payments (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Vendor reference
    vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    vendor_name TEXT NOT NULL,
    
    -- Invoice reference (optional)
    invoice_id TEXT REFERENCES public.supplier_invoices(id) ON DELETE SET NULL,
    invoice_number TEXT,
    
    -- Payment details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card')),
    
    -- Transaction details
    transaction_reference TEXT,
    cheque_number TEXT,
    cheque_date DATE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Create indexes for performance
-- =====================================================

-- Vendors indexes
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_gst ON public.vendors(gst_number) WHERE gst_number IS NOT NULL;

-- Purchase orders indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_id ON public.purchase_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON public.purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON public.purchase_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number ON public.purchase_orders(order_number);

-- Purchase order items indexes
CREATE INDEX IF NOT EXISTS idx_po_items_user_id ON public.purchase_order_items(user_id);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON public.purchase_order_items(purchase_order_id);

-- Supplier invoices indexes
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_user_id ON public.supplier_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_vendor_id ON public.supplier_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_po_id ON public.supplier_invoices(purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON public.supplier_invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_due_date ON public.supplier_invoices(due_date) WHERE payment_status != 'paid';

-- Vendor payments indexes
CREATE INDEX IF NOT EXISTS idx_vendor_payments_user_id ON public.vendor_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id ON public.vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_invoice_id ON public.vendor_payments(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_payments_date ON public.vendor_payments(payment_date DESC);

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create RLS Policies for vendors
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can insert their own vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can update their own vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can delete their own vendors" ON public.vendors;

CREATE POLICY "Users can view their own vendors"
    ON public.vendors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own vendors"
    ON public.vendors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vendors"
    ON public.vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vendors"
    ON public.vendors FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Create RLS Policies for purchase_orders
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can insert their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can update their own purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Users can delete their own purchase orders" ON public.purchase_orders;

CREATE POLICY "Users can view their own purchase orders"
    ON public.purchase_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own purchase orders"
    ON public.purchase_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own purchase orders"
    ON public.purchase_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own purchase orders"
    ON public.purchase_orders FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Create RLS Policies for purchase_order_items
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own PO items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can insert their own PO items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can update their own PO items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Users can delete their own PO items" ON public.purchase_order_items;

CREATE POLICY "Users can view their own PO items"
    ON public.purchase_order_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own PO items"
    ON public.purchase_order_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own PO items"
    ON public.purchase_order_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own PO items"
    ON public.purchase_order_items FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Create RLS Policies for supplier_invoices
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own supplier invoices" ON public.supplier_invoices;
DROP POLICY IF EXISTS "Users can insert their own supplier invoices" ON public.supplier_invoices;
DROP POLICY IF EXISTS "Users can update their own supplier invoices" ON public.supplier_invoices;
DROP POLICY IF EXISTS "Users can delete their own supplier invoices" ON public.supplier_invoices;

CREATE POLICY "Users can view their own supplier invoices"
    ON public.supplier_invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own supplier invoices"
    ON public.supplier_invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own supplier invoices"
    ON public.supplier_invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own supplier invoices"
    ON public.supplier_invoices FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Create RLS Policies for vendor_payments
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own vendor payments" ON public.vendor_payments;
DROP POLICY IF EXISTS "Users can insert their own vendor payments" ON public.vendor_payments;
DROP POLICY IF EXISTS "Users can update their own vendor payments" ON public.vendor_payments;
DROP POLICY IF EXISTS "Users can delete their own vendor payments" ON public.vendor_payments;

CREATE POLICY "Users can view their own vendor payments"
    ON public.vendor_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own vendor payments"
    ON public.vendor_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vendor payments"
    ON public.vendor_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vendor payments"
    ON public.vendor_payments FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Create triggers and functions
-- =====================================================

-- Function to update PO total from items
CREATE OR REPLACE FUNCTION update_po_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.purchase_orders
    SET 
        subtotal = (
            SELECT COALESCE(SUM(total_price), 0)
            FROM public.purchase_order_items
            WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
        ),
        total_amount = subtotal + COALESCE(tax_amount, 0) + COALESCE(shipping_charges, 0) - COALESCE(discount_amount, 0),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_po_total ON public.purchase_order_items;
CREATE TRIGGER trigger_update_po_total
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_po_total();

-- Function to update invoice balance
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance_due := NEW.total_amount - COALESCE(NEW.amount_paid, 0);
    NEW.updated_at := NOW();
    
    -- Update payment status based on balance
    IF NEW.balance_due <= 0 THEN
        NEW.payment_status := 'paid';
    ELSIF NEW.amount_paid > 0 THEN
        NEW.payment_status := 'partial';
    ELSIF NEW.due_date < CURRENT_DATE THEN
        NEW.payment_status := 'overdue';
    ELSE
        NEW.payment_status := 'unpaid';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invoice_balance ON public.supplier_invoices;
CREATE TRIGGER trigger_update_invoice_balance
    BEFORE INSERT OR UPDATE ON public.supplier_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_balance();

-- Function to update vendor totals
CREATE OR REPLACE FUNCTION update_vendor_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.vendors
    SET 
        total_purchases = (
            SELECT COALESCE(SUM(total_amount), 0)
            FROM public.purchase_orders
            WHERE vendor_id = NEW.vendor_id AND status IN ('received', 'partially_received')
        ),
        outstanding_balance = (
            SELECT COALESCE(SUM(balance_due), 0)
            FROM public.supplier_invoices
            WHERE vendor_id = NEW.vendor_id AND payment_status != 'paid'
        ),
        last_purchase_date = (
            SELECT MAX(order_date)
            FROM public.purchase_orders
            WHERE vendor_id = NEW.vendor_id
        ),
        updated_at = NOW()
    WHERE id = NEW.vendor_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vendor_totals_po ON public.purchase_orders;
CREATE TRIGGER trigger_update_vendor_totals_po
    AFTER INSERT OR UPDATE ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_totals();

DROP TRIGGER IF EXISTS trigger_update_vendor_totals_inv ON public.supplier_invoices;
CREATE TRIGGER trigger_update_vendor_totals_inv
    AFTER INSERT OR UPDATE ON public.supplier_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_totals();

-- =====================================================
-- Create useful views
-- =====================================================

-- View: Purchase orders summary
CREATE OR REPLACE VIEW purchase_orders_summary AS
SELECT 
    po.id,
    po.user_id,
    po.order_number,
    po.order_date,
    po.vendor_id,
    po.vendor_name,
    po.status,
    po.total_amount,
    po.payment_status,
    po.amount_paid,
    po.total_amount - po.amount_paid AS balance_due,
    po.expected_delivery_date,
    po.actual_delivery_date,
    COUNT(poi.id) AS item_count,
    SUM(poi.quantity_received) AS total_received,
    SUM(poi.quantity) AS total_ordered
FROM public.purchase_orders po
LEFT JOIN public.purchase_order_items poi ON po.id = poi.purchase_order_id
GROUP BY po.id, po.order_number, po.order_date, po.vendor_id, po.vendor_name, 
         po.status, po.total_amount, po.payment_status, po.amount_paid,
         po.expected_delivery_date, po.actual_delivery_date, po.user_id;

COMMENT ON VIEW purchase_orders_summary IS 'Summary view of purchase orders with item counts';

-- View: Supplier invoices summary
CREATE OR REPLACE VIEW supplier_invoices_summary AS
SELECT 
    si.id,
    si.user_id,
    si.invoice_number,
    si.invoice_date,
    si.due_date,
    si.vendor_id,
    si.vendor_name,
    si.total_amount,
    si.amount_paid,
    si.balance_due,
    si.payment_status,
    si.purchase_order_id,
    CASE 
        WHEN si.payment_status = 'unpaid' AND si.due_date < CURRENT_DATE THEN true
        ELSE false
    END AS is_overdue,
    CASE 
        WHEN si.due_date IS NOT NULL THEN si.due_date - CURRENT_DATE
        ELSE NULL
    END AS days_until_due
FROM public.supplier_invoices si;

COMMENT ON VIEW supplier_invoices_summary IS 'Summary view of supplier invoices with overdue tracking';

-- View: Vendor summary with stats
CREATE OR REPLACE VIEW vendors_summary AS
SELECT 
    v.id,
    v.user_id,
    v.name,
    v.contact_person,
    v.phone,
    v.vendor_type,
    v.status,
    v.total_purchases,
    v.outstanding_balance,
    v.last_purchase_date,
    COUNT(DISTINCT po.id) AS purchase_order_count,
    COUNT(DISTINCT si.id) AS invoice_count,
    COUNT(DISTINCT si.id) FILTER (WHERE si.payment_status IN ('unpaid', 'overdue')) AS outstanding_invoice_count
FROM public.vendors v
LEFT JOIN public.purchase_orders po ON v.id = po.vendor_id
LEFT JOIN public.supplier_invoices si ON v.id = si.vendor_id
GROUP BY v.id, v.name, v.contact_person, v.phone, v.vendor_type, v.status,
         v.total_purchases, v.outstanding_balance, v.last_purchase_date, v.user_id;

COMMENT ON VIEW vendors_summary IS 'Summary view of vendors with purchase and invoice statistics';

-- Grant permissions
GRANT SELECT ON purchase_orders_summary TO authenticated;
GRANT SELECT ON supplier_invoices_summary TO authenticated;
GRANT SELECT ON vendors_summary TO authenticated;

-- =====================================================
-- Add comments for documentation
-- =====================================================

COMMENT ON TABLE public.vendors IS 'Supplier and vendor master data';
COMMENT ON TABLE public.purchase_orders IS 'Purchase orders placed with vendors';
COMMENT ON TABLE public.purchase_order_items IS 'Line items in purchase orders';
COMMENT ON TABLE public.supplier_invoices IS 'Invoices received from suppliers';
COMMENT ON TABLE public.vendor_payments IS 'Payment history for vendors';

-- =====================================================
-- END OF MIGRATION
-- =====================================================


-- =====================================================
-- Migration: Reservations & Booking System
-- Description: Add reservation system for weddings and special events
-- Date: 2025-11-13
-- =====================================================

-- This migration adds a complete reservation/booking system for jewelry
-- reservations for weddings, anniversaries, and other special events.

-- =====================================================
-- Create reservations table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reservations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Customer information
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    
    -- Event details
    event_type TEXT NOT NULL CHECK (event_type IN ('wedding', 'anniversary', 'engagement', 'birthday', 'festival', 'other')),
    event_date DATE NOT NULL,
    event_description TEXT,
    
    -- Reservation details
    reservation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pickup_date DATE,
    return_date DATE,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ready', 'picked_up', 'returned', 'cancelled')),
    
    -- Financial details
    total_amount NUMERIC(12,2) DEFAULT 0,
    advance_paid NUMERIC(12,2) DEFAULT 0,
    balance_due NUMERIC(12,2) DEFAULT 0,
    
    -- Additional requirements
    special_requests TEXT,
    category_preferences JSONB, -- Store array of preferred categories
    color_preferences JSONB, -- Store array of preferred colors
    polish_quality TEXT, -- High, Medium, Standard
    
    -- Notes and tracking
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Create reservation_items table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reservation_items (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reservation_id TEXT NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    
    -- Item details
    item_id TEXT, -- Reference to jewelry/gold/stones tables
    item_type TEXT CHECK (item_type IN ('jewelry', 'gold', 'stones', 'custom')),
    item_name TEXT NOT NULL,
    item_description TEXT,
    
    -- Quantity and pricing
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2),
    total_price NUMERIC(12,2),
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'allocated', 'ready', 'delivered', 'returned')),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON public.reservations(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_event_date ON public.reservations(event_date);
CREATE INDEX IF NOT EXISTS idx_reservations_event_type ON public.reservations(event_type);

CREATE INDEX IF NOT EXISTS idx_reservation_items_user_id ON public.reservation_items(user_id);
CREATE INDEX IF NOT EXISTS idx_reservation_items_reservation_id ON public.reservation_items(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_items_item_id ON public.reservation_items(item_id) WHERE item_id IS NOT NULL;

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create RLS Policies for reservations
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can insert their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can update their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can delete their own reservations" ON public.reservations;

CREATE POLICY "Users can view their own reservations"
    ON public.reservations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reservations"
    ON public.reservations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reservations"
    ON public.reservations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reservations"
    ON public.reservations FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- Create RLS Policies for reservation_items
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own reservation items" ON public.reservation_items;
DROP POLICY IF EXISTS "Users can insert their own reservation items" ON public.reservation_items;
DROP POLICY IF EXISTS "Users can update their own reservation items" ON public.reservation_items;
DROP POLICY IF EXISTS "Users can delete their own reservation items" ON public.reservation_items;

CREATE POLICY "Users can view their own reservation items"
    ON public.reservation_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reservation items"
    ON public.reservation_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reservation items"
    ON public.reservation_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reservation items"
    ON public.reservation_items FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- Create function to update balance_due automatically
-- =====================================================

CREATE OR REPLACE FUNCTION update_reservation_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance_due := NEW.total_amount - COALESCE(NEW.advance_paid, 0);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update balance automatically
DROP TRIGGER IF EXISTS trigger_update_reservation_balance ON public.reservations;
CREATE TRIGGER trigger_update_reservation_balance
    BEFORE INSERT OR UPDATE ON public.reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_reservation_balance();

-- =====================================================
-- Create function to update reservation total from items
-- =====================================================

CREATE OR REPLACE FUNCTION update_reservation_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.reservations
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM public.reservation_items
        WHERE reservation_id = NEW.reservation_id
    ),
    updated_at = NOW()
    WHERE id = NEW.reservation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update reservation total when items change
DROP TRIGGER IF EXISTS trigger_update_reservation_total ON public.reservation_items;
CREATE TRIGGER trigger_update_reservation_total
    AFTER INSERT OR UPDATE OR DELETE ON public.reservation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_reservation_total();

-- =====================================================
-- Create view for reservation summary
-- =====================================================

CREATE OR REPLACE VIEW reservations_summary AS
SELECT 
    r.id,
    r.user_id,
    r.customer_name,
    r.customer_phone,
    r.event_type,
    r.event_date,
    r.reservation_date,
    r.status,
    r.total_amount,
    r.advance_paid,
    r.balance_due,
    COUNT(ri.id) AS item_count,
    COUNT(ri.id) FILTER (WHERE ri.status = 'ready') AS ready_count,
    r.pickup_date,
    r.return_date,
    CASE 
        WHEN r.event_date < CURRENT_DATE AND r.status IN ('pending', 'confirmed') THEN true
        ELSE false
    END AS is_overdue
FROM public.reservations r
LEFT JOIN public.reservation_items ri ON r.id = ri.reservation_id
GROUP BY r.id, r.user_id, r.customer_name, r.customer_phone, r.event_type, 
         r.event_date, r.reservation_date, r.status, r.total_amount, 
         r.advance_paid, r.balance_due, r.pickup_date, r.return_date;

COMMENT ON VIEW reservations_summary IS 'Summary view of all reservations with item counts and overdue status';

-- Grant appropriate permissions
GRANT SELECT ON reservations_summary TO authenticated;

-- =====================================================
-- Add comments for documentation
-- =====================================================

COMMENT ON TABLE public.reservations IS 'Jewelry reservations for weddings, anniversaries, and special events';
COMMENT ON TABLE public.reservation_items IS 'Individual items in each reservation';

COMMENT ON COLUMN public.reservations.event_type IS 'Type of event: wedding, anniversary, engagement, birthday, festival, or other';
COMMENT ON COLUMN public.reservations.status IS 'Reservation status: pending, confirmed, ready, picked_up, returned, or cancelled';
COMMENT ON COLUMN public.reservations.category_preferences IS 'JSON array of preferred jewelry categories';
COMMENT ON COLUMN public.reservations.color_preferences IS 'JSON array of preferred colors/metals';

COMMENT ON COLUMN public.reservation_items.item_type IS 'Type of item: jewelry, gold, stones, or custom request';
COMMENT ON COLUMN public.reservation_items.status IS 'Item status: pending, allocated, ready, delivered, or returned';

-- =====================================================
-- Sample queries for testing
-- =====================================================

-- Get all active reservations for a user:
-- SELECT * FROM reservations_summary 
-- WHERE user_id = auth.uid() AND status IN ('pending', 'confirmed', 'ready')
-- ORDER BY event_date;

-- Get upcoming events (next 30 days):
-- SELECT * FROM reservations_summary
-- WHERE user_id = auth.uid() 
-- AND event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
-- ORDER BY event_date;

-- Get overdue reservations:
-- SELECT * FROM reservations_summary
-- WHERE user_id = auth.uid() AND is_overdue = true;

-- =====================================================
-- END OF MIGRATION
-- =====================================================


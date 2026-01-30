-- =====================================================
-- Migration: Google Actions Center - orders table
-- Description: Orders table for Google Actions checkout and related columns
-- Run after: 00-base-schema.sql (and add-user-id-columns if you use user_id)
-- =====================================================

-- Orders table for Google / POS orders (create only if not exists)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    order_number TEXT NOT NULL,
    google_order_id TEXT UNIQUE,
    source TEXT DEFAULT 'google',

    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,

    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax NUMERIC(12,2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,

    payment_method TEXT,
    order_type TEXT DEFAULT 'pickup',
    special_instructions TEXT,
    estimated_ready_time TEXT,

    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'ready', 'completed', 'cancelled')),
    payment_status TEXT,
    payment_transaction_id TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_google_order_id ON public.orders(google_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

COMMENT ON TABLE public.orders IS 'Orders from Google Actions Center and POS';

-- Optional: enable RLS (uncomment and adjust if you use user_id)
-- ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage own orders" ON public.orders
--   FOR ALL USING (auth.uid() = user_id);

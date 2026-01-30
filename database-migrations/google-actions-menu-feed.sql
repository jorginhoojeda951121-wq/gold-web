-- =====================================================
-- Migration: Google Actions Center - menu feed tables
-- Description: businesses, menu_items, google_menu_feeds for Google Merchant / menu feed
-- Run after: google-actions-orders.sql (or 00-base-schema.sql)
-- =====================================================

-- Businesses (for menu feed metadata and checkout base URL)
CREATE TABLE IF NOT EXISTS public.businesses (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    website_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON public.businesses(user_id);
COMMENT ON TABLE public.businesses IS 'Businesses for Google menu feed and checkout links';

-- Menu items (for Google Merchant Center feed)
CREATE TABLE IF NOT EXISTS public.menu_items (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'Uncategorized',
    image_url TEXT,
    availability TEXT DEFAULT 'available',
    is_active BOOLEAN DEFAULT true,

    prep_time_minutes INTEGER,
    dietary_restrictions TEXT[],

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_business_id ON public.menu_items(business_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_user_id ON public.menu_items(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_active ON public.menu_items(is_active);
COMMENT ON TABLE public.menu_items IS 'Menu items for Google Actions Center feed';

-- Cached menu feeds (JSON/XML) per business
CREATE TABLE IF NOT EXISTS public.google_menu_feeds (
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    feed_format TEXT NOT NULL CHECK (feed_format IN ('json', 'xml')),
    feed_data TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (business_id, feed_format)
);

CREATE INDEX IF NOT EXISTS idx_google_menu_feeds_business_id ON public.google_menu_feeds(business_id);
COMMENT ON TABLE public.google_menu_feeds IS 'Cached Google menu feed (JSON/XML) per business';

-- =====================================================
-- Migration: Google Calendar Integration
-- Description: Add support for Google Calendar sync with reservations
-- Date: 2025-11-13
-- =====================================================

-- Step 1: Drop any existing objects to start clean
DROP VIEW IF EXISTS public.reservations_with_calendar_status CASCADE;
DROP TRIGGER IF EXISTS trigger_update_calendar_sync ON public.reservations;
DROP FUNCTION IF EXISTS public.update_calendar_sync_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.get_calendar_sync_stats(UUID) CASCADE;

-- Step 2: Add columns to reservations table (only if they don't exist)
DO $$ 
BEGIN
    -- Add calendar_event_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reservations' 
        AND column_name = 'calendar_event_id'
    ) THEN
        ALTER TABLE public.reservations ADD COLUMN calendar_event_id TEXT;
    END IF;
    
    -- Add calendar_synced_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reservations' 
        AND column_name = 'calendar_synced_at'
    ) THEN
        ALTER TABLE public.reservations ADD COLUMN calendar_synced_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add index
CREATE INDEX IF NOT EXISTS idx_reservations_calendar_event_id 
ON public.reservations(calendar_event_id) 
WHERE calendar_event_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.reservations.calendar_event_id IS 'Google Calendar event ID for automatic syncing';
COMMENT ON COLUMN public.reservations.calendar_synced_at IS 'Last time this reservation was synced to Google Calendar';

-- Step 3: Create google_calendar_settings table
CREATE TABLE IF NOT EXISTS public.google_calendar_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    auto_sync_enabled BOOLEAN DEFAULT true,
    default_reminders JSONB DEFAULT '[
        {"method": "email", "minutes": 10080},
        {"method": "email", "minutes": 4320},
        {"method": "popup", "minutes": 1440},
        {"method": "popup", "minutes": 60}
    ]'::jsonb,
    calendar_id TEXT DEFAULT 'primary',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    event_duration_hours INTEGER DEFAULT 8,
    default_location TEXT,
    include_customer_email BOOLEAN DEFAULT true,
    google_account_email TEXT,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.google_calendar_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own calendar settings" ON public.google_calendar_settings;
CREATE POLICY "Users can view their own calendar settings"
    ON public.google_calendar_settings FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own calendar settings" ON public.google_calendar_settings;
CREATE POLICY "Users can insert their own calendar settings"
    ON public.google_calendar_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own calendar settings" ON public.google_calendar_settings;
CREATE POLICY "Users can update their own calendar settings"
    ON public.google_calendar_settings FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own calendar settings" ON public.google_calendar_settings;
CREATE POLICY "Users can delete their own calendar settings"
    ON public.google_calendar_settings FOR DELETE
    USING (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_google_calendar_settings_user_id 
ON public.google_calendar_settings(user_id);

-- Step 4: Create trigger function
CREATE FUNCTION public.update_calendar_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.calendar_event_id IS NOT NULL AND (OLD.calendar_event_id IS NULL OR OLD.calendar_event_id != NEW.calendar_event_id) THEN
        NEW.calendar_synced_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_calendar_sync
    BEFORE UPDATE ON public.reservations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_calendar_sync_timestamp();

-- Step 5: Create view
CREATE VIEW public.reservations_with_calendar_status AS
SELECT 
    r.id,
    r.user_id,
    r.customer_id,
    r.customer_name,
    r.customer_phone,
    r.customer_email,
    r.event_type,
    r.event_date,
    r.event_description,
    r.reservation_date,
    r.pickup_date,
    r.return_date,
    r.status,
    r.total_amount,
    r.advance_paid,
    r.balance_due,
    r.special_requests,
    r.category_preferences,
    r.color_preferences,
    r.polish_quality,
    r.notes,
    r.created_at,
    r.updated_at,
    r.calendar_event_id,
    r.calendar_synced_at,
    CASE 
        WHEN r.calendar_event_id IS NOT NULL THEN true
        ELSE false
    END AS is_synced_to_calendar,
    gcs.auto_sync_enabled,
    gcs.google_account_email
FROM public.reservations r
LEFT JOIN public.google_calendar_settings gcs ON r.user_id = gcs.user_id;

GRANT SELECT ON public.reservations_with_calendar_status TO authenticated;

-- Step 6: Create stats function
CREATE FUNCTION public.get_calendar_sync_stats(p_user_id UUID)
RETURNS TABLE (
    total_reservations BIGINT,
    synced_reservations BIGINT,
    unsynced_reservations BIGINT,
    last_sync_time TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_reservations,
        COUNT(calendar_event_id)::BIGINT as synced_reservations,
        (COUNT(*) - COUNT(calendar_event_id))::BIGINT as unsynced_reservations,
        MAX(calendar_synced_at) as last_sync_time
    FROM public.reservations
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

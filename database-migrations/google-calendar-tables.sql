-- =====================================================
-- Migration: Google Calendar integration tables
-- Description: calendar_tokens, appointments, appointment_notifications for Calendar webhook
-- Run after: 00-base-schema.sql
-- =====================================================

-- OAuth tokens for Google Calendar (per user/calendar)
CREATE TABLE IF NOT EXISTS public.calendar_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    calendar_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_tokens_user_id ON public.calendar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_tokens_calendar_id ON public.calendar_tokens(calendar_id);
COMMENT ON TABLE public.calendar_tokens IS 'Google Calendar OAuth tokens';

-- Appointments (synced with Google Calendar events)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    google_event_id TEXT UNIQUE,

    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    service_name TEXT,
    staff_email TEXT,

    date DATE NOT NULL,
    time TIME,
    duration INTEGER,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),
    cancellation_reason TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_google_event_id ON public.appointments(google_event_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
COMMENT ON TABLE public.appointments IS 'Appointments synced with Google Calendar';

-- Audit trail for appointment notifications (email/SMS sent)
CREATE TABLE IF NOT EXISTS public.appointment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_notifications_client_email ON public.appointment_notifications(client_email);
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_sent_at ON public.appointment_notifications(sent_at DESC);
COMMENT ON TABLE public.appointment_notifications IS 'Audit log of appointment notifications sent';

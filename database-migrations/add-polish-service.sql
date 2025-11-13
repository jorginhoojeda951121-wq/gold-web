-- =====================================================
-- ADD CUSTOM POLISH SERVICE FIELDS TO RESERVATIONS
-- =====================================================
-- Description: Adds polish_service and polish_rate fields to reservations
--              to support custom polish rates for stores
-- Created: 2025
-- =====================================================

-- Add polish service fields to reservations table
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS polish_service BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS polish_rate NUMERIC(12,2);

-- Add comment
COMMENT ON COLUMN public.reservations.polish_service IS 'Indicates if custom polish service is requested';
COMMENT ON COLUMN public.reservations.polish_rate IS 'Custom polish rate for stores with their own polish services';


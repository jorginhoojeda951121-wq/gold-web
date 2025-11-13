-- Migration: Add Craftsman Firm Type Support
-- This adds the ability to distinguish between individual craftsmen and firms

-- Add firm type columns to craftsmen table (if they don't exist)
DO $$ 
BEGIN
    -- Add type column (individual or firm)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'craftsmen' AND column_name = 'type') THEN
        ALTER TABLE public.craftsmen ADD COLUMN type TEXT DEFAULT 'individual' CHECK (type IN ('individual', 'firm'));
        COMMENT ON COLUMN public.craftsmen.type IS 'Type of craftsman: individual person or firm/company';
    END IF;
    
    -- Add firm name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'craftsmen' AND column_name = 'firm_name') THEN
        ALTER TABLE public.craftsmen ADD COLUMN firm_name TEXT;
        COMMENT ON COLUMN public.craftsmen.firm_name IS 'Name of firm (if type is firm)';
    END IF;
    
    -- Add firm contact column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'craftsmen' AND column_name = 'firm_contact') THEN
        ALTER TABLE public.craftsmen ADD COLUMN firm_contact TEXT;
        COMMENT ON COLUMN public.craftsmen.firm_contact IS 'Firm primary contact number (if different from individual contact)';
    END IF;
    
    -- Add firm address column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'craftsmen' AND column_name = 'firm_address') THEN
        ALTER TABLE public.craftsmen ADD COLUMN firm_address TEXT;
        COMMENT ON COLUMN public.craftsmen.firm_address IS 'Firm business address';
    END IF;
    
    -- Add firm GST number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'craftsmen' AND column_name = 'firm_gst_number') THEN
        ALTER TABLE public.craftsmen ADD COLUMN firm_gst_number TEXT;
        COMMENT ON COLUMN public.craftsmen.firm_gst_number IS 'Firm GST registration number (for invoicing)';
    END IF;
    
    -- Add contact person column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'craftsmen' AND column_name = 'contact_person') THEN
        ALTER TABLE public.craftsmen ADD COLUMN contact_person TEXT;
        COMMENT ON COLUMN public.craftsmen.contact_person IS 'Contact person name (if type is firm)';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_craftsmen_type ON public.craftsmen(type) WHERE type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_craftsmen_firm_gst ON public.craftsmen(firm_gst_number) WHERE firm_gst_number IS NOT NULL;

-- Update existing records to have 'individual' type if NULL
UPDATE public.craftsmen 
SET type = 'individual' 
WHERE type IS NULL;

-- Create a view for firm craftsmen statistics
CREATE OR REPLACE VIEW craftsmen_by_type_summary AS
SELECT 
    user_id,
    type,
    COUNT(*) AS count,
    COUNT(*) FILTER (WHERE status = 'active' OR status = 'busy') AS active_count,
    SUM(COALESCE(pending_amount, 0)) AS total_pending_amount,
    SUM(COALESCE(total_amount_paid, 0)) AS total_amount_paid
FROM public.craftsmen
GROUP BY user_id, type;

-- Grant appropriate permissions
GRANT SELECT ON craftsmen_by_type_summary TO authenticated;

-- Create a function to validate firm-specific fields
CREATE OR REPLACE FUNCTION validate_craftsman_firm_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- If type is 'firm', ensure firm_name is provided
    IF NEW.type = 'firm' AND (NEW.firm_name IS NULL OR NEW.firm_name = '') THEN
        -- Set firm_name to name if not provided
        NEW.firm_name := NEW.name;
    END IF;
    
    -- If type is 'individual', clear firm-specific fields
    IF NEW.type = 'individual' THEN
        NEW.firm_name := NULL;
        NEW.firm_contact := NULL;
        NEW.firm_address := NULL;
        NEW.firm_gst_number := NULL;
        NEW.contact_person := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate firm fields
DROP TRIGGER IF EXISTS trigger_validate_craftsman_firm_fields ON public.craftsmen;
CREATE TRIGGER trigger_validate_craftsman_firm_fields
    BEFORE INSERT OR UPDATE ON public.craftsmen
    FOR EACH ROW
    EXECUTE FUNCTION validate_craftsman_firm_fields();

-- Sample queries for reporting

-- Get all firms with their GST numbers
-- SELECT id, name AS firm_name, contact_person, firm_contact, firm_gst_number, status
-- FROM craftsmen 
-- WHERE type = 'firm' AND user_id = auth.uid()
-- ORDER BY name;

-- Get all individual craftsmen
-- SELECT id, name, phone AS contact, specialty, status
-- FROM craftsmen 
-- WHERE type = 'individual' AND user_id = auth.uid()
-- ORDER BY name;

-- Get summary by type
-- SELECT * FROM craftsmen_by_type_summary WHERE user_id = auth.uid();

-- Get firms with pending payments
-- SELECT 
--     name AS firm_name,
--     contact_person,
--     firm_contact,
--     pending_amount,
--     total_amount_due,
--     total_amount_paid
-- FROM craftsmen
-- WHERE type = 'firm' 
--   AND pending_amount > 0
--   AND user_id = auth.uid()
-- ORDER BY pending_amount DESC;

COMMENT ON VIEW craftsmen_by_type_summary IS 'Summary statistics of craftsmen grouped by type (individual/firm)';


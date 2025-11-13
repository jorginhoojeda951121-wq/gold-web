-- Migration: Add Craftsman Payment Tracking
-- This adds payment tracking capabilities for craftsmen including payment history and material-level payment tracking

-- Create craftsman_payments table for payment history
CREATE TABLE IF NOT EXISTS public.craftsman_payments (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    craftsman_id TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque')),
    project_id TEXT,
    description TEXT NOT NULL,
    receipt_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_craftsman_payments_user_id ON public.craftsman_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_craftsman_payments_craftsman_id ON public.craftsman_payments(craftsman_id);
CREATE INDEX IF NOT EXISTS idx_craftsman_payments_payment_date ON public.craftsman_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_craftsman_payments_project_id ON public.craftsman_payments(project_id) WHERE project_id IS NOT NULL;

-- Add payment tracking columns to craftsmen table (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'craftsmen' AND column_name = 'total_amount_due') THEN
        ALTER TABLE public.craftsmen ADD COLUMN total_amount_due DECIMAL(10, 2) DEFAULT 0 CHECK (total_amount_due >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'craftsmen' AND column_name = 'total_amount_paid') THEN
        ALTER TABLE public.craftsmen ADD COLUMN total_amount_paid DECIMAL(10, 2) DEFAULT 0 CHECK (total_amount_paid >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'craftsmen' AND column_name = 'pending_amount') THEN
        ALTER TABLE public.craftsmen ADD COLUMN pending_amount DECIMAL(10, 2) DEFAULT 0 CHECK (pending_amount >= 0);
    END IF;
END $$;

-- Add payment tracking columns to materials_assigned table (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials_assigned' AND column_name = 'agreed_amount') THEN
        ALTER TABLE public.materials_assigned ADD COLUMN agreed_amount DECIMAL(10, 2) CHECK (agreed_amount >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials_assigned' AND column_name = 'amount_paid') THEN
        ALTER TABLE public.materials_assigned ADD COLUMN amount_paid DECIMAL(10, 2) DEFAULT 0 CHECK (amount_paid >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materials_assigned' AND column_name = 'payment_status') THEN
        ALTER TABLE public.materials_assigned ADD COLUMN payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
    END IF;
END $$;

-- Enable Row Level Security on craftsman_payments table
ALTER TABLE public.craftsman_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own craftsman payments" ON public.craftsman_payments;
DROP POLICY IF EXISTS "Users can insert their own craftsman payments" ON public.craftsman_payments;
DROP POLICY IF EXISTS "Users can update their own craftsman payments" ON public.craftsman_payments;
DROP POLICY IF EXISTS "Users can delete their own craftsman payments" ON public.craftsman_payments;

-- Create RLS policies for craftsman_payments
CREATE POLICY "Users can view their own craftsman payments"
    ON public.craftsman_payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own craftsman payments"
    ON public.craftsman_payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own craftsman payments"
    ON public.craftsman_payments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own craftsman payments"
    ON public.craftsman_payments FOR DELETE
    USING (auth.uid() = user_id);

-- Function to automatically update craftsman payment totals
CREATE OR REPLACE FUNCTION update_craftsman_payment_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate totals for the affected craftsman
    UPDATE public.craftsmen
    SET 
        total_amount_paid = COALESCE((
            SELECT SUM(amount)
            FROM public.craftsman_payments
            WHERE craftsman_id = NEW.craftsman_id AND user_id = NEW.user_id
        ), 0),
        pending_amount = GREATEST(0, total_amount_due - COALESCE((
            SELECT SUM(amount)
            FROM public.craftsman_payments
            WHERE craftsman_id = NEW.craftsman_id AND user_id = NEW.user_id
        ), 0)),
        updated_at = NOW()
    WHERE id = NEW.craftsman_id AND user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update craftsman totals on payment insert
DROP TRIGGER IF EXISTS trigger_update_craftsman_payment_totals ON public.craftsman_payments;
CREATE TRIGGER trigger_update_craftsman_payment_totals
    AFTER INSERT ON public.craftsman_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_craftsman_payment_totals();

-- Function to update material payment status
CREATE OR REPLACE FUNCTION update_material_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update payment status based on amount paid vs agreed amount
    IF NEW.agreed_amount IS NOT NULL AND NEW.agreed_amount > 0 THEN
        IF NEW.amount_paid >= NEW.agreed_amount THEN
            NEW.payment_status := 'paid';
        ELSIF NEW.amount_paid > 0 THEN
            NEW.payment_status := 'partial';
        ELSE
            NEW.payment_status := 'unpaid';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update material payment status
DROP TRIGGER IF EXISTS trigger_update_material_payment_status ON public.materials_assigned;
CREATE TRIGGER trigger_update_material_payment_status
    BEFORE INSERT OR UPDATE ON public.materials_assigned
    FOR EACH ROW
    EXECUTE FUNCTION update_material_payment_status();

-- Create a view for craftsman payment summary
CREATE OR REPLACE VIEW craftsman_payment_summary AS
SELECT 
    c.id AS craftsman_id,
    c.name AS craftsman_name,
    c.user_id,
    c.total_amount_due,
    c.total_amount_paid,
    c.pending_amount,
    COUNT(DISTINCT cp.id) AS payment_count,
    MAX(cp.payment_date) AS last_payment_date,
    COUNT(DISTINCT ma.id) AS total_projects,
    COUNT(DISTINCT CASE WHEN ma.payment_status = 'paid' THEN ma.id END) AS paid_projects,
    COUNT(DISTINCT CASE WHEN ma.payment_status = 'partial' THEN ma.id END) AS partial_paid_projects,
    COUNT(DISTINCT CASE WHEN ma.payment_status = 'unpaid' THEN ma.id END) AS unpaid_projects
FROM public.craftsmen c
LEFT JOIN public.craftsman_payments cp ON c.id = cp.craftsman_id AND c.user_id = cp.user_id
LEFT JOIN public.materials_assigned ma ON c.id = ma.craftsman_id AND c.user_id = ma.user_id
GROUP BY c.id, c.name, c.user_id, c.total_amount_due, c.total_amount_paid, c.pending_amount;

-- Grant appropriate permissions
GRANT SELECT ON craftsman_payment_summary TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.craftsman_payments IS 'Payment history for craftsmen work';
COMMENT ON COLUMN public.craftsmen.total_amount_due IS 'Total amount to be paid for all assigned work';
COMMENT ON COLUMN public.craftsmen.total_amount_paid IS 'Total amount already paid to craftsman';
COMMENT ON COLUMN public.craftsmen.pending_amount IS 'Amount still pending (due - paid)';
COMMENT ON COLUMN public.materials_assigned.agreed_amount IS 'Agreed payment amount for this specific work';
COMMENT ON COLUMN public.materials_assigned.amount_paid IS 'Amount paid for this specific work';
COMMENT ON COLUMN public.materials_assigned.payment_status IS 'Payment status: unpaid, partial, or paid';

-- Sample query to get craftsman payment details:
-- SELECT * FROM craftsman_payment_summary WHERE user_id = auth.uid() ORDER BY pending_amount DESC;

-- Sample query to get payment history for a craftsman:
-- SELECT * FROM craftsman_payments WHERE craftsman_id = 'CRAFTSMAN_ID' AND user_id = auth.uid() ORDER BY payment_date DESC;

COMMENT ON VIEW craftsman_payment_summary IS 'Summary view of craftsman payments and project status';


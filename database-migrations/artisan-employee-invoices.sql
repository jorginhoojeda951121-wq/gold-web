-- =====================================================
-- Migration: Artisan & Employee Invoice System
-- Description: Add formal invoice generation for artisans and employees
-- Date: 2025-11-13
-- =====================================================

-- This migration adds tables to generate and track formal invoices
-- for artisan work payments and employee salary payments.

-- =====================================================
-- Create artisan_invoices table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.artisan_invoices (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Artisan reference
    craftsman_id TEXT NOT NULL REFERENCES public.craftsmen(id) ON DELETE RESTRICT,
    craftsman_name TEXT NOT NULL,
    craftsman_phone TEXT,
    craftsman_address TEXT,
    
    -- Firm details (if craftsman is a firm)
    firm_name TEXT,
    firm_gst_number TEXT,
    
    -- Invoice details
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    
    -- Work reference
    project_id TEXT, -- Reference to materials_assigned table
    work_description TEXT NOT NULL,
    
    -- Financial details
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    other_charges NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL,
    
    -- Payment tracking
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue')),
    amount_paid NUMERIC(12,2) DEFAULT 0,
    balance_due NUMERIC(12,2),
    
    -- Payment details
    payment_date DATE,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque')),
    transaction_reference TEXT,
    
    -- Invoice items (line items stored as JSONB)
    line_items JSONB, -- Array of {description, quantity, rate, amount}
    
    -- Notes and terms
    notes TEXT,
    terms_and_conditions TEXT,
    
    -- PDF storage reference
    pdf_url TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artisan_invoices_user_id ON public.artisan_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_artisan_invoices_craftsman_id ON public.artisan_invoices(craftsman_id);
CREATE INDEX IF NOT EXISTS idx_artisan_invoices_invoice_number ON public.artisan_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_artisan_invoices_status ON public.artisan_invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_artisan_invoices_date ON public.artisan_invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_artisan_invoices_project_id ON public.artisan_invoices(project_id) WHERE project_id IS NOT NULL;

COMMENT ON TABLE public.artisan_invoices IS 'Formal invoices for artisan work payments';
COMMENT ON COLUMN public.artisan_invoices.line_items IS 'JSON array of invoice line items: [{description, quantity, rate, amount}, ...]';

-- =====================================================
-- Create employee_payslips table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.employee_payslips (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Employee reference
    employee_id TEXT NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
    employee_name TEXT NOT NULL,
    employee_email TEXT,
    
    -- Payslip period
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    pay_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Salary details
    base_salary NUMERIC(12,2) NOT NULL,
    
    -- Working days
    total_working_days INTEGER NOT NULL,
    days_present INTEGER NOT NULL,
    days_absent INTEGER DEFAULT 0,
    days_late INTEGER DEFAULT 0,
    days_half_day INTEGER DEFAULT 0,
    
    -- Earnings (additions)
    hra NUMERIC(12,2) DEFAULT 0, -- House Rent Allowance
    conveyance NUMERIC(12,2) DEFAULT 0,
    medical_allowance NUMERIC(12,2) DEFAULT 0,
    bonus NUMERIC(12,2) DEFAULT 0,
    overtime_pay NUMERIC(12,2) DEFAULT 0,
    other_earnings NUMERIC(12,2) DEFAULT 0,
    total_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Deductions
    pf_deduction NUMERIC(12,2) DEFAULT 0, -- Provident Fund
    esi_deduction NUMERIC(12,2) DEFAULT 0, -- Employee State Insurance
    professional_tax NUMERIC(12,2) DEFAULT 0,
    tds NUMERIC(12,2) DEFAULT 0, -- Tax Deducted at Source
    late_penalty NUMERIC(12,2) DEFAULT 0,
    absence_deduction NUMERIC(12,2) DEFAULT 0,
    loan_deduction NUMERIC(12,2) DEFAULT 0,
    advance_deduction NUMERIC(12,2) DEFAULT 0,
    other_deductions NUMERIC(12,2) DEFAULT 0,
    total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Net salary
    gross_salary NUMERIC(12,2) NOT NULL, -- Base + Earnings
    net_salary NUMERIC(12,2) NOT NULL, -- Gross - Deductions
    
    -- Custom additions/deductions (from salary rules)
    custom_additions JSONB, -- Array of {name, amount}
    custom_deductions JSONB, -- Array of {name, amount}
    
    -- Payment details
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'processing')),
    payment_date DATE,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Cheque', 'UPI')),
    transaction_reference TEXT,
    
    -- Notes
    notes TEXT,
    
    -- PDF storage reference
    pdf_url TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one payslip per employee per month/year
    UNIQUE(user_id, employee_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_employee_payslips_user_id ON public.employee_payslips(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_payslips_employee_id ON public.employee_payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_payslips_period ON public.employee_payslips(year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_employee_payslips_status ON public.employee_payslips(payment_status);
CREATE INDEX IF NOT EXISTS idx_employee_payslips_pay_date ON public.employee_payslips(pay_date DESC);

COMMENT ON TABLE public.employee_payslips IS 'Monthly salary payslips for employees';
COMMENT ON COLUMN public.employee_payslips.total_working_days IS 'Actual days in the month (30/31 or 28/29 for February)';
COMMENT ON COLUMN public.employee_payslips.custom_additions IS 'JSON array of custom salary additions: [{name, amount}, ...]';
COMMENT ON COLUMN public.employee_payslips.custom_deductions IS 'JSON array of custom salary deductions: [{name, amount}, ...]';

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.artisan_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_payslips ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create RLS Policies
-- =====================================================

-- Artisan Invoices Policies
DROP POLICY IF EXISTS "Users can view their own artisan invoices" ON public.artisan_invoices;
CREATE POLICY "Users can view their own artisan invoices"
    ON public.artisan_invoices FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own artisan invoices" ON public.artisan_invoices;
CREATE POLICY "Users can insert their own artisan invoices"
    ON public.artisan_invoices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own artisan invoices" ON public.artisan_invoices;
CREATE POLICY "Users can update their own artisan invoices"
    ON public.artisan_invoices FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own artisan invoices" ON public.artisan_invoices;
CREATE POLICY "Users can delete their own artisan invoices"
    ON public.artisan_invoices FOR DELETE
    USING (auth.uid() = user_id);

-- Employee Payslips Policies
DROP POLICY IF EXISTS "Users can view their own employee payslips" ON public.employee_payslips;
CREATE POLICY "Users can view their own employee payslips"
    ON public.employee_payslips FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own employee payslips" ON public.employee_payslips;
CREATE POLICY "Users can insert their own employee payslips"
    ON public.employee_payslips FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own employee payslips" ON public.employee_payslips;
CREATE POLICY "Users can update their own employee payslips"
    ON public.employee_payslips FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own employee payslips" ON public.employee_payslips;
CREATE POLICY "Users can delete their own employee payslips"
    ON public.employee_payslips FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- Create triggers
-- =====================================================

-- Update balance_due for artisan invoices
CREATE OR REPLACE FUNCTION update_artisan_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance_due := NEW.total_amount - COALESCE(NEW.amount_paid, 0);
    NEW.updated_at := NOW();
    
    -- Update payment status based on balance
    IF NEW.balance_due <= 0 THEN
        NEW.payment_status := 'paid';
    ELSIF NEW.amount_paid > 0 THEN
        NEW.payment_status := 'partial';
    ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
        NEW.payment_status := 'overdue';
    ELSE
        NEW.payment_status := 'unpaid';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_artisan_invoice_balance ON public.artisan_invoices;
CREATE TRIGGER trigger_update_artisan_invoice_balance
    BEFORE INSERT OR UPDATE ON public.artisan_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_artisan_invoice_balance();

-- Calculate totals for employee payslips
CREATE OR REPLACE FUNCTION calculate_payslip_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total earnings
    NEW.total_earnings := NEW.base_salary + 
                         COALESCE(NEW.hra, 0) + 
                         COALESCE(NEW.conveyance, 0) + 
                         COALESCE(NEW.medical_allowance, 0) + 
                         COALESCE(NEW.bonus, 0) + 
                         COALESCE(NEW.overtime_pay, 0) + 
                         COALESCE(NEW.other_earnings, 0);
    
    -- Calculate total deductions
    NEW.total_deductions := COALESCE(NEW.pf_deduction, 0) + 
                           COALESCE(NEW.esi_deduction, 0) + 
                           COALESCE(NEW.professional_tax, 0) + 
                           COALESCE(NEW.tds, 0) + 
                           COALESCE(NEW.late_penalty, 0) + 
                           COALESCE(NEW.absence_deduction, 0) + 
                           COALESCE(NEW.loan_deduction, 0) + 
                           COALESCE(NEW.advance_deduction, 0) + 
                           COALESCE(NEW.other_deductions, 0);
    
    -- Calculate gross and net salary
    NEW.gross_salary := NEW.total_earnings;
    NEW.net_salary := NEW.gross_salary - NEW.total_deductions;
    
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_payslip_totals ON public.employee_payslips;
CREATE TRIGGER trigger_calculate_payslip_totals
    BEFORE INSERT OR UPDATE ON public.employee_payslips
    FOR EACH ROW
    EXECUTE FUNCTION calculate_payslip_totals();

-- =====================================================
-- Create summary views
-- =====================================================

-- Artisan invoices summary
CREATE OR REPLACE VIEW artisan_invoices_summary AS
SELECT 
    ai.id,
    ai.user_id,
    ai.invoice_number,
    ai.invoice_date,
    ai.due_date,
    ai.craftsman_id,
    ai.craftsman_name,
    ai.total_amount,
    ai.amount_paid,
    ai.balance_due,
    ai.payment_status,
    CASE 
        WHEN ai.payment_status = 'unpaid' AND ai.due_date < CURRENT_DATE THEN true
        ELSE false
    END AS is_overdue,
    CASE 
        WHEN ai.due_date IS NOT NULL THEN ai.due_date - CURRENT_DATE
        ELSE NULL
    END AS days_until_due
FROM public.artisan_invoices ai;

GRANT SELECT ON artisan_invoices_summary TO authenticated;

COMMENT ON VIEW artisan_invoices_summary IS 'Summary view of artisan invoices with overdue tracking';

-- Employee payslips summary by period
CREATE OR REPLACE VIEW employee_payslips_by_period AS
SELECT 
    user_id,
    year,
    month,
    COUNT(*) as total_payslips,
    SUM(gross_salary) as total_gross,
    SUM(total_deductions) as total_deductions,
    SUM(net_salary) as total_net,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_count,
    COUNT(*) FILTER (WHERE payment_status = 'unpaid') as unpaid_count
FROM public.employee_payslips
GROUP BY user_id, year, month
ORDER BY year DESC, month DESC;

GRANT SELECT ON employee_payslips_by_period TO authenticated;

COMMENT ON VIEW employee_payslips_by_period IS 'Monthly summary of employee payslips';

-- =====================================================
-- Helper function to generate invoice number
-- =====================================================

CREATE OR REPLACE FUNCTION generate_artisan_invoice_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
    v_invoice_number TEXT;
    v_prefix TEXT := 'ART-INV-';
    v_year TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_month TEXT := TO_CHAR(CURRENT_DATE, 'MM');
BEGIN
    -- Count existing invoices for this user in current month
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.artisan_invoices
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM invoice_date) = EXTRACT(MONTH FROM CURRENT_DATE);
    
    -- Generate invoice number: ART-INV-YYYY-MM-NNNN
    v_invoice_number := v_prefix || v_year || '-' || v_month || '-' || LPAD(v_count::TEXT, 4, '0');
    
    RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_artisan_invoice_number IS 'Generate sequential artisan invoice number for the current month';

-- =====================================================
-- Helper function to generate payslip reference
-- =====================================================

CREATE OR REPLACE FUNCTION generate_payslip_id(p_user_id UUID, p_employee_id TEXT, p_month INTEGER, p_year INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN 'PAY-' || p_year::TEXT || '-' || LPAD(p_month::TEXT, 2, '0') || '-' || SUBSTRING(p_employee_id, 1, 8);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_payslip_id IS 'Generate unique payslip ID from employee and period';

-- =====================================================
-- Sample queries for testing
-- =====================================================

-- Generate artisan invoice number:
-- SELECT generate_artisan_invoice_number('your-user-id'::UUID);

-- Get unpaid artisan invoices:
-- SELECT * FROM artisan_invoices_summary 
-- WHERE user_id = auth.uid() AND payment_status IN ('unpaid', 'partial', 'overdue')
-- ORDER BY invoice_date DESC;

-- Get employee payslips for current month:
-- SELECT * FROM employee_payslips 
-- WHERE user_id = auth.uid() 
-- AND month = EXTRACT(MONTH FROM CURRENT_DATE)
-- AND year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Get payslip summary by period:
-- SELECT * FROM employee_payslips_by_period WHERE user_id = auth.uid();

-- =====================================================
-- END OF MIGRATION
-- =====================================================


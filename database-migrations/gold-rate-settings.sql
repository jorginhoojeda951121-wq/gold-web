-- =====================================================
-- Migration: Gold Rate Settings & Price Calculator
-- Description: Add support for current gold rates, making charges, and automatic price calculation
-- Date: 2025-11-13
-- =====================================================

-- This migration adds tables to store current gold rates, making charges,
-- and rate history for automatic price calculation of gold jewelry items.

-- =====================================================
-- Create gold_rates table
-- =====================================================

CREATE TABLE IF NOT EXISTS gold_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Current rates per gram
  rate_24k NUMERIC(10,2) NOT NULL DEFAULT 6800.00,  -- 24K pure gold (99.9%)
  rate_22k NUMERIC(10,2) NOT NULL DEFAULT 6200.00,  -- 22K standard gold (91.6%)
  rate_18k NUMERIC(10,2) NOT NULL DEFAULT 5100.00,  -- 18K gold (75%)
  rate_14k NUMERIC(10,2) NOT NULL DEFAULT 4000.00,  -- 14K gold (58.3%)
  
  -- Making charges per gram
  making_24k NUMERIC(10,2) NOT NULL DEFAULT 600.00,
  making_22k NUMERIC(10,2) NOT NULL DEFAULT 550.00,
  making_18k NUMERIC(10,2) NOT NULL DEFAULT 500.00,
  making_14k NUMERIC(10,2) NOT NULL DEFAULT 450.00,
  
  -- Minimum making charges
  min_making_24k NUMERIC(10,2) DEFAULT 500.00,
  min_making_22k NUMERIC(10,2) DEFAULT 450.00,
  min_making_18k NUMERIC(10,2) DEFAULT 400.00,
  min_making_14k NUMERIC(10,2) DEFAULT 350.00,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active rate per user
  UNIQUE(user_id, is_active)
);

-- Add comments
COMMENT ON TABLE gold_rates IS 'Current gold rates and making charges per user';
COMMENT ON COLUMN gold_rates.rate_24k IS 'Current rate per gram for 24K (99.9%) pure gold';
COMMENT ON COLUMN gold_rates.rate_22k IS 'Current rate per gram for 22K (91.6%) standard gold';
COMMENT ON COLUMN gold_rates.rate_18k IS 'Current rate per gram for 18K (75%) gold';
COMMENT ON COLUMN gold_rates.rate_14k IS 'Current rate per gram for 14K (58.3%) gold';
COMMENT ON COLUMN gold_rates.making_24k IS 'Making charges per gram for 24K gold items';
COMMENT ON COLUMN gold_rates.is_active IS 'Only one active rate per user at a time';

-- =====================================================
-- Create gold_rate_history table
-- =====================================================

CREATE TABLE IF NOT EXISTS gold_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Historical rates
  rate_24k NUMERIC(10,2) NOT NULL,
  rate_22k NUMERIC(10,2) NOT NULL,
  rate_18k NUMERIC(10,2) NOT NULL,
  rate_14k NUMERIC(10,2) NOT NULL,
  
  -- Historical making charges
  making_24k NUMERIC(10,2),
  making_22k NUMERIC(10,2),
  making_18k NUMERIC(10,2),
  making_14k NUMERIC(10,2),
  
  -- Metadata
  updated_by TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for fast lookups
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE gold_rate_history IS 'Historical gold rate changes for tracking and analytics';
COMMENT ON COLUMN gold_rate_history.recorded_at IS 'When this rate was active (before being replaced)';

-- =====================================================
-- Create indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_gold_rates_user_id ON gold_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_gold_rates_active ON gold_rates(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gold_rate_history_user_id ON gold_rate_history(user_id);
CREATE INDEX IF NOT EXISTS idx_gold_rate_history_date ON gold_rate_history(user_id, recorded_at DESC);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE gold_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_rate_history ENABLE ROW LEVEL SECURITY;

-- Gold rates policies
CREATE POLICY "Users can view their own gold rates"
  ON gold_rates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gold rates"
  ON gold_rates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gold rates"
  ON gold_rates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gold rates"
  ON gold_rates FOR DELETE
  USING (auth.uid() = user_id);

-- Gold rate history policies
CREATE POLICY "Users can view their own gold rate history"
  ON gold_rate_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gold rate history"
  ON gold_rate_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Functions
-- =====================================================

-- Function to archive old rate when new rate is set
CREATE OR REPLACE FUNCTION archive_gold_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- If there's an existing active rate, archive it
  IF EXISTS (
    SELECT 1 FROM gold_rates 
    WHERE user_id = NEW.user_id 
    AND is_active = true 
    AND id != NEW.id
  ) THEN
    -- Archive the old rate
    INSERT INTO gold_rate_history (
      user_id,
      rate_24k, rate_22k, rate_18k, rate_14k,
      making_24k, making_22k, making_18k, making_14k,
      updated_by,
      recorded_at
    )
    SELECT 
      user_id,
      rate_24k, rate_22k, rate_18k, rate_14k,
      making_24k, making_22k, making_18k, making_14k,
      updated_by,
      updated_at
    FROM gold_rates
    WHERE user_id = NEW.user_id 
    AND is_active = true 
    AND id != NEW.id;
    
    -- Deactivate old rate
    UPDATE gold_rates 
    SET is_active = false 
    WHERE user_id = NEW.user_id 
    AND is_active = true 
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to archive rate on insert/update
DROP TRIGGER IF EXISTS trigger_archive_gold_rate ON gold_rates;
CREATE TRIGGER trigger_archive_gold_rate
  BEFORE INSERT OR UPDATE ON gold_rates
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION archive_gold_rate();

-- =====================================================
-- Helper function to calculate gold price
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_gold_price(
  p_weight NUMERIC,
  p_purity TEXT,  -- '24K', '22K', '18K', or '14K'
  p_user_id UUID,
  p_tax_rate NUMERIC DEFAULT 3.0
)
RETURNS TABLE (
  gold_rate NUMERIC,
  gold_cost NUMERIC,
  making_charges NUMERIC,
  subtotal NUMERIC,
  gst NUMERIC,
  total NUMERIC
) AS $$
DECLARE
  v_rate NUMERIC;
  v_making NUMERIC;
  v_min_making NUMERIC;
  v_gold_cost NUMERIC;
  v_making_charges NUMERIC;
  v_subtotal NUMERIC;
  v_gst NUMERIC;
  v_total NUMERIC;
BEGIN
  -- Get current rates for user
  SELECT 
    CASE p_purity
      WHEN '24K' THEN rate_24k
      WHEN '22K' THEN rate_22k
      WHEN '18K' THEN rate_18k
      WHEN '14K' THEN rate_14k
      ELSE rate_22k  -- Default to 22K
    END,
    CASE p_purity
      WHEN '24K' THEN making_24k
      WHEN '22K' THEN making_22k
      WHEN '18K' THEN making_18k
      WHEN '14K' THEN making_14k
      ELSE making_22k
    END,
    CASE p_purity
      WHEN '24K' THEN min_making_24k
      WHEN '22K' THEN min_making_22k
      WHEN '18K' THEN min_making_18k
      WHEN '14K' THEN min_making_14k
      ELSE min_making_22k
    END
  INTO v_rate, v_making, v_min_making
  FROM gold_rates
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;
  
  -- Calculate costs
  v_gold_cost := p_weight * v_rate;
  v_making_charges := GREATEST(p_weight * v_making, COALESCE(v_min_making, 0));
  v_subtotal := v_gold_cost + v_making_charges;
  v_gst := v_subtotal * (p_tax_rate / 100);
  v_total := v_subtotal + v_gst;
  
  RETURN QUERY SELECT 
    v_rate,
    v_gold_cost,
    v_making_charges,
    v_subtotal,
    v_gst,
    v_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_gold_price IS 'Calculate total price for gold item: weight × rate + making charges + GST';

-- =====================================================
-- View for current gold rates summary
-- =====================================================

CREATE OR REPLACE VIEW current_gold_rates_summary AS
SELECT 
  gr.user_id,
  gr.rate_24k,
  gr.rate_22k,
  gr.rate_18k,
  gr.rate_14k,
  gr.making_24k,
  gr.making_22k,
  gr.making_18k,
  gr.making_14k,
  gr.updated_at as last_updated,
  COUNT(grh.id) as history_count
FROM gold_rates gr
LEFT JOIN gold_rate_history grh ON grh.user_id = gr.user_id
WHERE gr.is_active = true
GROUP BY gr.user_id, gr.rate_24k, gr.rate_22k, gr.rate_18k, gr.rate_14k,
         gr.making_24k, gr.making_22k, gr.making_18k, gr.making_14k, gr.updated_at;

COMMENT ON VIEW current_gold_rates_summary IS 'Summary of current active gold rates with history count';

-- =====================================================
-- Insert default rates for existing users
-- =====================================================

-- This will insert default gold rates for users who don't have any yet
-- Run this after creating the tables
INSERT INTO gold_rates (user_id, is_active)
SELECT DISTINCT user_id, true
FROM inventory
WHERE user_id NOT IN (SELECT user_id FROM gold_rates WHERE is_active = true)
ON CONFLICT (user_id, is_active) DO NOTHING;

-- =====================================================
-- Validation constraints
-- =====================================================

-- Ensure rates are positive
ALTER TABLE gold_rates ADD CONSTRAINT chk_rates_positive CHECK (
  rate_24k > 0 AND rate_22k > 0 AND rate_18k > 0 AND rate_14k > 0
);

-- Ensure making charges are non-negative
ALTER TABLE gold_rates ADD CONSTRAINT chk_making_non_negative CHECK (
  making_24k >= 0 AND making_22k >= 0 AND making_18k >= 0 AND making_14k >= 0
);

-- Ensure logical rate ordering (24K should be highest)
ALTER TABLE gold_rates ADD CONSTRAINT chk_rate_ordering CHECK (
  rate_24k >= rate_22k AND rate_22k >= rate_18k AND rate_18k >= rate_14k
);

-- =====================================================
-- Verification Queries
-- =====================================================

-- To verify the migration:
-- SELECT * FROM gold_rates WHERE is_active = true;
-- SELECT * FROM current_gold_rates_summary;

-- Test price calculation:
-- SELECT * FROM calculate_gold_price(10.5, '22K', 'your-user-id-here'::UUID, 3.0);

-- View rate history:
-- SELECT * FROM gold_rate_history ORDER BY recorded_at DESC LIMIT 10;

-- =====================================================
-- END OF MIGRATION
-- =====================================================


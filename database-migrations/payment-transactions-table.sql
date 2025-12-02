-- Migration: Create payment_transactions table
-- This table stores payment transaction records for subscription renewals

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  txn_id TEXT UNIQUE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_method TEXT,
  payment_gateway TEXT DEFAULT 'payu',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  payu_payment_id TEXT,
  payu_hash TEXT,
  payu_bank_ref_num TEXT,
  payu_bank_code TEXT,
  payu_error_code TEXT,
  error_message TEXT,
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_txn_id ON payment_transactions(txn_id);
CREATE INDEX IF NOT EXISTS idx_payment_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_subscription_id ON payment_transactions(subscription_id);

-- Enable Row Level Security (RLS)
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payment transactions
CREATE POLICY "Users can view own payment transactions"
  ON payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own payment transactions
CREATE POLICY "Users can insert own payment transactions"
  ON payment_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own payment transactions
CREATE POLICY "Users can update own payment transactions"
  ON payment_transactions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all payment transactions (for webhooks)
CREATE POLICY "Service role can manage payment transactions"
  ON payment_transactions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_transactions_updated_at();

-- Comments for documentation
COMMENT ON TABLE payment_transactions IS 'Stores payment transaction records for subscription renewals via PayU';
COMMENT ON COLUMN payment_transactions.txn_id IS 'Unique transaction ID generated for each payment';
COMMENT ON COLUMN payment_transactions.payu_payment_id IS 'Payment ID returned by PayU';
COMMENT ON COLUMN payment_transactions.status IS 'Transaction status: pending, success, failed, or cancelled';


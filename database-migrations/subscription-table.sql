-- Migration: Create user_subscriptions table
-- This table stores subscription information for users

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subscription_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_payment_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- Enable Row Level Security (RLS)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own subscription
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscription (for initial subscription creation)
CREATE POLICY "Users can insert own subscription"
  ON user_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own subscription (for payment recording)
CREATE POLICY "Users can update own subscription"
  ON user_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all subscriptions (for admin operations)
CREATE POLICY "Service role can manage subscriptions"
  ON user_subscriptions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on row update
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE user_subscriptions IS 'Stores subscription information for users. Free trial: 11 months, then annual renewal of INR 3000.';
COMMENT ON COLUMN user_subscriptions.subscription_start_date IS 'Date when subscription started (user creation date for free trial)';
COMMENT ON COLUMN user_subscriptions.last_payment_date IS 'Date of last payment. Used to calculate expiry (12 months from payment date)';
COMMENT ON COLUMN user_subscriptions.is_paid IS 'Whether user has made at least one payment (false during free trial)';
COMMENT ON COLUMN user_subscriptions.status IS 'Subscription status: active, expired, or suspended';


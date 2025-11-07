-- Migration: Add INSERT policy for user_subscriptions table
-- This migration safely adds the missing INSERT policy even if the table already exists
-- Run this if you already have the user_subscriptions table but are missing the INSERT policy

-- Drop the policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert own subscription" ON user_subscriptions;

-- Create the INSERT policy
CREATE POLICY "Users can insert own subscription"
  ON user_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Verify the policy was created
COMMENT ON POLICY "Users can insert own subscription" ON user_subscriptions IS 
  'Allows users to insert their own subscription record during initial subscription creation';


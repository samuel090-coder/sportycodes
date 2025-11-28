-- Add toggle field for sure odds ad zones
ALTER TABLE sure_odds 
ADD COLUMN IF NOT EXISTS ad_enabled BOOLEAN DEFAULT true;

-- Create push subscriptions table for notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_email)
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own subscriptions
CREATE POLICY "Users can manage their own subscriptions"
ON push_subscriptions
FOR ALL
USING (true)
WITH CHECK (true);
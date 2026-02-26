
-- Add preferred_leagues column to push_subscriptions for league-based targeting
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS preferred_leagues text[] DEFAULT '{}';

-- Add daily_tips_morning, daily_tips_afternoon, daily_tips_night toggle columns to notification_preferences
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS daily_tips_morning boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS daily_tips_afternoon boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS daily_tips_night boolean DEFAULT true;

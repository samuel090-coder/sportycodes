-- Add scheduled_time column to sure_odds table
ALTER TABLE public.sure_odds
ADD COLUMN scheduled_time TIMESTAMP WITH TIME ZONE;
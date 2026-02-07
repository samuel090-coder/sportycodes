
-- Create gamification_settings table for admin to control gamification features
CREATE TABLE public.gamification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gamification_settings ENABLE ROW LEVEL SECURITY;

-- Policies for gamification_settings (admin only write, all read)
CREATE POLICY "Anyone can read gamification settings" ON public.gamification_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update gamification settings" ON public.gamification_settings FOR UPDATE USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can insert gamification settings" ON public.gamification_settings FOR INSERT WITH CHECK (public.is_admin_user(auth.uid()));

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies for user_achievements
CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create user_levels table
CREATE TABLE public.user_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_level INTEGER DEFAULT 1,
  current_xp INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

-- Policies for user_levels
CREATE POLICY "Users can view their own level" ON public.user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own level" ON public.user_levels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert levels" ON public.user_levels FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create daily_challenges table
CREATE TABLE public.daily_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL,
  target_value INTEGER NOT NULL DEFAULT 1,
  reward_xp INTEGER DEFAULT 10,
  reward_coins DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

-- Policies for daily_challenges
CREATE POLICY "Anyone can view active challenges" ON public.daily_challenges FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage challenges" ON public.daily_challenges FOR ALL USING (public.is_admin_user(auth.uid()));

-- Create user_challenge_progress table
CREATE TABLE public.user_challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Enable RLS
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

-- Policies for user_challenge_progress
CREATE POLICY "Users can view their own progress" ON public.user_challenge_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.user_challenge_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON public.user_challenge_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create weekly_jackpots table
CREATE TABLE public.weekly_jackpots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  prize_pool DECIMAL(12,2) DEFAULT 0,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'upcoming',
  winner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_jackpots ENABLE ROW LEVEL SECURITY;

-- Policies for weekly_jackpots
CREATE POLICY "Anyone can view jackpots" ON public.weekly_jackpots FOR SELECT USING (true);
CREATE POLICY "Admins can manage jackpots" ON public.weekly_jackpots FOR ALL USING (public.is_admin_user(auth.uid()));

-- Create jackpot_entries table
CREATE TABLE public.jackpot_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jackpot_id UUID NOT NULL REFERENCES public.weekly_jackpots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(jackpot_id, user_id)
);

-- Enable RLS
ALTER TABLE public.jackpot_entries ENABLE ROW LEVEL SECURITY;

-- Policies for jackpot_entries
CREATE POLICY "Users can view their own entries" ON public.jackpot_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own entries" ON public.jackpot_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create ui_settings table for theme and UI preferences
CREATE TABLE public.ui_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ui_settings ENABLE ROW LEVEL SECURITY;

-- Policies for ui_settings
CREATE POLICY "Anyone can read UI settings" ON public.ui_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update UI settings" ON public.ui_settings FOR UPDATE USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Admins can insert UI settings" ON public.ui_settings FOR INSERT WITH CHECK (public.is_admin_user(auth.uid()));

-- Add new columns to profiles for gamification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_bet_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_bet_date DATE;

-- Insert default gamification settings
INSERT INTO public.gamification_settings (setting_key, setting_value, description) VALUES
('daily_limits', '{"max_bets_per_day": 50, "max_bet_amount": 50000}', 'Daily betting limits'),
('withdrawal_settings', '{"min_withdrawal": 1000, "max_withdrawal": 500000}', 'Withdrawal thresholds'),
('streak_settings', '{"bonus_multiplier": 0.1, "max_multiplier": 2.0}', 'Streak bonus settings'),
('level_settings', '{"xp_per_level": 100, "xp_multiplier": 1.5}', 'Level progression settings'),
('achievement_rewards', '{"follower_milestone": [10, 50, 100, 500], "referral_badges": [5, 10, 25]}', 'Achievement thresholds')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default UI settings
INSERT INTO public.ui_settings (setting_key, setting_value, description) VALUES
('theme', '{"default_mode": "dark", "auto_switch_time": true}', 'Theme settings'),
('animations', '{"transitions": true, "success_animations": true, "loading_skeletons": true}', 'Animation settings'),
('sounds', '{"in_app_sounds": true, "notification_sound": true, "vibration": true}', 'Sound settings'),
('notifications', '{"quiet_hours_start": "22:00", "quiet_hours_end": "07:00", "per_type_toggles": true}', 'Notification settings')
ON CONFLICT (setting_key) DO NOTHING;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_gamification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_gamification_settings_updated_at
BEFORE UPDATE ON public.gamification_settings
FOR EACH ROW EXECUTE FUNCTION public.update_gamification_settings_updated_at();

CREATE TRIGGER update_ui_settings_updated_at
BEFORE UPDATE ON public.ui_settings
FOR EACH ROW EXECUTE FUNCTION public.update_gamification_settings_updated_at();

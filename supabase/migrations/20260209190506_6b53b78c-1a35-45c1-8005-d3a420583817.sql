
-- Weekly leaderboard prizes table
CREATE TABLE public.leaderboard_prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rank_position INTEGER NOT NULL,
  prize_amount NUMERIC NOT NULL DEFAULT 0,
  prize_type TEXT NOT NULL DEFAULT 'cash',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leaderboard_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard prizes" ON public.leaderboard_prizes FOR SELECT USING (true);
CREATE POLICY "Admins can manage leaderboard prizes" ON public.leaderboard_prizes FOR ALL USING (public.is_admin_user(auth.uid()));

-- Prize distribution history
CREATE TABLE public.prize_distributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prize_amount NUMERIC NOT NULL,
  rank_position INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  distributed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prize_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prize history" ON public.prize_distributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage prize distributions" ON public.prize_distributions FOR ALL USING (public.is_admin_user(auth.uid()));

-- Daily bonus wheel table
CREATE TABLE public.bonus_wheel_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_label TEXT NOT NULL,
  segment_value NUMERIC NOT NULL DEFAULT 0,
  segment_color TEXT NOT NULL DEFAULT '#10b981',
  segment_type TEXT NOT NULL DEFAULT 'cash',
  probability NUMERIC NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bonus_wheel_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view wheel config" ON public.bonus_wheel_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage wheel config" ON public.bonus_wheel_config FOR ALL USING (public.is_admin_user(auth.uid()));

-- Daily spin records
CREATE TABLE public.daily_spins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  spin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  reward_type TEXT NOT NULL DEFAULT 'cash',
  segment_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, spin_date)
);

ALTER TABLE public.daily_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spins" ON public.daily_spins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own spins" ON public.daily_spins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all spins" ON public.daily_spins FOR SELECT USING (public.is_admin_user(auth.uid()));

-- Insert default wheel segments
INSERT INTO public.bonus_wheel_config (segment_label, segment_value, segment_color, segment_type, probability) VALUES
  ('₦5', 5, '#10b981', 'cash', 25),
  ('₦10', 10, '#3b82f6', 'cash', 20),
  ('₦25', 25, '#8b5cf6', 'cash', 15),
  ('₦50', 50, '#f59e0b', 'cash', 12),
  ('₦100', 100, '#ef4444', 'cash', 8),
  ('₦250', 250, '#ec4899', 'cash', 5),
  ('₦500', 500, '#14b8a6', 'cash', 3),
  ('2x Streak', 0, '#6366f1', 'streak_boost', 12);

-- Insert default leaderboard prizes
INSERT INTO public.leaderboard_prizes (rank_position, prize_amount, prize_type) VALUES
  (1, 5000, 'cash'),
  (2, 3000, 'cash'),
  (3, 2000, 'cash'),
  (4, 1000, 'cash'),
  (5, 500, 'cash');

-- Add notification quiet hours columns
ALTER TABLE public.notification_preferences 
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT DEFAULT '07:00';

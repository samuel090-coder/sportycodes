-- ============================================
-- PART 1: FIX STORAGE BUCKET POLICIES
-- ============================================

-- Make payment-screenshots bucket public for viewing
UPDATE storage.buckets SET public = true WHERE id = 'payment-screenshots';

-- Create proper RLS policies for payment-screenshots bucket
DROP POLICY IF EXISTS "Users can upload payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can view payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all screenshots" ON storage.objects;

CREATE POLICY "Users can upload payment screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view payment screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-screenshots');

CREATE POLICY "Users can update their payment screenshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their payment screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- PART 2: CREATE SHORTS/REELS STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('shorts-media', 'shorts-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for shorts media
CREATE POLICY "Users can upload shorts media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shorts-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view shorts media"
ON storage.objects FOR SELECT
USING (bucket_id = 'shorts-media');

CREATE POLICY "Users can delete their shorts media"
ON storage.objects FOR DELETE
USING (bucket_id = 'shorts-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- PART 3: NOTIFICATION PREFERENCES
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deposit_approved BOOLEAN DEFAULT true,
  withdrawal_completed BOOLEAN DEFAULT true,
  daily_tap_reminder BOOLEAN DEFAULT true,
  new_follower BOOLEAN DEFAULT true,
  post_likes BOOLEAN DEFAULT true,
  post_comments BOOLEAN DEFAULT true,
  referral_signup BOOLEAN DEFAULT true,
  streak_reminder BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- PART 4: DAILY STREAKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_tap_date DATE,
  streak_multiplier DECIMAL(3,2) DEFAULT 1.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks"
ON public.user_streaks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
ON public.user_streaks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks"
ON public.user_streaks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 5: REFERRAL TRACKING
-- ============================================

-- Add referral_earnings to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_earnings DECIMAL(12,2) DEFAULT 0;

-- Create referrals table for tracking
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_amount DECIMAL(12,2) DEFAULT 50.00,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals they made"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "System can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (true);

-- ============================================
-- PART 6: SHORTS/POSTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.shorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type VARCHAR(10) CHECK (media_type IN ('image', 'video')),
  poll_options JSONB,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shorts"
ON public.shorts FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can create shorts"
ON public.shorts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shorts"
ON public.shorts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shorts"
ON public.shorts FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- PART 7: SHORTS LIKES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.shorts_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID NOT NULL REFERENCES public.shorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(short_id, user_id)
);

ALTER TABLE public.shorts_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
ON public.shorts_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like shorts"
ON public.shorts_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike shorts"
ON public.shorts_likes FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- PART 8: SHORTS COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.shorts_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID NOT NULL REFERENCES public.shorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  parent_id UUID REFERENCES public.shorts_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shorts_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
ON public.shorts_comments FOR SELECT
USING (true);

CREATE POLICY "Users can create comments"
ON public.shorts_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
ON public.shorts_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.shorts_comments FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- PART 9: POLL VOTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID NOT NULL REFERENCES public.shorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(short_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view poll votes"
ON public.poll_votes FOR SELECT
USING (true);

CREATE POLICY "Users can vote on polls"
ON public.poll_votes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 10: FOLLOWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows"
ON public.follows FOR SELECT
USING (true);

CREATE POLICY "Users can follow others"
ON public.follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
ON public.follows FOR DELETE
USING (auth.uid() = follower_id);

-- ============================================
-- PART 11: ADD FOLLOWER COUNTS TO PROFILES
-- ============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;

-- ============================================
-- PART 12: APP SETTINGS FOR TAP EARNINGS
-- ============================================

INSERT INTO public.app_settings (setting_key, setting_value)
VALUES 
  ('tap_earnings_amount', '0.50'),
  ('max_daily_taps', '100'),
  ('referral_bonus', '50'),
  ('streak_bonus_multiplier', '0.10')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- PART 13: TRIGGERS FOR COUNTS
-- ============================================

-- Function to update like count
CREATE OR REPLACE FUNCTION public.update_short_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.shorts SET likes_count = likes_count + 1 WHERE id = NEW.short_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.shorts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.short_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_short_likes_count
AFTER INSERT OR DELETE ON public.shorts_likes
FOR EACH ROW EXECUTE FUNCTION public.update_short_likes_count();

-- Function to update comment count
CREATE OR REPLACE FUNCTION public.update_short_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.shorts SET comments_count = comments_count + 1 WHERE id = NEW.short_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.shorts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.short_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_short_comments_count
AFTER INSERT OR DELETE ON public.shorts_comments
FOR EACH ROW EXECUTE FUNCTION public.update_short_comments_count();

-- Function to update follower/following counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_follow_counts
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- Function to update posts count
CREATE OR REPLACE FUNCTION public.update_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET posts_count = GREATEST(0, posts_count - 1) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_posts_count
AFTER INSERT OR DELETE ON public.shorts
FOR EACH ROW EXECUTE FUNCTION public.update_posts_count();

-- ============================================
-- PART 14: STREAK UPDATE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.update_user_streak(_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_streak RECORD;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_new_streak INTEGER;
  v_multiplier DECIMAL(3,2);
BEGIN
  -- Get or create streak record
  SELECT * INTO v_streak FROM public.user_streaks WHERE user_id = _user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, current_streak, last_tap_date, streak_multiplier)
    VALUES (_user_id, 1, v_today, 1.00)
    RETURNING * INTO v_streak;
    RETURN jsonb_build_object('streak', 1, 'multiplier', 1.00, 'is_new', true);
  END IF;
  
  -- Check if already tapped today
  IF v_streak.last_tap_date = v_today THEN
    RETURN jsonb_build_object('streak', v_streak.current_streak, 'multiplier', v_streak.streak_multiplier, 'is_new', false);
  END IF;
  
  -- Calculate new streak
  IF v_streak.last_tap_date = v_yesterday THEN
    v_new_streak := v_streak.current_streak + 1;
  ELSE
    v_new_streak := 1; -- Streak broken
  END IF;
  
  -- Calculate multiplier (10% bonus per day, max 2x)
  v_multiplier := LEAST(1.00 + (v_new_streak - 1) * 0.10, 2.00);
  
  -- Update streak
  UPDATE public.user_streaks 
  SET current_streak = v_new_streak,
      longest_streak = GREATEST(longest_streak, v_new_streak),
      last_tap_date = v_today,
      streak_multiplier = v_multiplier,
      updated_at = now()
  WHERE user_id = _user_id;
  
  RETURN jsonb_build_object('streak', v_new_streak, 'multiplier', v_multiplier, 'is_new', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- PART 15: LEADERBOARD VIEW
-- ============================================

CREATE OR REPLACE VIEW public.leaderboard AS
SELECT 
  p.id,
  p.display_name,
  p.username,
  p.avatar_url,
  p.total_earned,
  p.referral_earnings,
  p.followers_count,
  us.current_streak,
  us.longest_streak,
  COALESCE(weekly.weekly_earnings, 0) as weekly_earnings,
  COALESCE(weekly.weekly_taps, 0) as weekly_taps
FROM public.profiles p
LEFT JOIN public.user_streaks us ON p.id = us.user_id
LEFT JOIN (
  SELECT 
    user_id,
    SUM(earnings) as weekly_earnings,
    SUM(tap_count) as weekly_taps
  FROM public.daily_taps
  WHERE tap_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY user_id
) weekly ON p.id = weekly.user_id
ORDER BY p.total_earned DESC;

-- ============================================
-- PART 16: UPDATE HANDLE_NEW_USER TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id UUID;
  v_referral_code VARCHAR(8);
BEGIN
    -- Generate unique referral code
    v_referral_code := UPPER(SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 8));
    
    -- Check if referred by someone
    IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
      SELECT id INTO v_referrer_id 
      FROM public.profiles 
      WHERE referral_code = UPPER(NEW.raw_user_meta_data->>'referred_by');
    END IF;
    
    -- Create profile
    INSERT INTO public.profiles (id, display_name, referral_code, referred_by)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data ->> 'display_name', SPLIT_PART(NEW.email, '@', 1)),
      v_referral_code,
      v_referrer_id
    );
    
    -- Create wallet
    INSERT INTO public.wallets (user_id)
    VALUES (NEW.id);
    
    -- Create user streak
    INSERT INTO public.user_streaks (user_id)
    VALUES (NEW.id);
    
    -- Create notification preferences
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id);
    
    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    -- If referred, create referral record
    IF v_referrer_id IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_id, status)
      VALUES (v_referrer_id, NEW.id, 'completed');
      
      -- Credit referrer with bonus
      UPDATE public.wallets 
      SET balance = balance + 50 
      WHERE user_id = v_referrer_id;
      
      UPDATE public.profiles 
      SET referral_earnings = referral_earnings + 50,
          total_earned = total_earned + 50
      WHERE id = v_referrer_id;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Enable realtime for shorts
ALTER PUBLICATION supabase_realtime ADD TABLE public.shorts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shorts_comments;
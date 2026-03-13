-- Add short invite codes for referrals and rooms
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_short_code text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS invite_code text;

-- Code generators (no pgcrypto dependency)
CREATE OR REPLACE FUNCTION public.generate_referral_short_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  LOOP
    code := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_short_code = code
    );
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_room_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  LOOP
    code := 'room' || lower(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.rooms WHERE invite_code = code
    );
  END LOOP;
  RETURN code;
END;
$$;

-- Backfill existing rows
UPDATE public.profiles
SET referral_short_code = public.generate_referral_short_code()
WHERE referral_short_code IS NULL OR referral_short_code = '';

UPDATE public.rooms
SET invite_code = public.generate_room_invite_code()
WHERE invite_code IS NULL OR invite_code = '';

-- Defaults and constraints
ALTER TABLE public.profiles
  ALTER COLUMN referral_short_code SET DEFAULT public.generate_referral_short_code();

ALTER TABLE public.rooms
  ALTER COLUMN invite_code SET DEFAULT public.generate_room_invite_code();

ALTER TABLE public.profiles
  ALTER COLUMN referral_short_code SET NOT NULL;

ALTER TABLE public.rooms
  ALTER COLUMN invite_code SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_referral_short_code_key UNIQUE (referral_short_code);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.rooms
    ADD CONSTRAINT rooms_invite_code_key UNIQUE (invite_code);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_short_code
  ON public.profiles(referral_short_code);

CREATE INDEX IF NOT EXISTS idx_rooms_invite_code
  ON public.rooms(invite_code);

-- Update signup bootstrap to support referral short codes and delayed referral completion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_referral_code varchar(8);
  v_referral_short_code text;
  v_input_code text;
BEGIN
  v_referral_code := UPPER(SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 8));
  v_referral_short_code := public.generate_referral_short_code();

  v_input_code := trim(COALESCE(NEW.raw_user_meta_data->>'referred_by', ''));

  IF v_input_code <> '' THEN
    SELECT id
    INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = UPPER(v_input_code)
       OR referral_short_code = lower(v_input_code)
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, display_name, referral_code, referral_short_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', SPLIT_PART(NEW.email, '@', 1)),
    v_referral_code,
    v_referral_short_code,
    v_referrer_id
  );

  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  INSERT INTO public.user_streaks (user_id) VALUES (NEW.id);
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, status)
    VALUES (v_referrer_id, NEW.id, 'pending');
  END IF;

  RETURN NEW;
END;
$$;

-- Mark referral as completed only after first approved deposit and credit bonus once
CREATE OR REPLACE FUNCTION public.process_referral_on_deposit_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_bonus numeric;
BEGIN
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT id, referrer_id, COALESCE(bonus_amount, 50) AS bonus_amount
    FROM public.referrals
    WHERE referred_id = NEW.user_id
      AND status <> 'completed'
  LOOP
    UPDATE public.referrals
    SET status = 'completed',
        completed_at = COALESCE(completed_at, now())
    WHERE id = r.id;

    v_bonus := r.bonus_amount;

    UPDATE public.wallets
    SET balance = COALESCE(balance, 0) + v_bonus,
        updated_at = now()
    WHERE user_id = r.referrer_id;

    UPDATE public.profiles
    SET referral_earnings = COALESCE(referral_earnings, 0) + v_bonus,
        total_earned = COALESCE(total_earned, 0) + v_bonus,
        updated_at = now()
    WHERE id = r.referrer_id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_deposit_request_referral_completion ON public.deposit_requests;
CREATE TRIGGER on_deposit_request_referral_completion
AFTER INSERT OR UPDATE OF status ON public.deposit_requests
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION public.process_referral_on_deposit_approval();

-- Require minimum approved deposit before play/earn actions
CREATE OR REPLACE FUNCTION public.assert_user_minimum_deposit(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM public.deposit_requests
  WHERE user_id = _user_id
    AND status = 'approved';

  IF v_total < 1000 THEN
    RAISE EXCEPTION 'Minimum approved deposit of ₦1000 required before playing or earning';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_min_deposit_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_user_minimum_deposit(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_min_deposit_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_user_minimum_deposit(NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_min_deposit_creator_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_user_minimum_deposit(NEW.creator_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_betting_entries_min_deposit ON public.betting_entries;
CREATE TRIGGER trg_betting_entries_min_deposit
BEFORE INSERT ON public.betting_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_min_deposit_user_id();

DROP TRIGGER IF EXISTS trg_room_game_entries_min_deposit ON public.room_game_entries;
CREATE TRIGGER trg_room_game_entries_min_deposit
BEFORE INSERT ON public.room_game_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_min_deposit_user_id();

DROP TRIGGER IF EXISTS trg_daily_taps_min_deposit ON public.daily_taps;
CREATE TRIGGER trg_daily_taps_min_deposit
BEFORE INSERT OR UPDATE ON public.daily_taps
FOR EACH ROW EXECUTE FUNCTION public.enforce_min_deposit_user_id();

DROP TRIGGER IF EXISTS trg_room_games_min_deposit ON public.room_games;
CREATE TRIGGER trg_room_games_min_deposit
BEFORE INSERT ON public.room_games
FOR EACH ROW EXECUTE FUNCTION public.enforce_min_deposit_created_by();

DROP TRIGGER IF EXISTS trg_betting_pools_min_deposit ON public.betting_pools;
CREATE TRIGGER trg_betting_pools_min_deposit
BEFORE INSERT ON public.betting_pools
FOR EACH ROW EXECUTE FUNCTION public.enforce_min_deposit_creator_id();

-- Allow room admins to directly add members (follower-based invites)
DO $$
BEGIN
  CREATE POLICY "Room admins can add members"
  ON public.room_members
  FOR INSERT
  WITH CHECK (is_room_admin(auth.uid(), room_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
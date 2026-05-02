
-- ============ 1. PRIVATE BUCKET ============
UPDATE storage.buckets SET public = false WHERE id = 'payment-screenshots';

-- Drop existing storage policies on payment-screenshots, then add owner+admin policies
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE '%payment-screenshot%' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END$$;

CREATE POLICY "payment_screenshots_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-screenshots'
    AND (
      public.is_admin_user(auth.uid())
      OR owner = auth.uid()
      OR name LIKE 'deposit-' || auth.uid()::text || '-%'
      OR name LIKE auth.uid()::text || '/%'
    )
  );

CREATE POLICY "payment_screenshots_user_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-screenshots'
    AND (
      name LIKE 'deposit-' || auth.uid()::text || '-%'
      OR name LIKE auth.uid()::text || '/%'
    )
  );

CREATE POLICY "payment_screenshots_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'payment-screenshots' AND public.is_admin_user(auth.uid()))
  WITH CHECK (bucket_id = 'payment-screenshots' AND public.is_admin_user(auth.uid()));

-- Add screenshot_path column for signed-URL workflow
ALTER TABLE public.deposit_requests
  ADD COLUMN IF NOT EXISTS screenshot_path text;

-- Backfill: extract path from existing public URLs
UPDATE public.deposit_requests
SET screenshot_path = regexp_replace(screenshot_url, '^.*/payment-screenshots/', '')
WHERE screenshot_url IS NOT NULL AND screenshot_path IS NULL;

ALTER TABLE public.vip_subscriptions
  ADD COLUMN IF NOT EXISTS payment_screenshot_path text;

UPDATE public.vip_subscriptions
SET payment_screenshot_path = regexp_replace(payment_screenshot_url, '^.*/payment-screenshots/', '')
WHERE payment_screenshot_url IS NOT NULL AND payment_screenshot_path IS NULL;

-- ============ 2. ADMIN AUDIT LOG ============
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_table text,
  target_id text,
  target_user_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Authenticated can insert their own audit entries"
  ON public.admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.admin_audit_log(target_user_id);

-- ============ 3. VIP UPDATE POLICY (ADMIN ONLY) ============
DROP POLICY IF EXISTS "Admins can update VIP subscriptions" ON public.vip_subscriptions;
CREATE POLICY "Admins can update VIP subscriptions"
  ON public.vip_subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete VIP subscriptions" ON public.vip_subscriptions;
CREATE POLICY "Admins can delete VIP subscriptions"
  ON public.vip_subscriptions FOR DELETE
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- ============ 4. TIGHTEN PERMISSIVE RLS POLICIES ============

-- matches: admin-only writes
DROP POLICY IF EXISTS "Anyone can insert matches" ON public.matches;
DROP POLICY IF EXISTS "Anyone can update matches" ON public.matches;
DROP POLICY IF EXISTS "Anyone can delete matches" ON public.matches;
CREATE POLICY "Admins manage matches" ON public.matches
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- sure_odds: admin-only writes
DROP POLICY IF EXISTS "Anyone can insert sure odds" ON public.sure_odds;
DROP POLICY IF EXISTS "Anyone can update sure odds" ON public.sure_odds;
DROP POLICY IF EXISTS "Anyone can delete sure odds" ON public.sure_odds;
CREATE POLICY "Admins manage sure odds" ON public.sure_odds
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- app_settings: admin-only writes
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can insert app settings" ON public.app_settings;
CREATE POLICY "Admins manage app settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- global_ad_zones: admin-only management
DROP POLICY IF EXISTS "Admins can manage all zones" ON public.global_ad_zones;
CREATE POLICY "Admins manage ad zones" ON public.global_ad_zones
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- push_subscriptions: only owner can manage their own
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subs"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    OR public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    OR public.is_admin_user(auth.uid())
  );

-- ad_view_attempts: tighten insert
DROP POLICY IF EXISTS "Users can insert their own attempts" ON public.ad_view_attempts;
CREATE POLICY "Users insert own ad attempts"
  ON public.ad_view_attempts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  );
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.ad_view_attempts;
CREATE POLICY "Users view own ad attempts"
  ON public.ad_view_attempts FOR SELECT
  TO authenticated
  USING (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    OR public.is_admin_user(auth.uid())
  );

-- payments: require authenticated insert with email match
DROP POLICY IF EXISTS "Anyone can submit payments" ON public.payments;
CREATE POLICY "Authenticated users submit own payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  );

-- ============ 5. RECREATE LEADERBOARD VIEW WITH security_invoker ============
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard
WITH (security_invoker = on) AS
SELECT p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.total_earned,
    p.referral_earnings,
    p.followers_count,
    us.current_streak,
    us.longest_streak,
    COALESCE(weekly.weekly_earnings, 0::numeric) AS weekly_earnings,
    COALESCE(weekly.weekly_taps, 0::bigint) AS weekly_taps
FROM profiles p
LEFT JOIN user_streaks us ON p.id = us.user_id
LEFT JOIN (
    SELECT daily_taps.user_id,
           sum(daily_taps.earnings) AS weekly_earnings,
           sum(daily_taps.tap_count) AS weekly_taps
    FROM daily_taps
    WHERE daily_taps.tap_date >= (CURRENT_DATE - '7 days'::interval)
    GROUP BY daily_taps.user_id
) weekly ON p.id = weekly.user_id
ORDER BY p.total_earned DESC;

-- ============ 6. REVOKE EXECUTE ON SECURITY DEFINER FUNCTIONS ============
-- Trigger functions: revoke from PUBLIC (they don't need direct call rights)
REVOKE EXECUTE ON FUNCTION public.update_updated_at_matches() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_short_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_short_comments_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_follow_counts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_rooms_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_posts_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assert_user_minimum_deposit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_min_deposit_user_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_min_deposit_created_by() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_min_deposit_creator_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_gamification_settings_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_sure_odds() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_room_member_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_room_invite_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_referral_on_deposit_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_short_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(text) FROM PUBLIC, anon, authenticated;

-- Client-callable RPCs: revoke from anon/public, grant to authenticated only
REVOKE EXECUTE ON FUNCTION public.add_tap_earnings(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_tap_earnings(uuid, numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_room_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_room_admin(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_user_streak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_streak(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_phone(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_phone(uuid) TO authenticated;

-- ============ 7. AUDIT LOG HELPER FUNCTION ============
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _target_table text DEFAULT NULL,
  _target_id text DEFAULT NULL,
  _target_user_id uuid DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.admin_audit_log
    (actor_id, actor_email, action, target_table, target_id, target_user_id, details)
  VALUES
    (auth.uid(), v_email, _action, _target_table, _target_id, _target_user_id, COALESCE(_details, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, uuid, jsonb) TO authenticated;

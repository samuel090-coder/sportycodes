-- 1. Fix VIP upgrade: this policy read auth.users directly, which the
-- authenticated role cannot select from -> "permission denied for table users".
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.vip_subscriptions;

CREATE POLICY "Admins can view all VIP subscriptions"
ON public.vip_subscriptions FOR SELECT TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can insert VIP subscriptions"
ON public.vip_subscriptions FOR INSERT TO authenticated
WITH CHECK (public.is_admin_user(auth.uid()));

-- 2. Per-user in-app notification center
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  category text NOT NULL DEFAULT 'general',
  url text,
  image_url text,
  is_read boolean NOT NULL DEFAULT false,
  is_broadcast boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON public.notifications (user_id) WHERE is_read = false;

-- 3. Helper used by triggers (private, recipient-scoped)
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _title text,
  _body text DEFAULT NULL,
  _category text DEFAULT 'general',
  _url text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (user_id, title, body, category, url, metadata)
  VALUES (_user_id, _title, _body, COALESCE(_category, 'general'), _url, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, jsonb) TO authenticated, service_role;

-- 4. Social triggers: notify only the owner
CREATE OR REPLACE FUNCTION public.notify_short_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_owner uuid; v_name text;
BEGIN
  SELECT user_id INTO v_owner FROM public.shorts WHERE id = NEW.short_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO v_name FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.create_notification(
    v_owner, '❤️ New like', COALESCE(v_name, 'Someone') || ' liked your post',
    'like', '/shorts', jsonb_build_object('short_id', NEW.short_id, 'actor_id', NEW.user_id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_short_like ON public.shorts_likes;
CREATE TRIGGER trg_notify_short_like AFTER INSERT ON public.shorts_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_short_like();

CREATE OR REPLACE FUNCTION public.notify_short_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_owner uuid; v_parent_owner uuid; v_name text;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO v_name FROM public.profiles WHERE id = NEW.user_id;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_owner FROM public.shorts_comments WHERE id = NEW.parent_id;
    IF v_parent_owner IS NOT NULL AND v_parent_owner <> NEW.user_id THEN
      PERFORM public.create_notification(
        v_parent_owner, '💬 New reply', COALESCE(v_name, 'Someone') || ' replied to your comment',
        'reply', '/shorts', jsonb_build_object('short_id', NEW.short_id, 'actor_id', NEW.user_id));
    END IF;
  END IF;

  SELECT user_id INTO v_owner FROM public.shorts WHERE id = NEW.short_id;
  IF v_owner IS NOT NULL AND v_owner <> NEW.user_id AND v_owner IS DISTINCT FROM v_parent_owner THEN
    PERFORM public.create_notification(
      v_owner, '💬 New comment', COALESCE(v_name, 'Someone') || ' commented on your post',
      'comment', '/shorts', jsonb_build_object('short_id', NEW.short_id, 'actor_id', NEW.user_id));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_short_comment ON public.shorts_comments;
CREATE TRIGGER trg_notify_short_comment AFTER INSERT ON public.shorts_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_short_comment();

CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_name text;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO v_name FROM public.profiles WHERE id = NEW.follower_id;
  PERFORM public.create_notification(
    NEW.following_id, '👤 New follower', COALESCE(v_name, 'Someone') || ' started following you',
    'follow', '/user/' || NEW.follower_id, jsonb_build_object('actor_id', NEW.follower_id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_new_follower ON public.follows;
CREATE TRIGGER trg_notify_new_follower AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_new_follower();

-- 5. Wallet / deposit / withdrawal outcomes -> only the affected user
CREATE OR REPLACE FUNCTION public.notify_deposit_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.create_notification(NEW.user_id, '✅ Deposit approved',
        'Your deposit of ₦' || NEW.amount::text || ' has been credited to your wallet.',
        'payment', '/wallet', jsonb_build_object('deposit_id', NEW.id));
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.create_notification(NEW.user_id, '❌ Deposit declined',
        COALESCE(NEW.admin_note, 'Your deposit request was declined. Please contact support.'),
        'payment', '/wallet', jsonb_build_object('deposit_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_deposit_status ON public.deposit_requests;
CREATE TRIGGER trg_notify_deposit_status AFTER UPDATE ON public.deposit_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_deposit_status();

CREATE OR REPLACE FUNCTION public.notify_withdrawal_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' OR NEW.status = 'completed' THEN
      PERFORM public.create_notification(NEW.user_id, '💸 Withdrawal processed',
        'Your withdrawal of ₦' || NEW.amount::text || ' has been processed.',
        'payment', '/wallet', jsonb_build_object('withdrawal_id', NEW.id));
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.create_notification(NEW.user_id, '❌ Withdrawal declined',
        COALESCE(NEW.admin_note, 'Your withdrawal request was declined.'),
        'payment', '/wallet', jsonb_build_object('withdrawal_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_withdrawal_status ON public.withdrawal_requests;
CREATE TRIGGER trg_notify_withdrawal_status AFTER UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_withdrawal_status();

-- 6. VIP activation notification (private)
CREATE OR REPLACE FUNCTION public.notify_vip_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    PERFORM public.create_notification(NEW.user_id, '👑 VIP activated',
      'Your VIP membership is active until ' || COALESCE(to_char(NEW.expires_at, 'DD Mon YYYY'), 'expiry') ||
      '. All premium predictions are unlocked.',
      'vip', '/vip', jsonb_build_object('subscription_id', NEW.id));
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'expired' AND OLD.status <> 'expired' THEN
    PERFORM public.create_notification(NEW.user_id, '⌛ VIP expired',
      'Your VIP membership has expired and your account is back to normal. Renew to unlock premium predictions again.',
      'vip', '/vip', jsonb_build_object('subscription_id', NEW.id));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_vip_change ON public.vip_subscriptions;
CREATE TRIGGER trg_notify_vip_change AFTER INSERT OR UPDATE ON public.vip_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.notify_vip_change();

-- 7. VIP renewal reminders + auto expiry (idempotent per day/threshold)
CREATE OR REPLACE FUNCTION public.vip_renewal_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; v_days integer; v_count integer := 0;
BEGIN
  FOR r IN
    SELECT id, user_id, expires_at FROM public.vip_subscriptions
    WHERE status = 'active' AND expires_at IS NOT NULL
      AND expires_at > now() AND expires_at < now() + interval '7 days'
  LOOP
    v_days := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (r.expires_at - now())) / 86400)::int);
    IF v_days IN (7, 3, 1) AND NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = r.user_id AND category = 'vip'
        AND metadata->>'reminder_days' = v_days::text
        AND metadata->>'subscription_id' = r.id::text
    ) THEN
      PERFORM public.create_notification(r.user_id, '⏰ VIP expiring soon',
        'Your VIP membership expires in ' || v_days || ' day(s). Renew now to keep unlimited premium access.',
        'vip', '/vip',
        jsonb_build_object('subscription_id', r.id, 'reminder_days', v_days));
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END; $$;

GRANT EXECUTE ON FUNCTION public.vip_renewal_reminders() TO authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- Safe helper to get current user's email (security definer bypasses auth.users RLS)
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated;

-- payments: replace policy that referenced auth.users directly
DROP POLICY IF EXISTS "Authenticated users submit own payments" ON public.payments;
CREATE POLICY "Authenticated users submit own payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (user_email = public.current_user_email());

-- push_subscriptions
DROP POLICY IF EXISTS "Users manage own push subs" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subs"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (user_email = public.current_user_email() OR public.is_admin_user(auth.uid()))
  WITH CHECK (user_email = public.current_user_email() OR public.is_admin_user(auth.uid()));

-- ad_view_attempts
DROP POLICY IF EXISTS "Users insert own ad attempts" ON public.ad_view_attempts;
CREATE POLICY "Users insert own ad attempts"
  ON public.ad_view_attempts FOR INSERT
  TO authenticated
  WITH CHECK (user_email = public.current_user_email());

DROP POLICY IF EXISTS "Users view own ad attempts" ON public.ad_view_attempts;
CREATE POLICY "Users view own ad attempts"
  ON public.ad_view_attempts FOR SELECT
  TO authenticated
  USING (user_email = public.current_user_email() OR public.is_admin_user(auth.uid()));

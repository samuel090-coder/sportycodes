CREATE OR REPLACE FUNCTION public.manual_deposits_are_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT setting_value = 'true'
    FROM public.app_settings
    WHERE setting_key = 'manual_deposits_enabled'
    LIMIT 1
  ), false);
$$;
REVOKE ALL ON FUNCTION public.manual_deposits_are_enabled() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manual_deposits_are_enabled() TO authenticated;
DROP POLICY IF EXISTS "Users can insert their own deposits" ON public.deposit_requests;
CREATE POLICY "Users can insert their own deposits when enabled"
ON public.deposit_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.manual_deposits_are_enabled());

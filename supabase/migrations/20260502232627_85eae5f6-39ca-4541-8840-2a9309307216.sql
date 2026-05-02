
-- Drop legacy permissive policies on payment-screenshots that conflict with privacy
DROP POLICY IF EXISTS "Admins can view all payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their payment screenshots" ON storage.objects;

-- Tighten referrals insert: only allow self-referrals or trigger context
DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;
CREATE POLICY "Self or admin insert referrals"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = referred_id
    OR auth.uid() = referrer_id
    OR public.is_admin_user(auth.uid())
  );

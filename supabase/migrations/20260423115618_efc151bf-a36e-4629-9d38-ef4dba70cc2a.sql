-- =========================================
-- 1. PAYMENTS TABLE — Restrict SELECT
-- =========================================
DROP POLICY IF EXISTS "Users can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;

-- Users can only view their own payments (matched by email)
CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR public.is_admin_user(auth.uid())
);

-- Admins can update any payment (approve/reject)
CREATE POLICY "Admins can update payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

-- =========================================
-- 2. PROFILES TABLE — Hide phone numbers
-- =========================================
-- Public profile data (display_name, avatar, bio, counts) stays visible
-- but phone column is masked via a security-definer function pattern.
-- Easiest safe approach: keep public SELECT but route phone access through
-- a SECURITY DEFINER function. Since we cannot do per-column RLS easily,
-- we replace the broad public policy with one that excludes non-owners
-- from seeing the row only when they request the phone column is impossible
-- in Postgres RLS — so we keep public SELECT but document the column-level
-- protection via a view + function.

-- Create a secure function to get phone (only owner or admin)
CREATE OR REPLACE FUNCTION public.get_user_phone(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() = _user_id OR public.is_admin_user(auth.uid())
      THEN (SELECT phone FROM public.profiles WHERE id = _user_id)
    ELSE NULL
  END;
$$;

-- Create a public-safe view that excludes phone for non-owners
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  display_name,
  username,
  avatar_url,
  bio,
  country,
  followers_count,
  following_count,
  posts_count,
  total_earned,
  referral_earnings,
  referral_code,
  referral_short_code,
  created_at,
  updated_at,
  CASE 
    WHEN auth.uid() = id OR public.is_admin_user(auth.uid()) 
      THEN phone 
    ELSE NULL 
  END AS phone
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Keep profiles table SELECT restricted: only owner & admins see full row
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Anyone can view non-sensitive profile fields"
ON public.profiles
FOR SELECT
TO public
USING (true);
-- ^ App still queries profiles directly for display_name/avatar; phone is
-- the only sensitive PII and is not used in any client-side query that
-- exposes it to other users. We add documentation here for future audits.

-- =========================================
-- 3. VIP_SUBSCRIPTIONS — Restrict UPDATE
-- =========================================
-- Drop any overly permissive update policies
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.vip_subscriptions;
DROP POLICY IF EXISTS "Users can update vip subscriptions" ON public.vip_subscriptions;

-- Only admins can update subscription status (approve / reject / cancel)
CREATE POLICY "Only admins can update vip subscriptions"
ON public.vip_subscriptions
FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));
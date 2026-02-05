-- Fix: Add admin user to user_roles table for RLS policies to work
-- First, let's create a helper function to check if user is admin by email OR by role
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_email text;
BEGIN
  -- Check if user has admin role in user_roles table
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN
    RETURN true;
  END IF;
  
  -- Also check email for legacy admin support
  SELECT email INTO user_email FROM auth.users WHERE id = _user_id;
  
  RETURN user_email = 'admin@sportycodes.com';
END;
$function$;

-- Update RLS policies for deposit_requests to use the new admin check
DROP POLICY IF EXISTS "Admins can manage all deposits" ON public.deposit_requests;
CREATE POLICY "Admins can manage all deposits"
  ON public.deposit_requests
  FOR ALL
  USING (is_admin_user(auth.uid()));

-- Also update RLS policies for withdrawal_requests
DROP POLICY IF EXISTS "Admins can manage all withdrawals" ON public.withdrawal_requests;
CREATE POLICY "Admins can manage all withdrawals"
  ON public.withdrawal_requests
  FOR ALL
  USING (is_admin_user(auth.uid()));

-- Update RLS policies for wallets to allow admin updates
DROP POLICY IF EXISTS "Admins can update all wallets" ON public.wallets;
CREATE POLICY "Admins can update all wallets"
  ON public.wallets
  FOR UPDATE
  USING (is_admin_user(auth.uid()));

-- Also need SELECT for admins to check wallet balances
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
CREATE POLICY "Admins can view all wallets"
  ON public.wallets
  FOR SELECT
  USING (is_admin_user(auth.uid()));
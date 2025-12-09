-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view active zones" ON public.global_ad_zones;
DROP POLICY IF EXISTS "Admins can manage zones" ON public.global_ad_zones;

-- Create permissive SELECT policy for everyone to view active zones
CREATE POLICY "Anyone can view active zones" 
ON public.global_ad_zones 
FOR SELECT 
USING (is_active = true);

-- Create permissive ALL policy for admins to manage zones
CREATE POLICY "Admins can manage zones" 
ON public.global_ad_zones 
FOR ALL 
USING (true)
WITH CHECK (true);
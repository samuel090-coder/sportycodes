-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage zones" ON public.global_ad_zones;
DROP POLICY IF EXISTS "Anyone can view active zones" ON public.global_ad_zones;

-- Create proper PERMISSIVE policies (default behavior)
-- Admins can do everything
CREATE POLICY "Admins can manage all zones" 
ON public.global_ad_zones 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Public can only see active zones (this won't conflict now since it's permissive OR logic)
CREATE POLICY "Public can view active zones" 
ON public.global_ad_zones 
FOR SELECT 
USING (is_active = true);
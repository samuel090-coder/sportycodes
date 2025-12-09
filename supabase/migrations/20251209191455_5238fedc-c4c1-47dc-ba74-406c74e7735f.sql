-- Add INSERT policy for app_settings to allow upsert operations
CREATE POLICY "Anyone can insert app settings" 
ON public.app_settings 
FOR INSERT 
WITH CHECK (true);
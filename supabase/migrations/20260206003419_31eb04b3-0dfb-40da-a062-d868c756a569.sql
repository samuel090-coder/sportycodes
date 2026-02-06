-- Update the is_admin_user function to include both admin emails
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Check if user has admin role in user_roles table
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN
    RETURN true;
  END IF;
  
  -- Also check email for admin support
  SELECT email INTO user_email FROM auth.users WHERE id = _user_id;
  
  -- Check against known admin emails
  RETURN user_email IN ('admin@sportycodes.com', 'samuelsunday09066423764@gmail.com');
END;
$$;

-- Drop conflicting wallet policy that uses has_role
DROP POLICY IF EXISTS "Admins can manage all wallets" ON public.wallets;

-- Create announcement-images storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('announcement-images', 'announcement-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for announcement images
CREATE POLICY "Anyone can view announcement images"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcement-images');

CREATE POLICY "Admins can upload announcement images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'announcement-images' AND is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete announcement images"
ON storage.objects FOR DELETE
USING (bucket_id = 'announcement-images' AND is_admin_user(auth.uid()));

-- Add image_url column to announcements table
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS image_url text;
-- Create storage bucket for notification images
INSERT INTO storage.buckets (id, name, public)
VALUES ('notification-images', 'notification-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to notification images
CREATE POLICY "Anyone can view notification images"
ON storage.objects FOR SELECT
USING (bucket_id = 'notification-images');

-- Allow admin uploads to notification images bucket
CREATE POLICY "Admin can upload notification images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'notification-images');

-- Allow admin to delete notification images
CREATE POLICY "Admin can delete notification images"
ON storage.objects FOR DELETE
USING (bucket_id = 'notification-images');
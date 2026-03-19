
-- Create storage bucket for advert images
INSERT INTO storage.buckets (id, name, public) VALUES ('advert-images', 'advert-images', true);

-- Allow anyone to read advert images
CREATE POLICY "Public read advert images" ON storage.objects FOR SELECT USING (bucket_id = 'advert-images');

-- Allow authenticated users to upload advert images
CREATE POLICY "Auth users upload advert images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'advert-images');

-- Allow authenticated users to delete advert images
CREATE POLICY "Auth users delete advert images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'advert-images');

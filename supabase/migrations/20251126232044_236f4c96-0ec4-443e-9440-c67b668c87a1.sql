-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', false);

-- Create RLS policies for payment-screenshots bucket
CREATE POLICY "Users can upload their own payment screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'payment-screenshots');

CREATE POLICY "Users can view their own payment screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'payment-screenshots');

CREATE POLICY "Admins can view all payment screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'payment-screenshots');
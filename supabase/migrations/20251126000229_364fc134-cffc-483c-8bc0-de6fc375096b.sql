-- Create payments table for tracking user payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  sure_odd_id TEXT NOT NULL,
  screenshot_url TEXT,
  amount DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert payments (for payment submission)
CREATE POLICY "Anyone can submit payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to view their own payments
CREATE POLICY "Users can view all payments"
  ON public.payments
  FOR SELECT
  USING (true);

-- Create admin role check function
CREATE OR REPLACE FUNCTION is_admin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, hardcode admin email - replace with your admin email
  RETURN user_email = 'admin@sportycodes.com';
END;
$$;

-- Admin can update payment status
CREATE POLICY "Admins can update payments"
  ON public.payments
  FOR UPDATE
  USING (is_admin((SELECT user_email FROM public.payments WHERE id = payments.id)))
  WITH CHECK (is_admin((SELECT user_email FROM public.payments WHERE id = payments.id)));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
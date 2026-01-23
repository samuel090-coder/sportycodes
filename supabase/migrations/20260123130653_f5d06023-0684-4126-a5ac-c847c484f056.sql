-- Create VIP subscriptions table
CREATE TABLE public.vip_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 2000,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  payment_reference TEXT,
  payment_screenshot_url TEXT,
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create house earnings table for tracking admin commission
CREATE TABLE public.house_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  betting_pool_id UUID REFERENCES public.betting_pools(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 15,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add house_fee_percentage to app_settings if not exists
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('house_fee_percentage', '15')
ON CONFLICT (setting_key) DO NOTHING;

-- Add vip_price to app_settings
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('vip_monthly_price', '2000')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.vip_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_earnings ENABLE ROW LEVEL SECURITY;

-- VIP subscriptions policies
CREATE POLICY "Users can view their own subscriptions"
ON public.vip_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
ON public.vip_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
ON public.vip_subscriptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'samuelsunday09066423764@gmail.com'
  )
);

-- House earnings policies (admin only)
CREATE POLICY "Admins can view house earnings"
ON public.house_earnings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'samuelsunday09066423764@gmail.com'
  )
);

CREATE POLICY "Admins can insert house earnings"
ON public.house_earnings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'samuelsunday09066423764@gmail.com'
  )
);

-- Enable realtime for subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.vip_subscriptions;
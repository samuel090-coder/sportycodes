-- Create betting pools table for match predictions
CREATE TABLE public.betting_pools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  match_details JSONB NOT NULL DEFAULT '{}',
  options JSONB NOT NULL DEFAULT '[]',
  entry_fee DECIMAL(10,2) NOT NULL DEFAULT 100,
  prize_pool DECIMAL(10,2) NOT NULL DEFAULT 0,
  creator_deposit DECIMAL(10,2) NOT NULL DEFAULT 0,
  winning_option INTEGER,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'settled', 'cancelled')),
  closes_at TIMESTAMP WITH TIME ZONE NOT NULL,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create betting entries table
CREATE TABLE public.betting_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_id UUID REFERENCES public.betting_pools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  selected_option INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  is_winner BOOLEAN,
  payout DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pool_id, user_id)
);

-- Enable RLS
ALTER TABLE public.betting_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.betting_entries ENABLE ROW LEVEL SECURITY;

-- Betting pools policies
CREATE POLICY "Anyone can view open pools" ON public.betting_pools
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create pools" ON public.betting_pools
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their pools" ON public.betting_pools
  FOR UPDATE USING (auth.uid() = creator_id);

-- Betting entries policies  
CREATE POLICY "Users can view entries" ON public.betting_entries
  FOR SELECT USING (true);

CREATE POLICY "Users can create entries" ON public.betting_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger for betting pools updated_at
CREATE TRIGGER update_betting_pools_updated_at
  BEFORE UPDATE ON public.betting_pools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for betting pools and entries only
ALTER PUBLICATION supabase_realtime ADD TABLE public.betting_pools;
ALTER PUBLICATION supabase_realtime ADD TABLE public.betting_entries;
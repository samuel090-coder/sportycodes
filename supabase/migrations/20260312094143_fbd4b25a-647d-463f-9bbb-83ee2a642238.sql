
-- Fix room_event_purchases missing RLS policies
DO $$ BEGIN
  CREATE POLICY "Users can insert purchases" ON public.room_event_purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own purchases" ON public.room_event_purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Room games table
CREATE TABLE public.room_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  game_type text NOT NULL,
  title text NOT NULL,
  entry_fee numeric NOT NULL DEFAULT 0,
  prize_pool numeric NOT NULL DEFAULT 0,
  max_players integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'open',
  game_data jsonb NOT NULL DEFAULT '{}',
  winner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Room game entries
CREATE TABLE public.room_game_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.room_games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  entry_data jsonb NOT NULL DEFAULT '{}',
  is_winner boolean NOT NULL DEFAULT false,
  payout numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(game_id, user_id)
);

-- Room cross posts (tag groups to other groups)
CREATE TABLE public.room_cross_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  target_room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  posted_by uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'message',
  source_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_game_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_cross_posts ENABLE ROW LEVEL SECURITY;

-- Room games policies
CREATE POLICY "Members can view games" ON public.room_games FOR SELECT USING (is_room_member(auth.uid(), room_id));
CREATE POLICY "Members can create games" ON public.room_games FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND is_room_member(auth.uid(), room_id));
CREATE POLICY "Creator or admin can update games" ON public.room_games FOR UPDATE USING (auth.uid() = created_by OR is_room_admin(auth.uid(), room_id));

-- Game entries policies
CREATE POLICY "View game entries" ON public.room_game_entries FOR SELECT USING (EXISTS (SELECT 1 FROM public.room_games g WHERE g.id = game_id AND is_room_member(auth.uid(), g.room_id)));
CREATE POLICY "Join games" ON public.room_game_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own entries" ON public.room_game_entries FOR UPDATE USING (auth.uid() = user_id);

-- Cross posts policies
CREATE POLICY "View cross posts" ON public.room_cross_posts FOR SELECT USING (is_room_member(auth.uid(), source_room_id) OR is_room_member(auth.uid(), target_room_id));
CREATE POLICY "Create cross posts" ON public.room_cross_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = posted_by AND is_room_member(auth.uid(), source_room_id));

-- Enable realtime for games
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_game_entries;

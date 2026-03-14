
-- Add room settings columns for join approval and premium
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS require_approval boolean NOT NULL DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS join_fee numeric NOT NULL DEFAULT 0;

-- Room join requests table
CREATE TABLE public.room_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.room_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can request to join" ON public.room_join_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own requests" ON public.room_join_requests
  FOR SELECT TO public USING (auth.uid() = user_id OR is_room_admin(auth.uid(), room_id));

CREATE POLICY "Admins can update requests" ON public.room_join_requests
  FOR UPDATE TO public USING (is_room_admin(auth.uid(), room_id));

-- Message reactions table
CREATE TABLE public.room_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.room_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.room_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can react" ON public.room_message_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view reactions" ON public.room_message_reactions
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can remove own reactions" ON public.room_message_reactions
  FOR DELETE TO public USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_join_requests;

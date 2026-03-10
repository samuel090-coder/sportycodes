
-- Rooms table
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  avatar_url text,
  cover_url text,
  is_public boolean NOT NULL DEFAULT true,
  member_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Room members
CREATE TABLE public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- admin, moderator, member
  is_blocked boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Room messages (chat)
CREATE TABLE public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  message_type text NOT NULL DEFAULT 'text', -- text, event, transfer
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Room events (tagged sure odds, betting pools, etc.)
CREATE TABLE public.room_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  posted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- sure_odd, betting_pool
  source_id uuid NOT NULL,
  custom_price numeric NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Room event purchases
CREATE TABLE public.room_event_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_event_id uuid NOT NULL REFERENCES public.room_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_event_id, user_id)
);

-- Room wallet transfers
CREATE TABLE public.room_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable realtime for room messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;

-- RLS policies
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_event_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_transfers ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is room member (not blocked)
CREATE OR REPLACE FUNCTION public.is_room_member(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE user_id = _user_id AND room_id = _room_id AND is_blocked = false
  )
$$;

-- Helper: check if user is room admin
CREATE OR REPLACE FUNCTION public.is_room_admin(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE user_id = _user_id AND room_id = _room_id AND role = 'admin' AND is_blocked = false
  )
$$;

-- Rooms: anyone can view public rooms, members can view private rooms
CREATE POLICY "Anyone can view public rooms" ON public.rooms
  FOR SELECT USING (is_public = true OR is_room_member(auth.uid(), id));

CREATE POLICY "Auth users can create rooms" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Room admins can update rooms" ON public.rooms
  FOR UPDATE USING (is_room_admin(auth.uid(), id));

CREATE POLICY "Room admins can delete rooms" ON public.rooms
  FOR DELETE USING (auth.uid() = creator_id);

-- Room members
CREATE POLICY "Members can view room members" ON public.room_members
  FOR SELECT USING (is_room_member(auth.uid(), room_id) OR EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND is_public = true));

CREATE POLICY "Users can join public rooms" ON public.room_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND is_public = true)
      OR is_room_admin(auth.uid(), room_id)
    )
  );

CREATE POLICY "Room admins can update members" ON public.room_members
  FOR UPDATE USING (is_room_admin(auth.uid(), room_id));

CREATE POLICY "Users can leave rooms" ON public.room_members
  FOR DELETE USING (auth.uid() = user_id OR is_room_admin(auth.uid(), room_id));

-- Room messages
CREATE POLICY "Members can view messages" ON public.room_messages
  FOR SELECT USING (is_room_member(auth.uid(), room_id));

CREATE POLICY "Members can send messages" ON public.room_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_room_member(auth.uid(), room_id));

CREATE POLICY "Users can delete own messages" ON public.room_messages
  FOR DELETE USING (auth.uid() = user_id OR is_room_admin(auth.uid(), room_id));

-- Room events
CREATE POLICY "Members can view events" ON public.room_events
  FOR SELECT USING (is_room_member(auth.uid(), room_id));

CREATE POLICY "Room admins can post events" ON public.room_events
  FOR INSERT WITH CHECK (auth.uid() = posted_by AND is_room_admin(auth.uid(), room_id));

CREATE POLICY "Room admins can update events" ON public.room_events
  FOR UPDATE USING (is_room_admin(auth.uid(), room_id));

CREATE POLICY "Room admins can delete events" ON public.room_events
  FOR DELETE USING (is_room_admin(auth.uid(), room_id));

-- Room event purchases
CREATE POLICY "Members can view own purchases" ON public.room_event_purchases
  FOR SELECT USING (auth.uid() = user_id OR is_room_admin(auth.uid(), (SELECT room_id FROM public.room_events WHERE id = room_event_id)));

CREATE POLICY "Members can purchase events" ON public.room_event_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Room transfers
CREATE POLICY "Transfer participants can view" ON public.room_transfers
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Members can send transfers" ON public.room_transfers
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND is_room_member(auth.uid(), room_id));

-- Trigger to update room member count
CREATE OR REPLACE FUNCTION public.update_room_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rooms SET member_count = member_count + 1 WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.rooms SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_room_member_change
  AFTER INSERT OR DELETE ON public.room_members
  FOR EACH ROW EXECUTE FUNCTION update_room_member_count();

-- Trigger to update rooms updated_at
CREATE OR REPLACE FUNCTION public.update_rooms_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_rooms_update
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION update_rooms_updated_at();

-- Storage bucket for room avatars and covers
INSERT INTO storage.buckets (id, name, public) VALUES ('room-media', 'room-media', true);

CREATE POLICY "Anyone can view room media" ON storage.objects
  FOR SELECT USING (bucket_id = 'room-media');

CREATE POLICY "Auth users can upload room media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'room-media' AND auth.role() = 'authenticated');

CREATE POLICY "Auth users can update room media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'room-media' AND auth.role() = 'authenticated');

CREATE POLICY "Auth users can delete room media" ON storage.objects
  FOR DELETE USING (bucket_id = 'room-media' AND auth.role() = 'authenticated');

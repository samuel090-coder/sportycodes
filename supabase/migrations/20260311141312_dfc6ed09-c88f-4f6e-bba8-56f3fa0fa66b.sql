-- Update room_events RLS: allow any member to post events (not just admins)
DROP POLICY IF EXISTS "Room admins can post events" ON public.room_events;
CREATE POLICY "Members can post events" ON public.room_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = posted_by AND is_room_member(auth.uid(), room_id));

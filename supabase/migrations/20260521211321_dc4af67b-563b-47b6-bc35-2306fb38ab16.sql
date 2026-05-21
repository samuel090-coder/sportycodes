
-- Support conversations
CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_for_admin integer NOT NULL DEFAULT 0,
  unread_for_user integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own conversation" ON public.support_conversations
  FOR SELECT USING (auth.uid() = user_id OR is_admin_user(auth.uid()));
CREATE POLICY "Users insert own conversation" ON public.support_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own conversation" ON public.support_conversations
  FOR UPDATE USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

-- Support messages
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('user','ai','admin')),
  sender_id uuid,
  content text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_conv ON public.support_messages(conversation_id, created_at);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view messages" ON public.support_messages
  FOR SELECT USING (
    is_admin_user(auth.uid()) OR
    EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Participants send messages" ON public.support_messages
  FOR INSERT WITH CHECK (
    is_admin_user(auth.uid()) OR
    EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;

-- Seed global AI toggle setting
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('support_ai_enabled', 'true')
ON CONFLICT DO NOTHING;

-- Storage bucket for support media
INSERT INTO storage.buckets (id, name, public) VALUES ('support-media', 'support-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view support media" ON storage.objects
  FOR SELECT USING (bucket_id = 'support-media');
CREATE POLICY "Authenticated upload support media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'support-media');

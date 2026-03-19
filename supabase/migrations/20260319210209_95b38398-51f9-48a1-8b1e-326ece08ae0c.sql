
-- Live match videos table for admin billboard
CREATE TABLE public.live_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  embed_url text NOT NULL,
  thumbnail_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.live_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active videos" ON public.live_videos
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage videos" ON public.live_videos
  FOR ALL USING (is_admin_user(auth.uid()));

-- Admin advert rooms table
CREATE TABLE public.admin_adverts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  image_url text,
  link_url text,
  placement text NOT NULL DEFAULT 'feed',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_adverts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active adverts" ON public.admin_adverts
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage adverts" ON public.admin_adverts
  FOR ALL USING (is_admin_user(auth.uid()));

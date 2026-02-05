-- Create announcements table for site-wide notifications
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  display_type TEXT NOT NULL DEFAULT 'toast', -- 'banner', 'popup', 'toast'
  priority INTEGER DEFAULT 1, -- Higher = more important
  bg_color TEXT DEFAULT '#6366f1', -- Custom background color
  text_color TEXT DEFAULT '#ffffff', -- Custom text color
  link_url TEXT, -- Optional link
  link_text TEXT DEFAULT 'Learn More',
  is_active BOOLEAN DEFAULT true,
  is_dismissible BOOLEAN DEFAULT true, -- Can users dismiss it?
  show_once BOOLEAN DEFAULT false, -- Only show once per user
  start_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_at TIMESTAMP WITH TIME ZONE, -- Optional expiry
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to track which users have dismissed which announcements
CREATE TABLE public.announcement_dismissals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Anyone can view active announcements"
  ON public.announcements FOR SELECT
  USING (is_active = true AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at > now()));

CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (is_admin_user(auth.uid()));

-- RLS Policies for dismissals
CREATE POLICY "Users can view their own dismissals"
  ON public.announcement_dismissals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss announcements"
  ON public.announcement_dismissals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for announcements
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

-- Add trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AnnouncementToastView } from "@/components/announcements/AnnouncementSurfaces";

interface Announcement {
  id: string;
  title: string;
  content: string;
  display_type: string;
  bg_color: string;
  text_color: string;
  link_url?: string;
  link_text?: string;
  is_dismissible: boolean;
  is_active: boolean;
  priority: number;
}

export const AnnouncementToast = () => {
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAuth();
    fetchAnnouncements();
    
    // Subscribe to realtime for new announcements
    const channel = supabase
      .channel('announcements-toast')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
        const newAnnouncement = payload.new as Announcement;
        if (newAnnouncement.display_type === 'toast' && newAnnouncement.is_active) {
          showToast(newAnnouncement);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      fetchDismissals(session.user.id);
    }
  };

  const fetchDismissals = async (uid: string) => {
    const { data } = await supabase
      .from("announcement_dismissals")
      .select("announcement_id")
      .eq("user_id", uid);

    if (data) {
      setDismissedIds(new Set(data.map(d => d.announcement_id)));
    }
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .eq("display_type", "toast")
      .order("priority", { ascending: false });

    if (!error && data) {
      // Show toasts for announcements not yet shown in this session
      data.forEach((announcement) => {
        if (!shownIds.has(announcement.id) && !dismissedIds.has(announcement.id)) {
          showToast(announcement);
        }
      });
    }
  };

  const showToast = (announcement: Announcement) => {
    if (shownIds.has(announcement.id) || dismissedIds.has(announcement.id)) return;

    setShownIds(prev => new Set([...prev, announcement.id]));

    toast.custom(
      (t) => (
        <AnnouncementToastView
          a={announcement}
          onDismiss={() => {
            handleDismiss(announcement.id);
            toast.dismiss(t);
          }}
        />
      ),
      { duration: announcement.is_dismissible ? 10000 : Infinity }
    );
  };

  const handleDismiss = async (announcementId: string) => {
    setDismissedIds(prev => new Set([...prev, announcementId]));
    
    if (userId) {
      try {
        await supabase.from("announcement_dismissals").insert({
          announcement_id: announcementId,
          user_id: userId
        });
      } catch {
        // Ignore if already dismissed
      }
    }
  };

  return null; // This component only triggers toasts, no UI
};

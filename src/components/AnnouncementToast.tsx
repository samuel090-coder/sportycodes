import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, ExternalLink } from "lucide-react";

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

    const toastContent = (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-bold">
          <Megaphone className="w-4 h-4" />
          {announcement.title}
        </div>
        <p className="text-sm opacity-90">{announcement.content}</p>
        {announcement.link_url && (
          <a
            href={announcement.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm underline hover:opacity-80"
            onClick={(e) => e.stopPropagation()}
          >
            {announcement.link_text || "Learn More"}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );

    const toastOptions: any = {
      description: toastContent,
      duration: announcement.is_dismissible ? 10000 : Infinity,
      style: {
        backgroundColor: announcement.bg_color,
        color: announcement.text_color,
        border: `2px solid ${announcement.bg_color}`,
      },
      onDismiss: () => handleDismiss(announcement.id),
    };

    if (announcement.is_dismissible) {
      toastOptions.action = {
        label: "Dismiss",
        onClick: () => handleDismiss(announcement.id),
      };
    }

    toast(announcement.title, toastOptions);
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

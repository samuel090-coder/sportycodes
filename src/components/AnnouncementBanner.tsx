import { useState, useEffect } from "react";
import { X, ExternalLink, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
  priority: number;
}

export const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
    checkAuth();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('announcements-banner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements();
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

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .eq("display_type", "banner")
      .order("priority", { ascending: false });

    if (!error && data) {
      setAnnouncements(data);
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

  const handleDismiss = async (announcementId: string) => {
    setDismissedIds(prev => new Set([...prev, announcementId]));
    
    if (userId) {
      await supabase.from("announcement_dismissals").insert({
        announcement_id: announcementId,
        user_id: userId
      });
    }
  };

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.has(a.id));

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className="w-full space-y-0">
      {visibleAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className="relative px-4 py-3 flex items-center justify-center gap-3"
          style={{ 
            backgroundColor: announcement.bg_color,
            color: announcement.text_color 
          }}
        >
          <Megaphone className="w-4 h-4 flex-shrink-0" />
          <div className="flex items-center gap-2 text-center text-sm font-medium">
            <span className="font-bold">{announcement.title}</span>
            <span className="opacity-90">{announcement.content}</span>
            {announcement.link_url && (
              <a
                href={announcement.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline hover:opacity-80"
              >
                {announcement.link_text || "Learn More"}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          {announcement.is_dismissible && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-white/20"
              style={{ color: announcement.text_color }}
              onClick={() => handleDismiss(announcement.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnnouncementBannerView, AnnouncementView } from "@/components/announcements/AnnouncementSurfaces";

interface Announcement extends AnnouncementView {
  id: string;
  display_type: string;
  priority: number;
}

export const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
    checkAuth();

    const channel = supabase
      .channel("announcements-banner")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
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

    if (!error && data) setAnnouncements(data as unknown as Announcement[]);
  };

  const fetchDismissals = async (uid: string) => {
    const { data } = await supabase
      .from("announcement_dismissals")
      .select("announcement_id")
      .eq("user_id", uid);

    if (data) setDismissedIds(new Set(data.map((d) => d.announcement_id)));
  };

  const handleDismiss = async (announcementId: string) => {
    setDismissedIds((prev) => new Set([...prev, announcementId]));
    if (userId) {
      await supabase.from("announcement_dismissals").insert({
        announcement_id: announcementId,
        user_id: userId,
      });
    }
  };

  const visible = announcements.filter((a) => !dismissedIds.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="w-full space-y-0">
      {visible.map((a) => (
        <AnnouncementBannerView key={a.id} a={a} onDismiss={() => handleDismiss(a.id)} />
      ))}
    </div>
  );
};

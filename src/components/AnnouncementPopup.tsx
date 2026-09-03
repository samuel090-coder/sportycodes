import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { AnnouncementPopupBody, AnnouncementView } from "@/components/announcements/AnnouncementSurfaces";

interface Announcement extends AnnouncementView {
  id: string;
  display_type: string;
  priority: number;
}

export const AnnouncementPopup = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAnnouncements();
    checkAuth();

    const channel = supabase
      .channel("announcements-popup")
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
      .eq("display_type", "popup")
      .order("priority", { ascending: false });

    if (!error && data && data.length > 0) {
      setAnnouncements(data as unknown as Announcement[]);
      setTimeout(() => setIsOpen(true), 500);
    }
  };

  const fetchDismissals = async (uid: string) => {
    const { data } = await supabase
      .from("announcement_dismissals")
      .select("announcement_id")
      .eq("user_id", uid);

    if (data) setDismissedIds(new Set(data.map((d) => d.announcement_id)));
  };

  const visibleAnnouncements = announcements.filter((a) => !dismissedIds.has(a.id));
  const current = visibleAnnouncements[currentIndex];

  const handleDismiss = async () => {
    if (!current) return;
    setDismissedIds((prev) => new Set([...prev, current.id]));

    if (userId) {
      await supabase.from("announcement_dismissals").insert({
        announcement_id: current.id,
        user_id: userId,
      });
    }

    if (currentIndex < visibleAnnouncements.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsOpen(false);
    }
  };

  if (!current) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="max-w-md overflow-hidden rounded-2xl border-2 p-0"
        style={{ borderColor: current.bg_color || undefined }}
      >
        <DialogTitle className="sr-only">{current.title}</DialogTitle>
        <AnnouncementPopupBody
          a={current}
          counter={
            visibleAnnouncements.length > 1
              ? `${currentIndex + 1} of ${visibleAnnouncements.length}`
              : undefined
          }
          onDismiss={handleDismiss}
          onClose={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

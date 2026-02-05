import { useState, useEffect } from "react";
import { X, ExternalLink, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
      .channel('announcements-popup')
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
      .eq("display_type", "popup")
      .order("priority", { ascending: false });

    if (!error && data && data.length > 0) {
      setAnnouncements(data);
      // Check if we should show the popup
      setTimeout(() => setIsOpen(true), 500);
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

  const handleDismiss = async () => {
    const current = visibleAnnouncements[currentIndex];
    if (!current) return;

    const newDismissed = new Set([...dismissedIds, current.id]);
    setDismissedIds(newDismissed);

    if (userId) {
      await supabase.from("announcement_dismissals").insert({
        announcement_id: current.id,
        user_id: userId
      });
    }

    // Move to next or close
    if (currentIndex < visibleAnnouncements.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsOpen(false);
    }
  };

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.has(a.id));
  const current = visibleAnnouncements[currentIndex];

  if (!current) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="max-w-md rounded-2xl border-2"
        style={{ 
          borderColor: current.bg_color,
        }}
      >
        <DialogHeader>
          <div 
            className="w-full py-4 px-6 -mx-6 -mt-6 rounded-t-2xl flex items-center gap-3"
            style={{ 
              backgroundColor: current.bg_color,
              color: current.text_color 
            }}
          >
            <Megaphone className="w-6 h-6" />
            <DialogTitle className="text-lg font-bold" style={{ color: current.text_color }}>
              {current.title}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <DialogDescription className="text-foreground text-base leading-relaxed">
            {current.content}
          </DialogDescription>

          {current.link_url && (
            <a
              href={current.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-primary hover:underline font-medium"
            >
              {current.link_text || "Learn More"}
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-border">
          {visibleAnnouncements.length > 1 && (
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {visibleAnnouncements.length}
            </span>
          )}
          <div className="flex gap-2 ml-auto">
            {current.is_dismissible && (
              <Button variant="outline" onClick={handleDismiss}>
                Dismiss
              </Button>
            )}
            <Button 
              onClick={() => setIsOpen(false)}
              style={{ backgroundColor: current.bg_color, color: current.text_color }}
            >
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

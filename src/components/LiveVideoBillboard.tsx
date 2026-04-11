import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Tv } from "lucide-react";
import { LiveScoresTicker } from "@/components/LiveScoresTicker";

interface LiveVideo {
  id: string;
  title: string;
  embed_url: string;
  thumbnail_url: string | null;
}

export function LiveVideoBillboard() {
  const [videos, setVideos] = useState<LiveVideo[]>([]);
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("live_videos")
        .select("id, title, embed_url, thumbnail_url")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (data && data.length > 0) setVideos(data);
    };
    load();
  }, []);

  if (videos.length === 0) return null;

  const goTo = (dir: number) => {
    const next = current + dir;
    if (next >= 0 && next < videos.length) setCurrent(next);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? 1 : -1);
    }
  };

  const video = videos[current];

  return (
    <div className="relative w-full bg-card border-b border-border overflow-hidden">
      {/* Header label */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <Tv className="w-4 h-4 text-destructive animate-pulse" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Live Match</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {current + 1}/{videos.length}
        </span>
      </div>

      {/* Video container */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full aspect-video"
      >
        <iframe
          key={video.id}
          src={video.embed_url}
          title={video.title}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen"
          frameBorder="0"
        />

        {/* Navigation arrows */}
        {current > 0 && (
          <button
            onClick={() => goTo(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/70 backdrop-blur flex items-center justify-center text-foreground hover:bg-background/90 transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {current < videos.length - 1 && (
          <button
            onClick={() => goTo(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/70 backdrop-blur flex items-center justify-center text-foreground hover:bg-background/90 transition-colors z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Title bar */}
      <div className="px-4 py-2">
        <p className="text-sm font-semibold text-foreground truncate">{video.title}</p>
      </div>

      {/* Dots */}
      {videos.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-3">
          {videos.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-primary w-5" : "bg-muted-foreground/30"}`}
            />
          ))}
        </div>
      )}
      {/* Live Scores Ticker */}
      <LiveScoresTicker />
    </div>
  );
}

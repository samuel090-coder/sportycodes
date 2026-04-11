import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tv, Plus, Trash2, GripVertical, Wand2 } from "lucide-react";

interface LiveVideo {
  id: string;
  title: string;
  embed_url: string;
  is_active: boolean;
  display_order: number;
}

/**
 * Auto-converts any video URL to an embeddable format:
 * - YouTube watch/short/live URLs → embed
 * - Dailymotion → embed
 * - Vimeo → embed
 * - Facebook video → embed
 * - Twitch → embed
 * - Already an embed/iframe URL → pass through
 */
function convertToEmbedUrl(url: string): string {
  const trimmed = url.trim();

  // YouTube patterns
  const ytWatchMatch = trimmed.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/live\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytWatchMatch) {
    return `https://www.youtube.com/embed/${ytWatchMatch[1]}?autoplay=1&mute=1`;
  }
  // YouTube embed already
  if (trimmed.includes("youtube.com/embed/")) {
    return trimmed;
  }

  // Dailymotion
  const dmMatch = trimmed.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (dmMatch) {
    return `https://www.dailymotion.com/embed/video/${dmMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // Facebook video
  if (trimmed.includes("facebook.com") && trimmed.includes("video")) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=false`;
  }

  // Twitch
  const twitchMatch = trimmed.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  if (twitchMatch) {
    return `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${window.location.hostname}`;
  }

  // Return as-is (already embed or direct stream)
  return trimmed;
}

export function LiveVideosSection() {
  const [videos, setVideos] = useState<LiveVideo[]>([]);
  const [title, setTitle] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [converted, setConverted] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from("live_videos")
      .select("*")
      .order("display_order", { ascending: true });
    if (data) setVideos(data as LiveVideo[]);
  };

  const handleUrlChange = (value: string) => {
    setOriginalUrl(value);
    const embed = convertToEmbedUrl(value);
    setEmbedUrl(embed);
    setConverted(embed !== value.trim() && value.trim().length > 0);
  };

  const addVideo = async () => {
    if (!title.trim() || !embedUrl.trim()) { toast.error("Title and URL required"); return; }
    const { error } = await supabase.from("live_videos").insert({
      title: title.trim(),
      embed_url: embedUrl.trim(),
      display_order: videos.length,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Video added");
    setTitle(""); setEmbedUrl(""); setOriginalUrl(""); setConverted(false);
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("live_videos").update({ is_active: active }).eq("id", id);
    load();
  };

  const deleteVideo = async (id: string) => {
    await supabase.from("live_videos").delete().eq("id", id);
    toast.success("Video removed");
    load();
  };

  return (
    <Card className="bg-gradient-cyber border-2 border-cyber-neon-green/50 shadow-neon-green p-4 md:p-6">
      <h3 className="text-lg font-black text-cyber-neon-green mb-4 font-mono flex items-center gap-2">
        <Tv className="w-5 h-5 animate-neon-pulse" />
        LIVE MATCH VIDEOS
      </h3>

      <div className="space-y-3 mb-4">
        <Input placeholder="Video title" value={title} onChange={e => setTitle(e.target.value)} className="bg-cyber-dark border-cyber-neon-green/30 text-foreground font-mono" />
        <div className="relative">
          <Input
            placeholder="Paste any video link (YouTube, Vimeo, etc.)"
            value={originalUrl}
            onChange={e => handleUrlChange(e.target.value)}
            className="bg-cyber-dark border-cyber-neon-green/30 text-foreground font-mono pr-10"
          />
          {converted && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Wand2 className="w-4 h-4 text-cyber-neon-green animate-pulse" />
            </div>
          )}
        </div>
        {converted && (
          <div className="bg-cyber-neon-green/10 border border-cyber-neon-green/30 rounded-md px-3 py-2">
            <p className="text-[10px] text-cyber-neon-green font-mono mb-1">✨ Auto-converted to embed URL:</p>
            <p className="text-[11px] text-foreground font-mono truncate">{embedUrl}</p>
          </div>
        )}
        <Button onClick={addVideo} className="w-full gap-2 bg-cyber-neon-green text-cyber-dark font-mono font-bold">
          <Plus className="w-4 h-4" /> ADD VIDEO
        </Button>
      </div>

      <div className="space-y-2">
        {videos.map(v => (
          <div key={v.id} className="flex items-center gap-3 p-3 bg-cyber-dark/50 rounded-lg border border-cyber-neon-green/20">
            <GripVertical className="w-4 h-4 text-cyber-neon-cyan/40 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-foreground truncate">{v.title}</p>
              <p className="text-xs text-cyber-neon-cyan/50 truncate font-mono">{v.embed_url}</p>
            </div>
            <Switch checked={v.is_active} onCheckedChange={c => toggleActive(v.id, c)} />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-cyber-neon-red" onClick={() => deleteVideo(v.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {videos.length === 0 && <p className="text-center text-sm text-cyber-neon-cyan/40 font-mono py-4">No videos added yet</p>}
      </div>
    </Card>
  );
}

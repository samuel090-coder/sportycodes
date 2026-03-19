import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tv, Plus, Trash2, GripVertical } from "lucide-react";

interface LiveVideo {
  id: string;
  title: string;
  embed_url: string;
  is_active: boolean;
  display_order: number;
}

export function LiveVideosSection() {
  const [videos, setVideos] = useState<LiveVideo[]>([]);
  const [title, setTitle] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from("live_videos")
      .select("*")
      .order("display_order", { ascending: true });
    if (data) setVideos(data as LiveVideo[]);
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
    setTitle(""); setEmbedUrl("");
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
        <Input placeholder="Embed URL (iframe src)" value={embedUrl} onChange={e => setEmbedUrl(e.target.value)} className="bg-cyber-dark border-cyber-neon-green/30 text-foreground font-mono" />
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

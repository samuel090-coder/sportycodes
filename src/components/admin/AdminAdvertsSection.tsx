import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, ExternalLink } from "lucide-react";

interface Advert {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  placement: string;
  is_active: boolean;
  display_order: number;
}

export function AdminAdvertsSection() {
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [placement, setPlacement] = useState("feed");

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("admin_adverts").select("*").order("display_order");
    if (data) setAdverts(data as Advert[]);
  };

  const addAdvert = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    const { error } = await supabase.from("admin_adverts").insert({
      title: title.trim(),
      content: content.trim() || null,
      image_url: imageUrl.trim() || null,
      link_url: linkUrl.trim() || null,
      placement,
      display_order: adverts.length,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Advert created");
    setTitle(""); setContent(""); setImageUrl(""); setLinkUrl("");
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("admin_adverts").update({ is_active: active }).eq("id", id);
    load();
  };

  const deleteAdvert = async (id: string) => {
    await supabase.from("admin_adverts").delete().eq("id", id);
    toast.success("Advert removed");
    load();
  };

  return (
    <div className="space-y-6 px-2 md:px-0">
      <Card className="bg-gradient-cyber border-2 border-cyber-neon-purple/50 p-4 md:p-6">
        <h3 className="text-lg font-black text-cyber-neon-purple mb-4 font-mono flex items-center gap-2">
          <Megaphone className="w-5 h-5" />
          ADVERT ROOM
        </h3>

        <div className="space-y-3 mb-4">
          <Input placeholder="Advert title" value={title} onChange={e => setTitle(e.target.value)} className="bg-cyber-dark border-cyber-neon-purple/30 text-foreground font-mono" />
          <Textarea placeholder="Advert text (optional)" value={content} onChange={e => setContent(e.target.value)} className="bg-cyber-dark border-cyber-neon-purple/30 text-foreground font-mono min-h-[60px]" />
          <Input placeholder="Image URL (optional)" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="bg-cyber-dark border-cyber-neon-purple/30 text-foreground font-mono" />
          <Input placeholder="Link URL (optional)" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="bg-cyber-dark border-cyber-neon-purple/30 text-foreground font-mono" />
          <select value={placement} onChange={e => setPlacement(e.target.value)} className="w-full bg-cyber-dark border border-cyber-neon-purple/30 text-foreground font-mono rounded-md px-3 py-2 text-sm">
            <option value="feed">Feed (between cards)</option>
            <option value="header">Header banner</option>
            <option value="footer">Footer banner</option>
          </select>
          <Button onClick={addAdvert} className="w-full gap-2 bg-cyber-neon-purple text-white font-mono font-bold hover:bg-cyber-neon-purple/80">
            <Plus className="w-4 h-4" /> CREATE ADVERT
          </Button>
        </div>

        <div className="space-y-2">
          {adverts.map(ad => (
            <div key={ad.id} className="flex items-center gap-3 p-3 bg-cyber-dark/50 rounded-lg border border-cyber-neon-purple/20">
              {ad.image_url && <img src={ad.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-foreground truncate">{ad.title}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-neon-purple/20 text-cyber-neon-purple font-mono">{ad.placement}</span>
                  {ad.link_url && <ExternalLink className="w-3 h-3 text-cyber-neon-cyan/50" />}
                </div>
              </div>
              <Switch checked={ad.is_active} onCheckedChange={c => toggleActive(ad.id, c)} />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-cyber-neon-red" onClick={() => deleteAdvert(ad.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {adverts.length === 0 && <p className="text-center text-sm text-cyber-neon-purple/40 font-mono py-4">No adverts created yet</p>}
        </div>
      </Card>
    </div>
  );
}

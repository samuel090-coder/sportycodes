import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, ExternalLink, Upload, Image, Eye, EyeOff } from "lucide-react";

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [placement, setPlacement] = useState("feed");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("admin_adverts").select("*").order("display_order");
    if (data) setAdverts(data as Advert[]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `adverts/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("advert-images").upload(path, file);
    if (error) {
      toast.error("Upload failed: " + error.message);
      return null;
    }
    const { data } = supabase.storage.from("advert-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const addAdvert = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    setUploading(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
      if (!imageUrl) { setUploading(false); return; }
    }

    const { error } = await supabase.from("admin_adverts").insert({
      title: title.trim(),
      content: content.trim() || null,
      image_url: imageUrl,
      link_url: linkUrl.trim() || null,
      placement,
      display_order: adverts.length,
    });
    if (error) { toast.error(error.message); setUploading(false); return; }
    toast.success("Advert created");
    setTitle(""); setContent(""); setLinkUrl(""); setImageFile(null); setImagePreview(null);
    setUploading(false);
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
          <Input placeholder="Advert title *" value={title} onChange={e => setTitle(e.target.value)} className="bg-cyber-dark border-cyber-neon-purple/30 text-foreground font-mono" />
          <Textarea placeholder="Advert description (optional)" value={content} onChange={e => setContent(e.target.value)} className="bg-cyber-dark border-cyber-neon-purple/30 text-foreground font-mono min-h-[60px]" />

          {/* Image Upload */}
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-cyber-neon-purple/30" />
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-black/60 h-7 w-7 text-white hover:bg-black/80" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-cyber-neon-purple/30 bg-cyber-dark/50 text-cyber-neon-purple/60 hover:border-cyber-neon-purple/60 gap-2 flex-col">
                <Upload className="w-6 h-6" />
                <span className="text-xs font-mono">Upload Advert Image</span>
              </Button>
            )}
          </div>

          <Input placeholder="Link URL (optional - where ad leads to)" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="bg-cyber-dark border-cyber-neon-purple/30 text-foreground font-mono" />
          <select value={placement} onChange={e => setPlacement(e.target.value)} className="w-full bg-cyber-dark border border-cyber-neon-purple/30 text-foreground font-mono rounded-md px-3 py-2 text-sm">
            <option value="feed">Feed (between cards)</option>
            <option value="header">Header banner</option>
            <option value="footer">Footer banner</option>
          </select>
          <Button onClick={addAdvert} disabled={uploading} className="w-full gap-2 bg-cyber-neon-purple text-white font-mono font-bold hover:bg-cyber-neon-purple/80">
            {uploading ? "Uploading..." : <><Plus className="w-4 h-4" /> CREATE ADVERT</>}
          </Button>
        </div>

        <div className="space-y-2">
          {adverts.map(ad => (
            <div key={ad.id} className="flex items-center gap-3 p-3 bg-cyber-dark/50 rounded-lg border border-cyber-neon-purple/20">
              {ad.image_url ? (
                <img src={ad.image_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 border border-cyber-neon-purple/20" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-cyber-neon-purple/10 flex items-center justify-center shrink-0">
                  <Image className="w-5 h-5 text-cyber-neon-purple/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-foreground truncate font-bold">{ad.title}</p>
                {ad.content && <p className="text-[10px] text-muted-foreground truncate">{ad.content}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-neon-purple/20 text-cyber-neon-purple font-mono">{ad.placement}</span>
                  {ad.link_url && <ExternalLink className="w-3 h-3 text-cyber-neon-cyan/50" />}
                  {ad.is_active ? <Eye className="w-3 h-3 text-green-400" /> : <EyeOff className="w-3 h-3 text-red-400" />}
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

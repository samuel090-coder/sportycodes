import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

interface Advert {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  placement: string;
}

export function SiteAdverts({ placement }: { placement: string }) {
  const [adverts, setAdverts] = useState<Advert[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("admin_adverts")
        .select("id, title, content, image_url, link_url, placement")
        .eq("is_active", true)
        .eq("placement", placement)
        .order("display_order");
      if (data) setAdverts(data);
    };
    load();

    // Listen for changes
    const channel = supabase
      .channel(`adverts-${placement}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_adverts" }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [placement]);

  if (adverts.length === 0) return null;

  return (
    <div className="space-y-3">
      {adverts.map(ad => (
        <div
          key={ad.id}
          className="relative overflow-hidden rounded-xl border border-border bg-card cursor-pointer group transition-transform active:scale-[0.98]"
          onClick={() => ad.link_url && window.open(ad.link_url, "_blank")}
        >
          {ad.image_url && (
            <img src={ad.image_url} alt={ad.title} className="w-full h-36 object-cover" loading="lazy" />
          )}
          <div className="p-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold uppercase tracking-wider">Sponsored</span>
              {ad.link_url && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
            </div>
            <p className="text-sm font-bold text-foreground mt-1">{ad.title}</p>
            {ad.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ad.content}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

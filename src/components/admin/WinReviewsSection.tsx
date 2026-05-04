import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Trash2, Check, X, Sparkles, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WinningPostcard, WinningReviewData } from "@/components/WinningPostcard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WinReviewsSection() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "all">("pending");
  const [parsing, setParsing] = useState(false);
  const [draft, setDraft] = useState<WinningReviewData>({});
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("winning_reviews" as any).select("*").order("created_at", { ascending: false });
    if (tab !== "all") q = q.eq("status", tab);
    const { data } = await q;
    setItems((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("winning_reviews" as any).update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Review ${status}`);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("winning_reviews" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const parseFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParsing(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      const { data: resp, error } = await supabase.functions.invoke("parse-win-screenshot", { body: { imageDataUrl: dataUrl } });
      if (error) throw error;
      if (resp?.error) throw new Error(resp.error);
      setDraft({ ...resp.data, selections: resp.data.selections || [] });
      toast.success("Parsed!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  const adminPost = async () => {
    if (!file) return toast.error("Upload screenshot first");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const path = `admin/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("win-screenshots").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("win-screenshots").getPublicUrl(path);
      const { error } = await supabase.from("winning_reviews" as any).insert({
        user_id: user?.id,
        display_name: draft.display_name || "SPORTY CODES Winner",
        bookmaker: draft.bookmaker,
        ticket_id: draft.ticket_id,
        verify_code: draft.verify_code,
        bet_type: draft.bet_type,
        total_stake: draft.total_stake || 0,
        total_odds: draft.total_odds || 0,
        total_return: draft.total_return || 0,
        total_bonus: draft.total_bonus || 0,
        selections: draft.selections || [],
        screenshot_url: pub.publicUrl,
        caption: draft.caption,
        status: "approved",
        created_by_admin: true,
      });
      if (error) throw error;
      toast.success("Posted live!");
      setDraft({});
      setFile(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-cyber border-2 border-cyber-neon-red/60 p-6">
        <h3 className="text-2xl font-black text-cyber-neon-red font-mono mb-3 flex items-center gap-2">
          <Sparkles className="w-6 h-6" /> ADMIN: POST WIN
        </h3>
        <label>
          <input type="file" accept="image/*" hidden onChange={parseFile} disabled={parsing} />
          <Button asChild disabled={parsing} className="w-full bg-cyber-neon-red text-white font-black font-mono">
            <span>{parsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}{parsing ? "PARSING..." : "UPLOAD WIN SCREENSHOT"}</span>
          </Button>
        </label>
        {(draft.total_return || file) && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Field label="Display name" value={draft.display_name} onChange={(v) => setDraft({ ...draft, display_name: v })} />
              <Field label="Caption" value={draft.caption} onChange={(v) => setDraft({ ...draft, caption: v })} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Stake" type="number" value={draft.total_stake} onChange={(v) => setDraft({ ...draft, total_stake: parseFloat(v) || 0 })} />
                <Field label="Odds" type="number" value={draft.total_odds} onChange={(v) => setDraft({ ...draft, total_odds: parseFloat(v) || 0 })} />
                <Field label="Return" type="number" value={draft.total_return} onChange={(v) => setDraft({ ...draft, total_return: parseFloat(v) || 0 })} />
                <Field label="Bonus" type="number" value={draft.total_bonus} onChange={(v) => setDraft({ ...draft, total_bonus: parseFloat(v) || 0 })} />
              </div>
              <Button onClick={adminPost} disabled={saving} className="w-full bg-cyber-neon-green text-cyber-dark font-black font-mono">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "GO LIVE"}
              </Button>
            </div>
            <div>
              <WinningPostcard data={draft} />
            </div>
          </div>
        )}
      </Card>

      <div className="flex gap-2">
        {(["pending", "approved", "all"] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}
            className={`font-mono font-black uppercase ${tab === t ? "bg-cyber-neon-red text-white" : ""}`}>
            {t}
          </Button>
        ))}
      </div>

      {loading ? <div className="text-cyber-neon-cyan font-mono">Loading...</div> :
        items.length === 0 ? <div className="text-cyber-neon-cyan/60 font-mono text-center py-10">No reviews</div> :
        <div className="space-y-4">
          {items.map((r) => (
            <Card key={r.id} className="bg-cyber-panel border-cyber-neon-red/30 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <Badge className={r.status === "approved" ? "bg-cyber-neon-green text-cyber-dark" : r.status === "pending" ? "bg-yellow-400 text-cyber-dark" : "bg-red-600 text-white"}>
                    {r.status.toUpperCase()}
                  </Badge>
                  <p className="text-cyber-neon-cyan text-xs mt-1 font-mono">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  {r.status !== "approved" && (
                    <Button size="sm" onClick={() => setStatus(r.id, "approved")} className="bg-cyber-neon-green text-cyber-dark"><Check className="w-3 h-3" /></Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}><X className="w-3 h-3" /></Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => remove(r.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              <WinningPostcard data={r as WinningReviewData} />
              {r.screenshot_url && (
                <a href={r.screenshot_url} target="_blank" rel="noreferrer" className="block mt-2 text-cyber-neon-cyan text-xs underline font-mono">
                  View original screenshot
                </a>
              )}
            </Card>
          ))}
        </div>
      }
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="text-cyber-neon-cyan font-mono text-[10px]">{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="bg-cyber-dark/50 border-cyber-neon-cyan/40 text-cyber-neon-green font-mono h-8 mt-1" />
    </div>
  );
}

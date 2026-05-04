import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Loader2, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { WinningPostcard, WinningReviewData } from "@/components/WinningPostcard";

const WinningReviews = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<WinningReviewData>({});
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [caption, setCaption] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("winning_reviews" as any)
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50);
    setReviews((data as any[]) || []);
    setLoading(false);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setParsing(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { data: resp, error } = await supabase.functions.invoke("parse-win-screenshot", {
        body: { imageDataUrl: dataUrl },
      });
      if (error) throw error;
      if (resp?.error) throw new Error(resp.error);
      setDraft({ ...resp.data, selections: resp.data.selections || [] });
      toast.success("Win parsed! Review and submit.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to parse screenshot");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  const submit = async () => {
    if (!user) {
      toast.error("Please log in to submit");
      navigate("/auth");
      return;
    }
    if (!screenshotFile) {
      toast.error("Upload your winning screenshot");
      return;
    }
    setSubmitting(true);
    try {
      const path = `${user.id}/${Date.now()}-${screenshotFile.name}`;
      const { error: upErr } = await supabase.storage
        .from("win-screenshots")
        .upload(path, screenshotFile, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("win-screenshots").getPublicUrl(path);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", user.id)
        .single();

      const insertRow: any = {
        user_id: user.id,
        display_name: profile?.display_name || profile?.username || user.email?.split("@")[0],
        bookmaker: draft.bookmaker || null,
        ticket_id: draft.ticket_id || null,
        verify_code: draft.verify_code || null,
        bet_type: draft.bet_type || null,
        total_stake: draft.total_stake || 0,
        total_odds: draft.total_odds || 0,
        total_return: draft.total_return || 0,
        total_bonus: draft.total_bonus || 0,
        selections: draft.selections || [],
        screenshot_url: pub.publicUrl,
        caption,
        status: "pending",
      };
      const { error } = await supabase.from("winning_reviews" as any).insert(insertRow);
      if (error) throw error;
      toast.success("Submitted! Admin will approve shortly.");
      setShowForm(false);
      setDraft({});
      setScreenshotFile(null);
      setPreviewUrl("");
      setCaption("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-dark pb-32">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-cyber-neon-red to-red-800 shadow-bet">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-black text-white font-mono flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-300" /> WIN REVIEWS
            </h1>
          </div>
          <Button
            onClick={() => setShowForm((v) => !v)}
            className="bg-yellow-400 text-cyber-dark hover:bg-yellow-300 font-black"
          >
            <Sparkles className="w-4 h-4 mr-1" /> POST WIN
          </Button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {showForm && (
          <Card className="bg-gradient-cyber border-2 border-yellow-400/60 p-5">
            <h2 className="text-cyber-neon-red text-xl font-black font-mono mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> SHARE YOUR WIN
            </h2>
            <p className="text-cyber-neon-cyan/80 text-xs mb-4 font-mono">
              Upload your winning screenshot. AI rebuilds it as a SPORTY CODES postcard. Admin approves before it goes live.
            </p>
            <label>
              <input type="file" accept="image/*" hidden onChange={handleFile} disabled={parsing} />
              <Button
                asChild
                disabled={parsing}
                className="w-full bg-cyber-neon-red text-white hover:bg-red-600 font-black font-mono"
              >
                <span>
                  {parsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {parsing ? "PARSING WIN..." : "UPLOAD SCREENSHOT"}
                </span>
              </Button>
            </label>

            {(draft.total_return || screenshotFile) && (
              <div className="mt-5 space-y-4">
                <div>
                  <Label className="text-cyber-neon-cyan font-mono text-xs">CAPTION (optional)</Label>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Bagged this with SPORTY CODES 🔥"
                    className="bg-cyber-dark/50 border-cyber-neon-cyan/40 text-white font-mono mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Mini label="Stake" value={draft.total_stake} onChange={(v) => setDraft({ ...draft, total_stake: parseFloat(v) || 0 })} />
                  <Mini label="Odds" value={draft.total_odds} onChange={(v) => setDraft({ ...draft, total_odds: parseFloat(v) || 0 })} />
                  <Mini label="Return ₦" value={draft.total_return} onChange={(v) => setDraft({ ...draft, total_return: parseFloat(v) || 0 })} />
                  <Mini label="Bonus ₦" value={draft.total_bonus} onChange={(v) => setDraft({ ...draft, total_bonus: parseFloat(v) || 0 })} />
                </div>

                <div>
                  <Label className="text-cyber-neon-cyan font-mono text-xs mb-1 block">PREVIEW</Label>
                  <WinningPostcard data={{ ...draft, caption, display_name: user?.email?.split("@")[0] }} />
                </div>

                <Button
                  onClick={submit}
                  disabled={submitting}
                  className="w-full bg-cyber-neon-green text-cyber-dark hover:bg-cyber-neon-cyan font-black font-mono"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "SUBMIT FOR REVIEW"}
                </Button>
              </div>
            )}
          </Card>
        )}

        {loading ? (
          <div className="text-center py-20 text-cyber-neon-cyan font-mono">Loading wins...</div>
        ) : reviews.length === 0 ? (
          <Card className="p-10 text-center bg-cyber-panel border-cyber-neon-red/30">
            <Trophy className="w-12 h-12 mx-auto text-cyber-neon-cyan/40 mb-3" />
            <p className="text-cyber-neon-cyan font-mono">No wins posted yet. Be the first!</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {reviews.map((r) => (
              <WinningPostcard key={r.id} data={r as WinningReviewData} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

function Mini({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-cyber-neon-cyan font-mono text-[10px]">{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="bg-cyber-dark/50 border-cyber-neon-cyan/40 text-cyber-neon-green font-mono h-8 mt-1"
      />
    </div>
  );
}

export default WinningReviews;

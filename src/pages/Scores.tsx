import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Activity, AlertTriangle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { WinningPostcard, WinningReviewData } from "@/components/WinningPostcard";

type Match = {
  home: string; away: string;
  homeScore: any; awayScore: any;
  status: string; minute: string | null; competition: string;
};

const Scores = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "live" | "finished">("all");
  const [source, setSource] = useState<"live" | "admin" | null>(null);
  const [wins, setWins] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("fetch-live-scores");
      setMatches(data?.matches || []);
      setSource(data?.source || null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadWins = async () => {
    const { data } = await supabase
      .from("winning_reviews" as any)
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10);
    setWins((data as any[]) || []);
  };

  useEffect(() => {
    load();
    loadWins();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const filtered = matches.filter((m) =>
    filter === "all" ? true : filter === "live" ? m.status === "IN_PLAY" : m.status === "FINISHED"
  );

  return (
    <div className="min-h-screen bg-cyber-dark pb-32">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-cyber-neon-red to-red-800 shadow-bet">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-black text-white font-mono flex items-center gap-2">
              <Activity className="w-6 h-6 animate-pulse" /> SCORES
            </h1>
          </div>
          <Button
            onClick={load}
            disabled={loading}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-4 sticky top-16 z-10 bg-cyber-dark/80 backdrop-blur-sm py-2 -mx-2 px-2">
          {(["all", "live", "finished"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className={`font-mono font-black uppercase text-xs ${
                filter === f ? "bg-cyber-neon-red text-white" : "border-cyber-neon-red/40 text-cyber-neon-cyan"
              }`}
            >
              {f === "live" && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-1.5" />}
              {f}
            </Button>
          ))}
        </div>

        {loading && matches.length === 0 ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-cyber-panel border-cyber-neon-red/20 p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center bg-cyber-panel border-cyber-neon-red/30">
            <p className="text-cyber-neon-cyan font-mono">No {filter !== "all" ? filter : ""} matches right now.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((m, i) => (
              <Card
                key={i}
                className="bg-cyber-panel border border-cyber-neon-red/30 hover:border-cyber-neon-red transition-colors p-3 font-mono"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white font-bold truncate">{m.home}</span>
                      <span className="text-cyber-neon-green font-black text-lg ml-2">{m.homeScore}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-white font-bold truncate">{m.away}</span>
                      <span className="text-cyber-neon-green font-black text-lg ml-2">{m.awayScore}</span>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    {m.status === "IN_PLAY" ? (
                      <div className="flex items-center gap-1 text-red-500 text-xs font-black">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        {m.minute || "LIVE"}'
                      </div>
                    ) : m.status === "FINISHED" ? (
                      <span className="text-cyber-neon-cyan/70 text-[10px] font-black">FT</span>
                    ) : (
                      <span className="text-cyber-neon-cyan/50 text-[10px]">{m.status}</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Scores;

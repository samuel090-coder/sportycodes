import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";

interface MatchScore {
  home: string;
  away: string;
  homeScore: number | string;
  awayScore: number | string;
  status: string;
  minute?: string;
}

export function LiveScoresTicker() {
  const [matches, setMatches] = useState<MatchScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.functions.invoke("fetch-live-scores", {
        body: null,
        headers: { "Content-Type": "application/json" },
      });

      if (error) {
        console.error("Score fetch error:", error);
        return;
      }

      // Parse response - adapt to API structure
      const parsed: MatchScore[] = [];
      if (data?.response) {
        const items = Array.isArray(data.response) ? data.response : [];
        for (const m of items.slice(0, 20)) {
          parsed.push({
            home: m.home?.name || m.homeTeam?.name || m.teams?.home?.name || "Home",
            away: m.away?.name || m.awayTeam?.name || m.teams?.away?.name || "Away",
            homeScore: m.home?.score ?? m.goals?.home ?? m.score?.home ?? "-",
            awayScore: m.away?.score ?? m.goals?.away ?? m.score?.away ?? "-",
            status: m.status?.long || m.fixture?.status?.long || m.status || "Scheduled",
            minute: m.status?.elapsed || m.fixture?.status?.elapsed || m.minute || undefined,
          });
        }
      } else if (Array.isArray(data)) {
        for (const m of data.slice(0, 20)) {
          parsed.push({
            home: m.home?.name || m.homeTeam || "Home",
            away: m.away?.name || m.awayTeam || "Away",
            homeScore: m.home?.score ?? m.homeScore ?? "-",
            awayScore: m.away?.score ?? m.awayScore ?? "-",
            status: m.status || "Scheduled",
            minute: m.minute || undefined,
          });
        }
      }

      if (parsed.length > 0) setMatches(parsed);
    } catch (err) {
      console.error("Live scores error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
    const interval = setInterval(fetchScores, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  if (loading && matches.length === 0) {
    return (
      <div className="bg-card border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-destructive animate-pulse" />
          <span className="text-xs text-muted-foreground">Loading live scores...</span>
        </div>
      </div>
    );
  }

  if (matches.length === 0) return null;

  return (
    <div className="bg-card border-b border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-1.5">
        <Activity className="w-3.5 h-3.5 text-destructive shrink-0" />
        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider shrink-0">Live Scores</span>
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 px-4 pb-2 min-w-max">
          {matches.map((m, i) => (
            <div
              key={i}
              className="flex-shrink-0 bg-muted/50 rounded-lg px-3 py-2 min-w-[160px] border border-border"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-foreground truncate max-w-[55px]">{m.home}</span>
                <span className="text-xs font-black text-primary">
                  {m.homeScore} - {m.awayScore}
                </span>
                <span className="text-[10px] font-semibold text-foreground truncate max-w-[55px] text-right">{m.away}</span>
              </div>
              <div className="text-center mt-0.5">
                <span className={`text-[9px] font-mono ${
                  m.status?.toLowerCase().includes("live") || m.minute
                    ? "text-destructive font-bold"
                    : "text-muted-foreground"
                }`}>
                  {m.minute ? `${m.minute}'` : m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

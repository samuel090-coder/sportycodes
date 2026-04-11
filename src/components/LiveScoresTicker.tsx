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
  competition?: string;
}

const statusMap: Record<string, string> = {
  SCHEDULED: "Upcoming",
  TIMED: "Upcoming",
  IN_PLAY: "LIVE",
  PAUSED: "HT",
  FINISHED: "FT",
  SUSPENDED: "Suspended",
  POSTPONED: "Postponed",
  CANCELLED: "Cancelled",
  AWARDED: "Awarded",
};

export function LiveScoresTicker() {
  const [matches, setMatches] = useState<MatchScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-live-scores", {
        body: null,
        headers: { "Content-Type": "application/json" },
      });

      if (error) {
        console.error("Score fetch error:", error);
        return;
      }

      const parsed: MatchScore[] = [];
      if (data?.matches && Array.isArray(data.matches)) {
        for (const m of data.matches.slice(0, 30)) {
          parsed.push({
            home: m.home || "Home",
            away: m.away || "Away",
            homeScore: m.homeScore ?? "-",
            awayScore: m.awayScore ?? "-",
            status: statusMap[m.status] || m.status || "Scheduled",
            minute: m.minute || undefined,
            competition: m.competition || "",
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
    const interval = setInterval(fetchScores, 60000);
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
          {matches.map((m, i) => {
            const isLive = m.status === "LIVE" || m.status === "HT";
            return (
              <div
                key={i}
                className="flex-shrink-0 bg-muted/50 rounded-lg px-3 py-2 min-w-[160px] border border-border"
              >
                {m.competition && (
                  <p className="text-[8px] text-muted-foreground truncate text-center mb-0.5">{m.competition}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-foreground truncate max-w-[55px]">{m.home}</span>
                  <span className="text-xs font-black text-primary">
                    {m.homeScore} - {m.awayScore}
                  </span>
                  <span className="text-[10px] font-semibold text-foreground truncate max-w-[55px] text-right">{m.away}</span>
                </div>
                <div className="text-center mt-0.5">
                  <span className={`text-[9px] font-mono ${
                    isLive ? "text-destructive font-bold" : "text-muted-foreground"
                  }`}>
                    {m.minute ? `${m.minute}'` : m.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

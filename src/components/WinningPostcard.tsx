import { Trophy, Sparkles, CheckCircle2 } from "lucide-react";

export interface WinSelection {
  home_team: string;
  away_team: string;
  market: string;
  pick: string;
  odds: number;
  outcome?: string;
  final_score?: string;
}

export interface WinningReviewData {
  display_name?: string | null;
  bookmaker?: string | null;
  ticket_id?: string | null;
  verify_code?: string | null;
  bet_type?: string | null;
  total_stake?: number | null;
  total_odds?: number | null;
  total_return?: number | null;
  total_bonus?: number | null;
  selections?: WinSelection[];
  caption?: string | null;
}

const fmt = (n?: number | null) =>
  typeof n === "number" && !isNaN(n)
    ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

export function WinningPostcard({ data }: { data: WinningReviewData }) {
  const sels = data.selections || [];
  return (
    <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden border-2 border-cyber-neon-red/60 shadow-neon-red bg-cyber-dark font-mono">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyber-neon-red via-red-600 to-red-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
          <span className="text-white font-black text-lg tracking-tight">SPORTY CODES</span>
        </div>
        <span className="text-[10px] bg-black/30 text-white px-2 py-0.5 rounded uppercase font-black">WINNER</span>
      </div>

      {/* YOU WON banner */}
      <div className="px-4 pt-5 pb-4 text-center bg-gradient-to-b from-yellow-500/10 to-transparent">
        <Trophy className="w-16 h-16 text-yellow-400 mx-auto drop-shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-pulse" />
        <div className="text-yellow-300 text-xs font-black tracking-[0.3em] mt-2">YOU WON</div>
        <div className="text-cyber-neon-green text-3xl font-black tracking-wider drop-shadow-[0_0_12px_rgba(34,197,94,0.6)] mt-1">
          ₦{fmt(data.total_return)}
        </div>
        {data.display_name && (
          <div className="text-cyber-neon-cyan/80 text-xs mt-2">
            by <span className="font-black text-white">{data.display_name}</span>
          </div>
        )}
      </div>

      {/* Verify code */}
      {data.verify_code && (
        <div className="mx-4 mb-3 rounded-md bg-black/50 border border-cyber-neon-green/40 px-3 py-2 text-center">
          <div className="text-cyber-neon-cyan/60 text-[9px] tracking-[0.2em]">VERIFY CODE</div>
          <div className="text-cyber-neon-green font-black tracking-wider text-sm">{data.verify_code}</div>
        </div>
      )}

      {/* Stats */}
      <div className="mx-4 mb-3 rounded-lg bg-cyber-panel border border-cyber-neon-red/30 grid grid-cols-3 divide-x divide-cyber-neon-red/20">
        <div className="p-2 text-center">
          <div className="text-cyber-neon-cyan/70 text-[9px] uppercase">Stake</div>
          <div className="text-white font-black text-sm">₦{fmt(data.total_stake)}</div>
        </div>
        <div className="p-2 text-center">
          <div className="text-cyber-neon-cyan/70 text-[9px] uppercase">Odds</div>
          <div className="text-white font-black text-sm">{fmt(data.total_odds)}</div>
        </div>
        <div className="p-2 text-center">
          <div className="text-cyber-neon-cyan/70 text-[9px] uppercase">Bonus</div>
          <div className="text-cyber-neon-green font-black text-sm">₦{fmt(data.total_bonus)}</div>
        </div>
      </div>

      {/* Selections */}
      {sels.length > 0 && (
        <div className="px-4 pb-4">
          <div className="text-cyber-neon-red text-xs font-black tracking-widest mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> WINNING PICKS
          </div>
          <div className="space-y-2">
            {sels.map((s, i) => (
              <div key={i} className="rounded-md bg-cyber-panel border border-cyber-neon-green/30 p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-cyber-neon-green font-black text-sm">{s.pick}</span>
                  <span className="text-white font-bold">@{fmt(s.odds)}</span>
                </div>
                <div className="text-white/90 mt-0.5 font-bold">
                  {s.home_team} <span className="text-cyber-neon-cyan/60">vs</span> {s.away_team}
                </div>
                <div className="flex items-center justify-between text-cyber-neon-cyan/70 mt-0.5">
                  <span>{s.market}</span>
                  {s.final_score && <span className="text-cyber-neon-green font-bold">{s.final_score}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.caption && (
        <div className="px-4 pb-3 text-center text-cyber-neon-cyan/80 text-sm italic">
          "{data.caption}"
        </div>
      )}

      <div className="h-1 bg-gradient-to-r from-yellow-400 via-cyber-neon-red to-cyber-neon-green animate-pulse" />
    </div>
  );
}

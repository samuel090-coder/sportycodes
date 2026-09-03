import { Lock, ShieldCheck, CalendarDays, Clock, Trophy } from "lucide-react";

export interface BetslipSelection {
  home_team: string;
  away_team: string;
  market: string;
  pick: string;
  odds: number;
}

export interface BetslipPostcardData {
  bookmaker?: string;
  booking_code: string;
  total_odds: number;
  max_bonus_pct?: number;
  stake?: number;
  bonus?: number;
  payout?: number;
  slip_date?: string;
  /** optional scheduling metadata */
  match_date?: string;
  match_time?: string;
  competition?: string;
  league?: string;
  selections: BetslipSelection[];
}

interface Props {
  data: BetslipPostcardData;
  /** when false, the booking code AND all selections stay protected */
  unlocked?: boolean;
}

const fmt = (n?: number) =>
  typeof n === "number" && !isNaN(n)
    ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

export function BetslipPostcard({ data, unlocked = true }: Props) {
  const meta = [
    data.match_date && { icon: CalendarDays, label: data.match_date },
    data.match_time && { icon: Clock, label: data.match_time },
    (data.competition || data.league) && {
      icon: Trophy,
      label: [data.competition, data.league].filter(Boolean).join(" · "),
    },
  ].filter(Boolean) as { icon: typeof Clock; label: string }[];

  return (
    <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden border-2 border-cyber-neon-red/60 shadow-neon-red bg-cyber-dark font-mono">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyber-neon-red to-red-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-lg tracking-tight drop-shadow">SPORTY CODES</span>
          <span className="text-[10px] bg-black/30 text-white px-1.5 py-0.5 rounded uppercase">Betslip</span>
        </div>
        <div className="text-right text-white text-[11px] leading-tight">
          <div className="opacity-80">Booking</div>
          <div>{data.slip_date || ""}</div>
        </div>
      </div>

      {/* Schedule metadata */}
      {meta.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {meta.map((m, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-cyber-neon-cyan/30 bg-cyber-panel px-2 py-0.5 text-[10px] text-cyber-neon-cyan"
            >
              <m.icon className="h-3 w-3" />
              {m.label}
            </span>
          ))}
        </div>
      )}

      {/* Booking Code */}
      <div className="px-4 pt-5 pb-3 text-center">
        <div className="text-cyber-neon-cyan text-xs tracking-widest opacity-80">BOOKING CODE</div>
        <div className="relative mt-1">
          {unlocked ? (
            <div className="text-cyber-neon-green text-4xl font-black tracking-wider drop-shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-in fade-in zoom-in-95 duration-500">
              {data.booking_code}
            </div>
          ) : (
            <div className="relative inline-block">
              <div className="text-blue-400 text-4xl font-black tracking-wider blur-md select-none">
                {data.booking_code || "XXXXXX"}
              </div>
              <div className="absolute inset-0 flex items-center justify-center gap-1 text-blue-300 text-xs">
                <Lock className="w-3.5 h-3.5" /> LOCKED
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Odds / Bonus */}
      <div className="mx-4 mb-3 rounded-lg bg-cyber-panel border border-cyber-neon-red/30 p-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-cyber-neon-cyan/70 text-[10px] uppercase">Odds</div>
          <div className="text-white font-black text-xl">{fmt(data.total_odds)}</div>
        </div>
        <div className="text-right">
          <div className="text-cyber-neon-cyan/70 text-[10px] uppercase">Max Bonus</div>
          <div className="text-cyber-neon-green font-black text-xl">
            {data.max_bonus_pct ? `${fmt(data.max_bonus_pct)}%` : "—"}
          </div>
        </div>
      </div>

      {/* Stake/Bonus/Payout */}
      <div className="mx-4 mb-3 rounded-lg bg-cyber-panel/60 border border-cyber-neon-cyan/20 divide-y divide-cyber-neon-cyan/10">
        <div className="flex justify-between px-3 py-2 text-sm">
          <span className="text-cyber-neon-cyan/80">Stake</span>
          <span className="text-white font-bold">₦{fmt(data.stake)}</span>
        </div>
        <div className="flex justify-between px-3 py-2 text-sm">
          <span className="text-cyber-neon-cyan/80">Bonus</span>
          <span className="text-white font-bold">₦{fmt(data.bonus)}</span>
        </div>
        <div className="flex justify-between px-3 py-2 text-sm">
          <span className="text-cyber-neon-cyan/80">Payout</span>
          <span className="text-cyber-neon-green font-black">₦{fmt(data.payout)}</span>
        </div>
      </div>

      {/* Selections — fully protected until access is granted */}
      <div className="px-4 pb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-cyber-neon-red text-xs font-black tracking-widest">SELECTIONS</span>
          <span className="text-[10px] text-cyber-neon-cyan/70">
            {data.selections.length} pick{data.selections.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="relative">
          <div
            className={`space-y-2 transition-all duration-700 ${
              unlocked ? "blur-0 opacity-100" : "blur-[7px] opacity-60 select-none pointer-events-none scale-[0.99]"
            }`}
            aria-hidden={!unlocked}
          >
            {data.selections.map((s, i) => (
              <div key={i} className="rounded-md bg-cyber-panel border border-cyber-neon-red/20 p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-cyber-neon-green font-black text-sm">{s.pick}</span>
                  <span className="text-white font-bold">{fmt(s.odds)}</span>
                </div>
                <div className="text-white/90 mt-0.5 font-bold">
                  {s.home_team} <span className="text-cyber-neon-cyan/60">vs</span> {s.away_team}
                </div>
                <div className="text-cyber-neon-cyan/70">{s.market}</div>
              </div>
            ))}
          </div>

          {!unlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-md bg-gradient-to-b from-cyber-dark/40 via-cyber-dark/70 to-cyber-dark/90 backdrop-blur-[2px] animate-in fade-in duration-500">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-cyber-neon-red/60 bg-black/60">
                <span className="absolute inset-0 animate-ping rounded-full border border-cyber-neon-red/40" />
                <ShieldCheck className="h-5 w-5 text-cyber-neon-red" />
              </div>
              <div className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-white">
                Predictions Protected
              </div>
              <div className="mt-0.5 px-6 text-center text-[10px] text-cyber-neon-cyan/80">
                Unlock to reveal every selection, market and odd
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LED bottom strip */}
      <div className="h-1 bg-gradient-to-r from-cyber-neon-red via-cyber-neon-cyan to-cyber-neon-green animate-pulse" />
    </div>
  );
}

import { useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Zap, Volume2, VolumeX, EyeOff, Flame, PartyPopper } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/* ============================================================================
   Message send effects
   ========================================================================== */
export type MsgEffect = "none" | "confetti" | "fireworks" | "slam" | "loud" | "invisible";

export const EFFECT_LABEL: Record<MsgEffect, string> = {
  none: "No effect",
  confetti: "🎉 Confetti",
  fireworks: "🎆 Fireworks",
  slam: "💥 Slam",
  loud: "📢 Loud",
  invisible: "🫥 Invisible ink",
};

/** Wraps the message body with a per-message visual effect. */
export function MessageEffectWrapper({
  effect, children,
}: { effect?: MsgEffect | null; children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  const e = (effect || "none") as MsgEffect;

  if (e === "loud") {
    return (
      <div className="text-xl font-black tracking-wide animate-pulse-glow drop-shadow-[0_0_8px_hsl(var(--primary)/0.9)]">
        {children}
      </div>
    );
  }
  if (e === "slam") {
    return <div className="animate-[fx-slam_0.55s_cubic-bezier(.2,.9,.3,1.4)_1] origin-center">{children}</div>;
  }
  if (e === "invisible") {
    return (
      <span
        onClick={() => setRevealed(true)}
        className={`cursor-pointer transition-all select-none ${
          revealed ? "" : "blur-md bg-muted/60 rounded px-1 text-transparent [text-shadow:0_0_8px_hsl(var(--muted-foreground))]"
        }`}
      >
        {children}
        {!revealed && <span className="ml-1 text-[9px] text-muted-foreground italic">tap to reveal</span>}
      </span>
    );
  }
  return <>{children}</>;
}

/* ============================================================================
   Slash-command parser
   ========================================================================== */
export type ParsedCommand =
  | { kind: "cashrain"; amount?: number }
  | { kind: "roll"; sides: number; result: number }
  | { kind: "flip"; result: "Heads" | "Tails" }
  | { kind: "me"; text: string }
  | { kind: "trivia" }
  | null;

export function parseSlashCommand(raw: string): ParsedCommand {
  const t = raw.trim();
  if (!t.startsWith("/")) return null;
  const [cmd, ...rest] = t.slice(1).split(/\s+/);
  const arg = rest.join(" ");
  switch (cmd.toLowerCase()) {
    case "cashrain": {
      const amount = parseInt(arg, 10);
      return { kind: "cashrain", amount: isNaN(amount) ? undefined : amount };
    }
    case "roll": {
      const sides = Math.min(1000, Math.max(2, parseInt(arg, 10) || 6));
      return { kind: "roll", sides, result: 1 + Math.floor(Math.random() * sides) };
    }
    case "flip":
    case "coinflip":
      return { kind: "flip", result: Math.random() < 0.5 ? "Heads" : "Tails" };
    case "me":
      return { kind: "me", text: arg || "..." };
    case "trivia":
      return { kind: "trivia" };
    default:
      return null;
  }
}

const TRIVIA: { q: string; a: string }[] = [
  { q: "Which country won the 2022 FIFA World Cup?", a: "Argentina 🇦🇷" },
  { q: "Who has the most Ballon d'Or awards?", a: "Lionel Messi (8)" },
  { q: "How many players are on a football pitch (both teams)?", a: "22" },
  { q: "Which club has won the most UCL titles?", a: "Real Madrid" },
  { q: "Who scored the 'Hand of God' goal?", a: "Diego Maradona" },
];
export const randomTrivia = () => TRIVIA[Math.floor(Math.random() * TRIVIA.length)];

/** Turns a parsed slash command into content + metadata for the DB insert. */
export function commandToMessage(cmd: ParsedCommand, displayName: string) {
  if (!cmd) return null;
  switch (cmd.kind) {
    case "roll":
      return { content: `🎲 ${displayName} rolled a ${cmd.result} (d${cmd.sides})`, message_type: "system" };
    case "flip":
      return { content: `🪙 ${displayName} flipped: ${cmd.result}`, message_type: "system" };
    case "me":
      return { content: `✨ ${displayName} ${cmd.text}`, message_type: "system" };
    case "trivia": {
      const t = randomTrivia();
      return { content: `❓ Trivia: ${t.q}\n👉 Answer: ||${t.a}||`, message_type: "system" };
    }
    case "cashrain":
      return {
        content: `💸 ${displayName} triggered CASH RAIN${cmd.amount ? ` (₦${cmd.amount.toLocaleString()})` : ""}!`,
        message_type: "system",
      };
    default:
      return null;
  }
}

/* ============================================================================
   Sound FX
   ========================================================================== */
const SOUND_KEY = "roomfx_sound_on";
export function useSoundFX() {
  const [on, setOn] = useState<boolean>(() => localStorage.getItem(SOUND_KEY) !== "0");
  const ctxRef = useRef<AudioContext | null>(null);
  const getCtx = () => {
    if (!ctxRef.current) {
      const A = (window.AudioContext || (window as any).webkitAudioContext);
      if (A) ctxRef.current = new A();
    }
    return ctxRef.current;
  };
  const play = useCallback((kind: "send" | "coin" | "pop" | "roar") => {
    if (!on) return;
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, now);
    const o = ctx.createOscillator();
    o.connect(g);
    if (kind === "send") {
      o.type = "sine"; o.frequency.setValueAtTime(660, now); o.frequency.exponentialRampToValueAtTime(880, now + 0.09);
      g.gain.exponentialRampToValueAtTime(0.15, now + 0.02); g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      o.start(now); o.stop(now + 0.15);
    } else if (kind === "coin") {
      o.type = "triangle"; o.frequency.setValueAtTime(1200, now); o.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.01); g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      o.start(now); o.stop(now + 0.2);
    } else if (kind === "pop") {
      o.type = "square"; o.frequency.setValueAtTime(440, now); o.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      g.gain.exponentialRampToValueAtTime(0.12, now + 0.01); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      o.start(now); o.stop(now + 0.13);
    } else {
      o.type = "sawtooth"; o.frequency.setValueAtTime(120, now); o.frequency.exponentialRampToValueAtTime(60, now + 0.5);
      g.gain.exponentialRampToValueAtTime(0.15, now + 0.02); g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      o.start(now); o.stop(now + 0.6);
    }
  }, [on]);
  const toggle = () => setOn((v) => { localStorage.setItem(SOUND_KEY, v ? "0" : "1"); return !v; });
  return { on, toggle, play };
}

/* ============================================================================
   Realtime FX bus  (broadcast — no DB writes)
   ========================================================================== */
export type FxEvent =
  | { type: "confetti"; from: string }
  | { type: "fireworks"; from: string }
  | { type: "cashrain"; from: string; amount?: number }
  | { type: "burst"; from: string; emoji: string; x?: number; y?: number };

export function useRoomFXBus(roomId: string | undefined, onEvent: (e: FxEvent) => void) {
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.channel(`room-fx-${roomId}`, {
      config: { broadcast: { self: true } },
    });
    channel.on("broadcast", { event: "fx" }, ({ payload }) => onEvent(payload as FxEvent));
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);
}

export async function sendFx(roomId: string, ev: FxEvent) {
  const ch = supabase.channel(`room-fx-${roomId}`);
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); });
  });
  await ch.send({ type: "broadcast", event: "fx", payload: ev });
  setTimeout(() => supabase.removeChannel(ch), 300);
}

/* ============================================================================
   Confetti / Fireworks / Cash-rain overlay + mascot + late-night dim
   ========================================================================== */
type Particle = { id: number; left: number; delay: number; hue: number; kind: "confetti" | "coin" | "spark" };
let PID = 0;

export function RoomFXLayer({
  active, mascotEmoji = "🐶",
}: { active: { confetti: number; fireworks: number; cashrain: number; bursts: { id: number; emoji: string; x: number; y: number }[] }; mascotEmoji?: string }) {
  const [confetti, setConfetti] = useState<Particle[]>([]);
  const [coins, setCoins] = useState<Particle[]>([]);
  const [sparks, setSparks] = useState<Particle[]>([]);

  // Late-night mode (10pm - 6am)
  const [nightMode, setNightMode] = useState(false);
  useEffect(() => {
    const check = () => {
      const h = new Date().getHours();
      setNightMode(h >= 22 || h < 6);
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!active.confetti) return;
    const batch: Particle[] = Array.from({ length: 60 }).map(() => ({
      id: ++PID, left: Math.random() * 100, delay: Math.random() * 0.5,
      hue: Math.floor(Math.random() * 360), kind: "confetti",
    }));
    setConfetti((c) => [...c, ...batch]);
    const to = setTimeout(() => setConfetti((c) => c.filter((p) => !batch.includes(p))), 3500);
    return () => clearTimeout(to);
  }, [active.confetti]);

  useEffect(() => {
    if (!active.cashrain) return;
    const batch: Particle[] = Array.from({ length: 45 }).map(() => ({
      id: ++PID, left: Math.random() * 100, delay: Math.random() * 1.5,
      hue: 45, kind: "coin",
    }));
    setCoins((c) => [...c, ...batch]);
    const to = setTimeout(() => setCoins((c) => c.filter((p) => !batch.includes(p))), 5000);
    return () => clearTimeout(to);
  }, [active.cashrain]);

  useEffect(() => {
    if (!active.fireworks) return;
    const batch: Particle[] = Array.from({ length: 30 }).map(() => ({
      id: ++PID, left: 10 + Math.random() * 80, delay: Math.random() * 0.6,
      hue: Math.floor(Math.random() * 360), kind: "spark",
    }));
    setSparks((c) => [...c, ...batch]);
    const to = setTimeout(() => setSparks((c) => c.filter((p) => !batch.includes(p))), 2200);
    return () => clearTimeout(to);
  }, [active.fireworks]);

  return (
    <>
      {/* Late-night dim overlay */}
      {nightMode && (
        <div className="pointer-events-none fixed inset-0 z-[45] bg-indigo-950/25 mix-blend-multiply" aria-hidden />
      )}

      {/* FX layer */}
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
        {confetti.map((p) => (
          <span
            key={p.id}
            className="absolute top-[-20px] w-2 h-3 rounded-sm"
            style={{
              left: `${p.left}%`,
              background: `hsl(${p.hue} 90% 60%)`,
              animation: `fx-fall 3.2s ${p.delay}s cubic-bezier(.2,.7,.3,1) forwards`,
            }}
          />
        ))}
        {coins.map((p) => (
          <span
            key={p.id}
            className="absolute top-[-24px] text-lg drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]"
            style={{
              left: `${p.left}%`,
              animation: `fx-fall 4.4s ${p.delay}s linear forwards, fx-spin 1.2s ${p.delay}s linear infinite`,
            }}
          >💵</span>
        ))}
        {sparks.map((p) => (
          <span
            key={p.id}
            className="absolute bottom-[10%] w-1.5 h-1.5 rounded-full"
            style={{
              left: `${p.left}%`,
              background: `hsl(${p.hue} 100% 70%)`,
              boxShadow: `0 0 12px hsl(${p.hue} 100% 65%)`,
              animation: `fx-firework 1.8s ${p.delay}s ease-out forwards`,
            }}
          />
        ))}

        {/* Reaction bursts */}
        {active.bursts.map((b) => (
          <span
            key={b.id}
            className="absolute text-3xl"
            style={{
              left: b.x, top: b.y,
              animation: "fx-burst 1.4s ease-out forwards",
            }}
          >{b.emoji}</span>
        ))}
      </div>

      {/* Mascot */}
      <div
        className="pointer-events-none fixed z-[55] text-3xl select-none"
        style={{
          right: 12, bottom: 96,
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))",
          animation: "fx-mascot 5s ease-in-out infinite",
        }}
        aria-hidden
      >
        {mascotEmoji}
      </div>

      <style>{`
        @keyframes fx-fall {
          0%   { transform: translate3d(0,-40px,0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translate3d(var(--drift,20px), 110vh, 0) rotate(720deg); opacity: 0.9; }
        }
        @keyframes fx-spin { to { transform: rotate(360deg); } }
        @keyframes fx-firework {
          0% { transform: translate(0,0) scale(0.4); opacity: 1; }
          100% { transform: translate(calc((var(--x,0) - 0.5) * 240px), -260px) scale(1); opacity: 0; }
        }
        @keyframes fx-burst {
          0%   { transform: translate(-50%,-50%) scale(0.4); opacity: 0; }
          20%  { transform: translate(-50%,-70%) scale(1.4); opacity: 1; }
          100% { transform: translate(-50%,-260%) scale(0.6); opacity: 0; }
        }
        @keyframes fx-mascot {
          0%,100% { transform: translateY(0) rotate(-4deg); }
          50%     { transform: translateY(-10px) rotate(6deg); }
        }
        @keyframes fx-slam {
          0%   { transform: scale(0.2) rotate(-8deg); opacity: 0; filter: blur(4px); }
          60%  { transform: scale(1.15) rotate(2deg); opacity: 1; filter: blur(0); }
          100% { transform: scale(1) rotate(0); }
        }
      `}</style>
    </>
  );
}

/* ============================================================================
   Composer FX picker (effect + reaction burst + sound toggle + cash rain)
   ========================================================================== */
export function ComposerFXMenu({
  effect, onEffect,
  onCashRain, onBurst,
  soundOn, onToggleSound,
}: {
  effect: MsgEffect;
  onEffect: (e: MsgEffect) => void;
  onCashRain: () => void;
  onBurst: (emoji: string) => void;
  soundOn: boolean;
  onToggleSound: () => void;
}) {
  const emojis = ["🎉", "🔥", "💯", "😂", "⚽", "💸", "👑", "💀"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Effects"
          className="h-8 px-2 shrink-0 rounded-md bg-secondary hover:bg-secondary/70 border border-border flex items-center gap-1"
        >
          <Sparkles className="w-4 h-4 text-primary" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs">Send with effect</DropdownMenuLabel>
        {(Object.keys(EFFECT_LABEL) as MsgEffect[]).map((k) => (
          <DropdownMenuItem key={k} onClick={() => onEffect(k)}>
            <span className="flex-1">{EFFECT_LABEL[k]}</span>
            {effect === k && <span className="text-primary">✓</span>}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">Reaction burst</DropdownMenuLabel>
        <div className="grid grid-cols-8 gap-0.5 px-1 pb-1">
          {emojis.map((e) => (
            <button
              key={e}
              onClick={() => onBurst(e)}
              className="text-lg hover:scale-125 transition-transform"
            >{e}</button>
          ))}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCashRain}>
          <Flame className="w-4 h-4 mr-2 text-yellow-400" /> Trigger cash rain
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleSound}>
          {soundOn ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
          Sound FX: {soundOn ? "On" : "Off"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground leading-snug">
          Tips: <code>/roll</code>, <code>/flip</code>, <code>/cashrain</code>, <code>/me dances</code>, <code>/trivia</code>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

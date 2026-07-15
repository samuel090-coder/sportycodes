import { ReactNode } from "react";

export type FrameDef = {
  id: string;
  name: string;
  emoji: string;
  /** Wrapper around the bubble — hosts border/glow/animation */
  wrapperClass: string;
  /** Inline background bubble class */
  bubbleClass: string;
  /** Extra decorative layer(s) inside wrapper */
  decoration?: ReactNode;
  /** Tag shown behind the mascot emoji */
  emojiHalo: string;
};

/**
 * 14 message frames. Each one differs by shape, border pattern,
 * mascot emoji and animation register — not just color.
 */
export const FRAMES: FrameDef[] = [
  {
    id: "default",
    name: "Classic",
    emoji: "💬",
    wrapperClass: "rounded-2xl",
    bubbleClass: "rounded-2xl px-3 py-2",
    emojiHalo: "bg-secondary",
  },
  {
    id: "neon-cat",
    name: "Neon Cat",
    emoji: "🐱",
    wrapperClass:
      "rounded-2xl p-[2px] frame-anim-neon shadow-[0_0_18px_hsl(var(--cyber-neon-cyan)/0.5)]",
    bubbleClass: "rounded-[14px] px-3 py-2 bg-card",
    emojiHalo: "bg-cyan-500/30 ring-2 ring-cyan-400/60",
  },
  {
    id: "puppy-love",
    name: "Puppy Love",
    emoji: "🐶",
    wrapperClass:
      "rounded-3xl p-[2px] bg-gradient-to-br from-pink-400 via-rose-500 to-pink-600 frame-anim-heartbeat",
    bubbleClass: "rounded-[22px] px-3 py-2 bg-pink-950/50",
    emojiHalo: "bg-pink-500/30 ring-2 ring-pink-400/60",
  },
  {
    id: "dragon-fire",
    name: "Dragon Fire",
    emoji: "🐉",
    wrapperClass:
      "rounded-2xl p-[2px] bg-[conic-gradient(from_0deg,#f59e0b,#ef4444,#f97316,#f59e0b)] frame-anim-flame",
    bubbleClass: "rounded-[14px] px-3 py-2 bg-stone-950/80",
    emojiHalo: "bg-orange-500/40 ring-2 ring-orange-400/60",
  },
  {
    id: "star-burst",
    name: "Star Burst",
    emoji: "⭐",
    wrapperClass:
      "rounded-2xl p-[2px] bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 frame-anim-shine",
    bubbleClass: "rounded-[14px] px-3 py-2 bg-yellow-950/40",
    decoration: (
      <>
        <span className="absolute -top-1 -right-1 text-xs frame-spin-slow">✨</span>
        <span className="absolute -bottom-1 -left-1 text-[10px] frame-spin-slow" style={{ animationDirection: "reverse" }}>✨</span>
      </>
    ),
    emojiHalo: "bg-yellow-500/30 ring-2 ring-yellow-400/60",
  },
  {
    id: "arcade",
    name: "Arcade",
    emoji: "👾",
    wrapperClass:
      "rounded-none p-[2px] border-2 border-dashed border-lime-400 frame-anim-marchingants bg-lime-950/40",
    bubbleClass: "rounded-none px-3 py-2 bg-black/70 font-mono",
    emojiHalo: "bg-lime-500/30 ring-2 ring-lime-400/60 rounded-none",
  },
  {
    id: "bubble-tea",
    name: "Bubble Tea",
    emoji: "🧋",
    wrapperClass:
      "rounded-[28px] p-[2px] bg-gradient-to-br from-amber-300 to-orange-400 frame-anim-bounce",
    bubbleClass: "rounded-[26px] px-3 py-2 bg-amber-950/40",
    emojiHalo: "bg-amber-500/40 ring-2 ring-amber-300/60",
  },
  {
    id: "galaxy",
    name: "Galaxy",
    emoji: "🌌",
    wrapperClass:
      "rounded-2xl p-[2px] bg-[conic-gradient(from_0deg,#7c3aed,#3b82f6,#ec4899,#7c3aed)] frame-anim-spin-conic",
    bubbleClass:
      "rounded-[14px] px-3 py-2 bg-slate-950/80 relative overflow-hidden",
    decoration: (
      <span className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:12px_12px]" />
    ),
    emojiHalo: "bg-indigo-500/40 ring-2 ring-fuchsia-400/60",
  },
  {
    id: "matrix",
    name: "Matrix",
    emoji: "🖥️",
    wrapperClass:
      "rounded-md p-[2px] bg-green-500/50 shadow-[0_0_20px_hsl(142_84%_55%/0.5)]",
    bubbleClass:
      "rounded-sm px-3 py-2 bg-black/90 font-mono text-green-300 relative overflow-hidden frame-anim-scanlines",
    emojiHalo: "bg-green-600/40 ring-2 ring-green-400/60 rounded-md",
  },
  {
    id: "royal",
    name: "Royal Gold",
    emoji: "👑",
    wrapperClass:
      "rounded-lg p-[3px] bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600 outline outline-1 outline-yellow-200/40 outline-offset-[3px] frame-anim-shine",
    bubbleClass: "rounded-md px-3 py-2 bg-amber-950/60",
    emojiHalo: "bg-amber-400/50 ring-2 ring-yellow-200/70",
  },
  {
    id: "love-note",
    name: "Love Note",
    emoji: "💌",
    wrapperClass:
      "rounded-tl-3xl rounded-br-3xl rounded-tr-md rounded-bl-md p-[2px] bg-gradient-to-br from-red-400 via-rose-500 to-red-600 frame-anim-heartbeat",
    bubbleClass:
      "rounded-tl-[22px] rounded-br-[22px] rounded-tr-sm rounded-bl-sm px-3 py-2 bg-red-950/50",
    emojiHalo: "bg-rose-500/40 ring-2 ring-rose-300/60",
  },
  {
    id: "holo",
    name: "Holographic",
    emoji: "🦄",
    wrapperClass:
      "rounded-2xl p-[2px] frame-anim-holo",
    bubbleClass: "rounded-[14px] px-3 py-2 bg-slate-900/70",
    emojiHalo: "bg-fuchsia-500/30 ring-2 ring-cyan-300/60",
  },
  {
    id: "frost",
    name: "Frost",
    emoji: "❄️",
    wrapperClass:
      "rounded-2xl p-[2px] bg-gradient-to-br from-sky-200 via-cyan-400 to-blue-500 shadow-[0_0_18px_hsl(200_100%_70%/0.4)] frame-anim-frost",
    bubbleClass:
      "rounded-[14px] px-3 py-2 bg-sky-950/50 backdrop-blur",
    decoration: (
      <span className="pointer-events-none absolute top-1 right-2 text-[10px] opacity-70 frame-anim-float">❄</span>
    ),
    emojiHalo: "bg-sky-500/40 ring-2 ring-cyan-200/70",
  },
  {
    id: "cyber-skull",
    name: "Cyber Skull",
    emoji: "💀",
    wrapperClass:
      "rounded-lg p-[2px] bg-gradient-to-br from-red-500 via-red-700 to-red-900 frame-anim-glitch shadow-[0_0_18px_hsl(0_100%_60%/0.5)]",
    bubbleClass:
      "rounded-md px-3 py-2 bg-black/85 font-mono text-red-100",
    emojiHalo: "bg-red-600/50 ring-2 ring-red-300/60 rounded-md",
  },
];

export const getFrame = (id?: string | null): FrameDef =>
  FRAMES.find((f) => f.id === id) || FRAMES[0];

/**
 * Renders framed message bubble with mascot emoji tab at the head.
 * children = message content.
 */
export const FramedBubble = ({
  frameId,
  children,
  align = "left",
  onDoubleClick,
}: {
  frameId?: string | null;
  children: ReactNode;
  align?: "left" | "right";
  onDoubleClick?: () => void;
}) => {
  const f = getFrame(frameId);

  if (f.id === "default") {
    return (
      <div
        onDoubleClick={onDoubleClick}
        className={`rounded-2xl px-3 py-2 text-sm select-none ${
          align === "right"
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-foreground rounded-bl-md"
        }`}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="relative pt-3" onDoubleClick={onDoubleClick}>
      {/* Mascot tab */}
      <div
        className={`absolute -top-1 ${
          align === "right" ? "right-2" : "left-2"
        } z-10 w-7 h-7 rounded-full ${f.emojiHalo} flex items-center justify-center text-base shadow-md frame-anim-float`}
      >
        <span>{f.emoji}</span>
      </div>
      <div className={`relative ${f.wrapperClass}`}>
        <div className={`relative text-sm ${f.bubbleClass}`}>
          {f.decoration}
          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
};

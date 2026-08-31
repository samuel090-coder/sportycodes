import { useEffect, useState } from "react";

const TIPS = [
  "Syncing live odds…",
  "Loading winning codes…",
  "Securing your wallet…",
  "Warming up the pitch…",
];

const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const raf = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / 2400) * 100);
      setProgress(pct);
    }, 40);
    const tipTimer = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 700);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 600);
    }, 2500);

    return () => {
      clearInterval(raf);
      clearInterval(tipTimer);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-bet-dark transition-all duration-500 ${
        isVisible ? "opacity-100" : "opacity-0 scale-105"
      }`}
    >
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-pulse" />
      <div
        className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl animate-pulse"
        style={{ animationDelay: "0.8s" }}
      />

      {/* Grid floor */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at 50% 45%, black, transparent 70%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 45%, black, transparent 70%)",
        }}
      />

      {/* Scanline sweep */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full">
        <div className="loader-sweep absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-primary/10 to-transparent" />
      </div>

      <div className="relative text-center px-8">
        {/* Orbiting ring emblem */}
        <div className="relative mx-auto mb-8 h-28 w-28">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-t-2 border-primary loader-spin" />
          <div
            className="absolute inset-2 rounded-full border-b-2 border-accent loader-spin-reverse"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-14 w-14 rounded-full bg-gradient-primary shadow-[var(--shadow-bet)] flex items-center justify-center loader-breathe">
              <span className="text-xl font-black text-primary-foreground">SC</span>
            </div>
          </div>
        </div>

        {/* Wordmark */}
        <h1 className="relative text-4xl sm:text-5xl font-black tracking-tight mb-1">
          <span className="bg-gradient-primary bg-clip-text text-transparent">SPORTY</span>{" "}
          <span className="text-foreground">CODES</span>
          <span className="loader-shine absolute inset-0 bg-gradient-to-r from-transparent via-foreground/25 to-transparent bg-clip-text text-transparent">
            SPORTY CODES
          </span>
        </h1>
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground mb-8">
          Smart bets. Real wins.
        </p>

        {/* Progress bar */}
        <div className="mx-auto h-1.5 w-56 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-primary transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p key={tip} className="mt-4 text-sm text-muted-foreground animate-fade-in">
          {TIPS[tip]}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;

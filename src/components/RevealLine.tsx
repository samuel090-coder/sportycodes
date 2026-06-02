import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";

interface RevealLineProps {
  visible: boolean;
  loading?: boolean;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  copyable?: boolean;
}

export function RevealLine({ visible, loading, label, value, mono, highlight, copyable }: RevealLineProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <div className="min-h-[28px] flex items-center justify-between gap-2">
        {visible ? (
          <>
            <p
              className={`animate-fade-in flex-1 ${mono ? "font-mono" : ""} ${
                highlight ? "text-2xl font-black text-primary" : "text-foreground font-semibold text-base"
              }`}
            >
              {value}
            </p>
            {copyable && (
              <button
                onClick={copy}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                aria-label="Copy"
              >
                {copied ? <Check className="w-4 h-4 text-bet-success" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </>
        ) : loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span className="font-mono tracking-widest animate-pulse">
              {"•".repeat(Math.min(value.length, 14))}
            </span>
          </div>
        ) : (
          <div className="h-5 w-32 rounded bg-secondary/40 animate-pulse" />
        )}
      </div>
    </div>
  );
}

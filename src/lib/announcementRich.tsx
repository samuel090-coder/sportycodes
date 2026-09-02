import React, { useEffect, useState } from "react";

/**
 * Lightweight rich-text markup used by the announcement system.
 * The SAME parser powers the admin preview and the live user-facing
 * announcement surfaces, so what an admin sees is exactly what ships.
 *
 * Block syntax (one per line):
 *   # Title            -> large heading
 *   ## Subtitle        -> medium heading
 *   ### Small title    -> small heading
 *   > Quote            -> quote block
 *   - Item             -> bullet list
 *   1. Item            -> numbered list
 *   ---                -> divider
 *   !info: text        -> callout (info | success | warn | error | promo)
 *   [Label](https://)  -> button
 *   ![](https://img)   -> image
 *   @@countdown:2026-09-10T18:00@@ -> live countdown
 *
 * Inline syntax:
 *   **bold**  *italic*  ==highlight==  `code`  [[Badge]]
 */

export const RICH_HELP = `# Big title
## Subtitle
Normal text with **bold**, *italic*, ==highlight== and [[BADGE]]
- bullet item
1. numbered item
> a quote
!info: callout box
---
![](https://image-url)
[Claim now](https://link)
@@countdown:2026-12-31T20:00@@`;

const CALLOUT_STYLES: Record<string, string> = {
  info: "border-primary/40 bg-primary/10 text-foreground",
  success: "border-emerald-500/40 bg-emerald-500/10 text-foreground",
  warn: "border-amber-500/40 bg-amber-500/10 text-foreground",
  error: "border-destructive/40 bg-destructive/10 text-foreground",
  promo: "border-primary/50 bg-gradient-to-r from-primary/20 to-transparent text-foreground",
};

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|==[^=]+==|`[^`]+`|\[\[[^\]]+\]\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    const key = `${keyBase}-i${i++}`;
    if (token.startsWith("**")) {
      nodes.push(<strong key={key} className="font-black">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("==")) {
      nodes.push(
        <mark key={key} className="rounded px-1 py-0.5 bg-primary/25 text-current font-semibold">
          {token.slice(2, -2)}
        </mark>
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[[")) {
      nodes.push(
        <span
          key={key}
          className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[0.7em] font-black uppercase tracking-wider text-primary-foreground align-middle"
        >
          {token.slice(2, -2)}
        </span>
      );
    } else {
      nodes.push(<em key={key} className="italic opacity-90">{token.slice(1, -1)}</em>);
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const Countdown = ({ target }: { target: string }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  if (isNaN(diff)) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const mn = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const cell = (v: number, l: string) => (
    <div className="flex min-w-[3rem] flex-col items-center rounded-lg border border-primary/30 bg-black/30 px-2 py-1">
      <span className="font-mono text-lg font-black leading-none">{String(v).padStart(2, "0")}</span>
      <span className="text-[0.6rem] uppercase tracking-widest opacity-70">{l}</span>
    </div>
  );
  return (
    <div className="my-2 flex flex-wrap gap-2">
      {cell(d, "days")}
      {cell(h, "hrs")}
      {cell(mn, "min")}
      {cell(s, "sec")}
    </div>
  );
};

export interface RichProps {
  content: string;
  className?: string;
  /** compact mode trims spacing for banners/toasts */
  compact?: boolean;
}

export const RichAnnouncement = ({ content, className = "", compact = false }: RichProps) => {
  if (!content?.trim()) return null;
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!list) return;
    const items = list.items.map((it, i) => (
      <li key={`${key}-li${i}`} className="leading-relaxed">
        {renderInline(it, `${key}-li${i}`)}
      </li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={key} className="my-1 list-decimal space-y-1 pl-5 marker:font-bold marker:text-primary">
          {items}
        </ol>
      ) : (
        <ul key={key} className="my-1 list-disc space-y-1 pl-5 marker:text-primary">
          {items}
        </ul>
      )
    );
    list = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    const key = `b${idx}`;

    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (!list || list.ordered !== ordered) {
        flushList(`${key}-list`);
        list = { ordered, items: [] };
      }
      list.items.push((bullet ? bullet[1] : numbered![1]) || "");
      return;
    }
    flushList(`${key}-list`);

    if (!line) {
      if (!compact) blocks.push(<div key={key} className="h-1" />);
      return;
    }
    if (/^---+$/.test(line)) {
      blocks.push(
        <div key={key} className="my-3 h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      );
      return;
    }
    const cd = line.match(/^@@countdown:(.+)@@$/);
    if (cd) {
      blocks.push(<Countdown key={key} target={cd[1].trim()} />);
      return;
    }
    const img = line.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
    if (img) {
      blocks.push(
        <img
          key={key}
          src={img[1]}
          alt=""
          loading="lazy"
          className="my-2 w-full rounded-xl border border-border/60 object-cover shadow-lg"
        />
      );
      return;
    }
    const btn = line.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (btn) {
      blocks.push(
        <a
          key={key}
          href={btn[2]}
          target={btn[2].startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="my-2 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-black uppercase tracking-wide text-primary-foreground shadow-lg transition-transform hover:scale-[1.03] active:scale-95"
        >
          {btn[1]}
        </a>
      );
      return;
    }
    const callout = line.match(/^!(info|success|warn|error|promo):\s*(.*)$/i);
    if (callout) {
      const tone = callout[1].toLowerCase();
      blocks.push(
        <div key={key} className={`my-2 rounded-xl border-l-4 px-3 py-2 text-sm ${CALLOUT_STYLES[tone]}`}>
          {renderInline(callout[2], key)}
        </div>
      );
      return;
    }
    if (line.startsWith("> ")) {
      blocks.push(
        <blockquote key={key} className="my-2 border-l-4 border-primary/60 pl-3 italic opacity-90">
          {renderInline(line.slice(2), key)}
        </blockquote>
      );
      return;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const size = h[1].length;
      const cls =
        size === 1
          ? "text-xl sm:text-2xl font-black tracking-tight"
          : size === 2
          ? "text-base sm:text-lg font-bold"
          : "text-sm font-bold uppercase tracking-wider opacity-90";
      blocks.push(
        <div key={key} className={`${cls} ${compact ? "" : "mt-1"}`}>
          {renderInline(h[2], key)}
        </div>
      );
      return;
    }
    blocks.push(
      <p key={key} className="text-sm leading-relaxed sm:text-[0.95rem]">
        {renderInline(line, key)}
      </p>
    );
  });
  flushList("tail-list");

  return <div className={`${compact ? "space-y-0.5" : "space-y-1.5"} ${className}`}>{blocks}</div>;
};

/** Plain-text flattening for one-line surfaces (banner/toast collapsed state). */
export const richToPlain = (content: string) =>
  (content || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) =>
      l
        .replace(/^@@countdown:.*@@$/, "")
        .replace(/^!\[[^\]]*\]\([^)]+\)$/, "")
        .replace(/^#{1,3}\s+/, "")
        .replace(/^[-*]\s+/, "• ")
        .replace(/^>\s+/, "")
        .replace(/^!(info|success|warn|error|promo):\s*/i, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\[\[([^\]]+)\]\]/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/==([^=]+)==/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .trim()
    )
    .filter(Boolean)
    .join(" · ");

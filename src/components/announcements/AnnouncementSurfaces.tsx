import { X, ExternalLink, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichAnnouncement, richToPlain } from "@/lib/announcementRich";

export interface AnnouncementView {
  id?: string;
  title: string;
  content: string;
  bg_color?: string | null;
  text_color?: string | null;
  link_url?: string | null;
  link_text?: string | null;
  image_url?: string | null;
  is_dismissible?: boolean | null;
}

const accent = (a: AnnouncementView) => a.bg_color || "hsl(var(--primary))";
const onAccent = (a: AnnouncementView) => a.text_color || "hsl(var(--primary-foreground))";

const LinkOut = ({ a, className }: { a: AnnouncementView; className?: string }) =>
  a.link_url ? (
    <a
      href={a.link_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:opacity-80 ${className || ""}`}
    >
      {a.link_text || "Learn More"}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  ) : null;

/* ------------------------------- BANNER ------------------------------- */
export const AnnouncementBannerView = ({
  a,
  onDismiss,
}: {
  a: AnnouncementView;
  onDismiss?: () => void;
}) => {
  const multiline = /\n/.test((a.content || "").trim()) || !!a.image_url;
  return (
    <div
      className="relative w-full overflow-hidden px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-500"
      style={{ backgroundColor: accent(a), color: onAccent(a) }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
      <div
        className={`relative mx-auto flex w-full max-w-3xl gap-3 ${
          multiline ? "flex-col" : "items-center justify-center text-center"
        } ${a.is_dismissible ? "pr-7" : ""}`}
      >
        <div className={`flex items-center gap-2 ${multiline ? "" : "shrink-0"}`}>
          <Megaphone className="h-4 w-4 shrink-0 animate-pulse" />
          <span className="text-sm font-black tracking-tight sm:text-base">{a.title}</span>
        </div>
        {multiline ? (
          <RichAnnouncement content={a.content} compact />
        ) : (
          <span className="text-xs opacity-95 sm:text-sm">{richToPlain(a.content)}</span>
        )}
        <LinkOut a={a} className="text-xs sm:text-sm" />
      </div>
      {a.is_dismissible && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss announcement"
          className="absolute right-2 top-2 rounded-full p-1 transition hover:bg-white/20"
          style={{ color: onAccent(a) }}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

/* -------------------------------- POPUP ------------------------------- */
export const AnnouncementPopupBody = ({
  a,
  counter,
  onDismiss,
  onClose,
}: {
  a: AnnouncementView;
  counter?: string;
  onDismiss?: () => void;
  onClose?: () => void;
}) => (
  <div className="overflow-hidden rounded-2xl">
    <div
      className="relative flex items-center gap-3 px-5 py-4"
      style={{ backgroundColor: accent(a), color: onAccent(a) }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_65%)]" />
      <Megaphone className="relative h-5 w-5 shrink-0" />
      <span className="relative text-base font-black tracking-tight sm:text-lg">{a.title}</span>
    </div>

    {a.image_url && (
      <img src={a.image_url} alt="" loading="lazy" className="max-h-52 w-full object-cover" />
    )}

    <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
      <RichAnnouncement content={a.content} />
      <LinkOut a={a} className="mt-3 text-sm text-primary" />
    </div>

    <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
      {counter ? <span className="text-xs text-muted-foreground">{counter}</span> : <span />}
      <div className="flex gap-2">
        {a.is_dismissible && (
          <Button variant="outline" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
        <Button
          size="sm"
          onClick={onClose}
          className="font-bold"
          style={{ backgroundColor: accent(a), color: onAccent(a) }}
        >
          Got it
        </Button>
      </div>
    </div>
  </div>
);

/* -------------------------------- TOAST ------------------------------- */
export const AnnouncementToastView = ({
  a,
  onDismiss,
}: {
  a: AnnouncementView;
  onDismiss?: () => void;
}) => (
  <div
    className="relative w-full max-w-sm overflow-hidden rounded-xl border-2 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500"
    style={{ backgroundColor: accent(a), color: onAccent(a), borderColor: accent(a) }}
  >
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.18),transparent_60%)]" />
    <div className="relative p-4 pr-8">
      <div className="mb-1 flex items-center gap-2 text-sm font-black">
        <Megaphone className="h-4 w-4" />
        {a.title}
      </div>
      <div className="text-xs opacity-95">
        <RichAnnouncement content={a.content} compact />
      </div>
      <LinkOut a={a} className="mt-2 text-xs" />
    </div>
    {onDismiss && (
      <button
        onClick={onDismiss}
        aria-label="Close"
        className="absolute right-1.5 top-1.5 rounded-full p-1 transition hover:bg-white/20"
        style={{ color: onAccent(a) }}
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
);

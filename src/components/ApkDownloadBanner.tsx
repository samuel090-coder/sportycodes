import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X, Smartphone, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DISMISS_KEY = "apk_banner_dismissed_v1";
const SESSION_KEY = "apk_banner_session_shown";

interface ApkSettings {
  enabled: boolean;
  url: string;
  title: string;
  text: string;
  version: string;
}

const ApkDownloadBanner = () => {
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [settings, setSettings] = useState<ApkSettings | null>(null);

  useEffect(() => {
    // Don't show on admin/install/reset routes
    const path = window.location.pathname;
    if (path.startsWith("/admin") || path === "/install" || path === "/reset-password") return;

    // Permanent dismiss
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    // Session-shown guard (avoid re-opening on every route change in same tab)
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "apk_banner_enabled",
          "apk_download_url",
          "apk_banner_title",
          "apk_banner_text",
          "apk_version",
        ]);

      if (cancelled || !data) return;
      const map = Object.fromEntries(data.map((d: any) => [d.setting_key, d.setting_value]));
      const cfg: ApkSettings = {
        enabled: (map.apk_banner_enabled ?? "true") === "true",
        url: map.apk_download_url ?? "",
        title: map.apk_banner_title ?? "Get the SPORTY CODES App",
        text:
          map.apk_banner_text ??
          "Download the official Android APK for the fastest experience.",
        version: map.apk_version ?? "1.0.0",
      };
      if (!cfg.enabled || !cfg.url) return;

      setSettings(cfg);
      // Slight delay so it feels intentional
      setTimeout(() => {
        sessionStorage.setItem(SESSION_KEY, "1");
        setOpen(true);
      }, 4000);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => {
    if (dontShow) localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  const handleDownload = async () => {
    if (!settings?.url) return;
    setDownloading(true);
    try {
      // Trigger download
      const a = document.createElement("a");
      a.href = settings.url;
      a.download = `sporty-codes-${settings.version}.apk`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Download started", { description: "Check your notifications/downloads." });
      setTimeout(() => {
        setDownloading(false);
        close();
      }, 1200);
    } catch (e) {
      setDownloading(false);
      toast.error("Download failed. Please try again.");
    }
  };

  if (!open || !settings) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        {/* Glow ring */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary via-red-500 to-primary opacity-60 blur-xl animate-pulse" />

        <div className="relative rounded-3xl border border-primary/40 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Top gradient strip */}
          <div className="h-1.5 bg-gradient-to-r from-primary via-red-500 to-primary" />

          {/* Close */}
          <button
            onClick={close}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/60 hover:bg-background text-muted-foreground hover:text-foreground transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 pt-7 text-center space-y-4">
            {/* Animated phone icon */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-red-700 flex items-center justify-center shadow-lg shadow-primary/40">
                <Smartphone className="w-10 h-10 text-white" />
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-card flex items-center justify-center">
                  <Download className="w-3.5 h-3.5 text-white" />
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                {settings.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {settings.text}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-primary/80 font-mono pt-1">
                v{settings.version} · Android APK
              </p>
            </div>

            {/* Perks */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { icon: Zap, label: "Faster" },
                { icon: ShieldCheck, label: "Secure" },
                { icon: CheckCircle2, label: "Verified" },
              ].map((p) => (
                <div
                  key={p.label}
                  className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-secondary/30 py-2"
                >
                  <p.icon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-semibold text-foreground/80">
                    {p.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Download button */}
            <Button
              onClick={handleDownload}
              disabled={downloading}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-red-600 hover:opacity-90 text-white font-bold shadow-lg shadow-primary/30 h-12"
            >
              {downloading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Starting download...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Download APK
                </span>
              )}
            </Button>

            {/* Don't show again */}
            <label className="flex items-center justify-center gap-2 pt-1 cursor-pointer select-none">
              <Checkbox
                checked={dontShow}
                onCheckedChange={(v) => setDontShow(v === true)}
                id="apk-dont-show"
              />
              <span className="text-xs text-muted-foreground">
                Do not show again
              </span>
            </label>

            <button
              onClick={close}
              className="text-xs text-muted-foreground/70 hover:text-foreground underline-offset-2 hover:underline"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ApkDownloadBanner;

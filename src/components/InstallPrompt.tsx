import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket, Zap, Gauge, Bell } from "lucide-react";

const SNOOZE_KEY = "sc_install_snoozed_at";
/** re-ask 30 minutes after "Maybe Later", and on every new visit */
const SNOOZE_MS = 30 * 60 * 1000;

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true ||
  document.referrer.includes("android-app://");

/**
 * Custom PWA install experience: intercepts the browser prompt and shows an
 * on-brand centered modal. If the device/browser can't install, nothing is
 * shown and the user keeps browsing normally.
 */
export const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      const snoozed = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      if (Date.now() - snoozed > SNOOZE_MS) {
        setTimeout(() => setOpen(true), 2500);
      } else {
        // try again once the snooze window elapses within this session
        const wait = SNOOZE_MS - (Date.now() - snoozed);
        setTimeout(() => setOpen(true), Math.min(wait, SNOOZE_MS));
      }
    };

    const onInstalled = () => {
      setOpen(false);
      setDeferred(null);
      localStorage.removeItem(SNOOZE_KEY);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setOpen(false);
        setDeferred(null);
      } else {
        localStorage.setItem(SNOOZE_KEY, String(Date.now()));
        setOpen(false);
      }
    } finally {
      setInstalling(false);
    }
  };

  const later = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setOpen(false);
  };

  if (!deferred) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : later())}>
      <DialogContent className="max-w-[22rem] overflow-hidden rounded-2xl border-2 border-primary/40 p-0 sm:max-w-sm">
        <div className="relative bg-gradient-to-br from-primary to-red-800 px-5 py-6 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_60%)]" />
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black/30 shadow-lg">
            <span className="absolute inset-0 animate-ping rounded-2xl border border-white/30" />
            <Rocket className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="relative mt-3 text-lg font-black tracking-tight text-primary-foreground">
            Experience Sport Codes Faster
          </h2>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p className="text-center text-sm leading-relaxed text-muted-foreground">
            Browser mode is slower and limits your experience. Install the Sport Codes app to enjoy
            faster loading, quicker updates, better performance, and a smoother experience.
          </p>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { icon: Zap, label: "Instant" },
              { icon: Gauge, label: "Faster" },
              { icon: Bell, label: "Alerts" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-xl border border-border bg-muted/40 py-2">
                <Icon className="mx-auto h-4 w-4 text-primary" />
                <div className="mt-1 text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Button
              onClick={install}
              disabled={installing}
              className="h-11 w-full rounded-xl text-sm font-black uppercase tracking-wide"
            >
              {installing ? "Opening installer…" : "Install Now"}
            </Button>
            <Button onClick={later} variant="ghost" className="h-9 w-full text-xs text-muted-foreground">
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstallPrompt;

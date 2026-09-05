import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket, Zap, Gauge, Bell, RefreshCw } from "lucide-react";

const SNOOZE_KEY = "sc_install_snoozed_at";
/** re-ask 30 minutes after "Exit", and on every new visit */
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
      const elapsed = Date.now() - snoozed;
      // Always re-ask on a new visit; within the same session wait out the snooze.
      const delay = elapsed > SNOOZE_MS ? 2000 : Math.min(SNOOZE_MS - elapsed, SNOOZE_MS);
      const t = setTimeout(() => setOpen(true), delay);
      return () => clearTimeout(t);
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
      // Fire the browser's native installer right away — no navigation.
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setOpen(false);
        setDeferred(null);
      } else {
        localStorage.setItem(SNOOZE_KEY, String(Date.now()));
        setOpen(false);
      }
    } catch {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
      setOpen(false);
    } finally {
      setInstalling(false);
    }
  };

  const exit = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setOpen(false);
  };

  // Browsers/devices without install support never see this modal.
  if (!deferred) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : exit())}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[20rem] overflow-hidden rounded-2xl border-2 border-primary/40 p-0 duration-300 sm:max-w-sm">
        <div className="relative bg-gradient-to-br from-primary to-red-800 px-5 py-5 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_60%)]" />
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black/30 shadow-lg">
            <span className="absolute inset-0 animate-ping rounded-2xl border border-white/30" />
            <Rocket className="h-7 w-7 animate-bounce text-primary-foreground" />
          </div>
          <h2 className="relative mt-3 text-base font-black tracking-tight text-primary-foreground">
            Install Sporty Codes
          </h2>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Browsing in the browser is slower. The installed app loads faster, performs better,
            updates quicker and gives you a smoother experience.
          </p>

          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              { icon: Zap, label: "Faster" },
              { icon: Gauge, label: "Smooth" },
              { icon: RefreshCw, label: "Updates" },
              { icon: Bell, label: "Alerts" },
            ].map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className="animate-fade-in rounded-xl border border-border bg-muted/40 py-2"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Icon className="mx-auto h-4 w-4 text-primary" />
                <div className="mt-1 text-[0.6rem] font-bold uppercase tracking-wide text-muted-foreground">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Button
              onClick={install}
              disabled={installing}
              className="h-11 w-full rounded-xl text-sm font-black uppercase tracking-wide transition-transform active:scale-95"
            >
              {installing ? "Opening installer…" : "Install Now"}
            </Button>
            <Button onClick={exit} variant="ghost" className="h-9 w-full text-xs text-muted-foreground">
              Exit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstallPrompt;

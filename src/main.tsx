import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "@/integrations/supabase/client";

// Keep Realtime authenticated so postgres_changes subscriptions receive
// events immediately after login (without requiring a browser refresh).
supabase.auth.getSession().then(({ data }) => {
  if (data.session?.access_token) {
    supabase.realtime.setAuth(data.session.access_token);
  }
});
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.access_token) {
    supabase.realtime.setAuth(session.access_token);
  }
});


// Register push service worker on app startup (works everywhere)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js", { updateViaCache: "none" })
    .then((registration) => {
      console.log("Service Worker registered on startup:", registration);
      // Proactively check for updates (important after SW strategy changes)
      registration.update().catch(() => {});
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
}

// The generated caching worker (/pwa-sw.js) shares the "/" scope with our push
// worker (/sw.js) and would take over the registration, silently killing push
// notifications. Keep /sw.js as the only worker and remove any stale copy.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs
      .filter((r) => (r.active || r.waiting || r.installing)?.scriptURL.includes("/pwa-sw.js"))
      .forEach((r) => r.unregister());
  });
}

createRoot(document.getElementById("root")!).render(<App />);

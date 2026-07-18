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


// Register service worker on app startup
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

createRoot(document.getElementById("root")!).render(<App />);

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

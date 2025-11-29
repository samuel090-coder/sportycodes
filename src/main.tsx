import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker on app startup
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('Service Worker registered on startup:', registration);
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
    });
}

createRoot(document.getElementById("root")!).render(<App />);

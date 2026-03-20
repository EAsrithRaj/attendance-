import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      console.log("SW registered:", reg.scope);

      // Send stored settings to SW on registration
      const enabled = localStorage.getItem("notificationsEnabled");
      const time = localStorage.getItem("notificationTime") || "07:00";
      const subjects = localStorage.getItem("notificationSubjects");

      if (reg.active) {
        reg.active.postMessage({
          type: "UPDATE_SETTINGS",
          enabled: enabled !== "false",
          time,
          subjects: subjects ? JSON.parse(subjects) : null,
        });
      }
    });

    // Listen for data requests from SW
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "REQUEST_NOTIFICATION_DATA") {
        navigator.serviceWorker.controller?.postMessage({
          type: "NOTIFICATION_DATA",
          subjects: localStorage.getItem("subjects") || "[]",
          records: localStorage.getItem("attendanceRecords") || "[]",
        });
      }
    });
  });

  // Request notification permission after 3s delay
  setTimeout(() => {
    const stored = localStorage.getItem("notificationPermission");
    if (stored === "denied") return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        localStorage.setItem("notificationPermission", perm);
      });
    }
  }, 3000);
}

createRoot(document.getElementById("root")!).render(<App />);

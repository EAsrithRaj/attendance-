// Attendance Tracker Service Worker

let notificationTimer = null;

function getSettings() {
  // Service workers don't have localStorage access directly,
  // but we can use clients to request data or read from cache.
  // For simplicity, we'll receive settings via postMessage.
  return self._notifSettings || {
    enabled: true,
    time: "07:00",
    subjects: null, // null means all enabled
  };
}

function computeStats(subjects, records) {
  const results = [];
  for (const sub of subjects) {
    const subRecords = records.filter(
      (r) => r.subjectId === sub.id && r.status !== "CANCELLED"
    );
    let total = 0;
    let attended = 0;
    for (const r of subRecords) {
      total += r.weightSnapshot;
      if (r.status === "PRESENT") attended += r.weightSnapshot;
    }
    const pct = total > 0 ? (attended / total) * 100 : 100;
    const min = sub.minimumRequiredPercentage;
    const isRed = pct < min;
    const isYellow = !isRed && pct < min + 3;

    // Must attend next
    let mustAttend = 0;
    if (pct < min + 3 && total > 0) {
      let t = total, a = attended;
      const target = (min + 3) / 100;
      while (mustAttend < 1000 && a / t < target) {
        t++; a++; mustAttend++;
      }
    }

    results.push({ name: sub.name, pct, min, isRed, isYellow, mustAttend });
  }
  return results;
}

function buildNotificationContent(data) {
  const settings = getSettings();
  let subjects, records;

  try {
    subjects = JSON.parse(data.subjects || "[]");
    records = JSON.parse(data.records || "[]");
  } catch {
    return null;
  }

  if (subjects.length === 0) return null;

  // Filter by per-subject toggles
  const enabledSubjects = settings.subjects;
  if (enabledSubjects) {
    subjects = subjects.filter((s) => enabledSubjects[s.id] !== false);
  }

  if (subjects.length === 0) return null;

  const stats = computeStats(subjects, records);
  const dangers = stats.filter((s) => s.isRed);
  const borderlines = stats.filter((s) => s.isYellow);

  let title, body;

  if (dangers.length > 0) {
    title = "⚠️ Attendance Alert";
    const lines = dangers.map(
      (s) => `${s.name} is in danger — ${s.pct.toFixed(1)}% (min ${s.min}%). Must attend today.`
    );
    if (borderlines.length > 0) {
      lines.push(
        ...borderlines.map(
          (s) => `${s.name} is borderline — ${s.pct.toFixed(1)}% (min ${s.min}%). Recommended to attend.`
        )
      );
    }
    body = lines.join("\n");
  } else if (borderlines.length > 0) {
    title = "📊 Attendance Reminder";
    body = borderlines
      .map(
        (s) => `${s.name} is borderline — ${s.pct.toFixed(1)}% (min ${s.min}%). Recommended to attend.`
      )
      .join("\n");
  } else {
    title = "✅ Attendance Update";
    body = "All subjects on track. Have a good day!";
  }

  return { title, body };
}

function scheduleNotification(timeStr) {
  if (notificationTimer) {
    clearTimeout(notificationTimer);
    notificationTimer = null;
  }

  const [hours, minutes] = (timeStr || "07:00").split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();

  notificationTimer = setTimeout(() => {
    fireNotification();
    // Repeat every 24 hours
    setInterval(fireNotification, 24 * 60 * 60 * 1000);
  }, delay);
}

async function fireNotification() {
  const settings = getSettings();
  if (!settings.enabled) return;

  // Request data from any open client
  const clients = await self.clients.matchAll({ type: "window" });

  if (clients.length > 0) {
    // Ask client for fresh data
    clients[0].postMessage({ type: "REQUEST_NOTIFICATION_DATA" });
  } else {
    // No client open — show generic notification
    self.registration.showNotification("📊 Attendance Tracker", {
      body: "Open the app to check your attendance status.",
      icon: "/favicon.ico",
      tag: "attendance-daily",
    });
  }
}

self.addEventListener("message", (event) => {
  const { type, ...data } = event.data;

  if (type === "UPDATE_SETTINGS") {
    self._notifSettings = {
      enabled: data.enabled !== false,
      time: data.time || "07:00",
      subjects: data.subjects || null,
    };
    scheduleNotification(data.time || "07:00");
  }

  if (type === "NOTIFICATION_DATA") {
    const content = buildNotificationContent(data);
    if (content) {
      self.registration.showNotification(content.title, {
        body: content.body,
        icon: "/favicon.ico",
        tag: "attendance-daily",
      });
    }
  }

  if (type === "TEST_NOTIFICATION") {
    const content = buildNotificationContent(data);
    if (content) {
      self.registration.showNotification(content.title, {
        body: content.body,
        icon: "/favicon.ico",
        tag: "attendance-test",
      });
    } else {
      self.registration.showNotification("📊 Attendance Tracker", {
        body: "Add subjects and mark attendance to get personalized notifications.",
        icon: "/favicon.ico",
        tag: "attendance-test",
      });
    }
  }
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  // Start with default schedule
  scheduleNotification("07:00");
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow("/");
      }
    })
  );
});

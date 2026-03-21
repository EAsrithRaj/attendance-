import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

export default function SettingsNotifications() {
  const navigate = useNavigate();
  const { subjects } = useAppState();

  // ── Notifications ───────────────────────────────────────────────────────────
  const [notifsEnabled, setNotifsEnabled] = useState(
    () => localStorage.getItem("notificationsEnabled") !== "false",
  );
  const [notifTime, setNotifTime] = useState(
    () => localStorage.getItem("notificationTime") || "07:00",
  );
  const [notifSubjects, setNotifSubjects] = useState<Record<string, boolean>>(
    () => {
      try {
        return JSON.parse(localStorage.getItem("notificationSubjects") || "{}");
      } catch {
        return {};
      }
    },
  );

  const sendSettingsToSW = (
    enabled: boolean,
    time: string,
    subs: Record<string, boolean>,
  ) => {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "UPDATE_SETTINGS",
        enabled,
        time,
        subjects: subs,
      });
    }
  };

  const handleNotifsToggle = (checked: boolean) => {
    setNotifsEnabled(checked);
    localStorage.setItem("notificationsEnabled", String(checked));
    sendSettingsToSW(checked, notifTime, notifSubjects);
  };

  const handleTimeChange = (newTime: string) => {
    setNotifTime(newTime);
    localStorage.setItem("notificationTime", newTime);
    sendSettingsToSW(notifsEnabled, newTime, notifSubjects);
  };

  const handleSubjectToggle = (subId: string, checked: boolean) => {
    const updated = { ...notifSubjects, [subId]: checked };
    setNotifSubjects(updated);
    localStorage.setItem("notificationSubjects", JSON.stringify(updated));
    sendSettingsToSW(notifsEnabled, notifTime, updated);
  };

  const handleTestNotification = () => {
    if (!("Notification" in window)) {
      toast.error("Notifications not supported in this browser");
      return;
    }
    if (Notification.permission === "denied") {
      toast.error(
        "Notification permission denied. Enable it in browser settings.",
      );
      return;
    }
    if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        localStorage.setItem("notificationPermission", perm);
        if (perm === "granted") fireTestNotification();
        else toast.error("Permission denied");
      });
      return;
    }
    fireTestNotification();
  };

  const fireTestNotification = () => {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "TEST_NOTIFICATION",
        subjects: localStorage.getItem("subjects") || "[]",
        records: localStorage.getItem("attendanceRecords") || "[]",
      });
      toast.success("Test notification sent!");
    } else {
      toast.error("Service worker not ready. Try reloading.");
    }
  };

  const permissionStatus =
    typeof Notification !== "undefined"
      ? Notification.permission
      : "unsupported";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageShell
      title="Notifications"
      actions={
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 pl-1"
          onClick={() => navigate("/settings")}
        >
          <ChevronLeft className="h-4 w-4" />
          Settings
        </Button>
      }
    >
      <div className="space-y-4 pb-20 animate-fade-in">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {notifsEnabled ? (
                  <Bell className="h-4 w-4 text-primary" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm text-card-foreground">
                  Daily Notifications
                </span>
              </div>
              <Switch
                checked={notifsEnabled}
                onCheckedChange={handleNotifsToggle}
              />
            </div>

            {permissionStatus === "denied" && (
              <p className="text-xs text-destructive">
                Notification permission denied. Enable it in your browser/OS
                settings.
              </p>
            )}
            {permissionStatus === "default" && (
              <p className="text-xs text-muted-foreground">
                You'll be prompted to allow notifications.
              </p>
            )}

            {notifsEnabled && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Notification Time
                  </Label>
                  <Input
                    type="time"
                    value={notifTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                  />
                </div>

                {subjects.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Include Subjects
                    </Label>
                    {subjects.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                      >
                        <span className="text-sm text-card-foreground">
                          {s.name}
                        </span>
                        <Switch
                          checked={notifSubjects[s.id] !== false}
                          onCheckedChange={(checked) =>
                            handleSubjectToggle(s.id, checked)
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestNotification}
                  className="w-full"
                >
                  <Bell className="h-4 w-4 mr-1.5" />
                  Test Notification
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

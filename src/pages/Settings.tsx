import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import type { Subject } from "@/types/attendance";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Trash2,
  Plus,
  AlertTriangle,
  Beaker,
  Bell,
  BellOff,
  ChevronRight,
  CalendarDays,
  BookOpen,
  Clock,
  Palmtree,
  Download,
  Palette,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import ImportExport from "@/components/ImportExport";
import { toast } from "sonner";

// ── Helpers ────────────────────────────────────────────────────────────────────

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    subjects,
    timetable,
    allHolidays,
    examPeriods,
    semester,
    setSubjects,
    setTimetable,
    setExamPeriods,
    setSemester,
    resetAll,
    loadTestData,
  } = useAppState();

  // ── Semester ────────────────────────────────────────────────────────────────
  const [semStart, setSemStart] = useState(semester.startDate);
  const [semEnd, setSemEnd] = useState(semester.endDate);
  const saveSem = () => setSemester({ startDate: semStart, endDate: semEnd });

  // ── Subject form ────────────────────────────────────────────────────────────
  const [newSubName, setNewSubName] = useState("");
  const [newSubMin, setNewSubMin] = useState("75");
  const subNameRef = useRef<HTMLInputElement>(null);

  const addSubject = () => {
    if (!newSubName.trim()) return;
    const id = newSubName.trim().toUpperCase().replace(/\s+/g, "_");
    if (subjects.some((s) => s.id === id)) return;
    setSubjects([
      ...subjects,
      {
        id,
        name: newSubName.trim(),
        minimumRequiredPercentage: Number(newSubMin) || 75,
      },
    ]);
    setNewSubName("");
    setNewSubMin("75");
    setTimeout(() => subNameRef.current?.focus(), 0);
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter((s) => s.id !== id));
    setTimetable(timetable.filter((t) => t.subjectId !== id));
  };

  // ── Exam periods ────────────────────────────────────────────────────────────
  const [examStart, setExamStart] = useState("");
  const [examEnd, setExamEnd] = useState("");

  const addExam = () => {
    if (!examStart || !examEnd) return;
    setExamPeriods([
      ...examPeriods,
      { startDate: examStart, endDate: examEnd },
    ]);
    setExamStart("");
    setExamEnd("");
  };

  const removeExam = (i: number) =>
    setExamPeriods(examPeriods.filter((_, idx) => idx !== i));

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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <PageShell title="Settings">
      <div className="space-y-6 pb-24">

        {/* ── Navigation menu ───────────────────────────── */}
        <nav className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-fade-in">
          {MENU_ITEMS(subjects.length, allHolidays.length, notifsEnabled).map(
            (item, i, arr) => (
              <button
                key={item.route}
                type="button"
                onClick={() => navigate(item.route)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 active:bg-muted/60 transition-colors ${
                  i < arr.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                {/* Icon */}
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}>
                  <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                </span>

                {/* Label + subtitle */}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-card-foreground">
                    {item.label}
                  </span>
                  {item.subtitle && (
                    <span className="block text-xs text-muted-foreground truncate">
                      {item.subtitle}
                    </span>
                  )}
                </span>

                {/* Badge + arrow */}
                <span className="flex items-center gap-2 shrink-0">
                  {item.badge != null && item.badge > 0 && (
                    <span className="text-[11px] font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5 leading-none">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </button>
            )
          )}
        </nav>

        {/* ── Existing UI (temporary, kept below menu) ─── */}
        <Section title="Semester">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input
                type="date"
                value={semStart}
                onChange={(e) => setSemStart(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End</Label>
              <Input
                type="date"
                value={semEnd}
                onChange={(e) => setSemEnd(e.target.value)}
              />
            </div>
          </div>
          <Button size="sm" onClick={saveSem} className="mt-2 w-full">
            Save Semester
          </Button>
        </Section>

        {/* ── Subjects ──────────────────────────────────── */}
        <Section title="Subjects">
          {subjects.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 mb-2"
            >
              <span className="text-sm text-card-foreground">
                {s.name}{" "}
                <span className="text-muted-foreground">
                  ({s.minimumRequiredPercentage}%)
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSubject(s.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <Input
              ref={subNameRef}
              placeholder="Subject name"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubject()}
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Min %"
              value={newSubMin}
              onChange={(e) => setNewSubMin(e.target.value)}
              className="w-20"
            />
            <Button size="sm" onClick={addSubject}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Section>

        {/* ── Notifications ─────────────────────────────── */}
        <Section title="Notifications">
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
        </Section>


        {/* ── Exam Periods ──────────────────────────────── */}
        <Section title="Exam Periods">
          {examPeriods.map((ep, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 mb-2"
            >
              <span className="text-sm text-card-foreground font-mono">
                {ep.startDate} → {ep.endDate}
              </span>
              <Button variant="ghost" size="sm" onClick={() => removeExam(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <Input
              type="date"
              value={examStart}
              onChange={(e) => setExamStart(e.target.value)}
              className="flex-1"
            />
            <Input
              type="date"
              value={examEnd}
              onChange={(e) => setExamEnd(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={addExam}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Section>

        {/* ── Import / Export ───────────────────────────── */}
        <Section title="Import / Export">
          <ImportExport />
        </Section>

        {/* ── Danger Zone ───────────────────────────────── */}
        <Section title="Danger Zone">
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTestData}>
              <Beaker className="h-4 w-4 mr-1" /> Load Test Data
            </Button>
            <Button variant="destructive" onClick={resetAll}>
              <AlertTriangle className="h-4 w-4 mr-1" /> Reset All
            </Button>
          </div>
        </Section>

        <div className="flex justify-center pt-2">
          <ThemeToggle />
        </div>
      </div>
    </PageShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-fade-in">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}
}

// ── Settings menu items ───────────────────────────────────────────────────────

interface MenuItem {
  label: string;
  subtitle?: string;
  route: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badge?: number;
}

function MENU_ITEMS(
  subjectCount: number,
  holidayCount: number,
  notifsOn: boolean,
): MenuItem[] {
  return [
    {
      label: "Semester",
      subtitle: "Set start and end dates",
      route: "/settings/semester",
      icon: CalendarDays,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Subjects",
      subtitle: "Manage your subjects",
      route: "/settings/subjects",
      icon: BookOpen,
      iconBg: "bg-violet-100 dark:bg-violet-900/30",
      iconColor: "text-violet-600 dark:text-violet-400",
      badge: subjectCount,
    },
    {
      label: "Timetable",
      subtitle: "Weekly class schedule",
      route: "/settings/timetable",
      icon: Clock,
      iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Holidays",
      subtitle: "Auto + manual holidays",
      route: "/settings/holidays",
      icon: Palmtree,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      badge: holidayCount,
    },
    {
      label: "Notifications",
      subtitle: notifsOn ? "Enabled" : "Disabled",
      route: "/settings/notifications",
      icon: Bell,
      iconBg: notifsOn
        ? "bg-green-100 dark:bg-green-900/30"
        : "bg-muted dark:bg-muted",
      iconColor: notifsOn
        ? "text-green-600 dark:text-green-400"
        : "text-muted-foreground",
    },
    {
      label: "Data",
      subtitle: "Import / Export backup",
      route: "/settings/data",
      icon: Download,
      iconBg: "bg-cyan-100 dark:bg-cyan-900/30",
      iconColor: "text-cyan-600 dark:text-cyan-400",
    },
    {
      label: "Appearance",
      subtitle: "Theme and display",
      route: "/settings/appearance",
      icon: Palette,
      iconBg: "bg-pink-100 dark:bg-pink-900/30",
      iconColor: "text-pink-600 dark:text-pink-400",
    },
    {
      label: "Danger Zone",
      subtitle: "Reset or load test data",
      route: "/settings/danger",
      icon: AlertTriangle,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
    },
  ];
}

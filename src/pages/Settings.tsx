import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/context/AppContext";
import type { Subject, Holiday } from "@/types/attendance";
import { INDIAN_HOLIDAYS } from "@/data/holidays";
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
  MapPin,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  RotateCcw,
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
    holidays,
    allHolidays,
    examPeriods,
    semester,
    userState,
    deletedHolidayIds,
    setSubjects,
    setTimetable,
    setHolidays,
    setExamPeriods,
    setSemester,
    deleteAutoHoliday,
    restoreAutoHoliday,
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

  // ── Holidays — collapsible ──────────────────────────────────────────────────
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const [holStart, setHolStart] = useState("");
  const [holEnd, setHolEnd] = useState("");
  const [holName, setHolName] = useState("");

  const addHolidays = () => {
    if (!holStart) return;
    const effectiveEnd = holEnd || holStart;
    const dates = dateRange(holStart, effectiveEnd);
    if (dates.length === 0) return;

    const existingDates = new Set(holidays.map((h) => h.date));
    const newEntries: Holiday[] = dates
      .filter((d) => !existingDates.has(d))
      .map((d) => ({
        id: `manual_${d}_${Date.now()}`,
        date: d,
        name: holName.trim() || undefined,
        type: "manual" as const,
      }));

    if (newEntries.length > 0) {
      setHolidays([...holidays, ...newEntries]);
      toast.success(
        newEntries.length === 1
          ? "Holiday added"
          : `${newEntries.length} holidays added`,
      );
    } else {
      toast.info("All dates already exist");
    }

    setHolStart("");
    setHolEnd("");
    setHolName("");
  };

  const removeManualHoliday = (h: Holiday) => {
    if (h.id) {
      setHolidays(holidays.filter((m) => m.id !== h.id));
    } else {
      setHolidays(holidays.filter((m) => m.date !== h.date));
    }
  };

  // Grouped display
  const nationalHolidays = allHolidays.filter((h) => h.type === "national");
  const stateHolidays = allHolidays.filter((h) => h.type === "state");
  const manualHolidays = allHolidays.filter(
    (h) => h.type === "manual" || !h.type,
  );

  // Deleted auto holidays — sourced from the bundled list, filtered by deletedHolidayIds
  const deletedAutoHolidays = INDIAN_HOLIDAYS.filter((h) =>
    deletedHolidayIds.includes(h.id),
  );

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
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}
                >
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
            ),
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

        {/* ── Holidays (collapsible) ─────────────────────── */}
        <div className="rounded-xl border border-border bg-card shadow-sm animate-fade-in overflow-hidden">
          {/* Header row — always visible, fully tappable */}
          <button
            type="button"
            onClick={() => setHolidayOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-muted/30 active:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Holidays
              </span>
              {/* Count badge */}
              {allHolidays.length > 0 && (
                <span className="text-[10px] font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5 shrink-0">
                  {allHolidays.length}
                </span>
              )}
              {/* Hidden-holidays warning badge */}
              {deletedAutoHolidays.length > 0 && (
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded-full px-2 py-0.5 shrink-0">
                  {deletedAutoHolidays.length} hidden
                </span>
              )}
            </div>
            {holidayOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            )}
          </button>

          {/* Expandable body */}
          {holidayOpen && (
            <div className="px-4 pb-4 space-y-4 border-t border-border/60 pt-4">
              {/* State detection banner */}
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                  userState
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {userState
                  ? `Auto holidays loaded for ${userState}`
                  : "Showing national holidays only — location not detected"}
              </div>

              {/* National */}
              {nationalHolidays.length > 0 && (
                <HolidayGroup
                  label="National"
                  holidays={nationalHolidays}
                  onDelete={(h) => h.id && deleteAutoHoliday(h.id)}
                />
              )}

              {/* State-specific */}
              {stateHolidays.length > 0 && (
                <HolidayGroup
                  label="State"
                  holidays={stateHolidays}
                  onDelete={(h) => h.id && deleteAutoHoliday(h.id)}
                />
              )}

              {/* Manual */}
              {manualHolidays.length > 0 && (
                <HolidayGroup
                  label="Manual"
                  holidays={manualHolidays}
                  onDelete={removeManualHoliday}
                />
              )}

              {nationalHolidays.length === 0 &&
                stateHolidays.length === 0 &&
                manualHolidays.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No holidays loaded yet.
                  </p>
                )}

              {/* ── Restore deleted auto holidays ── */}
              {deletedAutoHolidays.length > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowDeleted((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    <span>
                      {deletedAutoHolidays.length} auto holiday
                      {deletedAutoHolidays.length !== 1 ? "s" : ""} hidden — tap
                      to restore
                    </span>
                    {showDeleted ? (
                      <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>

                  {showDeleted && (
                    <div className="px-3 pb-3 space-y-1 border-t border-amber-200/60 dark:border-amber-800/60 pt-2">
                      {deletedAutoHolidays.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between rounded-md bg-white/60 dark:bg-black/20 px-2.5 py-1.5"
                        >
                          <span className="text-xs text-card-foreground font-mono">
                            {h.date}
                            {h.name && (
                              <span className="text-muted-foreground">
                                {" "}
                                — {h.name}
                              </span>
                            )}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 shrink-0"
                            onClick={() => {
                              restoreAutoHoliday(h.id);
                              toast.success(`${h.name || "Holiday"} restored`);
                            }}
                            title="Restore holiday"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Add manual holiday ── */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Add Holiday
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Start date
                    </Label>
                    <Input
                      type="date"
                      value={holStart}
                      onChange={(e) => setHolStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      End (optional)
                    </Label>
                    <Input
                      type="date"
                      value={holEnd}
                      min={holStart || undefined}
                      onChange={(e) => setHolEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Holiday name (optional)"
                    value={holName}
                    onChange={(e) => setHolName(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && addHolidays()}
                  />
                  <Button size="sm" onClick={addHolidays}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

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

function HolidayGroup({
  label,
  holidays,
  onDelete,
}: {
  label: string;
  holidays: Holiday[];
  onDelete: (h: Holiday) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">
        {label}
      </span>
      {holidays.map((h, i) => (
        <div
          key={h.id ?? `${h.date}-${i}`}
          className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 mb-1.5 last:mb-0"
        >
          <span className="text-sm text-card-foreground font-mono truncate mr-2">
            {h.date}
            {h.name && (
              <span className="text-muted-foreground"> — {h.name}</span>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-destructive/10 shrink-0"
            onClick={() => onDelete(h)}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
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

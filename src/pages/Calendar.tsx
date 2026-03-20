import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useAppState } from "@/context/AppContext";
import AddExtraClassModal from "@/components/AddExtraClassModal";
import OverallAttendance from "@/components/OverallAttendance";

import { computeAttendanceStats } from "@/engine/attendanceEngine";
import type {
  DayState,
  DayPrediction,
  TimetableSlot,
  AttendanceRecord,
  Subject,
  AttendanceStatus,
  Holiday,
} from "@/types/attendance";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Ban,
  Eraser,
  Plus,
  Trash2,
} from "lucide-react";

/* ── Constants ───────────────────────────────────────────── */

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CELL_COLORS: Record<DayState, string> = {
  GREEN: "bg-attendance-green text-attendance-green-foreground",
  YELLOW: "bg-attendance-yellow text-attendance-yellow-foreground",
  RED: "bg-attendance-red text-attendance-red-foreground",
  GREY: "bg-attendance-grey/40 text-muted-foreground",
  BLUE: "bg-attendance-blue text-attendance-blue-foreground",
};

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  PRESENT: "bg-attendance-green text-attendance-green-foreground",
  ABSENT: "bg-attendance-red text-attendance-red-foreground",
  CANCELLED: "bg-attendance-grey text-attendance-grey-foreground",
};

/* ── Helpers ─────────────────────────────────────────────── */

function fmtDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getTodayStr(): string {
  const n = new Date();
  return fmtDate(n.getFullYear(), n.getMonth(), n.getDate());
}

function getDow(dateStr: string): number {
  const d = parseDate(dateStr).getDay();
  return d === 0 ? 7 : d;
}

/* ── Day info types & helpers ────────────────────────────── */

interface DayInfo {
  state: DayState;
  badge: string;
  bunkBuffer: number | null;
}

function pastDayInfo(
  dateStr: string,
  daySlots: TimetableSlot[],
  records: AttendanceRecord[],
): DayInfo {
  const extraRecs = records.filter((r) => r.date === dateStr && r.isExtra);
  const slotRecs = daySlots
    .map((s) =>
      records.find(
        (r) =>
          r.subjectId === s.subjectId &&
          r.date === dateStr &&
          r.slotId === s.id,
      ),
    )
    .filter((r): r is AttendanceRecord => !!r);

  const allRecs = [...slotRecs, ...extraRecs];
  if (daySlots.length === 0 && extraRecs.length === 0)
    return { state: "GREY", badge: "", bunkBuffer: null };

  const active = allRecs.filter((r) => r.status !== "CANCELLED");
  if (active.length === 0) {
    return {
      state: "GREY",
      badge: allRecs.length > 0 ? "C" : "",
      bunkBuffer: null,
    };
  }

  const allP = active.every((r) => r.status === "PRESENT");
  const allA = active.every((r) => r.status === "ABSENT");
  if (allP) return { state: "GREEN", badge: "P", bunkBuffer: null };
  if (allA) return { state: "RED", badge: "A", bunkBuffer: null };
  return { state: "YELLOW", badge: "M", bunkBuffer: null };
}

function futureDayInfo(
  daySlots: TimetableSlot[],
  pred: DayPrediction | undefined,
  records: AttendanceRecord[],
  subjectMap: Map<string, Subject>,
  filterSubjectId: string,
): DayInfo {
  if (daySlots.length === 0)
    return { state: "GREY", badge: "", bunkBuffer: null };

  let state: DayState = "GREY";
  if (pred) {
    let cps = pred.classPredictions;
    if (filterSubjectId !== "all")
      cps = cps.filter((cp) => cp.subjectId === filterSubjectId);

    if (cps.length > 0) {
      let worst: DayState = "GREEN";
      for (const cp of cps) {
        if (cp.skipState === "RED") {
          worst = "RED";
          break;
        }
        if (cp.skipState === "YELLOW") worst = "YELLOW";
      }
      state = worst;
    }
  }

  const weightBySubject = new Map<string, number>();
  for (const s of daySlots) {
    weightBySubject.set(
      s.subjectId,
      (weightBySubject.get(s.subjectId) || 0) + s.weight,
    );
  }
  let minBuf = Infinity;
  for (const [sid, w] of weightBySubject) {
    const sub = subjectMap.get(sid);
    if (!sub) continue;
    const stats = computeAttendanceStats(sub, records);
    minBuf = Math.min(minBuf, stats.bunkBuffer - w);
  }
  const bunkBuffer = minBuf !== Infinity && minBuf > 0 ? minBuf : null;
  return { state, badge: "", bunkBuffer };
}

/* ── Semester progress ───────────────────────────────────── */

function computeProgress(
  semester: { startDate: string; endDate: string },
  timetable: TimetableSlot[],
  holidays: { date: string }[],
  examPeriods: { startDate: string; endDate: string }[],
): { completed: number; total: number } {
  const holidaySet = new Set(holidays.map((h) => h.date));
  const slotDows = new Set(timetable.map((s) => s.dayOfWeek));
  const today = getTodayStr();
  let total = 0,
    completed = 0;
  const start = parseDate(semester.startDate);
  const end = parseDate(semester.endDate);
  const cur = new Date(start);

  while (cur <= end) {
    const ds = fmtDate(cur.getFullYear(), cur.getMonth(), cur.getDate());
    const jsDay = cur.getDay();
    const dow = jsDay === 0 ? 7 : jsDay;
    if (
      jsDay !== 0 &&
      !holidaySet.has(ds) &&
      !examPeriods.some((ep) => ds >= ep.startDate && ds <= ep.endDate) &&
      slotDows.has(dow)
    ) {
      total++;
      if (ds <= today) completed++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { completed, total };
}

/* ── Chained future predictions ──────────────────────────── */

function buildChainedPredictions(
  today: string,
  subjects: Subject[],
  timetable: TimetableSlot[],
  records: AttendanceRecord[],
  holidays: Set<string>,
  examPeriods: { startDate: string; endDate: string }[],
  semester: { startDate: string; endDate: string },
): Map<string, DayPrediction> {
  const map = new Map<string, DayPrediction>();
  if (subjects.length === 0) return map;

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const running = new Map<string, { total: number; attended: number }>();
  for (const s of subjects) running.set(s.id, { total: 0, attended: 0 });
  for (const r of records) {
    const t = running.get(r.subjectId);
    if (!t || r.status === "CANCELLED") continue;
    t.total += r.weightSnapshot;
    if (r.status === "PRESENT") t.attended += r.weightSnapshot;
  }

  const slotsByDow = new Map<number, TimetableSlot[]>();
  for (const s of timetable) {
    const arr = slotsByDow.get(s.dayOfWeek) ?? [];
    arr.push(s);
    slotsByDow.set(s.dayOfWeek, arr);
  }

  const startDate = parseDate(today);
  startDate.setDate(startDate.getDate() + 1);
  const endDate = parseDate(semester.endDate);
  const cur = new Date(startDate);

  while (cur <= endDate) {
    const ds = fmtDate(cur.getFullYear(), cur.getMonth(), cur.getDate());
    const jsDay = cur.getDay();
    const dow = jsDay === 0 ? 7 : jsDay;

    if (jsDay === 0 || holidays.has(ds)) {
      map.set(ds, { date: ds, state: "GREY", classPredictions: [] });
      cur.setDate(cur.getDate() + 1);
      continue;
    }
    if (examPeriods.some((ep) => ds >= ep.startDate && ds <= ep.endDate)) {
      map.set(ds, { date: ds, state: "BLUE", classPredictions: [] });
      cur.setDate(cur.getDate() + 1);
      continue;
    }

    const daySlots = slotsByDow.get(dow) ?? [];
    if (daySlots.length === 0) {
      map.set(ds, { date: ds, state: "GREY", classPredictions: [] });
      cur.setDate(cur.getDate() + 1);
      continue;
    }

    const classPredictions: {
      slotId: string;
      subjectId: string;
      weight: number;
      skipState: DayState;
    }[] = [];
    let dayState: DayState = "GREEN";

    for (const slot of daySlots) {
      const subject = subjectMap.get(slot.subjectId);
      const rt = running.get(slot.subjectId);
      if (!subject || !rt) continue;
      const hypTotal = rt.total + slot.weight;
      const hypPct = hypTotal > 0 ? (rt.attended / hypTotal) * 100 : 100;
      let skipState: DayState = "GREEN";
      if (hypPct < subject.minimumRequiredPercentage) skipState = "RED";
      else if (hypPct < subject.minimumRequiredPercentage + 3)
        skipState = "YELLOW";
      classPredictions.push({
        slotId: slot.id,
        subjectId: slot.subjectId,
        weight: slot.weight,
        skipState,
      });
      if (skipState === "RED") dayState = "RED";
      else if (skipState === "YELLOW" && dayState !== "RED")
        dayState = "YELLOW";
    }

    map.set(ds, { date: ds, state: dayState, classPredictions });

    for (const slot of daySlots) {
      const rt = running.get(slot.subjectId);
      if (!rt) continue;
      rt.total += slot.weight;
      rt.attended += slot.weight;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return map;
}

/* ── Main Component ──────────────────────────────────────── */

export default function CalendarPage() {
  const {
    subjects,
    timetable,
    records,
    allHolidays: holidays,
    holidays: manualHolidays,
    examPeriods,
    semester,
    markAttendance,
    clearMark,
    addExtraClass,
    deleteExtraClass,
    deleteAutoHoliday,
    setHolidays,
  } = useAppState();

  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterSubjectId, setFilterSubjectId] = useState("all");
  const [extraModalOpen, setExtraModalOpen] = useState(false);

  // Holiday deletion
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  // Android back gesture: close popup instead of navigating away
  useEffect(() => {
    if (selectedDate !== null) {
      window.history.pushState({ modal: true }, "");
      const handlePop = () => setSelectedDate(null);
      window.addEventListener("popstate", handlePop);
      return () => window.removeEventListener("popstate", handlePop);
    }
  }, [selectedDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = getTodayStr();

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  );
  const holidaySet = useMemo(
    () => new Set(holidays.map((h) => h.date)),
    [holidays],
  );
  const holidayMap = useMemo(
    () => new Map(holidays.map((h) => [h.date, h])),
    [holidays],
  );

  const slotsByDow = useMemo(() => {
    const m = new Map<number, TimetableSlot[]>();
    for (const s of timetable) {
      const arr = m.get(s.dayOfWeek) ?? [];
      arr.push(s);
      m.set(s.dayOfWeek, arr);
    }
    return m;
  }, [timetable]);

  const predictions = useMemo(() => {
    return buildChainedPredictions(
      today,
      subjects,
      timetable,
      records,
      holidaySet,
      examPeriods,
      semester,
    );
  }, [today, subjects, timetable, records, holidaySet, examPeriods, semester]);

  const progress = useMemo(
    () => computeProgress(semester, timetable, holidays, examPeriods),
    [semester, timetable, holidays, examPeriods],
  );

  const bunkStats = useMemo(
    () =>
      subjects.map((s) => {
        const stats = computeAttendanceStats(s, records);
        return {
          id: s.id,
          name: s.name,
          percentage: stats.percentage,
          minimum: s.minimumRequiredPercentage,
          bunkBuffer: stats.bunkBuffer,
          mustAttendNext: stats.mustAttendNext,
        };
      }),
    [subjects, records],
  );

  const getDaySlots = useCallback(
    (dateStr: string) => {
      const dow = getDow(dateStr);
      let slots = slotsByDow.get(dow) ?? [];
      if (filterSubjectId !== "all")
        slots = slots.filter((s) => s.subjectId === filterSubjectId);
      return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    },
    [slotsByDow, filterSubjectId],
  );

  const getDayInfo = useCallback(
    (dateStr: string): DayInfo => {
      if (dateStr < semester.startDate || dateStr > semester.endDate)
        return { state: "GREY", badge: "", bunkBuffer: null };
      if (holidaySet.has(dateStr))
        return { state: "GREY", badge: "", bunkBuffer: null };
      if (
        examPeriods.some(
          (ep) => dateStr >= ep.startDate && dateStr <= ep.endDate,
        )
      )
        return { state: "BLUE", badge: "", bunkBuffer: null };
      const d = parseDate(dateStr);
      if (d.getDay() === 0)
        return { state: "GREY", badge: "", bunkBuffer: null };
      const daySlots = getDaySlots(dateStr);
      if (dateStr <= today) return pastDayInfo(dateStr, daySlots, records);
      return futureDayInfo(
        daySlots,
        predictions.get(dateStr),
        records,
        subjectMap,
        filterSubjectId,
      );
    },
    [
      semester,
      holidaySet,
      examPeriods,
      getDaySlots,
      today,
      records,
      predictions,
      subjectMap,
      filterSubjectId,
    ],
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = (() => {
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const prev = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    setSelectedDate(null);
  };
  const next = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const monthName = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const selectedIsPast = selectedDate ? selectedDate <= today : false;
  const selectedHoliday = selectedDate
    ? (holidayMap.get(selectedDate) ?? null)
    : null;
  const selectedSlots = selectedDate ? getDaySlots(selectedDate) : [];
  const selectedPred = selectedDate ? predictions.get(selectedDate) : undefined;

  const handleMark = (
    subjectId: string,
    slotId: string,
    weight: number,
    status: AttendanceStatus,
  ) => {
    if (!selectedDate) return;
    markAttendance(subjectId, selectedDate, slotId, weight, status);
  };
  const handleClear = (subjectId: string, slotId: string) => {
    if (!selectedDate) return;
    clearMark(subjectId, selectedDate, slotId);
  };
  const bulkMark = (status: AttendanceStatus) => {
    selectedSlots.forEach((s) =>
      handleMark(s.subjectId, s.id, s.weight, status),
    );
  };
  const bulkClear = () => {
    selectedSlots.forEach((s) => handleClear(s.subjectId, s.id));
  };

  // ── Holiday deletion helpers ──────────────────────────────
  const openDeleteConfirm = useCallback((holiday: Holiday) => {
    setDeleteTarget(holiday);
  }, []);

  const confirmDeleteHoliday = () => {
    if (!deleteTarget) return;
    const type = deleteTarget.type;
    if (type === "national" || type === "state") {
      if (deleteTarget.id) deleteAutoHoliday(deleteTarget.id);
    } else {
      if (deleteTarget.id) {
        setHolidays(manualHolidays.filter((h) => h.id !== deleteTarget.id));
      } else {
        setHolidays(manualHolidays.filter((h) => h.date !== deleteTarget.date));
      }
    }
    setDeleteTarget(null);
    setSelectedDate(null);
  };

  // ── Long press handlers (mobile) ─────────────────────────
  const handleTouchStart = useCallback(
    (dateStr: string) => {
      if (!holidaySet.has(dateStr)) return;
      longPressTriggered.current = false;
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        const h = holidayMap.get(dateStr);
        if (h) openDeleteConfirm(h);
      }, 600);
    },
    [holidaySet, holidayMap, openDeleteConfirm],
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <PageShell
      title="Calendar"
      actions={
        subjects.length > 0 ? (
          <Select value={filterSubjectId} onValueChange={setFilterSubjectId}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : undefined
      }
    >
      <div className="animate-fade-in space-y-4">
        <OverallAttendance />

        {/* Semester progress */}
        {progress.total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>Semester progress</span>
              <span>
                {progress.completed} / {progress.total} class days
              </span>
            </div>
            <Progress
              value={(progress.completed / progress.total) * 100}
              className="h-2"
            />
          </div>
        )}

        {/* Bunk budget */}
        {bunkStats.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bunk Budget
            </p>
            <div className="space-y-2">
              {bunkStats.map((s) => {
                const isRed = s.percentage < s.minimum;
                const isYellow = !isRed && s.percentage < s.minimum + 3;
                const barColor = isRed
                  ? "bg-attendance-red"
                  : isYellow
                    ? "bg-attendance-yellow"
                    : "bg-attendance-green";
                const pctClamped = Math.min(100, Math.max(0, s.percentage));
                return (
                  <div key={s.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-card-foreground truncate max-w-[55%]">
                        {s.name}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {s.percentage.toFixed(1)}%{" "}
                        {s.bunkBuffer > 0 ? (
                          <span className="text-attendance-green font-semibold">
                            · skip {s.bunkBuffer} more
                          </span>
                        ) : s.mustAttendNext > 0 ? (
                          <span className="text-attendance-red font-semibold">
                            · attend next {s.mustAttendNext}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${pctClamped}%` }}
                      />
                      <div
                        className="absolute top-0 h-full w-px bg-foreground/40"
                        style={{ left: `${s.minimum}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-foreground">{monthName}</span>
          <Button variant="ghost" size="sm" onClick={next}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={`e-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = fmtDate(year, month, day);
            const info = getDayInfo(dateStr);
            const isToday = dateStr === today;
            const isHoliday = holidaySet.has(dateStr);
            const daySlots = getDaySlots(dateStr);
            const hasExtras = records.some(
              (r) => r.date === dateStr && r.isExtra,
            );
            const inSemester =
              dateStr >= semester.startDate && dateStr <= semester.endDate;
            const isWeekday = parseDate(dateStr).getDay() !== 0;
            const clickable =
              isHoliday ||
              daySlots.length > 0 ||
              hasExtras ||
              (dateStr <= today && inSemester && isWeekday);

            return (
              <Tooltip key={dateStr}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (longPressTriggered.current) return;
                      if (clickable) setSelectedDate(dateStr);
                    }}
                    onTouchStart={() => handleTouchStart(dateStr)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    className={`relative aspect-square flex items-center justify-center rounded-2xl text-xs font-mono font-medium transition-colors ${CELL_COLORS[info.state]} ${
                      isToday
                        ? "ring-2 ring-ring ring-offset-1 ring-offset-background"
                        : ""
                    } ${clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                  >
                    {day}
                    {info.badge && (
                      <span className="absolute top-0.5 right-0.5 text-[8px] font-bold leading-none opacity-80">
                        {info.badge}
                      </span>
                    )}
                    {info.bunkBuffer !== null && (
                      <span className="absolute bottom-0 left-0.5 text-[8px] font-bold leading-none opacity-70">
                        {info.bunkBuffer}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                {(daySlots.length > 0 ||
                  isHoliday ||
                  examPeriods.some(
                    (ep) => dateStr >= ep.startDate && dateStr <= ep.endDate,
                  )) && (
                  <TooltipContent side="top" className="max-w-[240px]">
                    <p className="font-semibold text-xs mb-1.5">{dateStr}</p>

                    {isHoliday && (
                      <div className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                        <span>🎉</span>
                        <span>
                          {holidayMap.get(dateStr)?.name ?? "Holiday"}
                        </span>
                      </div>
                    )}

                    {!isHoliday &&
                      examPeriods.some(
                        (ep) =>
                          dateStr >= ep.startDate && dateStr <= ep.endDate,
                      ) && (
                        <div className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                          <span>📝</span>
                          <span>Exam period — no classes</span>
                        </div>
                      )}

                    {daySlots.length > 0 &&
                      daySlots.map((slot) => {
                        const sub = subjectMap.get(slot.subjectId);
                        if (!sub) return null;
                        const isPast = dateStr <= today;

                        if (isPast) {
                          const rec = records.find(
                            (r) =>
                              r.subjectId === slot.subjectId &&
                              r.date === dateStr &&
                              r.slotId === slot.id,
                          );
                          return (
                            <div
                              key={slot.id}
                              className="text-[11px] flex justify-between gap-2"
                            >
                              <span>
                                {sub.name}
                                {slot.weight === 3 ? " 🔬" : ""}
                              </span>
                              <span className="text-muted-foreground">
                                {rec
                                  ? rec.status.charAt(0) +
                                    rec.status.slice(1).toLowerCase()
                                  : "—"}
                              </span>
                            </div>
                          );
                        }

                        const subjectRecords = records.filter(
                          (r) =>
                            r.subjectId === slot.subjectId &&
                            r.status !== "CANCELLED",
                        );
                        const curTotal = subjectRecords.reduce(
                          (s, r) => s + r.weightSnapshot,
                          0,
                        );
                        const curAttended = subjectRecords
                          .filter((r) => r.status === "PRESENT")
                          .reduce((s, r) => s + r.weightSnapshot, 0);
                        const curPct =
                          curTotal > 0 ? (curAttended / curTotal) * 100 : 100;
                        const skipPct =
                          curTotal + slot.weight > 0
                            ? (curAttended / (curTotal + slot.weight)) * 100
                            : 100;
                        const cp = predictions
                          .get(dateStr)
                          ?.classPredictions?.find((c) => c.slotId === slot.id);
                        const skipColor =
                          cp?.skipState === "RED"
                            ? "text-attendance-red"
                            : cp?.skipState === "YELLOW"
                              ? "text-attendance-yellow"
                              : "text-attendance-green";
                        const skipLabel =
                          cp?.skipState === "RED"
                            ? "Must attend"
                            : cp?.skipState === "YELLOW"
                              ? "Borderline"
                              : "Safe to skip";

                        return (
                          <div
                            key={slot.id}
                            className="text-[11px] space-y-0.5 mb-1.5 last:mb-0"
                          >
                            <div className="flex justify-between gap-2">
                              <span className="font-semibold">
                                {sub.name}
                                {slot.weight === 3 ? " 🔬" : ""}
                              </span>
                              <span className={`font-semibold ${skipColor}`}>
                                {skipLabel}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2 text-muted-foreground">
                              <span>If skipped:</span>
                              <span>
                                {curPct.toFixed(1)}% →{" "}
                                <span className={skipColor}>
                                  {skipPct.toFixed(1)}%
                                </span>{" "}
                                (min {sub.minimumRequiredPercentage}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center">
          {(
            [
              ["GREEN", "Safe / All present"],
              ["YELLOW", "Warning / Near limit"],
              ["RED", "Danger / Below minimum"],
              ["GREY", "Off / Holiday"],
              ["BLUE", "Exam period"],
            ] as const
          ).map(([st, label]) => (
            <div key={st} className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded-sm ${CELL_COLORS[st]}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Past day edit modal ──────────────────────────────── */}
      <Dialog
        open={selectedDate !== null && selectedIsPast}
        onOpenChange={(o) => {
          if (!o) setSelectedDate(null);
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto pb-20">
          <DialogHeader>
            <DialogTitle className="font-mono">{selectedDate}</DialogTitle>
          </DialogHeader>

          {/* Holiday banner inside dialog */}
          {selectedHoliday && (
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3">
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                🎉 {selectedHoliday.name || "Holiday"} — Holiday
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-destructive/10 shrink-0 ml-2"
                onClick={() => openDeleteConfirm(selectedHoliday)}
                title="Delete holiday"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}

          {(() => {
            const extraRecs = selectedDate
              ? records.filter((r) => r.date === selectedDate && r.isExtra)
              : [];
            const hasContent = selectedSlots.length > 0 || extraRecs.length > 0;

            return hasContent ? (
              <>
                {selectedSlots.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bulkMark("PRESENT")}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      All Present
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bulkMark("ABSENT")}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      All Absent
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bulkMark("CANCELLED")}
                    >
                      <Ban className="h-3.5 w-3.5 mr-1" />
                      All Cancelled
                    </Button>
                    <Button size="sm" variant="ghost" onClick={bulkClear}>
                      <Eraser className="h-3.5 w-3.5 mr-1" />
                      Clear all
                    </Button>
                  </div>
                )}
                <div className="space-y-3">
                  {selectedSlots.map((slot) => {
                    const sub = subjectMap.get(slot.subjectId);
                    if (!sub) return null;
                    const rec = records.find(
                      (r) =>
                        r.subjectId === slot.subjectId &&
                        r.date === selectedDate &&
                        r.slotId === slot.id,
                    );
                    return (
                      <div
                        key={slot.id}
                        className="rounded-lg border border-border p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-sm text-card-foreground">
                              {sub.name}
                            </span>
                            {slot.weight === 3 && (
                              <Badge
                                variant="secondary"
                                className="ml-2 text-[10px]"
                              >
                                LAB
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {slot.startTime}–{slot.endTime}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Status:{" "}
                          <span className="font-medium text-foreground">
                            {rec
                              ? rec.status.charAt(0) +
                                rec.status.slice(1).toLowerCase()
                              : "Not marked"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(["PRESENT", "ABSENT", "CANCELLED"] as const).map(
                            (st) => (
                              <Button
                                key={st}
                                size="sm"
                                variant={
                                  rec?.status === st ? "default" : "outline"
                                }
                                className={`flex-1 min-w-[30%] text-xs ${rec?.status === st ? STATUS_STYLES[st] : ""}`}
                                onClick={() =>
                                  handleMark(
                                    slot.subjectId,
                                    slot.id,
                                    slot.weight,
                                    st,
                                  )
                                }
                              >
                                {st === "PRESENT" && (
                                  <Check className="h-3 w-3 mr-0.5" />
                                )}
                                {st === "ABSENT" && (
                                  <X className="h-3 w-3 mr-0.5" />
                                )}
                                {st === "CANCELLED" && (
                                  <Ban className="h-3 w-3 mr-0.5" />
                                )}
                                {st.charAt(0) + st.slice(1).toLowerCase()}
                              </Button>
                            ),
                          )}
                          {rec && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 min-w-[30%]"
                              onClick={() =>
                                handleClear(slot.subjectId, slot.id)
                              }
                            >
                              <Eraser className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {extraRecs.map((rec) => {
                    const sub = subjectMap.get(rec.subjectId);
                    if (!sub) return null;
                    return (
                      <div
                        key={rec.slotId}
                        className="rounded-lg border border-border p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-card-foreground">
                              {sub.name}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              Extra
                            </Badge>
                            {rec.weightSnapshot === 3 && (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                LAB
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              deleteExtraClass(rec.slotId, rec.date)
                            }
                            title="Delete extra class"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Status:{" "}
                          <span className="font-medium text-foreground">
                            {rec.status.charAt(0) +
                              rec.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(["PRESENT", "ABSENT", "CANCELLED"] as const).map(
                            (st) => (
                              <Button
                                key={st}
                                size="sm"
                                variant={
                                  rec.status === st ? "default" : "outline"
                                }
                                className={`flex-1 min-w-[30%] text-xs ${rec.status === st ? STATUS_STYLES[st] : ""}`}
                                onClick={() =>
                                  handleMark(
                                    rec.subjectId,
                                    rec.slotId,
                                    rec.weightSnapshot,
                                    st,
                                  )
                                }
                              >
                                {st === "PRESENT" && (
                                  <Check className="h-3 w-3 mr-0.5" />
                                )}
                                {st === "ABSENT" && (
                                  <X className="h-3 w-3 mr-0.5" />
                                )}
                                {st === "CANCELLED" && (
                                  <Ban className="h-3 w-3 mr-0.5" />
                                )}
                                {st.charAt(0) + st.slice(1).toLowerCase()}
                              </Button>
                            ),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setExtraModalOpen(true)}
                  className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-border p-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add extra class
                </button>
              </>
            ) : (
              <>
                {!selectedHoliday && (
                  <p className="text-sm text-muted-foreground">
                    No classes this day.
                  </p>
                )}
                <button
                  onClick={() => setExtraModalOpen(true)}
                  className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-border p-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add extra class
                </button>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Future day preview sheet ─────────────────────────── */}
      <Sheet
        open={selectedDate !== null && !selectedIsPast}
        onOpenChange={(o) => {
          if (!o) setSelectedDate(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[60vh] rounded-t-2xl inset-x-4 mx-auto max-w-lg bottom-[20vh]"
        >
          <SheetHeader>
            <SheetTitle className="font-mono">
              {(() => {
                const [y, m, d] = (selectedDate ?? "").split("-").map(Number);
                const dt = new Date(y, m - 1, d);
                const dayName = dt.toLocaleDateString("en-US", {
                  weekday: "long",
                });
                return selectedHoliday
                  ? `${dayName}, ${selectedDate}`
                  : `${dayName}, ${selectedDate} — Predictions`;
              })()}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-3 mt-4">
            {/* Holiday banner inside sheet */}
            {selectedHoliday && (
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3">
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  🎉 {selectedHoliday.name || "Holiday"} — Holiday
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-destructive/10 shrink-0 ml-2"
                  onClick={() => openDeleteConfirm(selectedHoliday)}
                  title="Delete holiday"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}

            {!selectedHoliday &&
              selectedPred?.classPredictions
                .filter(
                  (cp) =>
                    filterSubjectId === "all" ||
                    cp.subjectId === filterSubjectId,
                )
                .map((cp) => {
                  const sub = subjectMap.get(cp.subjectId);
                  const slot = timetable.find((s) => s.id === cp.slotId);
                  if (!sub) return null;
                  const label =
                    cp.skipState === "RED"
                      ? "Must attend"
                      : cp.skipState === "YELLOW"
                        ? "Recommended"
                        : "Safe to skip";
                  const color =
                    cp.skipState === "RED"
                      ? "text-attendance-red"
                      : cp.skipState === "YELLOW"
                        ? "text-attendance-yellow"
                        : "text-attendance-green";
                  return (
                    <div
                      key={cp.slotId}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <span className="font-semibold text-sm">
                          {sub.name}
                        </span>
                        {(slot?.weight ?? 1) === 3 && (
                          <Badge
                            variant="secondary"
                            className="ml-2 text-[10px]"
                          >
                            LAB
                          </Badge>
                        )}
                        {slot && (
                          <span className="text-xs text-muted-foreground ml-2 font-mono">
                            {slot.startTime}–{slot.endTime}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-semibold ${color}`}>
                        {label}
                      </span>
                    </div>
                  );
                })}

            {!selectedHoliday &&
              (!selectedPred || selectedPred.classPredictions.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No predictions available.
                </p>
              )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Holiday delete confirmation ──────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete holiday?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete &ldquo;{deleteTarget?.name || "Holiday"}&rdquo; from
            holidays? This will restore normal class schedule for this day.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteHoliday}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extra class modal */}
      {selectedDate && (
        <AddExtraClassModal
          open={extraModalOpen}
          onClose={() => setExtraModalOpen(false)}
          subjects={subjects}
          date={selectedDate}
          records={records}
          onAdd={(subjectId, weight) => {
            addExtraClass(subjectId, selectedDate, weight);
            setExtraModalOpen(false);
          }}
        />
      )}
    </PageShell>
  );
}

import { useState } from "react";
import { useAppState } from "@/context/AppContext";
import {
  computeAttendanceStats,
  getSubjectState,
  computeAttendanceInsight,
} from "@/engine/attendanceEngine";
import type { AttendanceStatus, DayState, Holiday } from "@/types/attendance";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, Eraser, Plus, Trash2 } from "lucide-react";
import OverallAttendance from "@/components/OverallAttendance";
import AddExtraClassModal from "@/components/AddExtraClassModal";
import { toast } from "sonner";

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00").getDay();
  return d === 0 ? 7 : d;
}

const stateColorMap: Record<DayState, string> = {
  GREEN: "text-attendance-green",
  YELLOW: "text-attendance-yellow",
  RED: "text-attendance-red",
  GREY: "text-attendance-grey",
  BLUE: "text-attendance-blue",
};

const stateBorderMap: Record<DayState, string> = {
  GREEN: "border-l-attendance-green",
  YELLOW: "border-l-attendance-yellow",
  RED: "border-l-attendance-red",
  GREY: "border-l-border",
  BLUE: "border-l-attendance-blue",
};

// ── Status badge configs ──────────────────────────────────────────────────────

const statusBadge: Record<AttendanceStatus, string> = {
  PRESENT:
    "bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-400",
  ABSENT:
    "bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-400",
  CANCELLED:
    "bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400",
};

const statusBadgeLabel: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  CANCELLED: "Cancelled",
};

// Selected-button highlight classes (outline base + colour tint)
const selectedBtnClass: Record<AttendanceStatus, string> = {
  PRESENT:
    "border-green-500 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
  ABSENT:
    "border-red-500   text-red-600   bg-red-50   dark:bg-red-900/20   dark:text-red-400",
  CANCELLED:
    "border-gray-400  text-gray-600  bg-gray-100 dark:bg-gray-800     dark:text-gray-400",
};

export default function HomePage() {
  const {
    subjects,
    timetable,
    records,
    allHolidays,
    holidays,
    examPeriods,
    markAttendance,
    clearMark,
    addExtraClass,
    deleteAutoHoliday,
    setHolidays,
    loadTestData,
    selectedDate,
  } = useAppState();

  const dow = getDayOfWeek(selectedDate);
  const [extraModalOpen, setExtraModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  const todayHoliday = allHolidays.find((h) => h.date === selectedDate) ?? null;
  const isHoliday = todayHoliday !== null;
  const isExam = examPeriods.some(
    (ep) => selectedDate >= ep.startDate && selectedDate <= ep.endDate,
  );

  const todaySlots = timetable
    .filter((slot) => slot.dayOfWeek === dow)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const uniqueSlots = todaySlots.filter(
    (slot, index, self) => index === self.findIndex((s) => s.id === slot.id),
  );

  console.log("DEBUG START");
  console.log("subjects:", subjects.length);
  console.log("timetable:", timetable.length);
  console.log("records:", records.length);
  console.log("todaySlots:", todaySlots.length);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const getRecord = (subjectId: string, slotId: string) =>
    records.find(
      (r) =>
        r.subjectId === subjectId && r.date === selectedDate && r.slotId === slotId,
    );

  const mark = (subjectId: string, slotId: string, weight: number, status: AttendanceStatus) => {
    markAttendance(subjectId, selectedDate, slotId, weight, status);
    if (status === "PRESENT") toast.success("Marked Present");
    else if (status === "ABSENT") toast.success("Marked Absent");
    else if (status === "CANCELLED") toast.success("Marked Cancelled");
  };

  const bulkMark = (status: AttendanceStatus) => {
    todaySlots.forEach((slot) => {
      markAttendance(slot.subjectId, selectedDate, slot.id, slot.weight, status);
    });
  };

  const bulkClear = () => {
    todaySlots.forEach((slot) => {
      clearMark(slot.subjectId, selectedDate, slot.id);
    });
  };

  const confirmDeleteHoliday = () => {
    if (!deleteTarget) return;
    const type = deleteTarget.type;
    if (type === "national" || type === "state") {
      if (deleteTarget.id) deleteAutoHoliday(deleteTarget.id);
    } else {
      if (deleteTarget.id) {
        setHolidays(holidays.filter((h) => h.id !== deleteTarget.id));
      } else {
        setHolidays(holidays.filter((h) => h.date !== deleteTarget.date));
      }
    }
    setDeleteTarget(null);
  };

  // ── Today status summary ──────────────────────────────────────────────────
  const subjectStats = subjects.map((s) => ({
    percentage: computeAttendanceStats(s, records).percentage,
    minimum: s.minimumRequiredPercentage,
  }));

  const todayStatus: "safe" | "warning" | "danger" = subjectStats.some(
    (s) => s.percentage < s.minimum,
  )
    ? "danger"
    : subjectStats.some((s) => s.percentage < s.minimum + 5)
      ? "warning"
      : "safe";

  const statusConfig = {
    safe: {
      bg: "bg-green-500",
      title: "You're safe today",
      sub: "All subjects above required attendance",
    },
    warning: {
      bg: "bg-yellow-500",
      title: "Be careful today",
      sub: "Some subjects are close to minimum",
    },
    danger: {
      bg: "bg-red-500",
      title: "You must attend classes",
      sub: "Attendance below required level",
    },
  };

  if (subjects.length === 0) {
    return (
      <PageShell title="Today">
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center animate-fade-in">
          <div className="rounded-2xl bg-muted p-6">
            <BookEmoji />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            No subjects yet
          </h2>
          <p className="text-sm text-muted-foreground">
            Add subjects and timetable in Settings, or load test data to try it
            out.
          </p>
          <Button onClick={loadTestData} variant="default" size="lg">
            Load Test Data
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Today"
      actions={
        uniqueSlots.length > 0 && !isHoliday && !isExam ? (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => bulkMark("PRESENT")} title="All Present">
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={bulkClear} title="Clear All">
              <Eraser className="h-4 w-4" />
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="rounded-2xl border border-border p-4 mb-4 flex items-center justify-between">
        {/* LEFT: existing OverallAttendance */}
        <div>
          <OverallAttendance />
        </div>

        {/* RIGHT: status text */}
        {!isHoliday && !isExam && subjectStats.length > 0 && (
          <div className="text-right">
            <p
              className={`text-sm font-bold ${
                todayStatus === "danger"
                  ? "text-red-500"
                  : todayStatus === "warning"
                    ? "text-yellow-500"
                    : "text-green-500"
              }`}
            >
              {statusConfig[todayStatus].title}
            </p>
            <p className="text-xs text-muted-foreground">
              {statusConfig[todayStatus].sub}
            </p>
          </div>
        )}
      </div>

      <p className="mb-4 mt-3 text-xs text-muted-foreground font-mono tracking-wide">
        {selectedDate}
        {selectedDate !== getTodayStr() && (
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            Viewing past date
          </span>
        )}
      </p>

      {/* ── Holiday banner ─────────────────────────────────── */}
      {isHoliday && todayHoliday && (
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3.5 mb-4 animate-fade-in shadow-sm">
          <span className="text-base font-semibold text-amber-800 dark:text-amber-200">
            🎉 {todayHoliday.name || "Holiday"} — Holiday
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-destructive/10 shrink-0 ml-2 transition-colors duration-200"
            onClick={() => setDeleteTarget(todayHoliday)}
            title="Delete holiday"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}

      {isExam && (
        <div className="rounded-2xl bg-attendance-blue-muted px-4 py-3.5 text-center text-attendance-blue-foreground animate-fade-in mb-4 shadow-sm font-medium">
          📝 Exam period — no classes today
        </div>
      )}

      {!isHoliday &&
        !isExam &&
        uniqueSlots.length === 0 && (
          <div className="rounded-2xl bg-muted px-4 py-6 text-center text-muted-foreground animate-fade-in">
            <p className="text-2xl mb-2">😴</p>
            <p className="text-sm font-medium">No classes today</p>
          </div>
        )}

      {/* ── Subject cards ─────────────────────────────────── */}
      <div
        className={`flex flex-col gap-4 animate-fade-in transition-opacity ${isHoliday ? "opacity-40 pointer-events-none select-none" : ""}`}
      >
        {/* Timetable slots */}
        {!isExam &&
          uniqueSlots.map((slot) => {
            const subject = subjectMap.get(slot.subjectId);
            if (!subject) return null;
            const record = getRecord(slot.subjectId, slot.id);
            const stats = computeAttendanceStats(subject, records);
            const insight = computeAttendanceInsight(subject, records);
            console.log(subject.name, insight);
            const state = getSubjectState(
              stats.percentage,
              subject.minimumRequiredPercentage,
            );

            return (
              <div
                key={slot.id}
                className={`rounded-2xl border-l-4 border border-border bg-card p-4 shadow-md hover:shadow-lg transition-all duration-200 ${stateBorderMap[state]}`}
              >
                {/* Header: subject info + status badge + erase */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg text-card-foreground leading-tight">
                      {subject.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {slot.startTime}–{slot.endTime}
                      {slot.weight === 3 && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          LAB
                        </Badge>
                      )}
                    </p>
                  </div>

                  {/* Top-right: status badge + percentage + erase */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                    <div className="flex items-center gap-2">
                      {/* Status badge */}
                      {record?.status && (
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            record.status === "PRESENT"
                              ? "bg-green-100 text-green-700"
                              : record.status === "ABSENT"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {record.status}
                        </span>
                      )}
                      {/* Erase — only when marked */}
                      {record && (
                        <button
                          onClick={() => clearMark(slot.subjectId, selectedDate, slot.id)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
                          title="Clear mark"
                        >
                          <Eraser className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <span
                      className={`text-2xl font-bold font-mono leading-none ${stateColorMap[state]}`}
                    >
                      {stats.percentage.toFixed(1)}%
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      min {subject.minimumRequiredPercentage}%
                    </p>
                  </div>
                </div>

                {/* Action buttons — grid 3 cols */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    className="flex-1 h-12 active:scale-95 transition-all duration-150"
                    variant={record?.status === "PRESENT" ? "default" : "outline"}
                    disabled={record?.status === "PRESENT"}
                    onClick={() => mark(slot.subjectId, slot.id, slot.weight, "PRESENT")}
                  >
                    Present
                  </Button>
                  <Button
                    className={`flex-1 h-12 active:scale-95 transition-all duration-150 ${record?.status === "ABSENT" ? "border-red-500 text-red-600 bg-red-50" : ""}`}
                    variant="outline"
                    disabled={record?.status === "ABSENT"}
                    onClick={() => mark(slot.subjectId, slot.id, slot.weight, "ABSENT")}
                  >
                    Absent
                  </Button>
                  <Button
                    className={`flex-1 h-12 active:scale-95 transition-all duration-150 ${record?.status === "CANCELLED" ? "border-gray-500 text-gray-600 bg-gray-100" : ""}`}
                    variant="outline"
                    disabled={record?.status === "CANCELLED"}
                    onClick={() => mark(slot.subjectId, slot.id, slot.weight, "CANCELLED")}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            );
          })}

        {/* Add extra class */}
        {!isHoliday && !isExam && subjects.length > 0 && (
          <button
            onClick={() => setExtraModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-4 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-muted-foreground transition-all duration-200 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add extra class
          </button>
        )}
      </div>

      <AddExtraClassModal
        open={extraModalOpen}
        onClose={() => setExtraModalOpen(false)}
        subjects={subjects}
        date={selectedDate}
        records={records}
        onAdd={(subjectId, weight) => addExtraClass(subjectId, selectedDate, weight)}
      />

      {/* ── Holiday delete confirmation ─────────────────────── */}
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
    </PageShell>
  );
}

function BookEmoji() {
  return <span className="text-4xl">📚</span>;
}

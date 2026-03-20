import { useState } from "react";
import { useAppState } from "@/context/AppContext";
import { computeAttendanceStats, getSubjectState } from "@/engine/attendanceEngine";
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
import { Check, X, Ban, Eraser, Plus, Trash2 } from "lucide-react";
import OverallAttendance from "@/components/OverallAttendance";
import AddExtraClassModal from "@/components/AddExtraClassModal";

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00").getDay();
  return d === 0 ? 7 : d;
}

const statusStyles: Record<AttendanceStatus, string> = {
  PRESENT: "bg-attendance-green text-attendance-green-foreground",
  ABSENT: "bg-attendance-red text-attendance-red-foreground",
  CANCELLED: "bg-attendance-grey text-attendance-grey-foreground",
};

const stateColorMap: Record<DayState, string> = {
  GREEN: "text-attendance-green",
  YELLOW: "text-attendance-yellow",
  RED: "text-attendance-red",
  GREY: "text-attendance-grey",
  BLUE: "text-attendance-blue",
};

export default function HomePage() {
  const {
    subjects, timetable, records,
    allHolidays, holidays,
    examPeriods,
    markAttendance, clearMark, addExtraClass, deleteExtraClass,
    deleteAutoHoliday, setHolidays,
    loadTestData,
  } = useAppState();

  const today = getTodayStr();
  const dow = getDayOfWeek(today);
  const [extraModalOpen, setExtraModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  const todayHoliday = allHolidays.find((h) => h.date === today) ?? null;
  const isHoliday = todayHoliday !== null;
  const isExam = examPeriods.some((ep) => today >= ep.startDate && today <= ep.endDate);

  const todaySlots = timetable
    .filter((s) => s.dayOfWeek === dow)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const extraRecords = records.filter((r) => r.date === today && r.isExtra);
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const getRecord = (subjectId: string, slotId: string) =>
    records.find((r) => r.subjectId === subjectId && r.date === today && r.slotId === slotId);

  const bulkMark = (status: AttendanceStatus) => {
    todaySlots.forEach((slot) => {
      markAttendance(slot.subjectId, today, slot.id, slot.weight, status);
    });
  };

  const bulkClear = () => {
    todaySlots.forEach((slot) => {
      clearMark(slot.subjectId, today, slot.id);
    });
  };

  const confirmDeleteHoliday = () => {
    if (!deleteTarget) return;
    const type = deleteTarget.type;
    if (type === "national" || type === "state") {
      if (deleteTarget.id) deleteAutoHoliday(deleteTarget.id);
    } else {
      // manual — remove from manual holidays list
      if (deleteTarget.id) {
        setHolidays(holidays.filter((h) => h.id !== deleteTarget.id));
      } else {
        setHolidays(holidays.filter((h) => h.date !== deleteTarget.date));
      }
    }
    setDeleteTarget(null);
  };

  if (subjects.length === 0) {
    return (
      <PageShell title="Today">
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center animate-fade-in">
          <div className="rounded-2xl bg-muted p-6">
            <BookEmoji />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No subjects yet</h2>
          <p className="text-sm text-muted-foreground">
            Add subjects and timetable in Settings, or load test data to try it out.
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
        todaySlots.length > 0 && !isHoliday && !isExam ? (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => bulkMark("PRESENT")} title="All Present">
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkMark("ABSENT")} title="All Absent">
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkMark("CANCELLED")} title="All Cancelled">
              <Ban className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={bulkClear} title="Clear All">
              <Eraser className="h-4 w-4" />
            </Button>
          </div>
        ) : undefined
      }
    >
      <OverallAttendance />
      <p className="mb-4 mt-3 text-sm text-muted-foreground font-mono">{today}</p>

      {/* ── Holiday banner ─────────────────────────────────── */}
      {isHoliday && todayHoliday && (
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3 mb-4 animate-fade-in">
          <span className="text-base font-semibold text-amber-800 dark:text-amber-200">
            🎉 {todayHoliday.name || "Holiday"} — Holiday
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-destructive/10 shrink-0 ml-2"
            onClick={() => setDeleteTarget(todayHoliday)}
            title="Delete holiday"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}

      {isExam && (
        <div className="rounded-lg bg-attendance-blue-muted p-4 text-center text-attendance-blue-foreground animate-fade-in mb-4">
          📝 Exam period
        </div>
      )}

      {!isHoliday && !isExam && todaySlots.length === 0 && extraRecords.length === 0 && (
        <div className="rounded-lg bg-muted p-4 text-center text-muted-foreground animate-fade-in">
          No classes scheduled today
        </div>
      )}

      {/* Subject cards — shown greyed out on holidays */}
      <div className={`flex flex-col gap-3 animate-fade-in transition-opacity ${isHoliday ? "opacity-40 pointer-events-none select-none" : ""}`}>
        {/* Regular timetable slots */}
        {!isExam && todaySlots.map((slot) => {
          const subject = subjectMap.get(slot.subjectId);
          if (!subject) return null;
          const record = getRecord(slot.subjectId, slot.id);
          const stats = computeAttendanceStats(subject, records);
          const state = getSubjectState(stats.percentage, subject.minimumRequiredPercentage);

          return (
            <div key={slot.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-card-foreground">{subject.name}</h3>
                <span className={`text-sm font-bold font-mono ${stateColorMap[state]}`}>
                  {stats.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(["PRESENT", "ABSENT", "CANCELLED"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={record?.status === status ? "default" : "outline"}
                    className={record?.status === status ? statusStyles[status] : ""}
                    onClick={() => markAttendance(slot.subjectId, today, slot.id, slot.weight, status)}
                  >
                    {status === "PRESENT" && <Check className="h-3.5 w-3.5" />}
                    {status === "ABSENT" && <X className="h-3.5 w-3.5" />}
                    {status === "CANCELLED" && <Ban className="h-3.5 w-3.5" />}
                  </Button>
                ))}
                {record && (
                  <Button size="sm" variant="ghost" onClick={() => clearMark(slot.subjectId, today, slot.id)}>
                    <Eraser className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* Extra class cards */}
        {!isExam && extraRecords.map((rec) => {
          const subject = subjectMap.get(rec.subjectId);
          if (!subject) return null;
          const stats = computeAttendanceStats(subject, records);
          const state = getSubjectState(stats.percentage, subject.minimumRequiredPercentage);

          return (
            <div key={rec.slotId} className="rounded-xl border border-border bg-card p-4 shadow-sm relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-card-foreground">{subject.name}</h3>
                  <Badge variant="secondary" className="text-[10px]">Extra</Badge>
                  {rec.weightSnapshot === 3 && (
                    <Badge variant="secondary" className="text-[10px]">LAB</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold font-mono ${stateColorMap[state]}`}>
                    {stats.percentage.toFixed(1)}%
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteExtraClass(rec.slotId, today)}
                    title="Delete extra class"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(["PRESENT", "ABSENT", "CANCELLED"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={rec.status === status ? "default" : "outline"}
                    className={rec.status === status ? statusStyles[status] : ""}
                    onClick={() => markAttendance(rec.subjectId, today, rec.slotId, rec.weightSnapshot, status)}
                  >
                    {status === "PRESENT" && <Check className="h-3.5 w-3.5" />}
                    {status === "ABSENT" && <X className="h-3.5 w-3.5" />}
                    {status === "CANCELLED" && <Ban className="h-3.5 w-3.5" />}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Add extra class button */}
        {!isHoliday && !isExam && subjects.length > 0 && (
          <button
            onClick={() => setExtraModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors active-press"
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
        date={today}
        records={records}
        onAdd={(subjectId, weight) => addExtraClass(subjectId, today, weight)}
      />

      {/* ── Holiday delete confirmation ─────────────────────── */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete holiday?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete &ldquo;{deleteTarget?.name || "Holiday"}&rdquo; from holidays?
            This will restore normal class schedule for this day.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteHoliday}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function BookEmoji() {
  return <span className="text-4xl">📚</span>;
}

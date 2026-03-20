import { useState, useMemo } from "react";
import { useAppState } from "@/context/AppContext";
import { computeAttendanceStats } from "@/engine/attendanceEngine";
import PageShell from "@/components/PageShell";
import TimetableGrid from "@/components/timetable/TimetableGrid";
import TimetableEditor from "@/components/timetable/TimetableEditor";
import { Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TimetablePage() {
  const { subjects, timetable, records, setTimetable } = useAppState();
  const [editing, setEditing] = useState(false);

  // Overall attendance for header badge
  const overallStats = useMemo(() => {
    let attended = 0, total = 0;
    for (const sub of subjects) {
      const stats = computeAttendanceStats(sub, records);
      attended += stats.attendedWeighted;
      total += stats.totalWeighted;
    }
    const pct = total > 0 ? Math.min(100, Math.max(0, (attended / total) * 100)) : -1;
    const minReq = subjects.length > 0 ? Math.min(...subjects.map((s) => s.minimumRequiredPercentage)) : 75;
    return { pct, attended, total, minReq };
  }, [subjects, records]);

  return (
    <PageShell
      title="Timetable"
      actions={
        <div className="flex items-center gap-2">
          {!editing && overallStats.pct >= 0 && (
            <span className="text-xs font-mono font-semibold border border-border rounded-lg px-2.5 py-1 text-foreground">
              {overallStats.pct.toFixed(2)} | {overallStats.minReq}
            </span>
          )}
          <Button
            size="icon"
            variant={editing ? "default" : "ghost"}
            className="h-9 w-9"
            onClick={() => setEditing(!editing)}
          >
            {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </Button>
        </div>
      }
    >
      {subjects.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          Add subjects in Settings first.
        </div>
      ) : editing ? (
        <TimetableEditor
          timetable={timetable}
          subjects={subjects}
          onSave={setTimetable}
        />
      ) : (
        <TimetableGrid timetable={timetable} subjects={subjects} />
      )}
    </PageShell>
  );
}

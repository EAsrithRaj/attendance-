import { useMemo } from "react";
import { useAppState } from "@/context/AppContext";
import { getSubjectState } from "@/engine/attendanceEngine";
import type { DayState } from "@/types/attendance";

const stateColor: Record<DayState, string> = {
  GREEN: "text-attendance-green",
  YELLOW: "text-attendance-yellow",
  RED: "text-attendance-red",
  GREY: "text-muted-foreground",
  BLUE: "text-attendance-blue",
};

export default function OverallAttendance() {
  const { subjects, records, semester } = useAppState();

  const stats = useMemo(() => {
    if (subjects.length === 0) return null;

    let totalWeighted = 0;
    let attendedWeighted = 0;

    // Filter records within semester range
    const semRecords = records.filter(
      (r) => r.date >= semester.startDate && r.date <= semester.endDate
    );

    for (const rec of semRecords) {
      if (rec.status === "CANCELLED") continue;
      totalWeighted += rec.weightSnapshot;
      if (rec.status === "PRESENT") {
        attendedWeighted += rec.weightSnapshot;
      }
    }

    const percentage = totalWeighted > 0
      ? Math.min(100, Math.max(0, (attendedWeighted / totalWeighted) * 100))
      : 0;

    // Use the lowest subject minimum as the global minimum
    const globalMin = Math.min(...subjects.map((s) => s.minimumRequiredPercentage));
    const state = totalWeighted > 0 ? getSubjectState(percentage, globalMin) : "GREY";

    return { totalWeighted, attendedWeighted, percentage, state, hasData: totalWeighted > 0 };
  }, [subjects, records, semester]);

  if (!stats || subjects.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-fade-in">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
        Overall Attendance
      </p>
      {stats.hasData ? (
        <>
          <p className={`text-3xl font-bold font-mono ${stateColor[stats.state]}`}>
            {stats.percentage.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground font-mono">
            {stats.attendedWeighted} / {stats.totalWeighted}
          </p>
        </>
      ) : (
        <p className="text-3xl font-bold font-mono text-muted-foreground">—</p>
      )}
    </div>
  );
}

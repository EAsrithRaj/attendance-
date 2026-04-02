import { useMemo } from "react";
import { useAppState } from "@/context/AppContext";
import { calculateGlobalStats } from "@/engine/attendanceEngine";

type GlobalBand = "goal" | "surviving" | "risk";

const bandText: Record<GlobalBand, string> = {
  goal: "Global Goal Met",
  surviving: "Surviving, but below target",
  risk: "Overall At Risk",
};

const bandPctColor: Record<GlobalBand, string> = {
  goal: "text-attendance-green",
  surviving: "text-attendance-yellow",
  risk: "text-attendance-red",
};

const bandStatusColor: Record<GlobalBand, string> = {
  goal: "text-green-600 dark:text-green-400",
  surviving: "text-yellow-600 dark:text-yellow-500",
  risk: "text-red-600 dark:text-red-400",
};

export default function OverallAttendance() {
  const { subjects, records, semester } = useAppState();

  const stats = useMemo(() => {
    if (subjects.length === 0) return null;

    const semRecords = records.filter(
      (r) => r.date >= semester.startDate && r.date <= semester.endDate,
    );

    const global = calculateGlobalStats(subjects, semRecords);

    let band: GlobalBand;
    if (global.percentage >= global.weightedTarget) {
      band = "goal";
    } else if (global.percentage >= global.weightedMinimum) {
      band = "surviving";
    } else {
      band = "risk";
    }

    const hasData = global.totalPossibleWeighted > 0;

    return {
      totalWeighted: global.totalPossibleWeighted,
      attendedWeighted: global.totalAttendedWeighted,
      percentage: global.percentage,
      band,
      hasData,
    };
  }, [subjects, records, semester]);

  if (!stats || subjects.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-fade-in">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
        Overall Attendance
      </p>
      {stats.hasData ? (
        <>
          <p
            className={`text-3xl font-bold font-mono ${bandPctColor[stats.band]}`}
          >
            {stats.percentage.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground font-mono">
            Semester progress: {stats.attendedWeighted} / {stats.totalWeighted} units
          </p>
        </>
      ) : (
        <>
          <p className="text-3xl font-bold font-mono text-muted-foreground">—</p>
          <p className="text-sm text-muted-foreground font-mono">
            Semester progress: 0 / 0 units
          </p>
        </>
      )}
      <p
        className={`text-xs font-semibold mt-2 leading-snug ${bandStatusColor[stats.band]}`}
      >
        {bandText[stats.band]}
      </p>
    </div>
  );
}

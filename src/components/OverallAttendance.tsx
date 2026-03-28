import { useMemo } from "react";
import { useAppState } from "@/context/AppContext";

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

    let totalWeighted = 0;
    let attendedWeighted = 0;

    const semRecords = records.filter(
      (r) => r.date >= semester.startDate && r.date <= semester.endDate,
    );

    for (const rec of semRecords) {
      if (rec.status === "CANCELLED") continue;
      totalWeighted += rec.weightSnapshot;
      if (rec.status === "PRESENT") {
        attendedWeighted += rec.weightSnapshot;
      }
    }

    const globalPercentage =
      totalWeighted > 0
        ? Math.min(100, Math.max(0, (attendedWeighted / totalWeighted) * 100))
        : 0;

    const globalMinimum =
      subjects.reduce((acc, s) => acc + s.minimumRequiredPercentage, 0) /
      subjects.length;

    const globalTarget =
      subjects.reduce(
        (acc, s) => acc + (s.targetPercentage ?? s.minimumRequiredPercentage),
        0,
      ) / subjects.length;

    let band: GlobalBand;
    if (globalPercentage >= globalTarget) {
      band = "goal";
    } else if (globalPercentage >= globalMinimum) {
      band = "surviving";
    } else {
      band = "risk";
    }

    const hasData = totalWeighted > 0;

    return {
      totalWeighted,
      attendedWeighted,
      percentage: globalPercentage,
      globalMinimum,
      globalTarget,
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
            {stats.attendedWeighted} / {stats.totalWeighted} classes attended
          </p>
        </>
      ) : (
        <>
          <p className="text-3xl font-bold font-mono text-muted-foreground">—</p>
          <p className="text-sm text-muted-foreground font-mono">
            0 / 0 classes attended
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

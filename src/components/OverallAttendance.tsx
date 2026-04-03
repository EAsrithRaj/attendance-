import { useMemo } from "react";
import { useAppState } from "@/context/AppContext";
import { calculateGlobalStats, computeBunkBudget } from "@/engine/attendanceEngine";

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
  const { subjects, records, timetable, semester } = useAppState();

  const stats = useMemo(() => {
    if (subjects.length === 0) return null;

    const semRecords = records.filter(
      (r) => r.date >= semester.startDate && r.date <= semester.endDate,
    );

    const global = calculateGlobalStats(subjects, semRecords, timetable);

    let band: GlobalBand;
    if ((global.percentage ?? 0) >= global.weightedTarget) {
      band = "goal";
    } else if ((global.percentage ?? 0) >= global.weightedMinimum) {
      band = "surviving";
    } else {
      band = "risk";
    }

    const hasData = global.totalPossibleWeighted > 0;

    return {
      totalWeighted: global.totalPossibleWeighted,
      attendedWeighted: global.totalAttendedWeighted,
      percentage: global.percentage ?? 0,
      band,
      hasData,
    };
  }, [subjects, records, timetable, semester]);

  const budgetResult = useMemo(
    () => computeBunkBudget(subjects, records, timetable),
    [subjects, records, timetable],
  );

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
      {budgetResult === null ? (
        <p className="text-xs text-muted-foreground mt-1">
          No attendance data yet
        </p>
      ) : (
        (() => {
          const units = budgetResult.units;
          const labs = Math.floor(units / 3);
          const lectures = units % 3;

          return (
            <div className="mt-2 flex flex-col gap-0.5">
              <span
                className={`text-xs font-semibold ${
                  units === 0
                    ? "text-red-500"
                    : units === 1
                    ? "text-yellow-500"
                    : "text-green-500"
                }`}
              >
                Bunk Budget: {units} {units === 1 ? "unit" : "units"}
              </span>

              <span className="text-[11px] text-muted-foreground">
                {units === 0
                  ? "No skips allowed. Limited by: "
                  : units === 1
                  ? "High risk. Limited by: "
                  : "Limited by: "}
                {budgetResult.limitSource}
              </span>

              {units > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  (≈{" "}
                  {labs > 0 ? `${labs} lab${labs > 1 ? "s" : ""}` : ""}
                  {labs > 0 && lectures > 0 ? " + " : ""}
                  {lectures > 0
                    ? `${lectures} lecture${lectures > 1 ? "s" : ""}`
                    : ""}
                  )
                </span>
              )}
            </div>
          );
        })()
      )}
      <p
        className={`text-xs font-semibold mt-2 leading-snug ${bandStatusColor[stats.band]}`}
      >
        {bandText[stats.band]}
      </p>
    </div>
  );
}

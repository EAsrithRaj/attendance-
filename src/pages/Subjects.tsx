import { useAppState } from "@/context/AppContext";
import {
  computeAttendanceStats,
  getSubjectState,
} from "@/engine/attendanceEngine";
import type { DayState } from "@/types/attendance";
import PageShell from "@/components/PageShell";

const stateConfig: Record<
  DayState,
  { bg: string; text: string; label: string }
> = {
  GREEN: {
    bg: "bg-attendance-green-muted",
    text: "text-attendance-green",
    label: "Safe",
  },
  YELLOW: {
    bg: "bg-attendance-yellow-muted",
    text: "text-attendance-yellow",
    label: "Warning",
  },
  RED: {
    bg: "bg-attendance-red-muted",
    text: "text-attendance-red",
    label: "Danger",
  },
  GREY: {
    bg: "bg-attendance-grey-muted",
    text: "text-attendance-grey",
    label: "—",
  },
  BLUE: {
    bg: "bg-attendance-blue-muted",
    text: "text-attendance-blue",
    label: "—",
  },
};

export default function SubjectsPage() {
  const { subjects, records } = useAppState();

  // Overall attendance across all subjects
  const overall = subjects.reduce(
    (acc, sub) => {
      const stats = computeAttendanceStats(sub, records);
      acc.attended += stats.attendedWeighted;
      acc.total += stats.totalWeighted;
      return acc;
    },
    { attended: 0, total: 0 },
  );
  const overallPct =
    overall.total > 0 ? (overall.attended / overall.total) * 100 : 100;
  const overallState: DayState =
    overallPct < 75 ? "RED" : overallPct < 78 ? "YELLOW" : "GREEN";
  const overallCfg = stateConfig[overallState];

  return (
    <PageShell title="Subjects">
      {subjects.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No subjects configured. Go to Settings to add them.
        </p>
      ) : (
        <div className="flex flex-col gap-3 animate-fade-in">
          {/* ── Overall attendance summary card ── */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-card-foreground">
                Overall Attendance
              </h3>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${overallCfg.bg} ${overallCfg.text}`}
              >
                {overallCfg.label}
              </span>
            </div>
            <div className="flex items-end justify-between mb-2">
              <span
                className={`text-3xl font-bold font-mono ${overallCfg.text}`}
              >
                {overallPct.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground font-mono">
                {overall.attended} / {overall.total} classes
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overallState === "RED"
                    ? "bg-attendance-red"
                    : overallState === "YELLOW"
                      ? "bg-attendance-yellow"
                      : "bg-attendance-green"
                }`}
                style={{ width: `${Math.min(100, overallPct)}%` }}
              />
            </div>
          </div>
          {subjects.map((sub) => {
            const stats = computeAttendanceStats(sub, records);
            const state = getSubjectState(
              stats.percentage,
              sub.minimumRequiredPercentage,
            );
            const cfg = stateConfig[state];

            return (
              <div
                key={sub.id}
                className={`rounded-xl border border-border bg-card p-4 shadow-sm`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-card-foreground">
                    {sub.name}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                  >
                    {cfg.label}
                  </span>
                </div>

                {/* Percentage bar */}
                <div className="mb-3">
                  <div className="flex items-end justify-between mb-1">
                    <span
                      className={`text-2xl font-bold font-mono ${cfg.text}`}
                    >
                      {stats.percentage.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      min {sub.minimumRequiredPercentage}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        state === "RED"
                          ? "bg-attendance-red"
                          : state === "YELLOW"
                            ? "bg-attendance-yellow"
                            : "bg-attendance-green"
                      }`}
                      style={{ width: `${Math.min(100, stats.percentage)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold font-mono text-card-foreground">
                      {stats.attendedWeighted}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Attended
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold font-mono text-attendance-green">
                      {stats.bunkBuffer}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Can Bunk
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold font-mono text-attendance-red">
                      {stats.mustAttendNext > 0 ? stats.mustAttendNext : "—"}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Must Attend
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

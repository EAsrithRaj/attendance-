import type { AttendanceRecord, AttendanceStats, Subject, TimetableSlot, NotificationLevel, DayState } from "@/types/attendance";

export function computeAttendanceStats(
  subject: Subject,
  records: AttendanceRecord[]
): AttendanceStats {
  const subjectRecords = records.filter((r) => r.subjectId === subject.id);

  let totalWeighted = 0;
  let attendedWeighted = 0;
  let cancelledWeighted = 0;

  for (const record of subjectRecords) {
    if (record.status === "CANCELLED") {
      cancelledWeighted += record.weightSnapshot;
      continue;
    }
    totalWeighted += record.weightSnapshot;
    if (record.status === "PRESENT") {
      attendedWeighted += record.weightSnapshot;
    }
  }

  const percentage = totalWeighted > 0 ? (attendedWeighted / totalWeighted) * 100 : 100;

  // Bunk buffer: max classes you can skip and still be at minimum
  const requiredFraction = subject.minimumRequiredPercentage / 100;
  const maxBunkable =
    totalWeighted > 0
      ? Math.max(0, Math.floor(attendedWeighted / requiredFraction - totalWeighted))
      : 0;

  // Must-attend-next via forward simulation
  const yellowThreshold = subject.minimumRequiredPercentage + 3;
  const mustAttendNext = computeMustAttendNext(
    totalWeighted,
    attendedWeighted,
    yellowThreshold
  );

  return {
    totalWeighted,
    attendedWeighted,
    cancelledWeighted,
    percentage: Math.round(percentage * 100) / 100,
    bunkBuffer: maxBunkable,
    mustAttendNext,
  };
}

/**
 * Forward simulation: find minimum consecutive PRESENT classes (weight=1 each)
 * needed to reach targetPercentage.
 */
function computeMustAttendNext(
  totalWeighted: number,
  attendedWeighted: number,
  targetPercentage: number
): number {
  const target = targetPercentage / 100;
  let t = totalWeighted;
  let a = attendedWeighted;
  let count = 0;

  // Already above target
  if (t > 0 && a / t >= target) return 0;
  if (t === 0) return 0;

  // Simulate adding one class at a time (weight 1)
  while (count < 1000) {
    t += 1;
    a += 1;
    count += 1;
    if (a / t >= target) return count;
  }

  return count;
}

export function getNotificationLevel(state: DayState): NotificationLevel {
  switch (state) {
    case "RED":
      return "MUST_ATTEND";
    case "YELLOW":
      return "RECOMMENDED";
    case "GREEN":
      return "NO_NEED";
    case "GREY":
    case "BLUE":
      return "NONE";
  }
}

export function getSubjectState(
  percentage: number,
  minimum: number
): DayState {
  if (percentage < minimum) return "RED";
  if (percentage < minimum + 3) return "YELLOW";
  return "GREEN";
}

// ── Predictive attendance insight ─────────────────────────────────────────────

export interface AttendanceInsight {
  percentage: number;
  required: number;
  canSkip: number;
  mustAttend: number;
  status: "safe" | "warning" | "danger";
}

/**
 * Computes a predictive insight for a subject:
 * - how many classes can still be skipped
 * - how many must be attended consecutively to recover
 * - current standing (safe / warning / danger)
 *
 * Uses closed-form algebra — no simulation loops.
 */
export function computeAttendanceInsight(
  subject: Subject,
  records: AttendanceRecord[]
): AttendanceInsight {
  const required = subject.minimumRequiredPercentage;
  const stats = computeAttendanceStats(subject, records);

  const t = stats.totalWeighted;   // total weighted classes (excl. cancelled)
  const p = stats.attendedWeighted; // attended weighted classes
  const percentage = stats.percentage; // already computed, reused for status

  // ── Edge case: no classes recorded yet ───────────────────────────────────
  if (t === 0) {
    return { percentage: 100, required, canSkip: 0, mustAttend: 0, status: "safe" };
  }

  // ── Status ────────────────────────────────────────────────────────────────
  const status: AttendanceInsight["status"] =
    percentage < require
      ? "danger"
      : percentage < required + 5
      ? "warning"
      : "safe";

  // ── canSkip ───────────────────────────────────────────────────────────────
  // Maximum x such that: p / (t + x) >= required / 100
  // Solved:  x <= (p * 100 / required) - t
  let canSkip = 0;
  if (required > 0) {
    const rawSkip = (p * 100) / required - t;
    canSkip = Math.max(0, Math.floor(rawSkip));
  }

  // ── mustAttend ────────────────────────────────────────────────────────────
  // Minimum x such that: (p + x) / (t + x) >= required / 100
  // Solved:  x >= (required * t - p * 100) / (100 - required)
  let mustAttend = 0;
  if (percentage < required) {
    const denominator = 100 - required;
    if (denominator <= 0) {
      // required === 100%: must attend every remaining class — return a large sentinel
      mustAttend = Math.max(0, t - p);
    } else {
      const rawAttend = (required * t - p * 100) / denominator;
      mustAttend = Math.max(0, Math.ceil(rawAttend));
    }
  }

  return { percentage, required, canSkip, mustAttend, status };
}
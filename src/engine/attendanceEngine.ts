import type {
  AttendanceRecord,
  AttendanceStats,
  Subject,
  TimetableSlot,
  NotificationLevel,
  DayState,
} from "@/types/attendance";

export function computeAttendanceStats(
  subject: Subject,
  records: AttendanceRecord[],
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

  const percentage =
    totalWeighted > 0 ? (attendedWeighted / totalWeighted) * 100 : 100;

  // Bunk buffer: max classes you can skip and still be at minimum
  const requiredFraction = subject.minimumRequiredPercentage / 100;
  const maxBunkable =
    totalWeighted > 0 && requiredFraction > 0
      ? Math.max(
          0,
          Math.floor(attendedWeighted / requiredFraction - totalWeighted),
        )
      : 0;

  // Must-attend-next via forward simulation
  const yellowThreshold = subject.minimumRequiredPercentage + 3;
  const mustAttendNext = computeMustAttendNext(
    totalWeighted,
    attendedWeighted,
    yellowThreshold,
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

export interface GlobalAttendanceStats {
  totalAttendedWeighted: number;
  totalPossibleWeighted: number;
  percentage: number;
  weightedMinimum: number;
  weightedTarget: number;
}

export function calculateGlobalStats(
  subjects: Subject[],
  records: AttendanceRecord[],
): GlobalAttendanceStats {
  if (subjects.length === 0) {
    return {
      totalAttendedWeighted: 0,
      totalPossibleWeighted: 0,
      percentage: 0,
      weightedMinimum: 0,
      weightedTarget: 0,
    };
  }

  let totalAttendedWeighted = 0;
  let totalPossibleWeighted = 0;
  let weightedMinNumerator = 0;
  let weightedTargetNumerator = 0;

  for (const subject of subjects) {
    const stats = computeAttendanceStats(subject, records);
    const subjectWeight = stats.totalWeighted;
    const subjectTarget = Math.max(
      subject.targetPercentage ?? subject.minimumRequiredPercentage,
      subject.minimumRequiredPercentage,
    );

    totalAttendedWeighted += stats.attendedWeighted;
    totalPossibleWeighted += subjectWeight;
    weightedMinNumerator += subject.minimumRequiredPercentage * subjectWeight;
    weightedTargetNumerator += subjectTarget * subjectWeight;
  }

  const percentage =
    totalPossibleWeighted > 0
      ? Math.min(100, Math.max(0, (totalAttendedWeighted / totalPossibleWeighted) * 100))
      : 0;

  const weightedMinimum =
    totalPossibleWeighted > 0 ? weightedMinNumerator / totalPossibleWeighted : 0;
  const weightedTarget =
    totalPossibleWeighted > 0 ? weightedTargetNumerator / totalPossibleWeighted : 0;

  return {
    totalAttendedWeighted,
    totalPossibleWeighted,
    percentage,
    weightedMinimum,
    weightedTarget,
  };
}

/**
 * Forward simulation: find minimum consecutive PRESENT classes (weight=1 each)
 * needed to reach targetPercentage.
 */
function computeMustAttendNext(
  totalWeighted: number,
  attendedWeighted: number,
  targetPercentage: number,
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

export function getSubjectState(percentage: number, minimum: number): DayState {
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
 * Minimum weighted classes (weight 1 each) needed so that
 * (p + x) / (t + x) >= threshold/100.
 */
function mustAttendToReachThreshold(
  t: number,
  p: number,
  thresholdPercent: number,
): number {
  const denominator = 100 - thresholdPercent;
  if (denominator <= 0) {
    return Math.max(0, t - p);
  }
  return Math.max(0, Math.ceil((thresholdPercent * t - p * 100) / denominator));
}

/**
 * Computes a predictive insight for a subject (target goal vs survival minimum):
 * - safe: at or above target — skips until falling below target
 * - warning: at or above minimum but below target — survival skips + classes to reach goal
 * - danger: below minimum — classes needed to reach minimum
 *
 * Uses closed-form algebra — no simulation loops.
 */
export function computeAttendanceInsight(
  subject: Subject,
  records: AttendanceRecord[],
): AttendanceInsight {
  const minimum = subject.minimumRequiredPercentage;
  const required = minimum;
  const stats = computeAttendanceStats(subject, records);

  const t = stats.totalWeighted;
  const p = stats.attendedWeighted;
  const percentage = stats.percentage;

  if (t === 0) {
    return {
      percentage: 100,
      required,
      canSkip: 0,
      mustAttend: 0,
      status: "safe",
    };
  }

  const rawTarget = subject.targetPercentage ?? minimum;
  const target = Math.max(rawTarget, minimum);

  let status: AttendanceInsight["status"];
  if (percentage < minimum) {
    status = "danger";
  } else if (percentage < target) {
    status = "warning";
  } else {
    status = "safe";
  }

  let canSkip = 0;
  let mustAttend = 0;

  if (status === "safe") {
    if (target > 0) {
      canSkip = Math.max(0, Math.floor((p * 100) / target - t));
    }
    mustAttend = 0;
  } else if (status === "warning") {
    if (minimum > 0) {
      canSkip = Math.max(0, Math.floor((p * 100) / minimum - t));
    }
    mustAttend = mustAttendToReachThreshold(t, p, target);
  } else {
    canSkip = 0;
    mustAttend = mustAttendToReachThreshold(t, p, minimum);
  }

  return { percentage, required, canSkip, mustAttend, status };
}

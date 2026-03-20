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

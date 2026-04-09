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

  const requiredFraction = subject.minimumRequiredPercentage / 100;
  const maxBunkable =
    totalWeighted > 0 && requiredFraction > 0
      ? Math.max(
          0,
          Math.floor(attendedWeighted / requiredFraction - totalWeighted),
        )
      : 0;

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
  percentage: number | null;
  weightedMinimum: number;
  weightedTarget: number;
}

export function calculateGlobalStats(
  subjects: Subject[],
  records: AttendanceRecord[],
  timetable: TimetableSlot[] = [],
): GlobalAttendanceStats {
  const EPS = 1e-6;

  if (subjects.length === 0) {
    return {
      totalAttendedWeighted: 0,
      totalPossibleWeighted: 0,
      percentage: null,
      weightedMinimum: 0,
      weightedTarget: 0,
    };
  }

  let totalAttendedWeighted = 0;
  let totalPossibleWeighted = 0;
  let totalStableWeight = 0;
  let weightedMinNumerator = 0;
  let weightedTargetNumerator = 0;

  for (const subject of subjects) {
    const stats = computeAttendanceStats(subject, records);
    totalAttendedWeighted += stats.attendedWeighted;
    totalPossibleWeighted += stats.totalWeighted;

    const stableWeight = timetable
      .filter((slot) => slot.subjectId === subject.id)
      .reduce((sum, slot) => sum + slot.weight, 0);
    if (stableWeight <= EPS) {
      continue;
    }

    // FIX: Consistent target calculation
    const subjectTarget = Math.max(
      subject.targetPercentage ?? subject.minimumRequiredPercentage,
      subject.minimumRequiredPercentage
    );
    
    totalStableWeight += stableWeight;
    weightedMinNumerator += subject.minimumRequiredPercentage * stableWeight;
    weightedTargetNumerator += subjectTarget * stableWeight;
  }

  const percentage =
    totalPossibleWeighted > EPS
      ? Math.min(
          100,
          Math.max(0, (totalAttendedWeighted / totalPossibleWeighted) * 100),
        )
      : null;

  const weightedMinimum =
    totalStableWeight > EPS ? weightedMinNumerator / totalStableWeight : 0;
  const weightedTarget =
    totalStableWeight > EPS ? weightedTargetNumerator / totalStableWeight : 0;

  return {
    totalAttendedWeighted,
    totalPossibleWeighted,
    percentage,
    weightedMinimum,
    weightedTarget,
  };
}

function computeMustAttendNext(
  totalWeighted: number,
  attendedWeighted: number,
  targetPercentage: number,
): number {
  const target = targetPercentage / 100;
  let t = totalWeighted;
  let a = attendedWeighted;
  let count = 0;

  if (t > 0 && a / t >= target) return 0;
  if (t === 0) return 0;

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

export interface AttendanceInsight {
  percentage: number;
  required: number;
  canSkip: number;
  mustAttend: number;
  status: "safe" | "warning" | "danger";
}

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

export type BunkBudgetResult = {
  units: number;
  limitSource: string;
} | null;

export function computeBunkBudget(
  subjects: Subject[],
  records: AttendanceRecord[],
  timetable: TimetableSlot[]
): BunkBudgetResult {
  const EPS = 1e-6;
  const global = calculateGlobalStats(subjects, records, timetable);

  if (global.percentage === null || global.totalPossibleWeighted === 0) {
    return null;
  }

  const globalM = global.weightedMinimum / 100;
  const globalA = global.totalAttendedWeighted;
  const globalT = global.totalPossibleWeighted;

  let globalUnits = 0;
  if (globalA / globalT + EPS >= globalM) {
    globalUnits = Math.floor((globalA / globalM) - globalT + EPS);
  }

  let minUnits = globalUnits;
  let limitSource = "Overall Attendance";

  for (const subject of subjects) {
    const stats = computeAttendanceStats(subject, records);
    if (stats.totalWeighted === 0) continue;

    const subM = subject.minimumRequiredPercentage / 100;
    const subA = stats.attendedWeighted;
    const subT = stats.totalWeighted;

    let subUnits = 0;
    if (subA / subT + EPS >= subM) {
      subUnits = Math.floor((subA / subM) - subT + EPS);
    }

    if (subUnits < minUnits) {
      minUnits = subUnits;
      limitSource = subject.name;
    }
  }

  return {
    units: Math.max(0, minUnits),
    limitSource,
  };
}

export type SkipDecision = {
  date: string; // YYYY-MM-DD
  subjectId: string;
  slotId: string;
  skip: boolean;
};

export interface DailySimulationState {
  date: string;
  globalPercentage: number | null;
  budgetUnits: number | null;
  limitSource: string | null;
}

export interface SimulationResult {
  final: {
    global: GlobalAttendanceStats;
    subjects: { id: string; stats: AttendanceStats }[];
  };
  timeline: DailySimulationState[];
  firstFailureDate: string | null;
}

export function simulateFutureAttendance(
  subjects: Subject[],
  records: AttendanceRecord[],
  timetable: TimetableSlot[],
  startDate: string,
  endDate: string,
  decisions: SkipDecision[],
): SimulationResult {
  const simulatedRecords = [...records];
  const timeline: DailySimulationState[] = [];
  let firstFailureDate: string | null = null;

  const current = new Date(startDate);
  const end = new Date(endDate);

  const decisionMap = new Map(
    decisions.map(d => [`${d.date}-${d.subjectId}-${d.slotId}`, d])
  );

  // FIX: O(1) Map lookup for records to prevent O(n^2) scaling issues
  const recordMap = new Map(
    simulatedRecords.map(r => [`${r.date}-${r.subjectId}-${r.slotId}`, r])
  );

  while (current <= end) {
    const rawDay = current.getDay();
    const dayOfWeek = rawDay === 0 ? 7 : rawDay;
    
    // FIX: Timezone safe date parsing (en-CA forces YYYY-MM-DD locally)
    const dateStr = current.toLocaleDateString("en-CA");
    
    const dailySlots = timetable.filter((s) => s.dayOfWeek === dayOfWeek);

    for (const slot of dailySlots) {
      const key = `${dateStr}-${slot.subjectId}-${slot.id}`;
      const decision = decisionMap.get(key);
      const existing = recordMap.get(key);

      if (existing) {
        existing.status = decision?.skip ? "ABSENT" : "PRESENT";
        existing.weightSnapshot = slot.weight;
      } else {
        const newRecord: AttendanceRecord = {
          id: `sim-${dateStr}-${slot.id}`,
          subjectId: slot.subjectId,
          slotId: slot.id,
          date: dateStr,
          status: decision?.skip ? "ABSENT" : "PRESENT",
          weightSnapshot: slot.weight,
          isExtra: false,
          timestamp: new Date(dateStr).getTime(),
        };
        simulatedRecords.push(newRecord);
        recordMap.set(key, newRecord);
      }
    }

    const globalStats = calculateGlobalStats(subjects, simulatedRecords, timetable);
    const dailyBudget = computeBunkBudget(subjects, simulatedRecords, timetable);

    if (firstFailureDate === null && dailyBudget && dailyBudget.units === 0) {
      firstFailureDate = dateStr;
    }

    timeline.push({
      date: dateStr,
      globalPercentage: globalStats.percentage,
      budgetUnits: dailyBudget ? dailyBudget.units : null,
      limitSource: dailyBudget ? dailyBudget.limitSource : null,
    });

    current.setDate(current.getDate() + 1);
  }

  return {
    final: {
      global: calculateGlobalStats(subjects, simulatedRecords, timetable),
      subjects: subjects.map((s) => ({
        id: s.id,
        stats: computeAttendanceStats(s, simulatedRecords),
      })),
    },
    timeline,
    firstFailureDate,
  };
}

export interface OptimalSkipPlan {
  decisions: SkipDecision[];
  totalWeightSaved: number;
}

export function computeOptimalSkipPlanBnB(
  subjects: Subject[],
  records: AttendanceRecord[],
  timetable: TimetableSlot[],
  startDate: string,
  endDate: string
): OptimalSkipPlan {
  // 1. Build future slots
  const futureSlots: { date: string; slot: TimetableSlot }[] = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const rawDay = current.getDay();
    const dayOfWeek = rawDay === 0 ? 7 : rawDay;
    const dateStr = current.toLocaleDateString("en-CA");

    const dailySlots = timetable.filter(s => s.dayOfWeek === dayOfWeek);
    for (const slot of dailySlots) {
      futureSlots.push({ date: dateStr, slot });
    }
    current.setDate(current.getDate() + 1);
  }

  // 2. Heuristic: try lighter slots first to build high lower-bounds quickly
  futureSlots.sort((a, b) => a.slot.weight - b.slot.weight);

  let bestWeight = 0;
  let bestDecisions: SkipDecision[] = [];

  // 3. Precompute suffix max weights for DFS pruning
  const suffixMax: number[] = new Array(futureSlots.length).fill(0);
  for (let i = futureSlots.length - 1; i >= 0; i--) {
    suffixMax[i] =
      futureSlots[i].slot.weight +
      (i + 1 < futureSlots.length ? suffixMax[i + 1] : 0);
  }

  // 4. Branch and Bound DFS
  function dfs(
    index: number,
    decisions: SkipDecision[],
    currentWeight: number
  ) {
    // PRUNE: If current weight + all remaining possible weight can't beat the best, kill branch
    if (
      index < futureSlots.length &&
      currentWeight + suffixMax[index] <= bestWeight
    ) {
      return;
    }

    // BASE CASE: Reached the end
    if (index === futureSlots.length) {
      if (currentWeight > bestWeight) {
        bestWeight = currentWeight;
        bestDecisions = [...decisions];
      }
      return;
    }

    const { date, slot } = futureSlots[index];

    // --- BRANCH A: Try SKIP ---
    const skipDecision: SkipDecision = {
      date,
      subjectId: slot.subjectId,
      slotId: slot.id,
      skip: true
    };

    decisions.push(skipDecision);

    // Oracle Check
    const sim = simulateFutureAttendance(
      subjects,
      records,
      timetable,
      startDate,
      endDate,
      decisions
    );

    if (sim.firstFailureDate === null) {
      dfs(index + 1, decisions, currentWeight + slot.weight);
    }

    // Backtrack
    decisions.pop();

    // --- BRANCH B: Try NOT SKIP ---
    dfs(index + 1, decisions, currentWeight);
  }

  dfs(0, [], 0);

  return {
    decisions: bestDecisions,
    totalWeightSaved: bestWeight
  };
}
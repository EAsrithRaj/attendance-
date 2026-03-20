import type {
  Subject,
  TimetableSlot,
  AttendanceRecord,
  Holiday,
  ExamPeriod,
  SemesterConfig,
  DayPrediction,
  ClassPrediction,
  DayState,
} from "@/types/attendance";

function isSunday(dateStr: string): boolean {
  return new Date(dateStr + "T00:00:00").getDay() === 0;
}

function isInExamPeriod(dateStr: string, examPeriods: ExamPeriod[]): boolean {
  return examPeriods.some((ep) => dateStr >= ep.startDate && dateStr <= ep.endDate);
}

function isHoliday(dateStr: string, holidays: Holiday[]): boolean {
  return holidays.some((h) => h.date === dateStr);
}

function getDayOfWeek(dateStr: string): number {
  const day = new Date(dateStr + "T00:00:00").getDay();
  return day === 0 ? 7 : day; // 1=Mon...7=Sun
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

/**
 * Build a map of date -> scheduled timetable slots,
 * skipping Sundays, holidays, and exam periods.
 */
export function buildDateSlotMap(
  slots: TimetableSlot[],
  holidays: Holiday[],
  examPeriods: ExamPeriod[],
  semester: SemesterConfig
): Map<string, TimetableSlot[]> {
  const map = new Map<string, TimetableSlot[]>();
  let current = semester.startDate;

  while (current <= semester.endDate) {
    if (!isSunday(current) && !isHoliday(current, holidays) && !isInExamPeriod(current, examPeriods)) {
      const dow = getDayOfWeek(current);
      const daySlots = slots.filter((s) => s.dayOfWeek === dow);
      if (daySlots.length > 0) {
        map.set(current, daySlots);
      }
    }
    current = addDays(current, 1);
  }

  return map;
}

/**
 * For each subject, compute current totals from records (excluding cancelled).
 */
function computeSubjectTotals(
  subjects: Subject[],
  records: AttendanceRecord[]
): Map<string, { total: number; attended: number }> {
  const totals = new Map<string, { total: number; attended: number }>();
  for (const sub of subjects) {
    totals.set(sub.id, { total: 0, attended: 0 });
  }
  for (const rec of records) {
    const t = totals.get(rec.subjectId);
    if (!t) continue;
    if (rec.status === "CANCELLED") continue;
    t.total += rec.weightSnapshot;
    if (rec.status === "PRESENT") {
      t.attended += rec.weightSnapshot;
    }
  }
  return totals;
}

export function predictDay(
  dateStr: string,
  subjects: Subject[],
  slots: TimetableSlot[],
  records: AttendanceRecord[],
  holidays: Holiday[],
  examPeriods: ExamPeriod[]
): DayPrediction {
  if (isHoliday(dateStr, holidays)) {
    return { date: dateStr, state: "GREY", classPredictions: [] };
  }
  if (isInExamPeriod(dateStr, examPeriods)) {
    return { date: dateStr, state: "BLUE", classPredictions: [] };
  }
  if (isSunday(dateStr)) {
    return { date: dateStr, state: "GREY", classPredictions: [] };
  }

  const dow = getDayOfWeek(dateStr);
  const daySlots = slots.filter((s) => s.dayOfWeek === dow);

  if (daySlots.length === 0) {
    return { date: dateStr, state: "GREY", classPredictions: [] };
  }

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const totals = computeSubjectTotals(subjects, records);

  const classPredictions: ClassPrediction[] = [];
  let worstState: DayState = "GREEN";

  for (const slot of daySlots) {
    const subject = subjectMap.get(slot.subjectId);
    if (!subject) continue;

    const t = totals.get(slot.subjectId);
    if (!t) continue;

    // Simulate skipping this class
    const tempTotal = t.total + slot.weight;
    const tempAttended = t.attended; // unchanged
    const tempPercentage = tempTotal > 0 ? (tempAttended / tempTotal) * 100 : 100;

    let skipState: DayState = "GREEN";
    if (tempPercentage < subject.minimumRequiredPercentage) {
      skipState = "RED";
    } else if (tempPercentage < subject.minimumRequiredPercentage + 3) {
      skipState = "YELLOW";
    }

    classPredictions.push({
      slotId: slot.id,
      subjectId: slot.subjectId,
      weight: slot.weight,
      skipState,
    });

    if (skipState === "RED") worstState = "RED";
    else if (skipState === "YELLOW" && worstState !== "RED") worstState = "YELLOW";
  }

  return { date: dateStr, state: worstState, classPredictions };
}

export function predictRange(
  startDate: string,
  endDate: string,
  subjects: Subject[],
  slots: TimetableSlot[],
  records: AttendanceRecord[],
  holidays: Holiday[],
  examPeriods: ExamPeriod[]
): DayPrediction[] {
  const ALLOWED_STATES = new Set<DayState>(["GREEN", "YELLOW", "RED", "GREY", "BLUE"]);
  const toValidState = (value: unknown): DayState =>
    typeof value === "string" && ALLOWED_STATES.has(value as DayState) ? (value as DayState) : "GREY";

  const parseLocalDate = (dateStr: string): Date | null => {
    if (typeof dateStr !== "string") return null;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return null;

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed;
  };

  const formatLocalDate = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const addLocalDays = (date: Date, days: number): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

  try {
    const safeSubjects = (Array.isArray(subjects) ? subjects : []).filter(
      (s): s is Subject =>
        Boolean(s) &&
        typeof s.id === "string" &&
        typeof s.name === "string" &&
        Number.isFinite(s.minimumRequiredPercentage)
    );

    const safeSlots = (Array.isArray(slots) ? slots : []).filter(
      (slot): slot is TimetableSlot =>
        Boolean(slot) &&
        typeof slot.id === "string" &&
        typeof slot.subjectId === "string" &&
        Number.isFinite(slot.dayOfWeek) &&
        Number.isFinite(slot.weight)
    );

    const safeRecords = (Array.isArray(records) ? records : []).filter(
      (record): record is AttendanceRecord =>
        Boolean(record) &&
        typeof record.subjectId === "string" &&
        typeof record.status === "string" &&
        Number.isFinite(record.weightSnapshot)
    );

    const safeHolidays = (Array.isArray(holidays) ? holidays : []).filter(
      (h): h is Holiday => Boolean(h) && typeof h.date === "string"
    );

    const safeExamPeriods = (Array.isArray(examPeriods) ? examPeriods : []).filter(
      (ep): ep is ExamPeriod =>
        Boolean(ep) && typeof ep.startDate === "string" && typeof ep.endDate === "string"
    );

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    if (!start || !end || start > end) {
      console.error("predictRange: invalid date range", { startDate, endDate });
      console.debug("predictRange safety summary", {
        daysProcessed: 0,
        timetableSlotsFound: 0,
        subjectsCount: safeSubjects.length,
      });
      return [];
    }

    const subjectMap = new Map(safeSubjects.map((s) => [s.id, s]));
    const totals = new Map<string, { totalWeighted: number; attendedWeighted: number }>();
    for (const subject of safeSubjects) {
      totals.set(subject.id, { totalWeighted: 0, attendedWeighted: 0 });
    }

    for (const record of safeRecords) {
      const subjectTotals = totals.get(record.subjectId);
      if (!subjectTotals) continue;

      if (record.status === "CANCELLED") continue;

      const weight = Math.max(0, record.weightSnapshot);
      subjectTotals.totalWeighted += weight;
      if (record.status === "PRESENT") {
        subjectTotals.attendedWeighted += weight;
      }
    }

    const slotsByDow = new Map<number, TimetableSlot[]>();
    for (const slot of safeSlots) {
      const dow = Math.trunc(slot.dayOfWeek);
      if (dow < 1 || dow > 7) continue;
      const existing = slotsByDow.get(dow) ?? [];
      existing.push(slot);
      slotsByDow.set(dow, existing);
    }

    const holidaySet = new Set(safeHolidays.map((h) => h.date));

    const predictions: DayPrediction[] = [];
    let current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    let daysProcessed = 0;
    let timetableSlotsFound = 0;

    while (current <= end) {
      const dateKey = formatLocalDate(current);
      const jsDay = current.getDay();
      const dow = jsDay === 0 ? 7 : jsDay;

      daysProcessed += 1;

      if (jsDay === 0 || holidaySet.has(dateKey)) {
        predictions.push({ date: dateKey, state: "GREY", classPredictions: [] });
        current = addLocalDays(current, 1);
        continue;
      }

      if (safeExamPeriods.some((ep) => dateKey >= ep.startDate && dateKey <= ep.endDate)) {
        predictions.push({ date: dateKey, state: "BLUE", classPredictions: [] });
        current = addLocalDays(current, 1);
        continue;
      }

      const daySlots = slotsByDow.get(dow) ?? [];
      timetableSlotsFound += daySlots.length;

      if (daySlots.length === 0) {
        predictions.push({ date: dateKey, state: "GREY", classPredictions: [] });
        current = addLocalDays(current, 1);
        continue;
      }

      const classPredictions: ClassPrediction[] = [];
      let dayState: DayState = "GREEN";

      for (const slot of daySlots) {
        const subject = subjectMap.get(slot.subjectId);
        if (!subject) continue;

        const subjectTotals = totals.get(slot.subjectId) ?? { totalWeighted: 0, attendedWeighted: 0 };
        const totalWeighted = subjectTotals.totalWeighted;
        const attendedWeighted = subjectTotals.attendedWeighted;

        let skipState: DayState = "GREEN";

        if (totalWeighted === 0) {
          skipState = "GREEN";
        } else {
          let tempTotal = totalWeighted;
          let tempAttended = attendedWeighted;

          tempTotal += Math.max(0, slot.weight);

          const percentage = tempTotal === 0 ? 0 : (tempAttended / tempTotal) * 100;

          if (percentage < subject.minimumRequiredPercentage) {
            skipState = "RED";
          } else if (percentage < subject.minimumRequiredPercentage + 3) {
            skipState = "YELLOW";
          } else {
            skipState = "GREEN";
          }
        }

        const safeSkipState = toValidState(skipState);

        classPredictions.push({
          slotId: slot.id,
          subjectId: slot.subjectId,
          weight: slot.weight,
          skipState: safeSkipState,
        });

        if (safeSkipState === "RED") {
          dayState = "RED";
        } else if (safeSkipState === "YELLOW" && dayState !== "RED") {
          dayState = "YELLOW";
        }
      }

      if (classPredictions.length === 0) {
        predictions.push({ date: dateKey, state: "GREY", classPredictions: [] });
      } else {
        predictions.push({
          date: dateKey,
          state: toValidState(dayState),
          classPredictions,
        });
      }

      current = addLocalDays(current, 1);
    }

    console.debug("predictRange safety summary", {
      daysProcessed,
      timetableSlotsFound,
      subjectsCount: safeSubjects.length,
    });

    return predictions;
  } catch (error) {
    console.error("predictRange failed:", error);
    console.debug("predictRange safety summary", {
      daysProcessed: 0,
      timetableSlotsFound: 0,
      subjectsCount: Array.isArray(subjects) ? subjects.length : 0,
    });
    return [];
  }
}

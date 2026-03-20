import type {
  Subject,
  TimetableSlot,
  AttendanceRecord,
  Holiday,
  ExamPeriod,
  SemesterConfig,
} from "@/types/attendance";
import { computeAttendanceStats } from "@/engine/attendanceEngine";
import { predictDay } from "@/engine/predictionEngine";

export const TEST_SUBJECTS: Subject[] = [
  { id: "math", name: "Mathematics", minimumRequiredPercentage: 75 },
  { id: "phy-lab", name: "Physics Lab", minimumRequiredPercentage: 75 },
  { id: "cs", name: "Computer Science", minimumRequiredPercentage: 75 },
];

export const TEST_TIMETABLE: TimetableSlot[] = [
  { id: "s1", subjectId: "math", dayOfWeek: 1, startTime: "09:00", endTime: "10:00", weight: 1 },
  { id: "s2", subjectId: "phy-lab", dayOfWeek: 1, startTime: "10:00", endTime: "13:00", weight: 3 },
  { id: "s3", subjectId: "cs", dayOfWeek: 2, startTime: "09:00", endTime: "10:00", weight: 1 },
  { id: "s4", subjectId: "math", dayOfWeek: 3, startTime: "09:00", endTime: "10:00", weight: 1 },
  { id: "s5", subjectId: "cs", dayOfWeek: 4, startTime: "09:00", endTime: "10:00", weight: 1 },
  { id: "s6", subjectId: "math", dayOfWeek: 5, startTime: "09:00", endTime: "10:00", weight: 1 },
  { id: "s7", subjectId: "phy-lab", dayOfWeek: 5, startTime: "10:00", endTime: "13:00", weight: 3 },
];

export const TEST_RECORDS: AttendanceRecord[] = [
  // Math: 8 present out of 10 = 80% → above 75, bunk buffer > 0
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `m-p-${i}`,
    subjectId: "math",
    date: `2026-01-${String(6 + i * 2).padStart(2, "0")}`,
    status: "PRESENT" as const,
    weightSnapshot: 1,
    slotId: "s1",
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `m-a-${i}`,
    subjectId: "math",
    date: `2026-01-${String(22 + i * 2).padStart(2, "0")}`,
    status: "ABSENT" as const,
    weightSnapshot: 1,
    slotId: "s1",
  })),
  // Physics Lab: 6 present, 2 absent (weighted: 18 present, 6 absent out of 24 total = 75% → YELLOW boundary)
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `pl-p-${i}`,
    subjectId: "phy-lab",
    date: `2026-01-${String(5 + i * 7).padStart(2, "0")}`,
    status: "PRESENT" as const,
    weightSnapshot: 3,
    slotId: "s2",
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `pl-a-${i}`,
    subjectId: "phy-lab",
    date: `2026-02-${String(2 + i * 7).padStart(2, "0")}`,
    status: "ABSENT" as const,
    weightSnapshot: 3,
    slotId: "s2",
  })),
  // CS: 4 present, 1 cancelled, 1 absent → 4/5 = 80% (cancelled excluded)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `cs-p-${i}`,
    subjectId: "cs",
    date: `2026-01-${String(6 + i * 7).padStart(2, "0")}`,
    status: "PRESENT" as const,
    weightSnapshot: 1,
    slotId: "s3",
  })),
  {
    id: "cs-c-0",
    subjectId: "cs",
    date: "2026-02-03",
    status: "CANCELLED" as const,
    weightSnapshot: 1,
    slotId: "s3",
  },
  {
    id: "cs-a-0",
    subjectId: "cs",
    date: "2026-02-10",
    status: "ABSENT" as const,
    weightSnapshot: 1,
    slotId: "s3",
  },
];

export const TEST_HOLIDAYS: Holiday[] = [
  { date: "2026-01-26", name: "Republic Day" },
  { date: "2026-03-10", name: "Holi" },
];

export const TEST_EXAM_PERIODS: ExamPeriod[] = [
  { startDate: "2026-03-20", endDate: "2026-04-05" },
];

export const TEST_SEMESTER: SemesterConfig = {
  startDate: "2026-01-05",
  endDate: "2026-05-01",
};

// Verification function
export function runTestVerification(): void {
  console.log("=== Attendance Engine Test ===");
  for (const sub of TEST_SUBJECTS) {
    const stats = computeAttendanceStats(sub, TEST_RECORDS);
    console.log(`[${sub.name}]`, stats);
  }

  console.log("\n=== Prediction Test ===");
  // Test a Monday
  const monday = predictDay("2026-02-16", TEST_SUBJECTS, TEST_TIMETABLE, TEST_RECORDS, TEST_HOLIDAYS, TEST_EXAM_PERIODS);
  console.log("Mon 2026-02-16:", monday);

  // Test holiday
  const holiday = predictDay("2026-01-26", TEST_SUBJECTS, TEST_TIMETABLE, TEST_RECORDS, TEST_HOLIDAYS, TEST_EXAM_PERIODS);
  console.log("Holiday 2026-01-26:", holiday);

  // Test exam period
  const exam = predictDay("2026-03-25", TEST_SUBJECTS, TEST_TIMETABLE, TEST_RECORDS, TEST_HOLIDAYS, TEST_EXAM_PERIODS);
  console.log("Exam 2026-03-25:", exam);
}

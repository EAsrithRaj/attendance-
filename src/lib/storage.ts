import type {
  Subject,
  TimetableSlot,
  AttendanceRecord,
  Holiday,
  ExamPeriod,
  SemesterConfig,
} from "@/types/attendance";

const KEYS = {
  subjects: "subjects",
  timetable: "timetable",
  attendanceRecords: "attendanceRecords",
  holidays: "holidays",
  examPeriods: "examPeriods",
  semesterConfig: "semesterConfig",
} as const;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadSubjects(): Subject[] {
  return load<Subject[]>(KEYS.subjects, []);
}
export function saveSubjects(data: Subject[]): void {
  save(KEYS.subjects, data);
}

export function loadTimetable(): TimetableSlot[] {
  return load<TimetableSlot[]>(KEYS.timetable, []);
}
export function saveTimetable(data: TimetableSlot[]): void {
  save(KEYS.timetable, data);
}

export function loadAttendanceRecords(): AttendanceRecord[] {
  return load<AttendanceRecord[]>(KEYS.attendanceRecords, []);
}
export function saveAttendanceRecords(data: AttendanceRecord[]): void {
  save(KEYS.attendanceRecords, data);
}

export function loadHolidays(): Holiday[] {
  return load<Holiday[]>(KEYS.holidays, []);
}
export function saveHolidays(data: Holiday[]): void {
  save(KEYS.holidays, data);
}

export function loadExamPeriods(): ExamPeriod[] {
  return load<ExamPeriod[]>(KEYS.examPeriods, []);
}
export function saveExamPeriods(data: ExamPeriod[]): void {
  save(KEYS.examPeriods, data);
}

export function loadSemesterConfig(): SemesterConfig {
  return load<SemesterConfig>(KEYS.semesterConfig, {
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 120 * 86400000).toISOString().split("T")[0],
  });
}
export function saveSemesterConfig(data: SemesterConfig): void {
  save(KEYS.semesterConfig, data);
}

export function clearAllData(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}

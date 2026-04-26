export interface SubjectAdjustment {
  offset?: number;
  baseline?: {
    attended: number;
    total: number;
  };
}

export interface Subject {
  id: string;
  name: string;
  minimumRequiredPercentage: number;
  /** Optional goal; if omitted, engine uses `minimumRequiredPercentage`. */
  targetPercentage?: number;
  adjustment?: SubjectAdjustment;
}

export interface TimetableSlot {
  id: string;
  subjectId: string;
  dayOfWeek: number; // 1 = Mon … 6 = Sat
  startTime: string;
  endTime: string;
  weight: number; // 1 = theory, 3 = lab
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "CANCELLED";

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string; // ISO date string YYYY-MM-DD
  status: AttendanceStatus;
  weightSnapshot: number;
  slotId: string;
  isExtra?: boolean;
}

export interface Holiday {
  /** Unique id — present for auto-loaded INDIAN_HOLIDAYS entries, absent for legacy manual entries */
  id?: string;
  date: string;
  name?: string;
  type?: "national" | "state" | "manual";
}

export interface ExamPeriod {
  startDate: string;
  endDate: string;
}

export interface SemesterConfig {
  startDate: string;
  endDate: string;
}

export interface AttendanceStats {
  totalWeighted: number;
  attendedWeighted: number;
  cancelledWeighted: number;
  percentage: number;
  bunkBuffer: number;
  mustAttendNext: number;
}

export type DayState = "GREEN" | "YELLOW" | "RED" | "GREY" | "BLUE";

export interface ClassPrediction {
  slotId: string;
  subjectId: string;
  weight: number;
  skipState: DayState;
}

export interface DayPrediction {
  date: string;
  state: DayState;
  classPredictions: ClassPrediction[];
}

export type NotificationLevel = "MUST_ATTEND" | "RECOMMENDED" | "NO_NEED" | "NONE";
